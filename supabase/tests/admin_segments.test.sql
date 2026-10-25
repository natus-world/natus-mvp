-- Natus — segments in the admin panel (20261025010000).
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

insert into auth.users (id, instance_id, aud, role, email, is_anonymous)
values
  ('aaaaaaaa-0000-4000-8000-0000000000a1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'nico@example.test', false),
  ('aaaaaaaa-0000-4000-8000-0000000000a2', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'socio@example.test', false),
  ('bbbbbbbb-0000-4000-8000-0000000000b1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'ana@example.test', false),
  ('bbbbbbbb-0000-4000-8000-0000000000b2', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'beto@example.test', false),
  ('bbbbbbbb-0000-4000-8000-0000000000b3', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'carla@example.test', false),
  ('cccccccc-0000-4000-8000-0000000000c1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', null, true);
insert into public.admins (user_id, role) values
  ('aaaaaaaa-0000-4000-8000-0000000000a1', 'owner'),
  ('aaaaaaaa-0000-4000-8000-0000000000a2', 'admin');
-- Ana lives in Mexico, born there, 30; Beto lives in Spain, born in Chile, 50; Carla lives in Chile, 22.
insert into public.clients (user_id, legal_birth_name, birth_date, birth_country, country, grammatical_gender) values
  ('bbbbbbbb-0000-4000-8000-0000000000b1', 'Ana', current_date - interval '30 years 2 months', 'MX', 'MX', 'femenino'),
  ('bbbbbbbb-0000-4000-8000-0000000000b2', 'Beto', current_date - interval '50 years 2 months', 'CL', 'ES', 'masculino'),
  ('bbbbbbbb-0000-4000-8000-0000000000b3', 'Carla', current_date - interval '22 years 2 months', 'CL', 'CL', 'femenino');
-- An anonymous visitor from Mexico, still in the onboarding.
insert into public.anonymous_sessions (user_id, country, birth_date, grammatical_gender, expires_at)
values ('cccccccc-0000-4000-8000-0000000000c1', 'MX', current_date - interval '27 years', 'femenino', now() + interval '7 days');

select pg_temp.act_as('bbbbbbbb-0000-4000-8000-0000000000b1');
select throws_ok($$select public.admin_segment_set('{"countries":["MX"]}')$$, '42501', 'not_admin', 'A person cannot set a segment');
select throws_ok($$select * from public.admin_who()$$, '42501', 'not_admin', 'Nor read «Quiénes son»');

select pg_temp.act_as('aaaaaaaa-0000-4000-8000-0000000000a1');
select is((select total from public.admin_segment_count()), 3::bigint, 'Without a segment: every account but the team');
select throws_ok($$select public.admin_segment_set('{"countries":["Mexico"]}')$$, '22023', 'bad_segment', 'A country is two capital letters');
select throws_ok($$select public.admin_segment_set('{"sex":"f"}')$$, '22023', 'bad_segment', 'Only the four keys');
select is(public.admin_segment_set('{"countries":["MX"]}'), '{"place":"vive","countries":["MX"]}'::jsonb,
  'A country without a place means where they live');
select is((select in_segment from public.admin_segment_count()), 1::bigint, 'Living in Mexico: Ana');
reset role; -- the claims stay: auth.uid() is still the admin
select is(public.is_internal_user('bbbbbbbb-0000-4000-8000-0000000000b2'), true, 'Beto is out of this view');
select is(public.is_internal_user('cccccccc-0000-4000-8000-0000000000c1'), false,
  'An anonymous visitor from Mexico is inside it, by their session');
select pg_temp.act_as('aaaaaaaa-0000-4000-8000-0000000000a1');
select is((select count(*) from public.admin_people_list()), 1::bigint, 'The people list follows the segment');

select public.admin_segment_set('{"place":"nacio","countries":["CL"],"age":"45-54"}');
select is((select in_segment from public.admin_segment_count()), 1::bigint, 'Born in Chile and 45 to 54: Beto');

select pg_temp.act_as('aaaaaaaa-0000-4000-8000-0000000000a2');
select is(public.admin_segment_get(), '{}'::jsonb, 'Each admin has their own segment');
select is((select in_segment from public.admin_segment_count()), 3::bigint, '... and the other admin sees everybody');

select pg_temp.act_as('aaaaaaaa-0000-4000-8000-0000000000a1');
select is((select accounts from public.admin_who(true) where dimension = 'genero' and value = 'femenino'), 2::bigint,
  '«Quiénes son» for the menus ignores the segment');
select is((select accounts from public.admin_who() where dimension = 'vive' and value = 'ES'), 1::bigint,
  '... and the page keeps it');
select public.admin_segment_set('{}');
select is(public.admin_segment_get(), '{}'::jsonb, 'An empty segment clears it');

select * from finish();
rollback;
