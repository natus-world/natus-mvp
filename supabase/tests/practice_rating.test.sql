-- Natus — rating a practice (v1.2 R-03), adversarially.
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

select pg_temp.act_as('aaaaaaaa-0000-4000-8000-000000000001');

select lives_ok(
  $$insert into public.recommendation_checkins (user_id, practice_title, checked_on, rating, comment)
    values ('aaaaaaaa-0000-4000-8000-000000000001', 'Caminar', '2026-10-15', 4, 'Me ordenó la cabeza.')$$,
  'CONTROL: Alice marks a practice and says it helped'
);

select lives_ok(
  $$insert into public.recommendation_checkins (user_id, practice_title, checked_on)
    values ('aaaaaaaa-0000-4000-8000-000000000001', 'Respirar', '2026-10-15')$$,
  'Marking without rating is still allowed'
);

select throws_ok(
  $$insert into public.recommendation_checkins (user_id, practice_title, checked_on, rating)
    values ('aaaaaaaa-0000-4000-8000-000000000001', 'Leer', '2026-10-15', 6)$$,
  '23514', null,
  'A rating above 5 is refused'
);

select throws_ok(
  $$insert into public.recommendation_checkins (user_id, practice_title, checked_on, rating, comment)
    values ('aaaaaaaa-0000-4000-8000-000000000001', 'Escribir', '2026-10-15', 3, '')$$,
  '23514', null,
  'An empty comment is refused: no comment is null'
);

select pg_temp.act_as('bbbbbbbb-0000-4000-8000-000000000002');

select is(
  (select count(*)::int from public.recommendation_checkins where comment is not null),
  0,
  'Bob cannot read Alice''s comment'
);

reset role;
select lives_ok(
  $$insert into public.crisis_events (user_id, severity, category, source_surface)
    values ('aaaaaaaa-0000-4000-8000-000000000001', 'low', 'ideacion', 'practice_comment')$$,
  'A crisis can come from a practice comment'
);

select * from finish();
rollback;
