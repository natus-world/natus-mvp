import { json, preflight } from '../_shared/cors.ts';
import { authenticate, Unauthorized } from '../_shared/auth.ts';
import { logCall } from '../_shared/log.ts';
import { costUsd } from '../_shared/lib/budget.ts';
import { piecesOf, voiceTokens, type VoicePassage } from '../_shared/lib/voice.ts';
import { MEDITATION_VOICE_STYLE } from '../_shared/prompts/meditation-voice.ts';
import { MEDITATION_VOICE_PROMPT_VERSION } from '../_shared/prompts/versions.ts';
import type { SupabaseClient } from 'jsr:@supabase/supabase-js@2';

/**
 * The meditation's voice (owner, 29 Oct 2026).
 *
 * Reads aloud, with Google's Gemini TTS, a script the meditation function
 * stored — never a text from the browser, or this would be a free reading
 * service with Natus's key in it. Each passage becomes one MP3 in the private
 * bucket `meditation-voice`, once per passage and voice; asking again only
 * signs the links anew. The browser asks for a range — the first passages,
 * then the rest — so the practice starts while the rest is being read.
 *
 * Paid by use, so it stops at `voice_settings.monthly_cap_usd` for the
 * calendar month (UTC), counted from what the recordings were estimated to
 * cost. Past the ceiling, or when Google fails, it answers with an error and
 * the browser reads the meditation with the phone's own voice, as before.
 *
 * Google is reached with `GOOGLE_TTS_SERVICE_ACCOUNT` (a service account's
 * JSON, for an OAuth token) when it is set, else with `GOOGLE_TTS_API_KEY`.
 */

const BUCKET = 'meditation-voice';
const LINK_SECONDS = 6 * 60 * 60;
const AT_ONCE = 6;
/** At most this many passages per request, so one call stays well inside the function's time. */
const MAX_RANGE = 48;
const REQUEST_TIMEOUT_MS = 45_000;

type Voice = 'mujer' | 'hombre';
type Settings = {
  monthly_cap_usd: number;
  model: string;
  voice_mujer: string;
  voice_hombre: string;
  language_code: string;
};

// ── Google's credentials ─────────────────────────────────────────────────────

let cachedToken: { value: string; until: number } | null = null;

function base64url(bytes: Uint8Array | string): string {
  const raw = typeof bytes === 'string' ? new TextEncoder().encode(bytes) : bytes;
  let text = '';
  for (const b of raw) text += String.fromCharCode(b);
  return btoa(text).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function serviceAccountToken(json: string): Promise<string> {
  if (cachedToken && cachedToken.until > Date.now() + 60_000) return cachedToken.value;
  const account = JSON.parse(json) as { client_email: string; private_key: string; token_uri?: string };
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claims = base64url(
    JSON.stringify({
      iss: account.client_email,
      scope: 'https://www.googleapis.com/auth/cloud-platform',
      aud: account.token_uri ?? 'https://oauth2.googleapis.com/token',
      iat: now,
      exp: now + 3600,
    }),
  );
  const pem = account.private_key.replace(/-----[^-]+-----/g, '').replace(/\s+/g, '');
  const der = Uint8Array.from(atob(pem), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey('pkcs8', der, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, [
    'sign',
  ]);
  const signature = new Uint8Array(
    await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(`${header}.${claims}`)),
  );
  const response = await fetch(account.token_uri ?? 'https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: `${header}.${claims}.${base64url(signature)}`,
    }),
  });
  if (!response.ok) throw new Error(`google_token_${response.status}`);
  const payload = (await response.json()) as { access_token: string; expires_in: number };
  cachedToken = { value: payload.access_token, until: Date.now() + payload.expires_in * 1000 };
  return payload.access_token;
}

type Credentials = { headers: Record<string, string>; query: string };

async function credentials(): Promise<Credentials | null> {
  const account = Deno.env.get('GOOGLE_TTS_SERVICE_ACCOUNT');
  if (account) return { headers: { Authorization: `Bearer ${await serviceAccountToken(account)}` }, query: '' };
  const key = Deno.env.get('GOOGLE_TTS_API_KEY');
  if (key) return { headers: {}, query: `?key=${encodeURIComponent(key)}` };
  return null;
}

// ── one request to Google ───────────────────────────────────────────────────

class VoiceError extends Error {
  constructor(public readonly status: number, detail: string) {
    super(detail);
  }
}

async function synthesize(text: string, settings: Settings, voiceName: string, auth: Credentials): Promise<Uint8Array> {
  const body = JSON.stringify({
    input: { prompt: MEDITATION_VOICE_STYLE, text },
    voice: { languageCode: settings.language_code, name: voiceName, model_name: settings.model },
    audioConfig: { audioEncoding: 'MP3' },
  });
  let last: VoiceError | null = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    const response = await fetch(`https://texttospeech.googleapis.com/v1/text:synthesize${auth.query}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...auth.headers },
      body,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (response.ok) {
      const payload = (await response.json()) as { audioContent?: string };
      if (!payload.audioContent) throw new VoiceError(502, 'no_audio');
      return Uint8Array.from(atob(payload.audioContent), (c) => c.charCodeAt(0));
    }
    // Only what Google says went wrong, never the key: it is in the URL.
    const detail = (await response.text()).slice(0, 300);
    last = new VoiceError(response.status, detail);
    if (response.status < 500 && response.status !== 429) break;
  }
  throw last ?? new VoiceError(502, 'unknown');
}

/** MP3 frames join end to end: the pieces of one passage are one recording. */
function join(parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let at = 0;
  for (const p of parts) {
    out.set(p, at);
    at += p.length;
  }
  return out;
}

async function inBatches<T, R>(items: readonly T[], size: number, run: (item: T, index: number) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(size, items.length) }, async () => {
      while (next < items.length) {
        const index = next++;
        out[index] = await run(items[index]!, index);
      }
    }),
  );
  return out;
}

// ── the month's spend ───────────────────────────────────────────────────────

async function spentThisMonth(elevated: SupabaseClient): Promise<number> {
  const { data, error } = await elevated.rpc('voice_spent_this_month');
  // Not knowing what was spent is not a reason to spend: the ceiling holds.
  if (error) return Number.POSITIVE_INFINITY;
  return Number(data ?? 0);
}

async function signed(elevated: SupabaseClient, paths: string[]): Promise<string[] | null> {
  if (paths.length === 0) return [];
  const { data, error } = await elevated.storage.from(BUCKET).createSignedUrls(paths, LINK_SECONDS);
  if (error || !data || data.length !== paths.length) return null;
  const urls = data.map((d) => d.signedUrl);
  return urls.every((u) => typeof u === 'string' && u !== '') ? (urls as string[]) : null;
}

Deno.serve(async (request) => {
  const cors = preflight(request);
  if (cors) return cors;
  if (request.method !== 'POST') return json(request, { error: 'method_not_allowed' }, 405);

  let who: Awaited<ReturnType<typeof authenticate>>;
  try {
    who = await authenticate(request);
  } catch (error) {
    if (error instanceof Unauthorized) return json(request, { error: 'unauthorized' }, 401);
    return json(request, { error: 'misconfigured' }, 500);
  }
  const { userId, caller, elevated } = who;

  let scriptId: string;
  let voice: Voice;
  let from: number;
  let to: number;
  try {
    const body = (await request.json()) as Record<string, unknown>;
    if (typeof body.scriptId !== 'string' || !/^[0-9a-f-]{36}$/i.test(body.scriptId)) throw new Error();
    if (body.voice !== 'mujer' && body.voice !== 'hombre') throw new Error();
    from = Number.isInteger(body.from) ? (body.from as number) : 0;
    to = Number.isInteger(body.to) ? (body.to as number) : from + MAX_RANGE;
    if (from < 0 || to <= from) throw new Error();
    scriptId = body.scriptId;
    voice = body.voice;
  } catch {
    return json(request, { error: 'invalid_request' }, 400);
  }

  // Read as the person: RLS answers only with their own script.
  const { data: script } = await caller
    .from('meditation_voice_scripts')
    .select('id, passages')
    .eq('id', scriptId)
    .maybeSingle();
  if (!script) return json(request, { error: 'not_found' }, 404);
  const passages = script.passages as VoicePassage[];
  to = Math.min(to, passages.length, from + MAX_RANGE);
  if (from >= passages.length) return json(request, { from, urls: [], total: passages.length });

  const { data: keptRows } = await elevated
    .from('meditation_voice_audio')
    .select('passage, path')
    .eq('script_id', scriptId)
    .eq('voice', voice)
    .gte('passage', from)
    .lt('passage', to);
  const kept = new Map((keptRows ?? []).map((r) => [Number(r.passage), r.path as string]));
  const missing = Array.from({ length: to - from }, (_, i) => from + i).filter((i) => !kept.has(i));

  if (missing.length > 0) {
    const { data: settings } = await elevated.from('voice_settings').select('*').maybeSingle();
    if (!settings) return json(request, { error: 'misconfigured' }, 500);
    const auth = await credentials().catch(() => null);
    if (!auth) return json(request, { error: 'no_voice' }, 503);

    const work = missing.map((index) => {
      const text = passages[index]!.text;
      const parts = piecesOf(text);
      const tokens = voiceTokens(text.length, parts.length, MEDITATION_VOICE_STYLE.length);
      return { index, text, parts, tokens, cost: costUsd(tokens, settings.model) };
    });
    const cost = work.reduce((sum, w) => sum + w.cost, 0);
    if ((await spentThisMonth(elevated)) + cost > Number(settings.monthly_cap_usd)) {
      // The team hears it once a month (owner, 29 Oct 2026).
      await elevated.rpc('notify_voice_cap', { p_cap: Number(settings.monthly_cap_usd) });
      return json(request, { error: 'voice_cap' }, 429);
    }

    const voiceName = voice === 'hombre' ? settings.voice_hombre : settings.voice_mujer;
    const started = Date.now();
    try {
      await inBatches(work, AT_ONCE, async (w) => {
        const audio = join(await Promise.all(w.parts.map((text) => synthesize(text, settings as Settings, voiceName, auth))));
        const path = `${userId}/${scriptId}/${voice}/${String(w.index).padStart(3, '0')}.mp3`;
        const { error } = await elevated.storage.from(BUCKET).upload(path, audio, {
          contentType: 'audio/mpeg',
          upsert: true,
        });
        if (error) throw new VoiceError(500, `storage: ${error.message}`);
        await elevated.from('meditation_voice_audio').upsert({
          script_id: scriptId,
          voice,
          passage: w.index,
          user_id: userId,
          model: settings.model,
          voice_name: voiceName,
          path,
          characters: w.text.length,
          cost_usd: Math.round(w.cost * 100_000) / 100_000,
        });
        kept.set(w.index, path);
      });
    } catch (error) {
      const status = error instanceof VoiceError ? error.status : 502;
      console.error('voice_failed', status, error instanceof Error ? error.message : String(error));
      await logCall(elevated, {
        userId,
        purpose: 'voice',
        promptVersion: MEDITATION_VOICE_PROMPT_VERSION,
        model: settings.model,
        mode: 'server',
        outcome: 'api_error',
        latencyMs: Date.now() - started,
        errorKind: `google_${status}`,
      });
      return json(request, { error: 'voice_failed', status }, 502);
    }
    await logCall(elevated, {
      userId,
      purpose: 'voice',
      promptVersion: MEDITATION_VOICE_PROMPT_VERSION,
      model: settings.model,
      mode: 'server',
      outcome: 'ok',
      inputTokens: work.reduce((n, w) => n + w.tokens.inputTokens, 0),
      outputTokens: work.reduce((n, w) => n + w.tokens.outputTokens, 0),
      latencyMs: Date.now() - started,
    });
  }

  const paths = Array.from({ length: to - from }, (_, i) => kept.get(from + i)!);
  const urls = await signed(elevated, paths);
  if (!urls) return json(request, { error: 'voice_failed', status: 500 }, 502);
  return json(request, { from, urls, total: passages.length });
});
