import { execFileSync } from 'node:child_process';
import { createClient } from '@supabase/supabase-js';
import { afterAll, describe, expect, it, vi } from 'vitest';
import crisisSeed from '@data/crisis-resources.json';
import modalitySeed from '@data/modalities.json';
import topicSeed from '@data/topics.json';
import bedTrackSeed from '@data/bed-tracks.json';
import type { TypedClient } from '@/supabase/client.ts';
import type { Database } from '@/supabase/database.types.ts';
import { ADAPTERS } from './remote.ts';
import type { StoredMeditation } from './meditations.ts';
import { emptyDraft, type AnonymousSession } from './session.ts';
import type { Client } from './account.ts';

/**
 * The adapters, against a real Postgres.
 *
 * `hydrate.test.ts` records adapter calls and `rls.test.sql` reads rows as a
 * hostile stranger; neither ever wrote the same table twice through the code
 * the application ships. The defects below lived exactly there, and every
 * other test passed over them.
 *
 * Needs a local stack: `supabase start`, then `pnpm test:db`, which also
 * serves the functions. Skipped when the
 * variables are absent, so `pnpm test` and CI are unchanged.
 */

const URL = process.env['SUPABASE_TEST_URL'];
const ANON = process.env['SUPABASE_TEST_ANON_KEY'];
const SERVICE = process.env['SUPABASE_TEST_SERVICE_KEY'];
const DB_CONTAINER = process.env['SUPABASE_TEST_DB_CONTAINER'];
const configured = Boolean(URL && ANON && SERVICE && DB_CONTAINER);

const OWNED_TABLES = [
  'anonymous_sessions',
  'clients',
  'preferences',
  'subscriptions',
  'soul_map_syntheses',
  'modality_matches',
  'match_reactions',
  'recommendation_checkins',
  'conversations',
  'messages',
  'meditations',
  'chart_comparisons',
  'crisis_events',
  'natal_chart_calls',
  'client_errors',
] as const satisfies ReadonlyArray<keyof Database['public']['Tables']>;

type Person = { client: TypedClient; userId: string };

async function signIn(): Promise<Person> {
  const client = createClient<Database>(URL!, ANON!, { auth: { persistSession: false } });
  const { data, error } = await client.auth.signInAnonymously();
  if (error || !data.user) throw new Error(`sign-in: ${error?.message}`);
  return { client, userId: data.user.id };
}

/** Auth administration only: the service role is granted almost no table. */
function admin() {
  return createClient<Database>(URL!, SERVICE!, { auth: { persistSession: false } });
}

/** A query as the database owner, past every policy and grant. */
function asOwner(sql: string): string {
  return execFileSync(
    'docker',
    ['exec', DB_CONTAINER!, 'psql', '-U', 'postgres', '-tAF', ',', '-c', sql],
    { encoding: 'utf8' },
  ).trim();
}

/**
 * Counted as the database owner, so a row a policy hides from its owner
 * still counts as left behind.
 */
function rowsOwnedBy(userId: string): Record<string, number> {
  const out = asOwner(
    OWNED_TABLES.map(
      (t) => `select '${t}', count(*) from public.${t} where user_id = '${userId}'`,
    ).join(' union all '),
  );
  const counts: Record<string, number> = {};
  for (const line of out.split('\n')) {
    const [table, count] = line.split(',');
    if (table && Number(count) > 0) counts[table] = Number(count);
  }
  return counts;
}

/** Rows as JSON, in a stable order, with only the columns the seed carries. */
function tableAsJson(table: string, columns: string[], orderBy: string): unknown[] {
  const out = asOwner(
    `select coalesce(json_agg(r order by ${orderBy}), '[]') from (select ${columns.join(', ')} from public.${table}) r`,
  );
  return JSON.parse(out) as unknown[];
}

function pick<T extends Record<string, unknown>>(rows: T[], columns: string[]): unknown[] {
  return rows.map((r) => Object.fromEntries(columns.map((c) => [c, r[c] ?? null])));
}

/**
 * The functions' own quota and ledger code, run from Node. Loaded by a
 * computed path so `tsc` does not follow it into `jsr:` imports it cannot
 * resolve — the Edge runtime checks those, and `pnpm test:db` exercises them.
 */
async function edgeShared(): Promise<{
  currentQuota: (client: unknown, userId: string) => Promise<{ used: number }>;
  logCall: (client: unknown, record: Record<string, unknown>) => Promise<void>;
  overDeploymentBudget: (client: unknown) => Promise<boolean>;
  overSubscribedLimit: (client: unknown, userId: string) => Promise<boolean>;
  reserveChatTurn: (
    client: unknown,
    userId: string,
    subscribed: boolean,
    promptVersion: string,
    model: string,
  ) => Promise<string | null>;
  reserveModelCall: (
    client: unknown,
    userId: string,
    purpose: string,
    promptVersion: string,
    model: string,
  ) => Promise<string | null>;
}> {
  const base = '../../supabase/functions/_shared';
  const [quota, log, spend] = await Promise.all([
    import(/* @vite-ignore */ `${base}/quota.ts`),
    import(/* @vite-ignore */ `${base}/log.ts`),
    import(/* @vite-ignore */ `${base}/spend.ts`),
  ]);
  return {
    currentQuota: quota.currentQuota,
    logCall: log.logCall,
    overDeploymentBudget: spend.overDeploymentBudget,
    overSubscribedLimit: quota.overSubscribedLimit,
    reserveChatTurn: quota.reserveChatTurn,
    reserveModelCall: spend.reserveModelCall,
  };
}

const NOW = Date.now();

function meditation(): StoredMeditation {
  return {
    id: crypto.randomUUID(),
    intent: 'respirar',
    requested_minutes: 5,
    estimated_minutes: 5,
    script: {} as StoredMeditation['script'],
    prompt_version: 'test',
    mode: 'fixture',
    created_at: NOW,
  };
}

describe.skipIf(!configured)('adapters against Postgres', () => {
  const people: Person[] = [];
  const person = async () => {
    const p = await signIn();
    people.push(p);
    return p;
  };

  afterAll(async () => {
    for (const p of people) await admin().auth.admin.deleteUser(p.userId);
  });

  it('a save from one tab does not delete rows another tab wrote', async () => {
    const { client, userId } = await person();
    const [a, b, c] = [meditation(), meditation(), meditation()];
    await ADAPTERS.meditations.save(client, userId, [a]);

    vi.resetModules();
    const other = (await import('./remote.ts')).ADAPTERS;
    await other.meditations.load(client, userId);
    await other.meditations.save(client, userId, [a, b]);

    await ADAPTERS.meditations.save(client, userId, [a, c]);
    await ADAPTERS.meditations.save(client, userId, [c]);

    const ids = (await ADAPTERS.meditations.load(client, userId)).map((m: StoredMeditation) => m.id).sort();
    expect(ids).toEqual([b.id, c.id].sort());
  });

  it('the account survives the anonymous session it claimed', async () => {
    const { client, userId } = await person();
    const session: AnonymousSession = {
      id: crypto.randomUUID(),
      created_at: NOW,
      expires_at: NOW + 3_600_000,
      step: 4,
      draft: emptyDraft(),
      soul_map_id: null,
      claimed_by: null,
    };
    await ADAPTERS.anonymous_session.save(client, userId, session);

    // signup() in account.ts, then claimSession: the client points at the
    // session, and the session expires on the spot.
    const account: Client = {
      id: crypto.randomUUID(),
      email: 'ana@example.com',
      created_at: NOW,
      profile: emptyDraft(),
      soul_map_id: null,
      claimed_session_id: session.id,
    };
    await ADAPTERS.client.save(client, userId, account);
    await ADAPTERS.anonymous_session.save(client, userId, { ...session, claimed_by: account.id, expires_at: NOW });

    // The next getSession() sees it expired and writes null, which deletes
    // the row; `on delete set null` clears the pointer in Postgres but not in
    // the mirror. Then a Soul Map is generated and attachSoulMapToClient
    // writes the account again, stale pointer and all.
    await ADAPTERS.anonymous_session.save(client, userId, null);
    await ADAPTERS.client.save(client, userId, { ...account, soul_map_id: crypto.randomUUID() });

    expect(rowsOwnedBy(userId)['clients']).toBe(1);
  });

  it('the fourth clinical answer round-trips on both profile tables (v1.2 O-06)', async () => {
    const { client, userId } = await person();
    const draft = emptyDraft();
    draft.clinical_basics = { ideation_6m: 'no', additional_notes: 'Trabajo de noche.' };

    await ADAPTERS.anonymous_session.save(client, userId, {
      id: crypto.randomUUID(),
      created_at: NOW,
      expires_at: NOW + 3_600_000,
      step: 4,
      draft,
      soul_map_id: null,
      claimed_by: null,
    });
    expect((await ADAPTERS.anonymous_session.load(client, userId))?.draft.clinical_basics).toEqual(
      draft.clinical_basics,
    );

    await ADAPTERS.client.save(client, userId, {
      id: crypto.randomUUID(),
      email: 'ana@example.com',
      created_at: NOW,
      profile: draft,
      soul_map_id: null,
      claimed_session_id: null,
    });
    expect((await ADAPTERS.client.load(client, userId))?.profile.clinical_basics).toEqual(draft.clinical_basics);
  });

  it('a person cannot make themselves premium (v1.2 P-01)', async () => {
    const { client, userId } = await person();
    const { error } = await client.from('subscriptions').upsert({ user_id: userId, status: 'active' });
    expect(error).not.toBeNull();

    const { data } = await admin().from('subscriptions').select('status').eq('user_id', userId).maybeSingle();
    expect(data?.status ?? 'none').toBe('none');
  });

  it('deleting the account leaves no row behind', async () => {
    const { client, userId } = await person();
    await ADAPTERS.preferences.save(client, userId, { locale: 'es', voice_volume: 1, bed_volume: 0.45 });
    // The person cannot write their own subscription (v1.2 P-01); the server can.
    await admin().from('subscriptions').insert({ user_id: userId, status: 'active' });
    await ADAPTERS.meditations.save(client, userId, [meditation()]);
    expect(Object.keys(rowsOwnedBy(userId)).length).toBeGreaterThan(0);

    // The call purgeRemote makes, against the function `supabase functions
    // serve` is running.
    const { data, error } = await client.functions.invoke('delete-account', { method: 'POST' });
    expect(error).toBeNull();
    expect(data).toEqual({ deleted: true });

    expect(rowsOwnedBy(userId)).toEqual({});
    const { data: user } = await admin().auth.admin.getUserById(userId);
    expect(user.user).toBeNull();
  });

  it('a simulated subscription is bounded, counting the free turns too', async () => {
    const { userId } = await person();
    const { logCall, overSubscribedLimit } = await edgeShared();
    const turn = { userId, purpose: 'chat', promptVersion: 'test', model: 'test', latencyMs: 0 };

    for (let i = 0; i < 8; i++) await logCall(admin(), { ...turn, mode: 'server', outcome: 'ok', charged: true });
    expect(await overSubscribedLimit(admin(), userId)).toBe(false);

    await logCall(admin(), { ...turn, mode: 'server', outcome: 'ok', charged: true });
    expect(await overSubscribedLimit(admin(), userId)).toBe(true);
  });

  it('parallel chat turns cannot spend more than the free questions', async () => {
    const { userId } = await person();
    const { reserveChatTurn } = await edgeShared();

    const reserved = await Promise.all(
      Array.from({ length: 10 }, () => reserveChatTurn(admin(), userId, false, 'test', 'test')),
    );

    expect(reserved.filter((id) => id !== null)).toHaveLength(3);
  });

  it('parallel generations cannot pass the per-purpose ceiling', async () => {
    const { userId } = await person();
    const { reserveModelCall } = await edgeShared();

    const reserved = await Promise.all(
      Array.from({ length: 15 }, () => reserveModelCall(admin(), userId, 'soul_map', 'test', 'test')),
    );

    expect(reserved.filter((id) => id !== null)).toHaveLength(10);
  });

  it('the chat quota cannot be given back by the person it limits', async () => {
    const { client, userId } = await person();
    const { currentQuota, logCall } = await edgeShared();

    // What the chat function records: two answered turns and one crisis turn,
    // which is never charged.
    const turn = { userId, purpose: 'chat' as const, promptVersion: 'test', model: 'test', latencyMs: 0 };
    await logCall(admin(), { ...turn, mode: 'server', outcome: 'ok', charged: true });
    await logCall(admin(), { ...turn, mode: 'server', outcome: 'ok', charged: true });
    await logCall(admin(), { ...turn, mode: 'fixture', outcome: 'refused_crisis' });

    const before = await currentQuota(admin(), userId);
    expect(before.used).toBe(2);

    // Everything the browser can reach, tried.
    await client.from('messages').delete().eq('user_id', userId);
    await client.from('claude_api_calls').delete().eq('user_id', userId);
    await client.from('claude_api_calls').update({ charged: false }).eq('user_id', userId);

    expect(await currentQuota(admin(), userId)).toEqual(before);
  });
});

describe.skipIf(!configured)('the clinical exclusion, server-side', () => {
  type Clinical = {
    callerIsClinicallyVulnerable: (caller: unknown, userId: string) => Promise<boolean>;
    withoutClinicalExclusions: (slugs: string[], vulnerable: boolean) => { kept: string[]; excluded: string[] };
  };
  const clinical = (): Promise<Clinical> =>
    import(/* @vite-ignore */ `${'../../supabase/functions/_shared'}/clinical.ts`) as Promise<Clinical>;

  async function withAnswers(
    ideation: string | null,
    options: { account?: string | null; crisis?: boolean } = {},
  ): Promise<Person> {
    const p = await signIn();
    const draft = emptyDraft();
    if (ideation) draft.clinical_basics = { ideation_6m: ideation as never };
    await ADAPTERS.anonymous_session.save(p.client, p.userId, {
      id: crypto.randomUUID(),
      created_at: NOW,
      expires_at: NOW + 3_600_000,
      step: 4,
      draft,
      soul_map_id: null,
      claimed_by: null,
    });
    if (options.account !== undefined) {
      const profile = emptyDraft();
      if (options.account) profile.clinical_basics = { ideation_6m: options.account as never };
      await ADAPTERS.client.save(p.client, p.userId, {
        id: crypto.randomUUID(),
        email: 'ana@example.com',
        created_at: NOW,
        profile,
        soul_map_id: null,
        claimed_session_id: null,
      });
    }
    if (options.crisis) {
      await ADAPTERS.crisis_events.save(p.client, p.userId, [
        {
          id: crypto.randomUUID(),
          severity: 'high',
          category: 'ideacion',
          layer: 'deterministic',
          matched: ['x'],
          excerpt: 'x',
          source_surface: 'chat',
          created_at: Date.now(),
          admin_notified_at: null,
          false_positive: null,
        },
      ]);
    }
    return p;
  }

  it('reads frequent ideation from the stored answers and excludes', async () => {
    const { callerIsClinicallyVulnerable, withoutClinicalExclusions } = await clinical();
    const p = await withAnswers('frecuentes');
    const vulnerable = await callerIsClinicallyVulnerable(p.client, p.userId);
    expect(vulnerable).toBe(true);
    expect(withoutClinicalExclusions(['emdr', 'tcc', 'constelaciones-familiares'], vulnerable)).toEqual({
      kept: ['tcc'],
      excluded: ['emdr', 'constelaciones-familiares'],
    });
  });

  it('leaves the pool alone for somebody who is not vulnerable', async () => {
    const { callerIsClinicallyVulnerable } = await clinical();
    const p = await withAnswers('no');
    expect(await callerIsClinicallyVulnerable(p.client, p.userId)).toBe(false);
  });

  it('reads the account before the session, as activeProfile does', async () => {
    const { callerIsClinicallyVulnerable } = await clinical();
    const p = await withAnswers('no', { account: 'plan_o_intencion' });
    expect(await callerIsClinicallyVulnerable(p.client, p.userId)).toBe(true);
  });

  it('counts a crisis in the last thirty days', async () => {
    const { callerIsClinicallyVulnerable } = await clinical();
    const p = await withAnswers('no', { crisis: true });
    expect(await callerIsClinicallyVulnerable(p.client, p.userId)).toBe(true);
  });

  it('fails closed when there are no answers to read', async () => {
    const { callerIsClinicallyVulnerable } = await clinical();
    const p = await signIn();
    expect(await callerIsClinicallyVulnerable(p.client, p.userId)).toBe(true);
  });

  it('O-06: fails closed for a map seen before «Para cuidarte» was answered', async () => {
    const { callerIsClinicallyVulnerable } = await clinical();
    const p = await withAnswers(null);
    expect(await callerIsClinicallyVulnerable(p.client, p.userId)).toBe(true);
  });

  it('O-06: an account that has not answered yet fails closed too', async () => {
    const { callerIsClinicallyVulnerable } = await clinical();
    const p = await withAnswers('no', { account: null });
    expect(await callerIsClinicallyVulnerable(p.client, p.userId)).toBe(true);
  });
});

describe.skipIf(!configured)('the deployment budget', () => {
  const MARK = 'spend-test';

  afterAll(() => {
    asOwner(`delete from public.claude_api_calls where prompt_version = '${MARK}'`);
  });

  it('counts past the thousand rows PostgREST returns', async () => {
    // 1,200 server calls at 1,000 output tokens each: $30.00. The first
    // thousand alone come to $25.00, so a $27 ceiling tells the two apart.
    asOwner(
      `insert into public.claude_api_calls (purpose, prompt_version, model, mode, outcome, output_tokens)
       select 'chat', '${MARK}', 'test', 'server', 'ok', 1000 from generate_series(1, 1200)`,
    );
    (globalThis as { Deno?: unknown }).Deno = {
      env: { get: (k: string) => (k === 'MONTHLY_BUDGET_USD' ? '27' : undefined) },
    };
    const { overDeploymentBudget } = await edgeShared();

    expect(await overDeploymentBudget(admin())).toBe(true);
  });

  it('and is not simply refusing: under the ceiling it answers false', async () => {
    (globalThis as { Deno?: unknown }).Deno = {
      env: { get: (k: string) => (k === 'MONTHLY_BUDGET_USD' ? '31' : undefined) },
    };
    const { overDeploymentBudget } = await edgeShared();

    expect(await overDeploymentBudget(admin())).toBe(false);
  });

  it('is not callable by a person', async () => {
    const { client } = await signIn();
    const { error } = await client.rpc('deployment_token_totals', { since: new Date(0).toISOString() });
    expect(error?.code).toBe('42501');
  });
});

/**
 * The reference tables against the JSON they were generated from.
 *
 * `data/*.json` is what the application and the functions read; the tables
 * are copies, and one of them — `modalities` — is what `match_reactions`
 * holds a foreign key into. A copy nothing compares is a copy that drifts:
 * the crisis resources had lost their verification date and could be seeded
 * twice before this existed.
 */
describe.skipIf(!configured)('reference data matches data/*.json', () => {
  const byKey = (key: string) => (a: Record<string, unknown>, b: Record<string, unknown>) =>
    String(a[key]).localeCompare(String(b[key]));

  it('crisis resources', () => {
    const columns = ['country', 'type', 'name', 'contact', 'note', 'priority', 'is_active', 'verified_at'];
    const db = tableAsJson(
      'crisis_resources',
      columns.map((c) => (c === 'verified_at' ? 'verified_at::date::text as verified_at' : c)),
      'country, priority',
    );
    const seed = [...crisisSeed.resources].sort(
      (a, b) => a.country.localeCompare(b.country) || a.priority - b.priority,
    );
    expect(db).toEqual(pick(seed, columns));
  });

  it('modalities', () => {
    const columns = Object.keys(modalitySeed.modalities[0]!);
    const db = tableAsJson('modalities', columns, 'slug');
    const seed = [...modalitySeed.modalities].sort(byKey('slug'));
    expect(db).toEqual(pick(seed, columns));
  });

  it('topics', () => {
    const columns = ['slug', 'name_es', 'name_en'];
    const seed = [...topicSeed.topics].sort(byKey('slug'));
    expect(tableAsJson('topics', columns, 'slug')).toEqual(pick(seed, columns));
  });

  it('bed tracks', () => {
    const columns = ['id', 'name', 'frequency_hz', 'suits', 'synthesis', 'is_active'];
    const seed = [...bedTrackSeed.tracks].sort(byKey('id'));
    expect(tableAsJson('bed_tracks', columns, 'id')).toEqual(pick(seed, columns));
  });
});

describe.skipIf(!configured)('friends (v1.2 C-01)', () => {
  it('a link makes two people friends, both see it, and either can end it', async () => {
    const alice = await signIn();
    const bob = await signIn();
    // An account is a `clients` row; an anonymous session alone cannot invite.
    for (const [person, name] of [[alice, 'Alice Soto'], [bob, 'Bob Rojas']] as const) {
      const { error } = await person.client
        .from('clients')
        .insert({ user_id: person.userId, email: `${name.split(' ')[0]}@example.test`, legal_birth_name: name });
      expect(error).toBeNull();
    }

    const { data: token, error: tokenError } = await alice.client.rpc('my_invite_token');
    expect(tokenError).toBeNull();
    expect(typeof token).toBe('string');

    const { data: preview } = await bob.client.rpc('invite_preview', { p_token: token! });
    expect(preview?.[0]).toMatchObject({ inviter_first_name: 'Alice', valid: true, already_friends: false });

    const { error: acceptError } = await bob.client.rpc('accept_friend_invite', { p_token: token! });
    expect(acceptError).toBeNull();

    const { data: aliceFriends } = await alice.client.rpc('my_friends');
    const { data: bobFriends } = await bob.client.rpc('my_friends');
    expect(aliceFriends?.map((f) => f.first_name)).toEqual(['Bob']);
    expect(bobFriends?.map((f) => f.first_name)).toEqual(['Alice']);

    const { error: endError } = await alice.client.rpc('end_friendship', {
      p_friendship: aliceFriends![0]!.friendship_id,
    });
    expect(endError).toBeNull();
    const { data: afterEnd } = await bob.client.rpc('my_friends');
    expect(afterEnd).toEqual([]);

    await admin().auth.admin.deleteUser(alice.userId);
    await admin().auth.admin.deleteUser(bob.userId);
    expect(asOwner(`select count(*) from public.friendships where '${bob.userId}' in (requester_id, addressee_id)`)).toBe('0');
  });
});

describe.skipIf(!configured)('the schema', () => {
  it('refuses a new row in the removed pasted-key mode', async () => {
    const { client, userId } = await signIn();
    const { error } = await client.from('meditations').insert({
      user_id: userId,
      intent: 'test',
      requested_minutes: 5,
      estimated_minutes: 5,
      script: {},
      prompt_version: 'test',
      mode: 'byok',
    });
    expect(error?.code).toBe('23514');
    await admin().auth.admin.deleteUser(userId);
  });

  it('indexes every foreign key', () => {
    // A cascade scans the child table for the parent's key. Without an index
    // leading on that column, deleting one account is a sequential scan per
    // table, inside the transaction delete-account depends on.
    const unindexed = asOwner(`
      select c.conrelid::regclass || '.' || a.attname
      from pg_constraint c
      join pg_attribute a on a.attrelid = c.conrelid and a.attnum = c.conkey[1]
      where c.contype = 'f'
        and c.connamespace = 'public'::regnamespace
        and array_length(c.conkey, 1) = 1
        and not exists (
          select 1 from pg_index i
          where i.indrelid = c.conrelid and i.indkey[0] = c.conkey[1] and i.indpred is null
        )
      order by 1`);
    expect(unindexed === '' ? [] : unindexed.split('\n')).toEqual([]);
  });
});
