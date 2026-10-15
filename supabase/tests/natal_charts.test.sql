-- Natus — the calculated chart (v1.2 A-01), adversarially.
begin;
create extension if not exists pgtap with schema extensions;
select plan(4);

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

insert into public.natal_charts (user_id, has_birth_time, chart)
values ('aaaaaaaa-0000-4000-8000-000000000001', true, '{"version":"whole-sign-v1"}');

select pg_temp.act_as('aaaaaaaa-0000-4000-8000-000000000001');
select is((select count(*)::int from public.natal_charts), 1, 'CONTROL: Alice reads her own chart');
select throws_ok(
  $$update public.natal_charts set has_birth_time = false$$,
  '42501', null, 'Alice cannot rewrite her chart: only the function calculates it'
);
select throws_ok(
  $$insert into public.natal_charts (user_id, has_birth_time, chart)
    values ('bbbbbbbb-0000-4000-8000-000000000002', true, '{}')$$,
  '42501', null, 'Nor write one for somebody else'
);

select pg_temp.act_as('bbbbbbbb-0000-4000-8000-000000000002');
select is((select count(*)::int from public.natal_charts), 0, 'Bob cannot read Alice''s chart');

select * from finish();
rollback;
