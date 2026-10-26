-- Natus — «Macro datos» in the admin panel (20261026010000).
--
-- Run: supabase test db

begin;

create extension if not exists pgtap with schema extensions;

select plan(7);

create or replace function pg_temp.act_as(uid uuid) returns void as $$
begin
  perform set_config('request.jwt.claims',
    json_build_object('sub', uid::text, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
end;
$$ language plpgsql;

insert into auth.users (id, instance_id, aud, role, email, is_anonymous, created_at)
values
  ('aaaaaaaa-0000-4000-8000-0000000000a1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'nico@example.test', false, now() - interval '30 days'),
  ('bbbbbbbb-0000-4000-8000-0000000000b1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'ana@example.test', false, now() - interval '20 days'),
  ('bbbbbbbb-0000-4000-8000-0000000000b2', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'beto@example.test', false, now() - interval '2 days');
insert into public.admins (user_id, role) values ('aaaaaaaa-0000-4000-8000-0000000000a1', 'owner');
insert into public.clients (user_id, legal_birth_name, country) values
  ('bbbbbbbb-0000-4000-8000-0000000000b1', 'Ana', 'MX'),
  ('bbbbbbbb-0000-4000-8000-0000000000b2', 'Beto', 'CL');
-- The account steps the clients trigger wrote carry today's date; start clean.
delete from public.funnel_events;
insert into public.funnel_events (user_id, step, dedupe_key, occurred_at) values
  ('bbbbbbbb-0000-4000-8000-0000000000b1', 'account_created', 'ac', now() - interval '20 days'),
  ('bbbbbbbb-0000-4000-8000-0000000000b2', 'account_created', 'ac', now() - interval '2 days'),
  ('bbbbbbbb-0000-4000-8000-0000000000b1', 'app_opened', 'ao', now() - interval '1 day'),
  ('aaaaaaaa-0000-4000-8000-0000000000a1', 'app_opened', 'ao', now() - interval '1 day');

select pg_temp.act_as('bbbbbbbb-0000-4000-8000-0000000000b1');
select throws_ok($$select * from public.admin_macro(current_date - 6, current_date)$$, '42501', 'not_admin',
  'A person cannot read the macro numbers');

select pg_temp.act_as('aaaaaaaa-0000-4000-8000-0000000000a1');
select is((select accounts_total from public.admin_macro(current_date - 6, current_date)), 2::bigint, 'Every account but the team');
select is((select accounts_new from public.admin_macro(current_date - 6, current_date)), 1::bigint, 'One made this week');
select is((select returned from public.admin_macro(current_date - 6, current_date)), 1::bigint,
  'Ana, from before, came back this week');
select is((select active from public.admin_macro(current_date - 6, current_date)), 1::bigint,
  'Active: Ana; the admin who opened it does not count');

select public.admin_segment_set('{"countries":["CL"]}');
select is((select accounts_total from public.admin_macro(current_date - 6, current_date)), 1::bigint,
  'The segment applies: only Beto lives in Chile');
select is((select returned from public.admin_macro(current_date - 6, current_date)), 0::bigint, '... and he did not come back yet');

select * from finish();
rollback;
