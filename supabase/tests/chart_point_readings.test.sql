-- Natus — Davraz's readings of the full chart (package 05), adversarially.
begin;
create extension if not exists pgtap with schema extensions;
select plan(8);

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

insert into public.chart_point_readings (user_id, chart_calculated_at, prompt_version, readings)
values ('aaaaaaaa-0000-4000-8000-000000000001', now(), 'chart-points-v1.0',
        '[{"point":"Sun","text":"Tu Sol en Géminis sugiere curiosidad."}]');

select throws_ok(
  $$insert into public.chart_point_readings (user_id, chart_calculated_at, prompt_version, readings)
    values ('bbbbbbbb-0000-4000-8000-000000000002', now(), 't', '{}')$$,
  '23514', null, 'CONTROL: the readings are a list'
);

select pg_temp.act_as('aaaaaaaa-0000-4000-8000-000000000001');
select is((select count(*)::int from public.chart_point_readings), 1, 'CONTROL: Alice reads her own readings');
select throws_ok(
  $$update public.chart_point_readings set readings = '[]'$$,
  '42501', null, 'Alice cannot rewrite them: only the function writes them'
);
select throws_ok(
  $$insert into public.chart_point_readings (user_id, chart_calculated_at, prompt_version, readings)
    values ('bbbbbbbb-0000-4000-8000-000000000002', now(), 't', '[]')$$,
  '42501', null, 'Nor write some for somebody else'
);
select throws_ok(
  $$delete from public.chart_point_readings$$,
  '42501', null, 'Nor delete them'
);

select pg_temp.act_as('bbbbbbbb-0000-4000-8000-000000000002');
select is((select count(*)::int from public.chart_point_readings), 0, 'Bob cannot read Alice''s readings');

reset role;
select lives_ok(
  $$insert into public.claude_api_calls (user_id, purpose, prompt_version, model, mode, outcome)
    values ('aaaaaaaa-0000-4000-8000-000000000001', 'chart_points', 'chart-points-v1.0', 'claude-sonnet-5-5', 'server', 'ok')$$,
  'The ledger takes the new purpose'
);

delete from auth.users where id = 'aaaaaaaa-0000-4000-8000-000000000001';
select is((select count(*)::int from public.chart_point_readings where user_id = 'aaaaaaaa-0000-4000-8000-000000000001'), 0,
  'Deleting the account deletes the readings');

select * from finish();
rollback;
