-- Natus — «Pregúntale a las dos cartas» (20261028010000): one conversation
-- per map and friendship, apart from the Chat's and the chart's.
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
  ('bbbbbbbb-0000-4000-8000-0000000000b1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'ana@example.test', false),
  ('bbbbbbbb-0000-4000-8000-0000000000b2', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'beto@example.test', false),
  ('bbbbbbbb-0000-4000-8000-0000000000b3', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'carla@example.test', false);
insert into public.friendships (id, requester_id, addressee_id, status, responded_at) values
  ('dddddddd-0000-4000-8000-0000000000d1', 'bbbbbbbb-0000-4000-8000-0000000000b1', 'bbbbbbbb-0000-4000-8000-0000000000b2', 'accepted', now()),
  ('dddddddd-0000-4000-8000-0000000000d2', 'bbbbbbbb-0000-4000-8000-0000000000b1', 'bbbbbbbb-0000-4000-8000-0000000000b3', 'accepted', now()),
  ('dddddddd-0000-4000-8000-0000000000d3', 'bbbbbbbb-0000-4000-8000-0000000000b2', 'bbbbbbbb-0000-4000-8000-0000000000b3', 'accepted', now());
insert into public.soul_map_syntheses (id, user_id, prompt_version, synthesis, mode)
values ('cccccccc-0000-4000-8000-0000000000c1', 'bbbbbbbb-0000-4000-8000-0000000000b1', 'v1', '{}'::jsonb, 'fixture');

select pg_temp.act_as('bbbbbbbb-0000-4000-8000-0000000000b1');
insert into public.conversations (id, user_id, synthesis_id, kind) values
  ('eeeeeeee-0000-4000-8000-0000000000e1', 'bbbbbbbb-0000-4000-8000-0000000000b1', 'cccccccc-0000-4000-8000-0000000000c1', 'chat'),
  ('eeeeeeee-0000-4000-8000-0000000000e2', 'bbbbbbbb-0000-4000-8000-0000000000b1', 'cccccccc-0000-4000-8000-0000000000c1', 'carta');

select lives_ok($$
  insert into public.conversations (id, user_id, synthesis_id, kind, friendship_id) values
    ('eeeeeeee-0000-4000-8000-0000000000e3', 'bbbbbbbb-0000-4000-8000-0000000000b1', 'cccccccc-0000-4000-8000-0000000000c1', 'comparacion', 'dddddddd-0000-4000-8000-0000000000d1')
$$, 'Ana keeps a conversation over her comparison with Beto');

select lives_ok($$
  insert into public.conversations (id, user_id, synthesis_id, kind, friendship_id) values
    ('eeeeeeee-0000-4000-8000-0000000000e4', 'bbbbbbbb-0000-4000-8000-0000000000b1', 'cccccccc-0000-4000-8000-0000000000c1', 'comparacion', 'dddddddd-0000-4000-8000-0000000000d2')
$$, '... and another over her comparison with Carla, on the same map');

select throws_ok($$
  insert into public.conversations (user_id, synthesis_id, kind, friendship_id) values
    ('bbbbbbbb-0000-4000-8000-0000000000b1', 'cccccccc-0000-4000-8000-0000000000c1', 'comparacion', 'dddddddd-0000-4000-8000-0000000000d1')
$$, '23505', null, 'Only one per map and friendship');

select throws_ok($$
  insert into public.conversations (user_id, synthesis_id, kind) values
    ('bbbbbbbb-0000-4000-8000-0000000000b1', 'cccccccc-0000-4000-8000-0000000000c1', 'carta')
$$, '23505', null, 'Still one chart conversation per map');

select throws_ok($$
  insert into public.conversations (user_id, synthesis_id, kind, friendship_id) values
    ('bbbbbbbb-0000-4000-8000-0000000000b1', 'cccccccc-0000-4000-8000-0000000000c1', 'carta', 'dddddddd-0000-4000-8000-0000000000d1')
$$, '23514', null, 'Only a comparison conversation carries a friendship');

select throws_ok($$
  insert into public.conversations (user_id, synthesis_id, kind) values
    ('bbbbbbbb-0000-4000-8000-0000000000b1', 'cccccccc-0000-4000-8000-0000000000c1', 'otra')
$$, '23514', null, 'An unknown kind is refused');

-- A friendship that is not hers is a label, not a door: kept empty.
select lives_ok($$
  insert into public.conversations (id, user_id, synthesis_id, kind, friendship_id) values
    ('eeeeeeee-0000-4000-8000-0000000000e5', 'bbbbbbbb-0000-4000-8000-0000000000b1', 'cccccccc-0000-4000-8000-0000000000c1', 'comparacion', 'dddddddd-0000-4000-8000-0000000000d3')
$$, 'A friendship between two others does not refuse the row');
select is((select friendship_id from public.conversations where id = 'eeeeeeee-0000-4000-8000-0000000000e5'), null,
  '... and is not kept on it');

select is((select count(*) from public.conversations), 5::bigint, 'Ana reads her five conversations');

select * from finish();
rollback;
