-- Natus — the panel ordered by four questions (20261024010000_admin_panel_v2).
-- Every new function refuses a person, and the numbers come out as decided.
--
-- Run: supabase test db

begin;

create extension if not exists pgtap with schema extensions;

select plan(30);

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

-- An admin, two friends (Ana invited Beto, who arrived through the link), and a
-- third person whose friendship with Ana ended.
insert into auth.users (id, instance_id, aud, role, email, is_anonymous, created_at)
values
  ('aaaaaaaa-0000-4000-8000-0000000000a1', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'admin@example.test', false, now() - interval '30 days'),
  ('bbbbbbbb-0000-4000-8000-0000000000b1', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'ana@example.test', false, now() - interval '20 days'),
  ('bbbbbbbb-0000-4000-8000-0000000000b2', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'beto@example.test', false, now() - interval '2 days'),
  ('bbbbbbbb-0000-4000-8000-0000000000b3', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'carla@example.test', false, now() - interval '20 days');

insert into public.admins (user_id, role) values ('aaaaaaaa-0000-4000-8000-0000000000a1', 'owner');

insert into public.clients (user_id, email, legal_birth_name) values
  ('bbbbbbbb-0000-4000-8000-0000000000b1', 'ana@example.test', 'Ana Uno'),
  ('bbbbbbbb-0000-4000-8000-0000000000b2', 'beto@example.test', 'Beto Dos'),
  ('bbbbbbbb-0000-4000-8000-0000000000b3', 'carla@example.test', 'Carla Tres');

-- Ana and Carla used the app last week; Ana again this week; Beto is new this
-- week, arriving through Ana's link. Monday noon in Chile, so the weeks hold.
-- Creating the client rows recorded account_created now; the dates below are the test's.
delete from public.funnel_events;
create temp table t_mon as select ((date_trunc('week', now() at time zone 'America/Santiago') + interval '12 hours') at time zone 'America/Santiago') as at;
insert into public.funnel_events (user_id, step, occurred_at, dedupe_key) values
  ('bbbbbbbb-0000-4000-8000-0000000000b1', 'account_created', now() - interval '20 days', 'a1'),
  ('bbbbbbbb-0000-4000-8000-0000000000b1', 'app_opened', (select at from t_mon) - interval '7 days', 'a2'),
  ('bbbbbbbb-0000-4000-8000-0000000000b1', 'app_opened', (select at from t_mon), 'a3'),
  ('bbbbbbbb-0000-4000-8000-0000000000b3', 'account_created', now() - interval '20 days', 'c1'),
  ('bbbbbbbb-0000-4000-8000-0000000000b3', 'app_opened', (select at from t_mon) - interval '7 days', 'c2'),
  ('bbbbbbbb-0000-4000-8000-0000000000b2', 'onboarding_started', (select at from t_mon) - interval '10 minutes', 'b0'),
  ('bbbbbbbb-0000-4000-8000-0000000000b2', 'account_created', (select at from t_mon), 'b1');

insert into public.friendships (id, requester_id, addressee_id, status, created_at, responded_at, ended_by) values
  ('dddddddd-0000-4000-8000-0000000000d1', 'bbbbbbbb-0000-4000-8000-0000000000b1',
   'bbbbbbbb-0000-4000-8000-0000000000b2', 'accepted', (select at from t_mon) + interval '20 minutes',
   (select at from t_mon) + interval '20 minutes', null),
  ('dddddddd-0000-4000-8000-0000000000d2', 'bbbbbbbb-0000-4000-8000-0000000000b1',
   'bbbbbbbb-0000-4000-8000-0000000000b3', 'removed', now() - interval '10 days', now() - interval '1 day',
   'bbbbbbbb-0000-4000-8000-0000000000b3');

insert into public.chart_comparisons (user_id, friendship_id, prompt_version, result, mode) values
  ('bbbbbbbb-0000-4000-8000-0000000000b2', 'dddddddd-0000-4000-8000-0000000000d1', 'comparison-v2.3',
   '{"headline":"x","astro_dialogue":{"aspects":[{},{},{}]}}', 'server'),
  ('bbbbbbbb-0000-4000-8000-0000000000b1', 'dddddddd-0000-4000-8000-0000000000d2', 'comparison-v2.3',
   '{"headline":"secreto","astro_dialogue":{"aspects":[{}]}}', 'server');

-- ── a person is refused everywhere ──────────────────────────────────────────

select pg_temp.act_as('bbbbbbbb-0000-4000-8000-0000000000b1');

select throws_ok($$select * from public.admin_growth(4)$$, '42501', 'not_admin', 'A person cannot read the growth');
select throws_ok($$select * from public.admin_cohort_curve(4)$$, '42501', 'not_admin', 'Nor the curves');
select throws_ok($$select * from public.admin_open_days(current_date - 7, current_date)$$, '42501', 'not_admin', 'Nor the days of use');
select throws_ok($$select * from public.admin_activity_heatmap(current_date - 7, current_date)$$, '42501', 'not_admin', 'Nor the hours');
select throws_ok($$select * from public.admin_ratings(current_date - 7, current_date)$$, '42501', 'not_admin', 'Nor the ratings');
select throws_ok($$select * from public.admin_last_steps(current_date)$$, '42501', 'not_admin', 'Nor who left');
select throws_ok($$select * from public.admin_free_usage()$$, '42501', 'not_admin', 'Nor the free plan used up');
select throws_ok($$select * from public.admin_person_quota('bbbbbbbb-0000-4000-8000-0000000000b2')$$, '42501', 'not_admin', 'Nor somebody''s quota');
select throws_ok($$select * from public.admin_premium_list()$$, '42501', 'not_admin', 'Nor the Premium list');
select throws_ok($$select * from public.admin_friends(current_date - 7, current_date)$$, '42501', 'not_admin', 'Nor the invitations');
select throws_ok($$select * from public.admin_top_inviters(current_date - 7, current_date)$$, '42501', 'not_admin', 'Nor who invites');
select throws_ok($$select * from public.admin_person_friends('bbbbbbbb-0000-4000-8000-0000000000b2')$$, '42501', 'not_admin', 'Nor somebody''s friends');
select throws_ok($$select public.admin_friendship('dddddddd-0000-4000-8000-0000000000d1')$$, '42501', 'not_admin', 'Nor a friendship');
select throws_ok($$select * from public.admin_people_list('')$$, '42501', 'not_admin', 'Nor the list of people');

select pg_temp.act_as_owner();
select is((select count(*) from public.admin_access_log), 0::bigint, 'A refused call leaves nothing in the access log');

-- ── the admin reads ─────────────────────────────────────────────────────────

select pg_temp.act_as('aaaaaaaa-0000-4000-8000-0000000000a1');

select results_eq(
  $$select kept, new_people, returned, lost from public.admin_growth(2) order by week_start desc limit 1$$,
  $$values (1::bigint, 1::bigint, 0::bigint, 1::bigint)$$,
  'This week: Ana kept, Beto new, Carla lost');
select is((select count(*) from public.admin_growth(4)), 4::bigint, 'One row per week asked for');
select is((select sum(people) from public.admin_open_days(current_date - 14, current_date + 1))::bigint, 2::bigint,
  'Two people opened the app in two weeks');

select results_eq(
  $$select accepted, new_by_invite, befriended, comparisons from public.admin_friends(current_date - 30, current_date + 1)$$,
  $$values (1::bigint, 1::bigint, 2::bigint, 2::bigint)$$,
  'Ana invited, Beto arrived through the link, two friendships, two comparisons');
select is((select ended from public.admin_friends(current_date - 7, current_date)), 1::bigint,
  'The friendship Carla ended counts as ended');

select is((select accepted from public.admin_top_inviters(current_date - 30, current_date + 1)
           where user_id = 'bbbbbbbb-0000-4000-8000-0000000000b1'), 2::bigint, 'Ana is the one who invites');

select is((select count(*) from public.admin_person_friends('bbbbbbbb-0000-4000-8000-0000000000b1')), 2::bigint,
  'Ana''s file shows both friends');
select is((select ended_by_them from public.admin_person_friends('bbbbbbbb-0000-4000-8000-0000000000b3')
           where friendship_id = 'dddddddd-0000-4000-8000-0000000000d2'), true,
  'Carla''s file says she ended it');

select is((public.admin_friendship('dddddddd-0000-4000-8000-0000000000d1') -> 'comparisons' -> 0 -> 'result' ->> 'headline'),
  'x', 'A live friendship''s comparison can be read');
select is((public.admin_friendship('dddddddd-0000-4000-8000-0000000000d2') -> 'comparisons' -> 0 -> 'result'),
  'null'::jsonb, 'An ended friendship''s comparison cannot (owner, 23 Oct 2026)');
select is((public.admin_friendship('dddddddd-0000-4000-8000-0000000000d2') -> 'comparisons' -> 0 ->> 'aspects'),
  '1', '... though that it existed, and its size, stay');

select pg_temp.act_as_owner();
select is((select count(*) from public.admin_access_log where what = 'friendship'), 6::bigint,
  'Each look at a friendship is logged for both people');

select pg_temp.act_as('aaaaaaaa-0000-4000-8000-0000000000a1');
select is((select count(*) from public.admin_people_list('')), 3::bigint, 'The list shows the three accounts');
select is((select invited from public.admin_people_list('ana')), 2::bigint, 'With how many each invited');
select is((select count(*) from public.admin_free_usage()), 3::bigint, 'The free plan, feature by feature');

select * from finish();
rollback;
