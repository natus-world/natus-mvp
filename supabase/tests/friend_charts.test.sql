-- Natus — «Las dos cartas»: a friend's chart, readable only while friends.
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

create or replace function pg_temp.act_as_owner() returns void as $$
begin
  execute 'reset role';
  perform set_config('request.jwt.claims', '', true);
end;
$$ language plpgsql;

insert into auth.users (id, instance_id, aud, role, email)
values
  ('aaaaaaaa-0000-4000-8000-0000000000a1', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'ana@example.test'),
  ('bbbbbbbb-0000-4000-8000-0000000000b2', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'beto@example.test'),
  ('cccccccc-0000-4000-8000-0000000000c3', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'carla@example.test');

insert into public.natal_charts (user_id, has_birth_time, chart)
values
  ('aaaaaaaa-0000-4000-8000-0000000000a1', true, '{"who":"ana"}'),
  ('bbbbbbbb-0000-4000-8000-0000000000b2', true, '{"who":"beto"}'),
  ('cccccccc-0000-4000-8000-0000000000c3', true, '{"who":"carla"}');

insert into public.friendships (id, requester_id, addressee_id, status, responded_at)
values
  ('f0000000-0000-4000-8000-0000000000f1', 'aaaaaaaa-0000-4000-8000-0000000000a1',
   'bbbbbbbb-0000-4000-8000-0000000000b2', 'accepted', now());

select pg_temp.act_as('aaaaaaaa-0000-4000-8000-0000000000a1');

select is(
  public.friend_charts('f0000000-0000-4000-8000-0000000000f1'),
  '{"mine":{"who":"ana"},"theirs":{"who":"beto"}}'::jsonb,
  'CONTROL: Ana reads her chart and Beto''s while they are friends'
);

select pg_temp.act_as('bbbbbbbb-0000-4000-8000-0000000000b2');

select is(
  public.friend_charts('f0000000-0000-4000-8000-0000000000f1'),
  '{"mine":{"who":"beto"},"theirs":{"who":"ana"}}'::jsonb,
  'CONTROL: Beto reads the same friendship from his side'
);

select pg_temp.act_as('cccccccc-0000-4000-8000-0000000000c3');

select is(
  public.friend_charts('f0000000-0000-4000-8000-0000000000f1'),
  null,
  'Carla, who is not in the friendship, reads nothing'
);

select is_empty(
  'select 1 from public.natal_charts where user_id <> auth.uid()',
  'Nobody reads another person''s chart from the table itself'
);

select pg_temp.act_as_owner();
update public.friendships set status = 'removed', ended_by = 'aaaaaaaa-0000-4000-8000-0000000000a1'
where id = 'f0000000-0000-4000-8000-0000000000f1';

select pg_temp.act_as('bbbbbbbb-0000-4000-8000-0000000000b2');

select is(
  public.friend_charts('f0000000-0000-4000-8000-0000000000f1'),
  null,
  'Once the friendship ends, the chart is not shown on the next read'
);

select pg_temp.act_as_owner();

select ok(
  not has_function_privilege('anon', 'public.friend_charts(uuid)', 'execute'),
  'Somebody without a session cannot call it'
);

select ok(
  has_function_privilege('authenticated', 'public.friend_charts(uuid)', 'execute'),
  'CONTROL: a signed-in person can'
);

select * from finish();
rollback;
