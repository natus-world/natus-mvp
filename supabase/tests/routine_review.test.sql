-- Natus — routine change proposals (v1.2 R-04), adversarially.
begin;
create extension if not exists pgtap with schema extensions;
select plan(6);

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

insert into public.routine_change_proposals (id, user_id, trigger, proposal, prompt_version) values
  ('99999999-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000001', 'weekly', '{}', 't'),
  ('99999999-0000-4000-8000-000000000002', 'aaaaaaaa-0000-4000-8000-000000000001', 'weekly', '{}', 't');

select pg_temp.act_as('aaaaaaaa-0000-4000-8000-000000000001');

select throws_ok(
  $$insert into public.routine_change_proposals (user_id, trigger, proposal, prompt_version)
    values ('aaaaaaaa-0000-4000-8000-000000000001', 'weekly', '{}', 't')$$,
  '42501', null,
  'Alice cannot write herself a proposal'
);

update public.routine_change_proposals set status = 'accepted', responded_at = now()
  where id = '99999999-0000-4000-8000-000000000001';
select is((select status from public.routine_change_proposals where id = '99999999-0000-4000-8000-000000000001'),
  'accepted', 'She accepts a pending one');

update public.routine_change_proposals set status = 'rejected'
  where id = '99999999-0000-4000-8000-000000000001';
select is((select status from public.routine_change_proposals where id = '99999999-0000-4000-8000-000000000001'),
  'accepted', 'An answered proposal stays answered');

select throws_ok(
  $$update public.routine_change_proposals set status = 'no_change' where id = '99999999-0000-4000-8000-000000000002'$$,
  '42501', null,
  'She can only accept or keep her routine'
);

select throws_ok(
  $$update public.routine_change_proposals set proposal = '{"add": []}' where id = '99999999-0000-4000-8000-000000000002'$$,
  '42501', null,
  'She cannot rewrite what was proposed'
);

select pg_temp.act_as('bbbbbbbb-0000-4000-8000-000000000002');
select is((select count(*)::int from public.routine_change_proposals), 0, 'Bob sees none of Alice''s proposals');

select * from finish();
rollback;
