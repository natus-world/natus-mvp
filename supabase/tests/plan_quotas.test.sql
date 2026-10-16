-- Natus — plan quotas (v1.2 F-01), adversarially.
begin;
create extension if not exists pgtap with schema extensions;
select plan(20);

create or replace function pg_temp.act_as(uid uuid) returns void as $$
begin
  perform set_config('request.jwt.claims',
    json_build_object('sub', uid::text, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
end;
$$ language plpgsql;

insert into auth.users (id, instance_id, aud, role, email)
values
  ('aaaaaaaa-0000-4000-8000-000000000001', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'alice@example.test'),
  ('bbbbbbbb-0000-4000-8000-000000000002', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'bob@example.test');

-- A row in the ledger, as a function would write it.
create or replace function pg_temp.call(uid uuid, what text, outcome text, at timestamptz, charged boolean default false)
returns void as $$
  insert into public.claude_api_calls (user_id, purpose, prompt_version, model, mode, outcome, charged, created_at)
  values (uid, what, 't', 'm', 'server', outcome, charged, at);
$$ language sql;

-- ── free ───────────────────────────────────────────────────────────────────
select is(public.quota_remaining('aaaaaaaa-0000-4000-8000-000000000001', 'chat'), 4,
  'A new free person has the 3-question gift and this month''s 1');

select is(public.quota_parts('aaaaaaaa-0000-4000-8000-000000000001', 'chat'),
  '{"gift_left": 3, "monthly_left": 1, "used_before": false}'::jsonb,
  'The four of the first month are the gift and this month''s question');

select pg_temp.call('aaaaaaaa-0000-4000-8000-000000000001', 'chat', 'ok', now() - interval '40 days', true)
  from generate_series(1, 3);
select is(public.quota_remaining('aaaaaaaa-0000-4000-8000-000000000001', 'chat'), 2,
  'Three last month (one monthly, two from the gift) leave one of the gift and this month''s 1');
select is(public.quota_parts('aaaaaaaa-0000-4000-8000-000000000001', 'chat'),
  '{"gift_left": 1, "monthly_left": 1, "used_before": true}'::jsonb,
  'Of those two, one is this month''s new question, for somebody returning');

select pg_temp.call('aaaaaaaa-0000-4000-8000-000000000001', 'chat', 'ok', now(), true)
  from generate_series(1, 2);
select is(public.quota_remaining('aaaaaaaa-0000-4000-8000-000000000001', 'chat'), 0,
  'Used up this month');

select pg_temp.call('aaaaaaaa-0000-4000-8000-000000000001', 'chat', 'api_error', now(), false);
select is(public.quota_remaining('aaaaaaaa-0000-4000-8000-000000000001', 'chat'), 0,
  'A failed turn is not charged, and does not go below zero');

select is(public.quota_remaining('aaaaaaaa-0000-4000-8000-000000000001', 'meditation'), 1,
  'One meditation, in all');
select pg_temp.call('aaaaaaaa-0000-4000-8000-000000000001', 'meditation', 'api_error', now());
select is(public.quota_remaining('aaaaaaaa-0000-4000-8000-000000000001', 'meditation'), 1,
  'A meditation that failed does not spend it');
select pg_temp.call('aaaaaaaa-0000-4000-8000-000000000001', 'meditation', 'ok', now() - interval '60 days');
select is(public.quota_remaining('aaaaaaaa-0000-4000-8000-000000000001', 'meditation'), 0,
  'Once used, months later, it is still used: it does not renew');

select pg_temp.call('aaaaaaaa-0000-4000-8000-000000000001', 'comparison', 'ok', now() - interval '40 days')
  from generate_series(1, 2);
select is(public.quota_remaining('aaaaaaaa-0000-4000-8000-000000000001', 'comparison'), 2,
  'Comparisons renew each month');
select pg_temp.call('aaaaaaaa-0000-4000-8000-000000000001', 'comparison', 'pending', now());
select is(public.quota_remaining('aaaaaaaa-0000-4000-8000-000000000001', 'comparison'), 1,
  'One in flight counts, so two at once cannot both take the last');

select is(
  public.reserve_plan_chat_turn('aaaaaaaa-0000-4000-8000-000000000001', 't', 'm'),
  null,
  'No chat turn is reserved once the month is used'
);

-- ── premium ────────────────────────────────────────────────────────────────
insert into public.subscriptions (user_id, status, activated_at)
values ('bbbbbbbb-0000-4000-8000-000000000002', 'active', now());

select is(public.quota_remaining('bbbbbbbb-0000-4000-8000-000000000002', 'chat'), null,
  'Premium chat is unlimited (the money cap is the functions'' to check)');
select is(public.quota_remaining('bbbbbbbb-0000-4000-8000-000000000002', 'meditation'), 10,
  'Premium has 10 meditations a month');
select isnt(
  public.reserve_plan_chat_turn('bbbbbbbb-0000-4000-8000-000000000002', 't', 'm'),
  null,
  'CONTROL: a premium turn is reserved'
);

-- ── what a person can reach ────────────────────────────────────────────────
select pg_temp.act_as('aaaaaaaa-0000-4000-8000-000000000001');

select is((public.my_quota('chat') ->> 'remaining')::int, 0,
  'Alice reads her own quota');

select is((public.my_quota('chat') ->> 'offer_premium')::boolean, true,
  'With no recent alert, Premium may be offered');

reset role;
insert into public.crisis_events (user_id, severity, category, layer, matched, excerpt, source_surface)
  values ('aaaaaaaa-0000-4000-8000-000000000001', 'low', 'indirecto', 'deterministic', '{}', '', 'journal');
select pg_temp.act_as('aaaaaaaa-0000-4000-8000-000000000001');
select is((public.my_quota('chat') ->> 'offer_premium')::boolean, false,
  'For seven days after an alert, it is not');

select throws_ok(
  $$select public.quota_remaining('bbbbbbbb-0000-4000-8000-000000000002', 'chat')$$,
  '42501', null,
  'Alice cannot ask for somebody else''s quota'
);

select throws_ok(
  $$update public.plan_quotas set monthly = 1000 where tier = 'free' and feature = 'chat'$$,
  '42501', null,
  'Alice cannot give herself more questions'
);

select * from finish();
rollback;
