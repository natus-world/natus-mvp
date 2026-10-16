-- Natus — the memory (v1.2 M-01), adversarially.
begin;
create extension if not exists pgtap with schema extensions;
select plan(13);

create or replace function pg_temp.act_as(uid uuid) returns void as $$
begin
  perform set_config('request.jwt.claims',
    json_build_object('sub', uid::text, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
end;
$$ language plpgsql;

create or replace function pg_temp.as_server() returns void as $$
begin
  execute 'reset role';
  perform set_config('request.jwt.claims', json_build_object('role', 'service_role')::text, true);
end;
$$ language plpgsql;

insert into auth.users (id, instance_id, aud, role, email)
values
  ('aaaaaaaa-0000-4000-8000-000000000001', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'alice@example.test'),
  ('bbbbbbbb-0000-4000-8000-000000000002', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'bob@example.test');

insert into public.journal_entries (id, user_id, entry_date, body) values
  ('eeeeeeee-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000001', '2026-10-16', 'Caminé y me hizo bien.'),
  ('eeeeeeee-0000-4000-8000-000000000002', 'aaaaaaaa-0000-4000-8000-000000000001', '2026-10-15', 'Me cuesta dormir.');

-- What the function writes: an item resting on one entry, one on two, and
-- one the person will correct.
select pg_temp.as_server();
insert into public.memory_items (id, user_id, category, content) values
  ('11111111-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000001', 'le_funciona', 'Caminar le hace bien.'),
  ('11111111-0000-4000-8000-000000000002', 'aaaaaaaa-0000-4000-8000-000000000001', 'tema_recurrente', 'El sueño.'),
  ('11111111-0000-4000-8000-000000000003', 'aaaaaaaa-0000-4000-8000-000000000001', 'contexto', 'Vive sola.');
insert into public.memory_item_sources (memory_item_id, user_id, journal_entry_id) values
  ('11111111-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000001', 'eeeeeeee-0000-4000-8000-000000000001'),
  ('11111111-0000-4000-8000-000000000002', 'aaaaaaaa-0000-4000-8000-000000000001', 'eeeeeeee-0000-4000-8000-000000000001'),
  ('11111111-0000-4000-8000-000000000002', 'aaaaaaaa-0000-4000-8000-000000000001', 'eeeeeeee-0000-4000-8000-000000000002'),
  ('11111111-0000-4000-8000-000000000003', 'aaaaaaaa-0000-4000-8000-000000000001', 'eeeeeeee-0000-4000-8000-000000000001');

select is((select edited_by_user from public.memory_items where id = '11111111-0000-4000-8000-000000000001'), false,
  'What the function writes is not marked as the person''s');

select throws_ok(
  $$insert into public.memory_item_sources (memory_item_id, user_id, journal_entry_id, conversation_id)
    values ('11111111-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000001',
            'eeeeeeee-0000-4000-8000-000000000002', null),
           ('11111111-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000001', null, null)$$,
  '23514', null,
  'A source names exactly one origin'
);

-- ── the person ─────────────────────────────────────────────────────────────
select pg_temp.act_as('aaaaaaaa-0000-4000-8000-000000000001');

select is((select count(*)::int from public.memory_items), 3, 'Alice sees her memory');

update public.memory_items set content = 'Vive con su hermana.' where id = '11111111-0000-4000-8000-000000000003';
select is((select edited_by_user from public.memory_items where id = '11111111-0000-4000-8000-000000000003'), true,
  'Correcting an item makes it hers');

select throws_ok(
  $$update public.memory_items set edited_by_user = false where id = '11111111-0000-4000-8000-000000000003'$$,
  '42501', null,
  'She cannot unmark it, so the model could rewrite it'
);

insert into public.memory_items (user_id, category, content)
values ('aaaaaaaa-0000-4000-8000-000000000001', 'contexto', 'Trabaja de noche.');
select is((select edited_by_user from public.memory_items where content = 'Trabaja de noche.'), true,
  'What she adds is hers');

select throws_ok(
  $$insert into public.memory_item_sources (memory_item_id, user_id, journal_entry_id)
    values ('11111111-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000001', 'eeeeeeee-0000-4000-8000-000000000002')$$,
  '42501', null,
  'She cannot invent where an item came from'
);

-- Deleting the entry both rest on.
delete from public.journal_entries where id = 'eeeeeeee-0000-4000-8000-000000000001';

select is((select count(*)::int from public.memory_items where id = '11111111-0000-4000-8000-000000000001'), 0,
  'An item that rested only on the deleted entry goes with it');
select is((select count(*)::int from public.memory_items where id = '11111111-0000-4000-8000-000000000002'), 1,
  'An item with another source stays');
select is((select count(*)::int from public.memory_items where id = '11111111-0000-4000-8000-000000000003'), 1,
  'An item she corrected stays, though its only source went');

delete from public.memory_items where id = '11111111-0000-4000-8000-000000000002';
select is((select count(*)::int from public.memory_items where id = '11111111-0000-4000-8000-000000000002'), 0,
  'She can delete anything in it');

-- ── somebody else ──────────────────────────────────────────────────────────
select pg_temp.act_as('bbbbbbbb-0000-4000-8000-000000000002');

select is((select count(*)::int from public.memory_items), 0, 'Bob sees none of Alice''s memory');
select is((select count(*)::int from public.memory_item_sources), 0, 'nor where it came from');

select * from finish();
rollback;
