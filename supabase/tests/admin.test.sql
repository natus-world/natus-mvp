-- Natus — the admin panel's door, adversarially. Same discipline as rls.test.sql.
--
-- Run: supabase test db

begin;

create extension if not exists pgtap with schema extensions;

select plan(16);

create or replace function pg_temp.act_as(uid uuid) returns void as $$
begin
  perform set_config('request.jwt.claims',
    json_build_object('sub', uid::text, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
end;
$$ language plpgsql;

create or replace function pg_temp.act_as_owner() returns void as $$
begin
  execute 'reset role';
  perform set_config('request.jwt.claims', '', true);
end;
$$ language plpgsql;

insert into auth.users (id, instance_id, aud, role, email, is_anonymous)
values
  ('aaaaaaaa-0000-4000-8000-0000000000a1', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'admin@example.test', false),
  ('bbbbbbbb-0000-4000-8000-0000000000b2', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'person@example.test', false),
  ('cccccccc-0000-4000-8000-0000000000c3', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', null, true);

insert into public.admins (user_id, role) values
  ('aaaaaaaa-0000-4000-8000-0000000000a1', 'owner'),
  -- An anonymous row in the table must still not be an admin.
  ('cccccccc-0000-4000-8000-0000000000c3', 'admin');

-- Some use, so the metrics have something to count.
insert into public.claude_api_calls (user_id, purpose, prompt_version, model, mode, outcome,
                                     input_tokens, output_tokens)
values
  ('bbbbbbbb-0000-4000-8000-0000000000b2', 'chat', 'chat-v1.8', 'claude-sonnet-5-5', 'server', 'ok',
   1000000, 100000),
  ('bbbbbbbb-0000-4000-8000-0000000000b2', 'chat', 'chat-v1.8', 'claude-sonnet-5-5', 'server', 'api_error',
   0, 0),
  ('bbbbbbbb-0000-4000-8000-0000000000b2', 'chat', 'chat-v1.8', 'claude-sonnet-5-5', 'fixture', 'ok',
   1000000, 0),
  ('bbbbbbbb-0000-4000-8000-0000000000b2', 'chat', 'chat-v1.8', 'some-future-model', 'server', 'ok',
   1000000, 0);

-- ── somebody who is not an admin ────────────────────────────────────────────

select pg_temp.act_as('bbbbbbbb-0000-4000-8000-0000000000b2');

select is(public.is_admin(), false, 'A person is not an admin');
select throws_ok($$select * from public.admin_whoami()$$, '42501', 'not_admin',
  'A person cannot sign into the panel');
select throws_ok($$select * from public.admin_overview()$$, '42501', 'not_admin',
  'A person cannot read the overview');
select throws_ok($$select * from public.admin_funnel(current_date - 30, current_date)$$, '42501', 'not_admin',
  'A person cannot read the funnel');
select throws_ok($$select * from public.admin_ai_spend(30)$$, '42501', 'not_admin',
  'A person cannot read the spend');
select throws_ok($$select * from public.admin_crisis_counts(30)$$, '42501', 'not_admin',
  'A person cannot read the crisis counts');
select throws_ok($$select * from public.admins$$, '42501', null,
  'A person cannot read the admin list');
select throws_ok($$insert into public.admins (user_id) values ('bbbbbbbb-0000-4000-8000-0000000000b2')$$,
  '42501', null, 'A person cannot make themselves an admin');
select throws_ok($$select public.admin_require('overview')$$, '42501', null,
  'The door itself is not callable from the API');

-- ── an anonymous row put in the table ──────────────────────────────────────

select pg_temp.act_as('cccccccc-0000-4000-8000-0000000000c3');
select is(public.is_admin(), false, 'An anonymous session is never an admin, even if listed');

-- ── the admin ───────────────────────────────────────────────────────────────

select pg_temp.act_as('aaaaaaaa-0000-4000-8000-0000000000a1');

select is((select role from public.admin_whoami()), 'owner', 'CONTROL: the admin signs in');
select is((select accounts from public.admin_overview()), 2::bigint,
  'Accounts count people with Google, not anonymous sessions');
-- Sonnet: 1M in at 2 + 0.1M out at 10 = 3. Unknown model: 1M in at 5 = 5.
-- The fixture call is not money.
select is((select ai_spend_month from public.admin_overview()), 8.00::numeric,
  'The spend prices server calls only, unknown models at the fallback rate');
select is((select sum(failed) from public.admin_ai_spend(30)), 1::numeric,
  'A failed call is counted as failed');

select pg_temp.act_as_owner();

select is((select count(*) from public.admin_access_log
           where admin_id = 'aaaaaaaa-0000-4000-8000-0000000000a1' and what = 'signed_in'),
  1::bigint, 'The sign-in is logged');
select is((select count(*) from public.admin_access_log where what = 'overview'),
  0::bigint, 'Aggregates are not logged one by one');

select * from finish();
rollback;
