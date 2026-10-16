-- Natus — the journal (v1.2 B-01), adversarially.
begin;
create extension if not exists pgtap with schema extensions;
select plan(9);

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

select pg_temp.act_as('aaaaaaaa-0000-4000-8000-000000000001');

select lives_ok(
  $$insert into public.journal_entries (id, user_id, entry_date, body, mood)
    values ('11111111-1111-4111-8111-111111111111', 'aaaaaaaa-0000-4000-8000-000000000001', current_date, 'Hoy caminé sin teléfono.', 4)$$,
  'CONTROL: Alice writes in her journal'
);

select throws_ok(
  $$insert into public.journal_entries (user_id, entry_date, body, source)
    values ('aaaaaaaa-0000-4000-8000-000000000001', current_date, 'Dictado', 'voz')$$,
  '42501', null,
  'Alice, on the free plan, cannot write a voice entry: voice is premium'
);

select throws_ok(
  $$insert into public.journal_entries (user_id, entry_date, body, mood)
    values ('aaaaaaaa-0000-4000-8000-000000000001', current_date, 'x', 9)$$,
  '23514', null,
  'A mood outside 1 to 5 is refused'
);

select throws_ok(
  $$insert into public.journal_entries (user_id, entry_date, body)
    values ('bbbbbbbb-0000-4000-8000-000000000002', current_date, 'En nombre de Bob')$$,
  '42501', null,
  'Alice cannot write in Bob''s journal'
);

select pg_temp.act_as('bbbbbbbb-0000-4000-8000-000000000002');
select is((select count(*)::int from public.journal_entries), 0, 'Bob cannot read Alice''s journal');

select pg_temp.act_as('aaaaaaaa-0000-4000-8000-000000000001');
delete from public.journal_entries where id = '11111111-1111-4111-8111-111111111111';
reset role;

select is(
  (select count(*)::int from public.journal_entries where id = '11111111-1111-4111-8111-111111111111'),
  0,
  'Deleting is real: the entry is gone'
);
select is(
  (select event from public.system_audit_log where user_id = 'aaaaaaaa-0000-4000-8000-000000000001'),
  'journal_entry_deleted',
  'and only an event with no content stays'
);

delete from auth.users where id = 'aaaaaaaa-0000-4000-8000-000000000001';
select is(
  (select count(*)::int from public.system_audit_log where user_id = 'aaaaaaaa-0000-4000-8000-000000000001'),
  0,
  'Deleting the account takes the audit trail with it'
);

-- Bob is premium: voice is his.
reset role;
insert into public.subscriptions (user_id, status, activated_at)
  values ('bbbbbbbb-0000-4000-8000-000000000002', 'active', now());
select pg_temp.act_as('bbbbbbbb-0000-4000-8000-000000000002');
select lives_ok(
  $$insert into public.journal_entries (user_id, entry_date, body, source)
    values ('bbbbbbbb-0000-4000-8000-000000000002', current_date, 'Lo dije en voz alta.', 'voz')$$,
  'A premium person writes a voice entry'
);

select * from finish();
rollback;
