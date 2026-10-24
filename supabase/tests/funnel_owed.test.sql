-- Natus — the steps owed to the admin panel (20261024030000).
--
-- Run: supabase test db

begin;

create extension if not exists pgtap with schema extensions;

select plan(18);

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
  ('aaaaaaaa-0000-4000-8000-0000000000a1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'admin@example.test', false),
  ('bbbbbbbb-0000-4000-8000-0000000000b1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'ana@example.test', false),
  ('bbbbbbbb-0000-4000-8000-0000000000b2', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'beto@example.test', false),
  ('bbbbbbbb-0000-4000-8000-0000000000b3', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'carla@example.test', false);
insert into public.admins (user_id, role) values ('aaaaaaaa-0000-4000-8000-0000000000a1', 'owner');
insert into public.friendships (id, requester_id, addressee_id, status, responded_at) values
  ('dddddddd-0000-4000-8000-0000000000d1', 'bbbbbbbb-0000-4000-8000-0000000000b1', 'bbbbbbbb-0000-4000-8000-0000000000b2', 'accepted', now());
insert into public.chart_comparisons (id, user_id, friendship_id, prompt_version, result, mode) values
  ('eeeeeeee-0000-4000-8000-0000000000e1', 'bbbbbbbb-0000-4000-8000-0000000000b1', 'dddddddd-0000-4000-8000-0000000000d1',
   'comparison-v2.4', '{"headline":"x"}', 'server');

-- ── the browser's new steps ─────────────────────────────────────────────────
select pg_temp.act_as('bbbbbbbb-0000-4000-8000-0000000000b2');
select lives_ok($$select public.track_step('screen_viewed', null, null, 'carta')$$, 'A screen opened is a step');
select lives_ok($$select public.track_step('screen_viewed', null, null, 'carta')$$, '... again the same day');
select lives_ok($$select public.track_step('screen_viewed', null, null, 'crisis')$$, 'A screen outside the list is not refused');
select lives_ok($$select public.track_step('trial_tapped', null, null, 'welcome')$$, 'The touch on «Empezar mes gratis»');
select lives_ok($$select public.track_step('trial_approved', null, null, 'nowhere')$$, 'The return from PayPal, with a place outside the list');
select lives_ok($$select public.track_step('invite_opened')$$, 'An invitation opened');
select lives_ok($$select public.mark_comparison_read('eeeeeeee-0000-4000-8000-0000000000e1')$$, 'Beto reads the comparison Ana asked for');

select pg_temp.act_as('bbbbbbbb-0000-4000-8000-0000000000b1');
select lives_ok($$select public.mark_comparison_read('eeeeeeee-0000-4000-8000-0000000000e1')$$, 'Ana reading her own asks nothing');

select pg_temp.act_as('bbbbbbbb-0000-4000-8000-0000000000b3');
select lives_ok($$select public.mark_comparison_read('eeeeeeee-0000-4000-8000-0000000000e1')$$, 'Carla, not a friend, records nothing');

select pg_temp.act_as_owner();
select is((select count(*) from public.funnel_events
           where user_id = 'bbbbbbbb-0000-4000-8000-0000000000b2' and step = 'screen_viewed'), 1::bigint,
  'One screen, once a day, and nothing for a screen outside the list');
select is((select detail from public.funnel_events
           where user_id = 'bbbbbbbb-0000-4000-8000-0000000000b2' and step = 'trial_approved'), null,
  'A place outside the list is dropped, the step kept');
select is((select count(*) from public.comparison_reads), 1::bigint, 'Only the friend who did not ask is recorded');

-- ── a chat turn about a comparison ──────────────────────────────────────────
insert into public.soul_map_syntheses (id, user_id, prompt_version, synthesis, numerology, mode, is_current) values
  ('22222222-2222-4222-8222-222222222222', 'bbbbbbbb-0000-4000-8000-0000000000b2', 'soul-map-v2.8', '{}', '{}', 'server', true),
  ('22222222-2222-4222-8222-222222222223', 'bbbbbbbb-0000-4000-8000-0000000000b3', 'soul-map-v2.8', '{}', '{}', 'server', true);
insert into public.conversations (id, user_id, synthesis_id) values
  ('11111111-1111-4111-8111-111111111111', 'bbbbbbbb-0000-4000-8000-0000000000b2', '22222222-2222-4222-8222-222222222222'),
  ('11111111-1111-4111-8111-111111111112', 'bbbbbbbb-0000-4000-8000-0000000000b3', '22222222-2222-4222-8222-222222222223');
insert into public.messages (user_id, conversation_id, role, text, friendship_id) values
  ('bbbbbbbb-0000-4000-8000-0000000000b2', '11111111-1111-4111-8111-111111111111', 'user', '¿Qué hago con lo de los ritmos?', 'dddddddd-0000-4000-8000-0000000000d1'),
  ('bbbbbbbb-0000-4000-8000-0000000000b3', '11111111-1111-4111-8111-111111111112', 'user', 'algo', 'dddddddd-0000-4000-8000-0000000000d1');
select is((select count(*) from public.messages where friendship_id is not null), 1::bigint,
  'A friendship that is not the writer''s is left empty on the message');

-- ── the panel reads them ────────────────────────────────────────────────────
select pg_temp.act_as('bbbbbbbb-0000-4000-8000-0000000000b1');
select throws_ok($$select * from public.admin_screens(current_date - 7, current_date)$$, '42501', 'not_admin', 'A person cannot read the screens');

select pg_temp.act_as('aaaaaaaa-0000-4000-8000-0000000000a1');
select is((public.admin_friendship('dddddddd-0000-4000-8000-0000000000d1') -> 'chat' -> 0 ->> 'text'),
  '¿Qué hago con lo de los ritmos?', 'The friendship shows its chat turn');
select ok((public.admin_friendship('dddddddd-0000-4000-8000-0000000000d1') -> 'comparisons' -> 0 ->> 'read_by_other_at') is not null,
  '... and when the other friend read the comparison');

select pg_temp.act_as_owner();
select lives_ok($$delete from auth.users where id = 'bbbbbbbb-0000-4000-8000-0000000000b2'$$,
  'Deleting an account still works with its reads and tagged messages');
select is((select count(*) from public.comparison_reads), 0::bigint, '... and takes its reads with it');

select * from finish();
rollback;
