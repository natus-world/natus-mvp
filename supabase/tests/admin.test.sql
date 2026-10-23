-- Natus — the admin panel's door, adversarially. Same discipline as rls.test.sql.
--
-- Run: supabase test db

begin;

create extension if not exists pgtap with schema extensions;

select plan(54);

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

insert into public.clients (user_id, email, legal_birth_name)
values ('bbbbbbbb-0000-4000-8000-0000000000b2', 'person@example.test', 'Pepito Pérez');

insert into public.crisis_events (user_id, severity, category, source_surface, matched, excerpt)
values ('bbbbbbbb-0000-4000-8000-0000000000b2', 'low', 'ideacion', 'chat', '{"no aguanto"}', 'ya no aguanto');

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
select throws_ok($$select * from public.admin_retention(12)$$, '42501', 'not_admin',
  'A person cannot read the retention');
select throws_ok($$select * from public.admin_app_errors(current_date - 30, current_date)$$, '42501', 'not_admin',
  'A person cannot read the app errors');
select throws_ok($$select public.admin_person_summary('aaaaaaaa-0000-4000-8000-0000000000a1')$$, '42501', 'not_admin',
  'Nor anybody''s summary');
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
select throws_ok($$select * from public.admin_people('')$$, '42501', 'not_admin',
  'A person cannot list people');
select throws_ok($$select public.admin_person('bbbbbbbb-0000-4000-8000-0000000000b2')$$, '42501', 'not_admin',
  'A person cannot read a record, not even their own');
select throws_ok($$select public.admin_person_content('bbbbbbbb-0000-4000-8000-0000000000b2', 'chat')$$,
  '42501', 'not_admin', 'A person cannot read content through the panel');
select throws_ok($$select public.admin_grant_premium('person@example.test', null)$$, '42501', 'not_admin',
  'A person cannot give themselves Premium');
select throws_ok($$select * from public.admin_feedback_inbox()$$, '42501', 'not_admin',
  'A person cannot read the suggestions inbox');
select throws_ok($$select * from public.admin_crisis_list(30)$$, '42501', 'not_admin',
  'A person cannot read the crisis alerts');
select throws_ok($$select * from public.admin_expenses()$$, '42501', 'not_admin',
  'A person cannot read the expenses');
select throws_ok($$select public.admin_expense_save(null, '{"service":"x"}')$$, '42501', 'not_admin',
  'A person cannot write an expense');

-- The person's own suggestions.
select lives_ok($$insert into public.feedback_messages (user_id, author, body, screen)
  values ('bbbbbbbb-0000-4000-8000-0000000000b2', 'person', 'El botón de Caminos no se entiende', '/caminos')$$,
  'CONTROL: a person leaves a suggestion');
select throws_ok($$insert into public.feedback_messages (user_id, author, body)
  values ('bbbbbbbb-0000-4000-8000-0000000000b2', 'team', 'Gracias')$$,
  '42501', null, 'A person cannot write as the team');
select throws_ok($$insert into public.feedback_messages (user_id, author, body)
  values ('aaaaaaaa-0000-4000-8000-0000000000a1', 'person', 'hola')$$,
  '42501', null, 'A person cannot write in somebody else''s conversation');

-- ── an anonymous row put in the table ──────────────────────────────────────

select pg_temp.act_as('cccccccc-0000-4000-8000-0000000000c3');
select is(public.is_admin(), false, 'An anonymous session is never an admin, even if listed');

-- ── the admin ───────────────────────────────────────────────────────────────

select pg_temp.act_as('aaaaaaaa-0000-4000-8000-0000000000a1');

select is((select role from public.admin_whoami()), 'owner', 'CONTROL: the admin signs in');
select is((select accounts from public.admin_overview()), 1::bigint,
  'Accounts count people with an account, not anonymous sessions, and not the team');
select is((select count(*) from public.admin_hourly((now() at time zone 'America/Santiago')::date)), 24::bigint,
  'A day reads hour by hour');
select is((select count(*) from public.admin_daily_range(current_date - 9, current_date)), 10::bigint,
  'Any range of days reads day by day');
select lives_ok($$select * from public.admin_app_errors(current_date - 30, current_date)$$,
  'The admin reads the app errors');
select is((select sum(calls) from public.admin_ai_failures(current_date - 30, current_date)), 1::numeric,
  'A failed model answer is listed with its reason');
select ok(public.admin_person_summary('bbbbbbbb-0000-4000-8000-0000000000b2') ? 'need',
  'The summary says what brought the person');
-- Sonnet: 1M in at 2 + 0.1M out at 10 = 3. Unknown model: 1M in at 5 = 5.
-- The fixture call is not money.
select is((select ai_spend_month from public.admin_overview()), 8.00::numeric,
  'The spend prices server calls only, unknown models at the fallback rate');
select is((select sum(failed) from public.admin_ai_spend(30)), 1::numeric,
  'A failed call is counted as failed');

select is((select count(*) from public.admin_people('pérez')), 1::bigint,
  'People are found by name');
select is(public.admin_person('bbbbbbbb-0000-4000-8000-0000000000b2')->>'name', 'Pepito Pérez',
  'The record says who the person is');
select is(jsonb_array_length(public.admin_person_content('bbbbbbbb-0000-4000-8000-0000000000b2', 'chat')), 0,
  'Content is readable by kind');
select throws_ok($$select public.admin_person_content('bbbbbbbb-0000-4000-8000-0000000000b2', 'passwords')$$,
  '22023', 'unknown_kind', 'Only the kinds listed');

select lives_ok($$select public.admin_grant_premium('PERSON@example.test', 3)$$,
  'CONTROL: the admin gives three months of Premium by email');
select is(public.admin_person('bbbbbbbb-0000-4000-8000-0000000000b2')->>'plan', 'gift', 'The gift is Premium, as a gift');
select ok((public.admin_person('bbbbbbbb-0000-4000-8000-0000000000b2')->'subscription'->>'ends_at')::timestamptz
           between now() + interval '89 days' and now() + interval '93 days',
  'It ends in three months');
select is((select premium_gifted from public.admin_overview()), 1::bigint, 'A gift is counted as a gift');
select is((select premium_paying from public.admin_overview()), 0::bigint, '... and not as paying');
select lives_ok($$select public.admin_revoke_premium('bbbbbbbb-0000-4000-8000-0000000000b2')$$,
  'The admin takes it back');
select is(public.admin_person('bbbbbbbb-0000-4000-8000-0000000000b2')->>'plan', 'free', 'Taken back, the person is free');
select throws_ok($$select public.admin_grant_premium('nobody@example.test', null)$$, 'P0002', 'no_account',
  'No account, no gift');

select is((select count(*) from public.admin_feedback_inbox()), 1::bigint, 'The suggestion reaches the inbox');
select is((select name from public.admin_crisis_list(30)), 'Pepito Pérez', 'An alert says who, with the excerpt beside it');
select lives_ok($$select public.admin_expense_save(null, '{"service":"Prueba","amount_usd":"12.5","status":"to_buy"}')$$,
  'CONTROL: the admin records an expense');
select lives_ok($$select public.admin_feedback_reply('bbbbbbbb-0000-4000-8000-0000000000b2', 'Gracias, lo vemos')$$,
  'The admin answers');

select pg_temp.act_as_owner();

select is((select count(*) from public.admin_access_log
           where admin_id = 'aaaaaaaa-0000-4000-8000-0000000000a1' and what = 'signed_in'),
  1::bigint, 'The sign-in is logged');
select is((select count(*) from public.admin_access_log where what = 'overview'),
  0::bigint, 'Aggregates are not logged one by one');
select is((select count(*) from public.admin_access_log
           where what = 'person_chat' and subject_id = 'bbbbbbbb-0000-4000-8000-0000000000b2'),
  1::bigint, 'Reading somebody''s chat is logged with whom');

-- PostgREST runs a stable function in a read-only transaction, so one that
-- writes the access log must be volatile or the panel gets an error.
select is(
  (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname in
      ('admin_people', 'admin_person', 'admin_person_content', 'admin_feedback_inbox',
       'admin_feedback_thread', 'admin_whoami', 'admin_grant_premium', 'admin_revoke_premium',
       'admin_feedback_reply', 'admin_crisis_list', 'admin_expense_save', 'admin_expense_delete')
      and p.provolatile <> 'v'),
  0::bigint, 'Every admin function that logs is volatile');

select is((select amount_usd from public.tech_expenses where service = 'Prueba'), 12.50::numeric,
  'The expense is kept with its amount');

select * from finish();
rollback;
