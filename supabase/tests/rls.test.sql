-- Natus MVP — Row Level Security, adversarially
--
-- Every assertion here is a negative one: something a hostile holder of the
-- anon key must not be able to do. A policy test that only proves the owner
-- can read their own row proves nothing about the policy — it would pass
-- against a table with RLS switched off entirely.
--
-- So each negative carries a control: the same read, by the person entitled
-- to it, which must succeed. If a control ever fails the negative beside it
-- has stopped meaning anything. Phase 2 of the 001 plan learned this the hard
-- way, with suppression tests that passed while exercising nothing.
--
-- Run: supabase test db

begin;

create extension if not exists pgtap with schema extensions;

select plan(24);

-- ═══════════════════════════════════════════════════════════════════════════
-- Two people who have never met
-- ═══════════════════════════════════════════════════════════════════════════

create or replace function pg_temp.act_as(uid uuid) returns void as $$
begin
  perform set_config('request.jwt.claims',
    json_build_object('sub', uid::text, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
end;
$$ language plpgsql;

create or replace function pg_temp.act_as_anon() returns void as $$
begin
  perform set_config('request.jwt.claims', '', true);
  execute 'set local role anon';
end;
$$ language plpgsql;

create or replace function pg_temp.act_as_owner() returns void as $$
begin
  execute 'reset role';
  perform set_config('request.jwt.claims', '', true);
end;
$$ language plpgsql;

insert into auth.users (id, instance_id, aud, role, email)
values
  ('aaaaaaaa-0000-4000-8000-000000000001', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'alice@example.test'),
  ('bbbbbbbb-0000-4000-8000-000000000002', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'bob@example.test');

-- Alice has answered the clinical question in the way that matters most.
insert into public.clients (user_id, email, legal_birth_name, clinical_ideation_6m,
                            clinical_in_treatment, clinical_psychiatric_medication)
values ('aaaaaaaa-0000-4000-8000-000000000001', 'alice@example.test', 'Alice',
        'plan_o_intencion', true, true);

insert into public.clients (user_id, email, legal_birth_name, clinical_ideation_6m)
values ('bbbbbbbb-0000-4000-8000-000000000002', 'bob@example.test', 'Bob', 'no');

insert into public.anonymous_sessions (user_id, legal_birth_name, clinical_ideation_6m)
values ('aaaaaaaa-0000-4000-8000-000000000001', 'Alice', 'plan_o_intencion');

insert into public.soul_map_syntheses (user_id, prompt_version, synthesis, mode)
values ('aaaaaaaa-0000-4000-8000-000000000001', 'v1-reconstructed', '{}'::jsonb, 'fixture');

insert into public.conversations (user_id, synthesis_id)
select 'aaaaaaaa-0000-4000-8000-000000000001', id from public.soul_map_syntheses limit 1;

insert into public.messages (user_id, conversation_id, role, text, counted)
select 'aaaaaaaa-0000-4000-8000-000000000001', id, 'user', 'algo muy privado', false
from public.conversations limit 1;

insert into public.crisis_events (user_id, severity, category, source_surface, excerpt)
values ('aaaaaaaa-0000-4000-8000-000000000001', 'high', 'ideacion', 'chat',
        'texto sensible que disparó la detección');

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. Clinical answers do not cross between people
-- ═══════════════════════════════════════════════════════════════════════════

select pg_temp.act_as('aaaaaaaa-0000-4000-8000-000000000001');

select is(
  (select count(*)::int from public.clients),
  1,
  'CONTROL: Alice sees exactly one client row, her own'
);

-- Aggregated rather than a bare scalar subquery. Under a broken ownership
-- policy this returns more than one row, and a scalar subquery would abort
-- the transaction — taking the eighteen assertions after it down unrun, which
-- is precisely when they are most needed. Every assertion in this file must
-- be able to fail on its own.
select is(
  (select max(clinical_ideation_6m) from public.clients
   where user_id = 'aaaaaaaa-0000-4000-8000-000000000001'),
  'plan_o_intencion',
  'CONTROL: Alice can read her own clinical answer — the negatives below are not vacuous'
);

select pg_temp.act_as('bbbbbbbb-0000-4000-8000-000000000002');

select is(
  (select count(*)::int from public.clients),
  1,
  'Bob sees exactly one client row, and it is not Alice''s'
);

select is(
  (select count(*)::int from public.clients
   where user_id = 'aaaaaaaa-0000-4000-8000-000000000001'),
  0,
  'Bob naming Alice''s user_id explicitly still reads nothing'
);

select is(
  (select count(*)::int from public.clients where clinical_ideation_6m = 'plan_o_intencion'),
  0,
  'Bob cannot find anyone by their clinical answer'
);

select is(
  (select count(*)::int from public.anonymous_sessions),
  0,
  'The draft carries the same answers before signup, and is equally unreachable'
);

-- A join is the route most likely to leak.
select is(
  (select count(*)::int
   from public.clients c
   join public.soul_map_syntheses s on s.user_id = c.user_id),
  0,
  'Joining through the soul map does not surface Alice''s row either'
);

select is(
  (select count(*)::int from public.messages),
  0,
  'Bob cannot read Alice''s messages'
);

select is(
  (select count(*)::int from public.crisis_events),
  0,
  'Bob cannot read Alice''s crisis events, excerpt included'
);

select throws_ok(
  $$insert into public.clients (user_id, legal_birth_name)
    values ('aaaaaaaa-0000-4000-8000-000000000001', 'not Alice')$$,
  '42501',
  null,
  'Bob cannot write a row owned by Alice'
);

-- ═══════════════════════════════════════════════════════════════════════════
-- 2. The friendship gate (v1.2 C-01)
-- ═══════════════════════════════════════════════════════════════════════════
--
-- A comparison is read by both friends while they are friends, and by nobody
-- once the friendship ends. Only the comparison function writes one.

select pg_temp.act_as_owner();

insert into public.friendships (id, requester_id, addressee_id, status, responded_at)
values ('dddddddd-0000-4000-8000-000000000004',
        'aaaaaaaa-0000-4000-8000-000000000001',
        'bbbbbbbb-0000-4000-8000-000000000002',
        'accepted', now());

insert into public.chart_comparisons (id, user_id, friendship_id, prompt_version, result, mode)
values ('eeeeeeee-0000-4000-8000-000000000005',
        'aaaaaaaa-0000-4000-8000-000000000001',
        'dddddddd-0000-4000-8000-000000000004',
        'comparison-v2.0', '{}'::jsonb, 'server');

select pg_temp.act_as('aaaaaaaa-0000-4000-8000-000000000001');

select is(
  (select count(*)::int from public.chart_comparisons),
  1,
  'CONTROL: while they are friends, Alice reads the comparison she asked for'
);

select pg_temp.act_as('bbbbbbbb-0000-4000-8000-000000000002');

select is(
  (select count(*)::int from public.chart_comparisons),
  1,
  'Bob reads it too: a comparison belongs to the friendship, not to who asked'
);

select throws_ok(
  $$insert into public.chart_comparisons (user_id, friendship_id, prompt_version, result, mode)
    values ('bbbbbbbb-0000-4000-8000-000000000002', 'dddddddd-0000-4000-8000-000000000004',
            'v', '{}'::jsonb, 'server')$$,
  '42501',
  null,
  'Bob cannot write a comparison: only the function does, from stored data'
);

select throws_ok(
  $$delete from public.chart_comparisons$$,
  '42501',
  null,
  'Nor delete one: ending the friendship hides it, it does not erase it'
);

select pg_temp.act_as_owner();
update public.friendships set status = 'removed'
where id = 'dddddddd-0000-4000-8000-000000000004';
select pg_temp.act_as('aaaaaaaa-0000-4000-8000-000000000001');

select is(
  (select count(*)::int from public.chart_comparisons),
  0,
  'Ending the friendship closes the read immediately, for the one who asked'
);

select pg_temp.act_as('bbbbbbbb-0000-4000-8000-000000000002');

select is(
  (select count(*)::int from public.chart_comparisons),
  0,
  'And for the other friend'
);

select pg_temp.act_as_owner();
update public.friendships set status = 'accepted'
where id = 'dddddddd-0000-4000-8000-000000000004';
select pg_temp.act_as('aaaaaaaa-0000-4000-8000-000000000001');

select is(
  (select count(*)::int from public.chart_comparisons),
  1,
  'CONTROL: friends again, readable again — the previous assertions tested the status, not a typo'
);

-- ═══════════════════════════════════════════════════════════════════════════
-- 2b. Only the server decides who is premium (v1.2 P-01)
-- ═══════════════════════════════════════════════════════════════════════════

select pg_temp.act_as_owner();

insert into public.subscriptions (user_id, status)
values ('aaaaaaaa-0000-4000-8000-000000000001', 'none');

select pg_temp.act_as('aaaaaaaa-0000-4000-8000-000000000001');

select is(
  (select count(*)::int from public.subscriptions),
  1,
  'CONTROL: Alice can read her own subscription'
);

select throws_ok(
  $$update public.subscriptions set status = 'active'
    where user_id = 'aaaaaaaa-0000-4000-8000-000000000001'$$,
  '42501',
  null,
  'Alice cannot make herself premium by updating her row'
);

select throws_ok(
  $$insert into public.subscriptions (user_id, status)
    values ('aaaaaaaa-0000-4000-8000-000000000001', 'active')
    on conflict (user_id) do update set status = 'active'$$,
  '42501',
  null,
  'Alice cannot make herself premium with an upsert either'
);

select pg_temp.act_as('bbbbbbbb-0000-4000-8000-000000000002');

select is(
  (select count(*)::int from public.subscriptions),
  0,
  'Bob cannot see whether Alice pays'
);

-- ═══════════════════════════════════════════════════════════════════════════
-- 3. Reference data, and the one thing that must survive a failed sign-in
-- ═══════════════════════════════════════════════════════════════════════════

select pg_temp.act_as_anon();

-- Denied at the grant layer rather than filtered to zero rows by a policy,
-- which is the stronger of the two failures: anon was never given the verb,
-- so no policy edit can make this readable by accident.
select throws_ok(
  'select count(*) from public.modalities',
  '42501',
  null,
  'Without a session the recommendation pool is not reachable at all'
);

select cmp_ok(
  (select count(*)::int from public.crisis_resources),
  '>',
  0,
  'Crisis resources ARE readable without a session — PDR 6.4, there is always somewhere to call'
);

select pg_temp.act_as('bbbbbbbb-0000-4000-8000-000000000002');

select cmp_ok(
  (select count(*)::int from public.modalities),
  '>',
  0,
  'CONTROL: with a session the pool is readable, so the anon assertion tested the role'
);

select * from finish();

rollback;
