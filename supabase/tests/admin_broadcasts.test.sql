-- Natus — messages to many from the panel's Sugerencias (20261027220000).
--
-- Run: supabase test db

begin;

create extension if not exists pgtap with schema extensions;

select plan(14);

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
  ('bbbbbbbb-0000-4000-8000-0000000000b1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'ana@example.test', false),
  ('bbbbbbbb-0000-4000-8000-0000000000b2', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'beto@example.test', false),
  ('cccccccc-0000-4000-8000-0000000000c1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', null, true);
insert into public.admins (user_id, role) values ('aaaaaaaa-0000-4000-8000-0000000000a1', 'owner');
insert into public.clients (user_id, legal_birth_name, country) values
  ('bbbbbbbb-0000-4000-8000-0000000000b1', 'Ana', 'MX'),
  ('bbbbbbbb-0000-4000-8000-0000000000b2', 'Beto', 'CL');
-- Ana wrote a suggestion; Beto never did.
insert into public.feedback_messages (user_id, author, body, created_at) values
  ('bbbbbbbb-0000-4000-8000-0000000000b1', 'person', 'No encuentro mi ciudad', now() - interval '1 hour');

select pg_temp.act_as('bbbbbbbb-0000-4000-8000-0000000000b1');
select throws_ok($$select public.admin_broadcast_send('hola', 2)$$, '42501', 'not_admin', 'A person cannot send to everybody');
select throws_ok($$select * from public.admin_broadcasts()$$, '42501', 'not_admin', 'Nor read the messages to many');

select pg_temp.act_as('aaaaaaaa-0000-4000-8000-0000000000a1');
select is(public.admin_broadcast_audience(), 2::bigint, 'Everybody: the two accounts, not the team nor the anonymous visitor');
select throws_ok($$select public.admin_broadcast_send('Hola a todos', 5)$$, '40001', 'audience_changed',
  'Nothing goes when the number confirmed is not the number now');
select is(public.admin_broadcast_send('Hola a todos', 2), 2::bigint, 'It goes to the two');
select is((select recipients from public.admin_broadcasts()), 2::bigint, 'One message to many, reaching two');
select is((select seen from public.admin_broadcasts()), 0::bigint, '... nobody opened it yet');
select is((select count(*) from public.admin_feedback_inbox()), 1::bigint,
  'The conversations keep only Ana, who wrote; Beto has only the message to many');

-- Beto opens it in the app and answers.
select pg_temp.act_as('bbbbbbbb-0000-4000-8000-0000000000b2');
select public.feedback_mark_read();
reset role; -- written a minute later, which a test's single instant cannot show
insert into public.feedback_messages (user_id, author, body, created_at)
values ('bbbbbbbb-0000-4000-8000-0000000000b2', 'person', 'Gracias', now() + interval '1 minute');

select pg_temp.act_as('aaaaaaaa-0000-4000-8000-0000000000a1');
select is((select seen from public.admin_broadcasts()), 1::bigint, 'Beto opened it');
select is((select answered from public.admin_broadcasts()), 1::bigint, '... and answered');
select is((select count(*) from public.admin_feedback_inbox()), 2::bigint, 'His answer makes it a conversation');
select ok((select read_at is not null from public.admin_feedback_thread('bbbbbbbb-0000-4000-8000-0000000000b2') where author = 'team'),
  'His thread says when he saw the team''s message');

select public.admin_segment_set('{"countries":["MX"]}');
select is(public.admin_broadcast_audience(), 1::bigint, 'With a segment, only those in it');
select is(public.admin_broadcast_send('Solo México', 1), 1::bigint, '... and it goes only to them');

select * from finish();
rollback;
