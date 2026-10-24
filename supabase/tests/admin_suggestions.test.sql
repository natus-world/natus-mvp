-- Natus — the team's suggestions inside the admin panel.
--
-- Run: supabase test db

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

insert into auth.users (id, instance_id, aud, role, email, is_anonymous)
values
  ('aaaaaaaa-0000-4000-8000-0000000000a1', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'nico@example.test', false),
  ('aaaaaaaa-0000-4000-8000-0000000000a2', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'socio@example.test', false),
  ('bbbbbbbb-0000-4000-8000-0000000000b1', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'persona@example.test', false);
insert into public.admins (user_id, role) values
  ('aaaaaaaa-0000-4000-8000-0000000000a1', 'owner'),
  ('aaaaaaaa-0000-4000-8000-0000000000a2', 'admin');

select pg_temp.act_as('bbbbbbbb-0000-4000-8000-0000000000b1');
select throws_ok($$select * from public.admin_suggestions_list()$$, '42501', 'not_admin', 'A person cannot read the team''s suggestions');
select throws_ok($$select public.admin_suggestion_add('pulso', 'hola')$$, '42501', 'not_admin', 'Nor write one');

select pg_temp.act_as('aaaaaaaa-0000-4000-8000-0000000000a2');
select lives_ok($$select public.admin_suggestion_add('pagan', 'Pondría primero cuánto entra este mes')$$, 'An admin leaves a suggestion');
select throws_ok($$select public.admin_suggestion_add('pagan', '   ')$$, '23514', null, 'An empty one is refused');

select pg_temp.act_as('bbbbbbbb-0000-4000-8000-0000000000b1');
select throws_ok($$select count(*) from public.admin_suggestions$$, '42501', null, 'A person cannot read the table directly');

select pg_temp.act_as('aaaaaaaa-0000-4000-8000-0000000000a1');
select is((select count(*) from public.admin_suggestions_list()), 1::bigint, 'Every admin reads them all');
select is((select mine from public.admin_suggestions_list() limit 1), false, '... and knows it is not theirs');
select throws_ok(
  $$select public.admin_suggestion_delete((select id from public.admin_suggestions_list() limit 1))$$,
  '42501', 'not_yours', 'Nobody deletes another admin''s suggestion');

select pg_temp.act_as('aaaaaaaa-0000-4000-8000-0000000000a2');
select lives_ok($$select public.admin_suggestion_delete((select id from public.admin_suggestions_list() limit 1))$$,
  'Each admin deletes their own');

select * from finish();
rollback;
