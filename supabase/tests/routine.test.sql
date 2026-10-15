-- Natus — the routine (v1.2 R-01), adversarially.
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

insert into auth.users (id, instance_id, aud, role, email)
values
  ('aaaaaaaa-0000-4000-8000-000000000001', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'alice@example.test'),
  ('bbbbbbbb-0000-4000-8000-000000000002', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'bob@example.test');

insert into public.routine_practices (user_id, title, body, invitation, cadence, origin)
values ('aaaaaaaa-0000-4000-8000-000000000001', 'De un terapeuta', 'x', '¿x?', 'weekly', 'terapeuta');

select pg_temp.act_as('aaaaaaaa-0000-4000-8000-000000000001');

select lives_ok(
  $$insert into public.routine_practices (user_id, title, body, invitation, cadence, connects_soul_map)
    values ('aaaaaaaa-0000-4000-8000-000000000001', 'Caminar', 'x', '¿x?', 'daily', true)$$,
  'CONTROL: Alice saves the routine the model wrote for her'
);

select throws_ok(
  $$insert into public.routine_practices (user_id, title, body, invitation, cadence, origin)
    values ('aaaaaaaa-0000-4000-8000-000000000001', 'Falsa', 'x', '¿x?', 'daily', 'terapeuta')$$,
  '42501', null,
  'Alice cannot write a practice that claims to come from a therapist'
);

select is(
  (select count(*)::int from public.routine_practices where origin = 'terapeuta' and is_active),
  1,
  'She reads her therapist''s practice'
);

update public.routine_practices set is_active = false where origin = 'terapeuta';
select is(
  (select count(*)::int from public.routine_practices where origin = 'terapeuta' and is_active),
  1,
  'But cannot switch it off: only the model''s practices are hers to change'
);

select pg_temp.act_as('bbbbbbbb-0000-4000-8000-000000000002');
select is((select count(*)::int from public.routine_practices), 0, 'Bob reads none of Alice''s routine');

select * from finish();
rollback;
