-- Natus — one person's full chart in the admin panel (20261024040000).
--
-- Run: supabase test db

begin;

create extension if not exists pgtap with schema extensions;

select plan(5);

create or replace function pg_temp.act_as(uid uuid) returns void as $$
begin
  perform set_config('request.jwt.claims',
    json_build_object('sub', uid::text, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
end;
$$ language plpgsql;

insert into auth.users (id, instance_id, aud, role, email, is_anonymous)
values
  ('aaaaaaaa-0000-4000-8000-0000000000a1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'admin@example.test', false),
  ('bbbbbbbb-0000-4000-8000-0000000000b1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'ana@example.test', false);
insert into public.admins (user_id, role) values ('aaaaaaaa-0000-4000-8000-0000000000a1', 'owner');
insert into public.clients (user_id, legal_birth_name, birth_date, birth_time, birth_city, birth_country)
values ('bbbbbbbb-0000-4000-8000-0000000000b1', 'Ana Pérez', '1990-05-04', '13:20', 'Valparaíso', 'CL');
insert into public.natal_charts (user_id, has_birth_time, chart, calculated_at)
values ('bbbbbbbb-0000-4000-8000-0000000000b1', true,
        '{"points":[{"name":"Sun","sign":"Taurus","degree":13.6,"house":10}]}', '2026-10-20 12:00+00');
insert into public.chart_point_readings (user_id, chart_calculated_at, prompt_version, readings)
values ('bbbbbbbb-0000-4000-8000-0000000000b1', '2026-10-20 12:00+00', 'chart-points-v1.2',
        '[{"point":"Sun","text":"Tu Sol en Tauro."}]');

select pg_temp.act_as('bbbbbbbb-0000-4000-8000-0000000000b1');
select throws_ok($$select public.admin_person_chart('bbbbbbbb-0000-4000-8000-0000000000b1')$$,
  '42501', 'not_admin', 'A person cannot read a chart through the panel, not even their own');

select pg_temp.act_as('aaaaaaaa-0000-4000-8000-0000000000a1');
select is(public.admin_person_chart('bbbbbbbb-0000-4000-8000-0000000000b1') #>> '{chart,points,0,sign}', 'Taurus',
  'An admin reads the stored chart');
select is(public.admin_person_chart('bbbbbbbb-0000-4000-8000-0000000000b1') #>> '{birth,time}', '13:20:00',
  '... with the birth data it was cast from');
select is((public.admin_person_chart('bbbbbbbb-0000-4000-8000-0000000000b1') ->> 'readings_current')::boolean, true,
  '... and Davraz''s readings, said to be of this chart');

reset role;
select ok(exists (select 1 from public.admin_access_log
                  where what = 'person_chart' and subject_id = 'bbbbbbbb-0000-4000-8000-0000000000b1'),
  'The look is logged');

select * from finish();
rollback;
