-- Natus — friends (v1.2 C-01), adversarially.
--
-- Same discipline as rls.test.sql: every negative has a control beside it that
-- proves the same call works for the person entitled to it.
--
-- Run: supabase test db

begin;

create extension if not exists pgtap with schema extensions;

select plan(22);

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

-- Alice and Bob have accounts. Carol is a visitor who has not signed up.
insert into auth.users (id, instance_id, aud, role, email)
values
  ('aaaaaaaa-0000-4000-8000-000000000001', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'alice@example.test'),
  ('bbbbbbbb-0000-4000-8000-000000000002', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'bob@example.test'),
  ('cccccccc-0000-4000-8000-000000000003', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', null);

insert into public.clients (user_id, email, legal_birth_name, clinical_ideation_6m)
values
  ('aaaaaaaa-0000-4000-8000-000000000001', 'alice@example.test', 'Alice Andrea Soto', 'frecuentes'),
  ('bbbbbbbb-0000-4000-8000-000000000002', 'bob@example.test', 'Bob Rojas', 'no');

create temp table t (k text primary key, v text);
grant all on t to authenticated;

-- ── the link ─────────────────────────────────────────────────────────────────

select pg_temp.act_as('aaaaaaaa-0000-4000-8000-000000000001');

insert into t values ('alice_token', public.my_invite_token());

select is(
  public.my_invite_token(),
  (select v from t where k = 'alice_token'),
  'CONTROL: Alice has one live link, and asking again returns the same one'
);

select pg_temp.act_as('cccccccc-0000-4000-8000-000000000003');

select throws_ok(
  'select public.my_invite_token()',
  '42501',
  null,
  'A visitor without an account cannot make an invitation'
);

-- ── what the link shows ──────────────────────────────────────────────────────

select pg_temp.act_as('bbbbbbbb-0000-4000-8000-000000000002');

select is(
  (select inviter_first_name from public.invite_preview((select v from t where k = 'alice_token'))),
  'Alice',
  'Opening the link shows the first name of who invited, and only that'
);

select is(
  (select valid from public.invite_preview((select v from t where k = 'alice_token'))),
  true,
  'CONTROL: a live link reads as valid'
);

select is(
  (select count(*)::int from public.invite_preview('not-a-token')),
  0,
  'A made-up token shows nothing'
);

-- ── accepting ────────────────────────────────────────────────────────────────

select pg_temp.act_as('cccccccc-0000-4000-8000-000000000003');

select throws_ok(
  format('select public.accept_friend_invite(%L)', (select v from t where k = 'alice_token')),
  '42501',
  null,
  'A visitor without an account cannot accept: they sign up first'
);

select pg_temp.act_as('aaaaaaaa-0000-4000-8000-000000000001');

select throws_ok(
  format('select public.accept_friend_invite(%L)', (select v from t where k = 'alice_token')),
  '22023',
  null,
  'Alice cannot accept her own link'
);

select pg_temp.act_as('bbbbbbbb-0000-4000-8000-000000000002');

select lives_ok(
  format('select public.accept_friend_invite(%L)', (select v from t where k = 'alice_token')),
  'CONTROL: Bob accepts Alice''s link'
);

select is(
  (select first_name from public.my_friends()),
  'Alice',
  'Bob sees Alice among his friends, by first name'
);

select is(
  (select already_friends from public.invite_preview((select v from t where k = 'alice_token'))),
  true,
  'The link now tells Bob they are already friends'
);

select lives_ok(
  format('select public.accept_friend_invite(%L)', (select v from t where k = 'alice_token')),
  'Accepting twice does not make a second friendship'
);

select is(
  (select count(*)::int from public.friendships),
  1,
  'There is exactly one friendship between them'
);

insert into t values ('fid', (select id::text from public.friendships));

select pg_temp.act_as('aaaaaaaa-0000-4000-8000-000000000001');

select is(
  (select first_name from public.my_friends()),
  'Bob',
  'Alice sees Bob too: a friendship is one row, read from both sides'
);

-- ── what nobody may do by hand ──────────────────────────────────────────────

select pg_temp.act_as('bbbbbbbb-0000-4000-8000-000000000002');

select throws_ok(
  $$insert into public.friendships (requester_id, addressee_id, status)
    values ('bbbbbbbb-0000-4000-8000-000000000002', 'cccccccc-0000-4000-8000-000000000003', 'accepted')$$,
  '42501',
  null,
  'Bob cannot write a friendship directly, so he cannot befriend Carol without her'
);

select throws_ok(
  $$update public.friendships set status = 'accepted'$$,
  '42501',
  null,
  'Nor change one'
);

select throws_ok(
  $$select public.first_name_of('aaaaaaaa-0000-4000-8000-000000000001')$$,
  '42501',
  null,
  'Nobody can look up a name by user id'
);

select is(
  (select count(*)::int from public.clients where user_id = 'aaaaaaaa-0000-4000-8000-000000000001'),
  0,
  'Being friends does not open Alice''s profile, clinical answers included'
);

select pg_temp.act_as('cccccccc-0000-4000-8000-000000000003');

select is(
  (select count(*)::int from public.friendships),
  0,
  'Carol cannot see that Alice and Bob are friends'
);

-- ── a new link retires the old one ──────────────────────────────────────────

select pg_temp.act_as('aaaaaaaa-0000-4000-8000-000000000001');
select public.renew_invite_token();

select pg_temp.act_as('bbbbbbbb-0000-4000-8000-000000000002');

select is(
  (select valid from public.invite_preview((select v from t where k = 'alice_token'))),
  false,
  'After Alice renews her link, the old one reads as no longer valid'
);

-- ── ending it ────────────────────────────────────────────────────────────────

select pg_temp.act_as('cccccccc-0000-4000-8000-000000000003');

select throws_ok(
  format('select public.end_friendship(%L)', (select v from t where k = 'fid')),
  'P0002',
  null,
  'Carol cannot end a friendship she is not part of'
);

select pg_temp.act_as('bbbbbbbb-0000-4000-8000-000000000002');

select lives_ok(
  format('select public.end_friendship(%L)', (select v from t where k = 'fid')),
  'CONTROL: Bob can end it'
);

select pg_temp.act_as('aaaaaaaa-0000-4000-8000-000000000001');

select is(
  (select count(*)::int from public.my_friends()),
  0,
  'Once Bob ends it, Alice no longer has him as a friend'
);

select * from finish();

rollback;
