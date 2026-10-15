-- Natus — the admin funnel, adversarially. Same discipline as rls.test.sql.
--
-- Run: supabase test db

begin;

create extension if not exists pgtap with schema extensions;

select plan(15);

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

create or replace function pg_temp.steps(uid uuid, s text) returns int as $$
  select count(*)::int from public.funnel_events where user_id = uid and step = s;
$$ language sql;

insert into auth.users (id, instance_id, aud, role, email)
values
  ('aaaaaaaa-0000-4000-8000-000000000001', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'alice@example.test'),
  ('bbbbbbbb-0000-4000-8000-000000000002', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'bob@example.test');

insert into public.clients (user_id, email, legal_birth_name)
values
  ('aaaaaaaa-0000-4000-8000-000000000001', 'alice@example.test', 'Alice Soto'),
  ('bbbbbbbb-0000-4000-8000-000000000002', 'bob@example.test', 'Bob Rojas');

select is(
  pg_temp.steps('aaaaaaaa-0000-4000-8000-000000000001', 'account_created'),
  1,
  'Creating the account records its step, by trigger, with nothing else'
);

-- ── what the browser may record ─────────────────────────────────────────────

select pg_temp.act_as('aaaaaaaa-0000-4000-8000-000000000001');

select lives_ok(
  $$select public.track_step('onboarding_started', 'instagram', 'lanzamiento')$$,
  'CONTROL: the first step records, with its origin'
);
select public.track_step('onboarding_started', 'instagram', 'lanzamiento');
select public.track_step('app_opened');
select public.track_step('app_opened');
select public.track_step('paths_seen', 'instagram', 'lanzamiento');
select public.track_step('paywall_seen', null, null, 'chat');

select throws_ok(
  $$select public.track_step('first_charge')$$,
  '22023',
  null,
  'Nobody can record a payment for themselves'
);

select throws_ok(
  $$select public.track_step('onboarding_started', 'Instagram Ads!')$$,
  '23514',
  null,
  'An origin outside the closed vocabulary is refused, so no free text gets in'
);

select throws_ok(
  'select count(*) from public.funnel_events',
  '42501',
  null,
  'Nobody reads the funnel through the API, not even about themselves'
);

select throws_ok(
  $$insert into public.funnel_events (user_id, step, dedupe_key)
    values ('bbbbbbbb-0000-4000-8000-000000000002', 'first_charge', 'x')$$,
  '42501',
  null,
  'Nor writes it directly, for themselves or anybody else'
);

select throws_ok(
  $$select public.record_step('bbbbbbbb-0000-4000-8000-000000000002', 'first_charge')$$,
  '42501',
  null,
  'The server-side recorder is not callable from the browser'
);

select pg_temp.act_as_owner();

select is(
  pg_temp.steps('aaaaaaaa-0000-4000-8000-000000000001', 'onboarding_started'),
  1,
  'A one-time step recorded twice is one row'
);

select is(
  (select source || '/' || campaign from public.funnel_events
   where user_id = 'aaaaaaaa-0000-4000-8000-000000000001' and step = 'onboarding_started'),
  'instagram/lanzamiento',
  'The origin is kept on the first step'
);

select is(
  (select source from public.funnel_events
   where user_id = 'aaaaaaaa-0000-4000-8000-000000000001' and step = 'paths_seen'),
  null,
  'And dropped from any other step that tries to carry it'
);

select is(
  pg_temp.steps('aaaaaaaa-0000-4000-8000-000000000001', 'app_opened'),
  1,
  'Opening the app twice in a day is one row'
);

select is(
  (select detail from public.funnel_events
   where user_id = 'aaaaaaaa-0000-4000-8000-000000000001' and step = 'paywall_seen'),
  'chat',
  'The paywall keeps where it appeared'
);

-- ── steps the database records itself ──────────────────────────────────────

insert into public.recommendation_checkins (user_id, practice_title, checked_on)
values ('aaaaaaaa-0000-4000-8000-000000000001', 'Caminar', current_date),
       ('aaaaaaaa-0000-4000-8000-000000000001', 'Caminar', current_date - 1);

select is(
  pg_temp.steps('aaaaaaaa-0000-4000-8000-000000000001', 'first_practice'),
  1,
  'Marking practices records the first one, once'
);

insert into public.friend_invites (token, inviter_id)
values ('funneltesttoken', 'aaaaaaaa-0000-4000-8000-000000000001');
select pg_temp.act_as('bbbbbbbb-0000-4000-8000-000000000002');
select public.accept_friend_invite('funneltesttoken');
select pg_temp.act_as_owner();

select is(
  pg_temp.steps('aaaaaaaa-0000-4000-8000-000000000001', 'friend_accepted'),
  1,
  'A friend accepting records the step for the person who invited'
);

select is(
  pg_temp.steps('bbbbbbbb-0000-4000-8000-000000000002', 'friend_accepted'),
  0,
  'And not for the person who accepted'
);

select * from finish();

rollback;
