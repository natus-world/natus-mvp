/**
 * The four functions that share `_shared/serve-model.ts`, against the local
 * Edge runtime. `verify-chat-function.mjs` covers the fifth, which has a quota
 * and a crisis reply of its own and does not use the shared handler.
 *
 * The assertion this exists for is the second block: **a crisis is refused
 * before the key is checked.** The deterministic scan sits in front of the
 * model, and "in front" has to survive a deployment that has
 * no model at all — otherwise the ordering silently reverses the moment
 * somebody forgets to set a secret, and nothing anywhere would say so.
 *
 * It also covers what the module graph cannot be trusted to prove: five
 * separate workers, each importing the shared library, the shared prompts and
 * zod through the import map. The type checker sees none of that. A missing
 * file extension took all of them down once already.
 *
 *   supabase start && supabase functions serve
 *   node scripts/verify-model-functions.mjs
 *
 * Serve with `--env-file` carrying ANTHROPIC_API_KEY to reach the model itself;
 * without one the script says which assertions it could not make.
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';

const API = 'http://127.0.0.1:54321';
const env = readFileSync('.env.local', 'utf8');
const ANON = env.match(/VITE_SUPABASE_ANON_KEY=(.+)/)[1].trim();

const results = [];
const check = (name, pass, detail = '') => {
  results.push({ name, pass });
  console.log(`${pass ? 'ok  ' : 'FAIL'}  ${name}${detail ? `  — ${detail}` : ''}`);
};

const client = createClient(API, ANON, { auth: { persistSession: false } });
const { data: auth } = await client.auth.signInAnonymously();
const token = auth.session.access_token;
const userId = auth.session.user.id;
const authed = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

// Somebody who has answered «Para cuidarte» and is not vulnerable. Without an
// answer the comparison is refused (rule 6 fails closed), which is checked at
// the end with a second person.
{
  const { error } = await client
    .from('anonymous_sessions')
    .insert({ user_id: userId, legal_birth_name: 'Prueba', clinical_ideation_6m: 'no' });
  if (error) throw new Error(`could not seed the clinical answers: ${error.message}`);
}

// A friend to compare with (v1.2 C-01). Both need an account — a `clients`
// row — and the friendship is made the way the app makes it: one link, one
// acceptance.
const friend = createClient(API, ANON, { auth: { persistSession: false } });
const { data: friendAuth } = await friend.auth.signInAnonymously();
let FRIENDSHIP = null;
{
  const accounts = [
    [client, userId, 'Ana Maria Perez', '1990-04-12', '14:30'],
    [friend, friendAuth.session.user.id, 'Nico Rojas', '1988-09-03', '07:15'],
  ];
  for (const [who, id, name, date, time] of accounts) {
    const { error } = await who.from('clients').insert({
      user_id: id,
      email: `${id}@example.test`,
      legal_birth_name: name,
      birth_date: date,
      birth_time: time,
      birth_city: 'Santiago',
      birth_country: 'CL',
      clinical_ideation_6m: 'no',
    });
    if (error) throw new Error(`could not seed an account: ${error.message}`);
  }
  const { data: token } = await client.rpc('my_invite_token');
  const { data: id, error } = await friend.rpc('accept_friend_invite', { p_token: token });
  if (error) throw new Error(`could not make the friendship: ${error.message}`);
  FRIENDSHIP = id;
}

const call = (fn, body, headers = authed) =>
  fetch(`${API}/functions/v1/${fn}`, {
    method: 'POST',
    headers: { Origin: 'http://localhost:5173', ...headers },
    body: JSON.stringify(body),
  });

const SYNTHESIS = {
  detected_phase: 'exploracion',
  detected_mode: 'abierto',
  soul_map_synthesis: {
    tu_camino: 'Venís de un tiempo de mucho movimiento.',
    lo_que_estas_trabajando: 'Sostener algo sin necesitar que se resuelva ya.',
    que_necesitas_ahora: 'Un lugar donde bajar la velocidad.',
  },
  tips: [
    { title: 'Una pausa', body: 'Cortar el día por la mitad.', invitation: '¿Probás mañana?', cadence: 'daily' },
    { title: 'Escribir', body: 'Tres líneas, sin releer.', invitation: '¿Qué aparece?', cadence: 'weekly' },
    { title: 'Caminar', body: 'Veinte minutos sin destino.', invitation: '¿Cuándo te queda cómodo?', cadence: 'weekly' },
  ],
  follow_up_invitation: '¿Querés mirar alguna de estas de cerca?',
  inferred_topics: ['ansiedad', 'transicion'],
};

const DRAFT = {
  legal_birth_name: 'Ana Maria Perez',
  birth_date: '1990-04-12',
  birth_time: '14:30',
  birth_city: 'Santiago',
  country: 'CL',
  presenting_need_text: 'Siento que estoy en una transición y no encuentro dónde apoyarme.',
  presenting_need_slugs: [],
  openness_to_modalities: [],
  natal_chart: null,
};

// Real slugs, read from the same seed the functions read.
const MODALITIES = JSON.parse(readFileSync('data/modalities.json', 'utf8'))
  .modalities.filter((m) => m.is_active)
  .slice(0, 3)
  .map((m) => m.slug);

const BODIES = {
  'soul-map': { draft: DRAFT, numerology: null },
  match: {
    synthesis: SYNTHESIS,
    presentingNeedText: DRAFT.presenting_need_text,
    candidateSlugs: MODALITIES,
    strategy: 'topical',
    excludedForVulnerability: [],
    excludedForDismissal: [],
    droppedForSize: 0,
    poolBeforeTruncation: MODALITIES.length,
  },
  meditation: { intent: 'quiero bajar la ansiedad antes de dormir', minutes: 8, synthesis: SYNTHESIS, risk: 'none' },
  routine: { synthesis: SYNTHESIS, modalitySlugs: MODALITIES, reasons: { [MODALITIES[0]]: 'Mencionas que el cuerpo no afloja; aquí se trabaja desde la sensación física.' } },
  comparison: { friendship_id: FRIENDSHIP },
};

// ── the JWT is the control, on every one of them ────────────────────────────
for (const fn of Object.keys(BODIES)) {
  const anon = await call(fn, BODIES[fn], { 'Content-Type': 'application/json' });
  check(`${fn}: no bearer token is refused`, anon.status === 401, `status=${anon.status}`);
}

// ── a valid turn reaches the model gate ─────────────────────────────────────
//
// Three states, not two. A dummy key is the useful middle one: it makes every
// gate behind the key check reachable — the spend ceilings below, and the
// synastry enrichment — without spending anything at Anthropic, because the
// call fails at authentication rather than at billing.
//
//   503 no_model     no key. Nothing behind the gate can be exercised.
//   502 api_error    a key that Anthropic refused. Everything up to the call
//                    ran; the answer itself is still unverified.
//   200              a real key. The contract is checked.
let keyed = false;
let real = false;
for (const fn of Object.keys(BODIES)) {
  const response = await call(fn, BODIES[fn]);
  const body = await response.json();
  if (response.status === 503) {
    check(`${fn}: a valid request reaches the model gate`, body.error === 'no_model', `error=${body.error}`);
  } else if (response.status === 502 && body.kind === 'api_error') {
    keyed = true;
    check(`${fn}: a valid request reaches the model itself`, true, 'key refused upstream');
  } else {
    keyed = true;
    real = true;
    check(`${fn}: answers`, response.status === 200, `status=${response.status} ${JSON.stringify(body).slice(0, 90)}`);
    check(`${fn}: and bills what it spent`, Number.isInteger(body.input_tokens), `in=${body.input_tokens}`);
  }
}
if (!keyed) console.log('note  the model path is UNVERIFIED — serve with ANTHROPIC_API_KEY to cover it');
else if (!real) console.log('note  the key was refused upstream — the answer itself is still UNVERIFIED');

// ── safety runs in front of the model, and in front of the key check ────────
//
// Both surfaces where somebody writes in their own words. A `503 no_model`
// here would mean the scan sits behind the key, which is the reversal this
// block exists to catch.
const crisisSoulMap = await call('soul-map', {
  ...BODIES['soul-map'],
  draft: { ...DRAFT, presenting_need_text: 'hace semanas que me quiero morir' },
});
check(
  'soul-map: a crisis is refused before the key is checked',
  crisisSoulMap.status === 403 && (await crisisSoulMap.json()).error === 'refused_crisis',
  `status=${crisisSoulMap.status}`,
);

const crisisMeditation = await call('meditation', {
  ...BODIES.meditation,
  intent: 'hace semanas que me quiero morir',
});
check(
  'meditation: the same, on the intent',
  crisisMeditation.status === 403 && (await crisisMeditation.json()).error === 'refused_crisis',
  `status=${crisisMeditation.status}`,
);

const lowSeverity = await call('meditation', {
  ...BODIES.meditation,
  intent: 'estoy cansada de todo y no veo salida',
});
check(
  'meditation: a low-severity signal is not refused',
  lowSeverity.status !== 403,
  `status=${lowSeverity.status}`,
);

// ── a comparison is between friends, built on the server ───────────────────
//
// The browser sends a friendship id and nothing else (v1.2 C-01): the payload
// is built from both people's stored data, so there is no aspect list, birth
// date or chart a caller could slip in.
const notAnId = await call('comparison', { friendship_id: 'not-a-friendship' });
check('comparison: a body that is not a friendship id is refused', notAnId.status === 400, `status=${notAnId.status}`);

const stranger = await call('comparison', { friendship_id: crypto.randomUUID() });
const strangerBody = await stranger.json();
check(
  'comparison: a friendship the caller is not in is refused before anything is spent',
  stranger.status === 403 && strangerBody.reason === 'not_friends',
  `status=${stranger.status} ${JSON.stringify(strangerBody)}`,
);

if (real) {
  const { data: shared } = await friend.from('chart_comparisons').select('id').eq('friendship_id', FRIENDSHIP);
  check('comparison: the friend can read the comparison the other one asked for', (shared ?? []).length === 1, `${(shared ?? []).length} rows`);
}

// ── the catalogue is the server's ───────────────────────────────────────────
const invented = await call('match', { ...BODIES.match, candidateSlugs: ['terapia-inventada'] });
check(
  'match: a modality that does not exist is refused, not described',
  invented.status === 400,
  `status=${invented.status}`,
);

// ── the spend ceilings ──────────────────────────────────────────────────────
//
// Only reachable when the deployment has a key: the gate sits behind the model
// check, so that a keyless deployment does not run two queries to say
// `no_model`. Serve with a dummy ANTHROPIC_API_KEY to exercise it — the
// refusal happens before anything is sent to Anthropic, so the key never has
// to be real.
if (keyed) {
  const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SERVICE) {
    console.log('note  spend ceilings UNVERIFIED — set SUPABASE_SERVICE_ROLE_KEY to cover them');
  } else {
    const elevated = createClient(API, SERVICE, { auth: { persistSession: false } });
    // Written with the service role because that is who writes the ledger. A
    // person cannot insert here, which is the point of counting from it.
    const rows = Array.from({ length: 10 }, () => ({
      user_id: userId,
      purpose: 'soul_map',
      prompt_version: 'v1',
      model: 'claude-opus-5-5',
      mode: 'server',
      outcome: 'ok',
      input_tokens: 3000,
      output_tokens: 1200,
      cache_write_tokens: 1900,
      cache_read_tokens: 0,
    }));
    const { error: seedError } = await elevated.from('claude_api_calls').insert(rows);
    check('the ledger accepts the elevated write', !seedError, seedError?.message ?? '');

    const capped = await call('soul-map', BODIES['soul-map']);
    const cappedBody = await capped.json();
    check(
      'soul-map: a person at their ceiling is refused before the model is called',
      capped.status === 429 && cappedBody.scope === 'person',
      `status=${capped.status} scope=${cappedBody.scope}`,
    );

    // A different purpose is unaffected: the ceilings are per purpose, so one
    // exhausted surface must not close the others.
    const other = await call('meditation', BODIES.meditation);
    check(
      'meditation: another purpose is untouched by it',
      other.status !== 429,
      `status=${other.status}`,
    );
  }
}

// ── the ledger ──────────────────────────────────────────────────────────────
const { data: logged } = await client
  .from('claude_api_calls')
  .select('purpose,outcome')
  .eq('user_id', userId);
const refusals = (logged ?? []).filter((r) => r.outcome === 'refused_crisis').map((r) => r.purpose).sort();
// Seeded rows are 'ok', so they do not appear here.
check(
  'both crisis refusals are recorded, under their own purpose',
  refusals.join(',') === 'meditation,soul_map',
  refusals.join(',') || '(none)',
);

// ── rule 6 of PDR 8.5: the comparison is refused, before anything is spent ──
//
// Two people: one who answered «frecuentes», one who never answered at all.
// Both must be refused from what the server holds, whatever the request says,
// and ahead of the key check, so a keyless deployment refuses them too.
for (const [label, ideation] of [
  ['somebody clinically vulnerable', 'frecuentes'],
  ['somebody who has not answered yet', null],
]) {
  const other = createClient(API, ANON, { auth: { persistSession: false } });
  const { data: otherAuth } = await other.auth.signInAnonymously();
  if (ideation) {
    await other
      .from('anonymous_sessions')
      .insert({ user_id: otherAuth.session.user.id, legal_birth_name: 'Prueba', clinical_ideation_6m: ideation });
  }
  const refused = await call('comparison', BODIES.comparison, {
    Authorization: `Bearer ${otherAuth.session.access_token}`,
    'Content-Type': 'application/json',
  });
  const refusedBody = await refused.json();
  check(
    `comparison: ${label} is refused (rule 6)`,
    refused.status === 403 && refusedBody.reason === 'clinically_vulnerable',
    `status=${refused.status} ${JSON.stringify(refusedBody)}`,
  );
}

// ── the routine names only the therapies it was sent (v1.2 R-01) ───────────
const unknownTherapy = await call('routine', { synthesis: SYNTHESIS, modalitySlugs: ['no-existe'] });
check('routine: a therapy that is not in the catalogue is refused', unknownTherapy.status === 400, `status=${unknownTherapy.status}`);
const strayReason = await call('routine', { synthesis: SYNTHESIS, modalitySlugs: MODALITIES, reasons: { 'no-enviada': 'Un porqué suelto.' } });
check('routine: a reason for a therapy that was not sent is refused', strayReason.status === 400, `status=${strayReason.status}`);

// ── the plan's quotas (v1.2 F-01) ───────────────────────────────────────────
//
// Two fresh people, so nothing above shifts. Checked before the key, so this
// runs without a model too.
if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
  const elevated = createClient(API, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  const fresh = async () => {
    const someone = createClient(API, ANON, { auth: { persistSession: false } });
    const { data } = await someone.auth.signInAnonymously();
    return {
      id: data.session.user.id,
      headers: { Authorization: `Bearer ${data.session.access_token}`, 'Content-Type': 'application/json' },
    };
  };

  const free = await fresh();
  await elevated.from('claude_api_calls').insert({
    user_id: free.id, purpose: 'meditation', prompt_version: 'verify', model: 'verify', mode: 'server', outcome: 'ok',
  });
  const usedUp = await call('meditation', BODIES.meditation, free.headers);
  const usedUpBody = await usedUp.json();
  check(
    'meditation: a free person who used their one is asked to upgrade, not served',
    usedUp.status === 402 && usedUpBody.error === 'quota_exhausted' && usedUpBody.feature === 'meditation',
    `status=${usedUp.status} error=${usedUpBody.error}`,
  );

  const premium = await fresh();
  await elevated.from('subscriptions').upsert({ user_id: premium.id, status: 'active', activated_at: new Date().toISOString() });
  await elevated.from('claude_api_calls').insert(
    Array.from({ length: 4 }, () => ({
      user_id: premium.id, purpose: 'chat', prompt_version: 'verify', model: 'claude-sonnet-5-5',
      mode: 'server', outcome: 'ok', charged: true, output_tokens: 100_000,
    })),
  );
  const atCap = await call('meditation', BODIES.meditation, premium.headers);
  const atCapBody = await atCap.json();
  check(
    'meditation: premium at its monthly cap is told when it renews',
    atCap.status === 429 && atCapBody.scope === 'cap' && /^\d{4}-\d{2}-01$/.test(atCapBody.renews_on ?? ''),
    `status=${atCap.status} scope=${atCapBody.scope} renews_on=${atCapBody.renews_on}`,
  );

  // ── the memory (v1.2 M-01) ─────────────────────────────────────────────
  // Premium and consent are read on the server's side, the text is read
  // from the person's own record, and a crisis never reaches the model.
  const person = async ({ premium: isPremium, consent }) => {
    const someone = createClient(API, ANON, { auth: { persistSession: false } });
    const { data } = await someone.auth.signInAnonymously();
    const id = data.session.user.id;
    if (isPremium) {
      await elevated.from('subscriptions').upsert({ user_id: id, status: 'active', activated_at: new Date().toISOString() });
    }
    if (consent) await someone.from('preferences').upsert({ user_id: id, memory_consent_at: new Date().toISOString() });
    const entry = async (body) => {
      const { data: row, error } = await someone
        .from('journal_entries')
        .insert({ user_id: id, entry_date: '2026-10-16', body })
        .select('id')
        .single();
      if (error) throw new Error(`could not write a journal entry: ${error.message}`);
      return row.id;
    };
    return {
      id,
      client: someone,
      entry,
      headers: { Authorization: `Bearer ${data.session.access_token}`, 'Content-Type': 'application/json' },
    };
  };
  const ENTRY = 'Hoy caminé veinte minutos antes del trabajo y llegué más tranquila.';

  {
    const freeOne = await person({ premium: false, consent: true });
    const r = await call('memory', { source: 'journal', id: await freeOne.entry(ENTRY) }, freeOne.headers);
    const b = await r.json();
    check('memory: free keeps it paused', r.status === 403 && b.reason === 'memory_paused', `status=${r.status} reason=${b.reason}`);
  }
  {
    const noConsent = await person({ premium: true, consent: false });
    const r = await call('memory', { source: 'journal', id: await noConsent.entry(ENTRY) }, noConsent.headers);
    const b = await r.json();
    check('memory: premium without consent keeps it paused', r.status === 403 && b.reason === 'memory_paused', `status=${r.status} reason=${b.reason}`);
  }
  {
    const active = await person({ premium: true, consent: true });
    const crisisId = await active.entry('no sirve de nada, quiero morirme');
    const r = await call('memory', { source: 'journal', id: crisisId }, active.headers);
    const b = await r.json();
    const { data: row } = await active.client.from('journal_entries').select('memory_processed_at').eq('id', crisisId).single();
    check(
      'memory: an entry the browser did not flag is scanned again, refused and never offered again',
      r.status === 403 && b.reason === 'crisis' && Boolean(row?.memory_processed_at),
      `status=${r.status} reason=${b.reason} read=${Boolean(row?.memory_processed_at)}`,
    );

    const missing = await call('memory', { source: 'journal', id: crypto.randomUUID() }, active.headers);
    check('memory: an entry that is not theirs does not exist for them', missing.status === 403 && (await missing.json()).reason === 'not_found', `status=${missing.status}`);

    const someoneElse = await person({ premium: false, consent: false });
    const theirs = await call('memory', { source: 'journal', id: await someoneElse.entry(ENTRY) }, active.headers);
    check("memory: nobody learns from somebody else's journal", theirs.status === 403 && (await theirs.json()).reason === 'not_found', `status=${theirs.status}`);

    const bad = await call('memory', { source: 'diario', id: crisisId }, active.headers);
    check('memory: only the three sources', bad.status === 400, `status=${bad.status}`);

    const fine = await call('memory', { source: 'journal', id: await active.entry(ENTRY) }, active.headers);
    check(
      'memory: premium with consent reaches the model',
      fine.status === 503 || fine.status === 200,
      `status=${fine.status}${fine.status === 503 ? ' (no model here)' : ''}`,
    );
  }

  // ── the routine's review (v1.2 R-04) ───────────────────────────────────
  // Whether a review is due is the server's decision, from the rows.
  {
    const withRoutine = async ({ premium: isPremium, ageDays, pending = false }) => {
      const p = await person({ premium: isPremium, consent: false });
      const at = new Date(Date.now() - ageDays * 24 * 60 * 60 * 1000).toISOString();
      const { data: syn, error: synErr } = await p.client.from('soul_map_syntheses').insert({
        user_id: p.id, synthesis: SYNTHESIS, trigger: 'onboarding', mode: 'server', prompt_version: 'verify', latency_ms: 1, is_current: true,
      }).select('id').single();
      if (synErr) throw new Error(`could not seed a synthesis: ${synErr.message}`);
      const { data: match, error: matchErr } = await p.client.from('modality_matches').insert({
        user_id: p.id, synthesis_id: syn.id, result: { matched_modalities: [] }, strategy: 'topical', prompt_version: 'verify', used_fallback: false, is_current: true,
      }).select('id').single();
      if (matchErr) throw new Error(`could not seed a match: ${matchErr.message}`);
      const { error: practiceErr } = await p.client.from('routine_practices').insert(
        ['Caminar', 'Respirar', 'Escribir'].map((title) => ({
          user_id: p.id, match_id: match.id, title, body: 'Diez minutos.', invitation: '¿Cuándo?', cadence: 'weekly', connects_soul_map: true, created_at: at,
        })),
      );
      if (practiceErr) throw new Error(`could not seed a routine: ${practiceErr.message}`);
      if (pending) {
        await elevated.from('routine_change_proposals').insert({ user_id: p.id, match_id: match.id, trigger: 'weekly', proposal: {}, prompt_version: 'verify', created_at: at });
      }
      return p;
    };

    const nobody = await person({ premium: true, consent: false });
    const none = await call('routine-review', {}, nobody.headers);
    check('routine-review: no routine, nothing to review', none.status === 403 && (await none.json()).reason === 'no_routine', `status=${none.status}`);

    const weekOld = await withRoutine({ premium: true, ageDays: 8 });
    const due = await call('routine-review', {}, weekOld.headers);
    check('routine-review: premium, a week on, is reviewed', due.status === 503 || due.status === 200, `status=${due.status}${due.status === 503 ? ' (no model here)' : ''}`);

    const freeWeek = await withRoutine({ premium: false, ageDays: 8 });
    const notYet = await call('routine-review', {}, freeWeek.headers);
    check('routine-review: free waits two months', notYet.status === 403 && (await notYet.json()).reason === 'not_due', `status=${notYet.status}`);

    const waiting = await withRoutine({ premium: true, ageDays: 8, pending: true });
    const held = await call('routine-review', {}, waiting.headers);
    check('routine-review: never while a proposal waits for an answer', held.status === 403 && (await held.json()).reason === 'not_due', `status=${held.status}`);
  }
}

// ── PayPal's notifications (v1.2 P-01) ─────────────────────────────────────
//
// Open to the internet by design (PayPal has no JWT), so the one thing that
// must hold is that a notification PayPal did not sign changes nothing.
{
  const forged = await fetch(`${API}/functions/v1/paypal-webhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'paypal-transmission-sig': 'inventada' },
    body: JSON.stringify({
      id: `WH-${crypto.randomUUID()}`,
      event_type: 'BILLING.SUBSCRIPTION.ACTIVATED',
      resource: { id: 'I-FORGED', plan_id: 'P-6UF36541AB665994MNLIP4SQ', custom_id: userId },
    }),
  });
  const { data: mine } = await client.from('subscriptions').select('status').eq('user_id', userId).maybeSingle();
  check(
    'paypal-webhook: a notification PayPal did not sign makes nobody premium',
    forged.status !== 200 && mine?.status !== 'active',
    `status=${forged.status} subscription=${mine?.status ?? 'none'}`,
  );
  const wrongVerb = await fetch(`${API}/functions/v1/paypal-webhook`, { method: 'GET' });
  check('paypal-webhook: only POST', wrongVerb.status === 405, `status=${wrongVerb.status}`);
}

// ── Rebill's notifications (sandbox trial, owner, 22 Oct 2026) ─────────────
//
// The same rule: a notification Rebill did not sign changes nothing, whether
// or not the function has its secrets here.
{
  const forged = await fetch(`${API}/functions/v1/rebill-webhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-rebill-signature': 'ab'.repeat(32) },
    body: JSON.stringify({
      data: { payment: { status: 'approved', amount: 0 }, paymentLinkId: 'pl_forged', subscriptionId: 'sub_forged' },
      webhook: { event: 'payment.created', logId: `we_log_${crypto.randomUUID()}` },
    }),
  });
  const { data: mine } = await client.from('subscriptions').select('status').eq('user_id', userId).maybeSingle();
  check(
    'rebill-webhook: a notification Rebill did not sign makes nobody premium',
    forged.status !== 200 && mine?.status !== 'active',
    `status=${forged.status} subscription=${mine?.status ?? 'none'}`,
  );
  const wrongVerb = await fetch(`${API}/functions/v1/rebill-webhook`, { method: 'GET' });
  check('rebill-webhook: only POST', wrongVerb.status === 405, `status=${wrongVerb.status}`);
  const anonymous = await fetch(`${API}/functions/v1/rebill-checkout`, { method: 'POST' });
  check('rebill-checkout: nobody without a session', anonymous.status === 401, `status=${anonymous.status}`);
}

// ── the chart by whole sign, rebuilt from what is stored (v1.2 A-01) ───────
//
// No provider call: the positions are in the stored text, so this runs here
// without RAPIDAPI_KEY.
{
  const nothing = await call('natal-chart', { rebuild: true });
  check('natal-chart: nothing stored, nothing to rebuild', nothing.status === 404, `status=${nothing.status}`);

  const CONTEXT = `<chart_analysis><planets>
<point name="Sun" position="13.50" sign="Gemini" abs_pos="73.50" house="Tenth House" motion="direct" />
<point name="Mercury" position="28.00" sign="Taurus" abs_pos="58.00" house="Ninth House" motion="retrograde" />
</planets><axes>
<point name="Ascendant" position="20.00" sign="Virgo" abs_pos="170.00" house="First House" motion="direct" />
</axes></chart_analysis>`;
  await client
    .from('clients')
    .update({ natal_chart: { provider: 'astrologer', api_version: 'v6', context: CONTEXT, calculated_at: 1, parse_status: 'parsed' } })
    .eq('user_id', userId);
  const rebuilt = await call('natal-chart', { rebuild: true });
  check('natal-chart: a stored chart is rebuilt', rebuilt.status === 200, `status=${rebuilt.status}`);

  const { data: stored } = await client.from('natal_charts').select('house_system, chart').eq('user_id', userId).maybeSingle();
  const sun = stored?.chart?.points?.find((p) => p.name === 'Sun');
  check(
    'natal-chart: houses by whole sign, the ruler of the Ascendant and the sect, calculated',
    stored?.house_system === 'whole_sign' && sun?.house === 10 && stored?.chart?.ascendant_ruler?.planet === 'Mercury' && stored?.chart?.sect?.kind === 'diurna' && Array.isArray(stored?.chart?.aspects),
    JSON.stringify({ house: sun?.house, ruler: stored?.chart?.ascendant_ruler, sect: stored?.chart?.sect }),
  );

  // The same chart keeps its calculation stamp: the readings of the full
  // chart are written for it (package 05).
  const { data: first } = await client.from('natal_charts').select('calculated_at').eq('user_id', userId).maybeSingle();
  await call('natal-chart', { rebuild: true });
  const { data: again } = await client.from('natal_charts').select('calculated_at').eq('user_id', userId).maybeSingle();
  check(
    'natal-chart: a rebuild that changes nothing keeps calculated_at',
    Boolean(first?.calculated_at) && first?.calculated_at === again?.calculated_at,
    `${first?.calculated_at} → ${again?.calculated_at}`,
  );
}

// ── Davraz's readings of the full chart (package 05) ───────────────────────
//
// The browser sends nothing: the function reads the person's stored chart.
// Once per chart: readings written for the current calculation are kept and
// nothing is spent, which is decided before the key check.
{
  const anon = await call('chart-points', {}, { 'Content-Type': 'application/json' });
  check('chart-points: no bearer token is refused', anon.status === 401, `status=${anon.status}`);

  const someone = createClient(API, ANON, { auth: { persistSession: false } });
  const { data: someoneAuth } = await someone.auth.signInAnonymously();
  const noChart = await call('chart-points', {}, {
    Authorization: `Bearer ${someoneAuth.session.access_token}`,
    'Content-Type': 'application/json',
  });
  const noChartBody = await noChart.json();
  check(
    'chart-points: no chart, nothing to read and nothing spent',
    noChart.status === 403 && noChartBody.reason === 'no_chart',
    `status=${noChart.status} ${JSON.stringify(noChartBody)}`,
  );

  // `client` has the chart rebuilt above.
  const { data: chartRow } = await client.from('natal_charts').select('calculated_at').eq('user_id', userId).maybeSingle();
  const asked = await call('chart-points', {});
  const askedBody = await asked.json();
  if (asked.status === 200) {
    const { data: kept } = await client.from('chart_point_readings').select('chart_calculated_at, readings').eq('user_id', userId).maybeSingle();
    check(
      'chart-points: answers, and keeps the readings for this calculation',
      Boolean(kept) && Date.parse(kept.chart_calculated_at) === Date.parse(chartRow.calculated_at) && kept.readings.length === askedBody.points,
      `points=${askedBody.points} kept=${kept?.readings?.length}`,
    );
  } else {
    check(
      'chart-points: a person with a chart reaches the model gate',
      (asked.status === 503 && askedBody.error === 'no_model') || (asked.status === 502 && askedBody.kind === 'api_error'),
      `status=${asked.status} ${JSON.stringify(askedBody)}`,
    );
  }

  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const elevated = createClient(API, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
    const READINGS = [{ point: 'Sun', text: 'Tu Sol en Géminis sugiere curiosidad.' }];
    await elevated.from('chart_point_readings').upsert({
      user_id: userId, chart_calculated_at: chartRow.calculated_at, prompt_version: 'verify', readings: READINGS,
    });
    const again = await call('chart-points', {});
    const againBody = await again.json();
    check(
      'chart-points: readings for the current chart are kept, and nothing is spent',
      again.status === 403 && againBody.reason === 'current',
      `status=${again.status} ${JSON.stringify(againBody)}`,
    );
    const { data: mine } = await client.from('chart_point_readings').select('prompt_version').eq('user_id', userId).maybeSingle();
    check('chart-points: the person reads their own readings', mine?.prompt_version === 'verify', JSON.stringify(mine));
    const { data: theirs } = await someone.from('chart_point_readings').select('user_id');
    check("chart-points: nobody reads somebody else's", (theirs ?? []).length === 0, `${(theirs ?? []).length} rows`);

    await elevated.from('chart_point_readings').update({ chart_calculated_at: '2026-01-01T00:00:00Z' }).eq('user_id', userId);
    const stale = await call('chart-points', {});
    check(
      'chart-points: readings for an older calculation are written again',
      stale.status !== 403,
      `status=${stale.status}`,
    );
  }
}

const failed = results.filter((r) => !r.pass);
console.log(`\n${results.length - failed.length}/${results.length} passed`);
process.exit(failed.length === 0 ? 0 : 1);
