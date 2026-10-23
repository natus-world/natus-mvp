-- Natus — which practice a check-in is for (owner, 22 Oct 2026), adversarially.
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

insert into public.routine_practices (id, user_id, title, body, invitation, cadence, connects_modality)
values
  ('a1a1a1a1-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000001',
   'Caminar', 'x', '¿x?', 'daily', 'yoga'),
  ('b2b2b2b2-0000-4000-8000-000000000002', 'bbbbbbbb-0000-4000-8000-000000000002',
   'Respirar', 'x', '¿x?', 'daily', 'mindfulness');

select pg_temp.act_as('aaaaaaaa-0000-4000-8000-000000000001');

insert into public.recommendation_checkins (user_id, practice_title, checked_on, practice_id)
values ('aaaaaaaa-0000-4000-8000-000000000001', 'Caminar', '2026-10-22',
        'a1a1a1a1-0000-4000-8000-000000000001');
select is(
  (select practice_id from public.recommendation_checkins where practice_title = 'Caminar'),
  'a1a1a1a1-0000-4000-8000-000000000001'::uuid,
  'A new mark keeps its practice_id'
);

-- Reconciled by title and day, as the browser saves it: the rating rides on
-- the same row and the practice stays.
insert into public.recommendation_checkins (user_id, practice_title, checked_on, rating, practice_id)
values ('aaaaaaaa-0000-4000-8000-000000000001', 'Caminar', '2026-10-22', 4,
        'a1a1a1a1-0000-4000-8000-000000000001')
on conflict (user_id, practice_title, checked_on) do update set rating = excluded.rating, practice_id = excluded.practice_id;
select is(
  (select row(rating, practice_id)::text from public.recommendation_checkins where practice_title = 'Caminar'),
  row(4, 'a1a1a1a1-0000-4000-8000-000000000001'::uuid)::text,
  'Rating it keeps the same row and its practice'
);

select lives_ok(
  $$insert into public.recommendation_checkins (user_id, practice_title, checked_on, practice_id)
    values ('aaaaaaaa-0000-4000-8000-000000000001', 'Respirar', '2026-10-22',
            'b2b2b2b2-0000-4000-8000-000000000002')$$,
  'A mark that names somebody else''s practice is still kept'
);
select is(
  (select practice_id from public.recommendation_checkins where practice_title = 'Respirar'),
  null,
  'But it cannot point at somebody else''s practice'
);

update public.recommendation_checkins set practice_id = 'b2b2b2b2-0000-4000-8000-000000000002'
where practice_title = 'Caminar';
select is(
  (select practice_id from public.recommendation_checkins where practice_title = 'Caminar'),
  null,
  'Nor be changed to point at it'
);

-- Even past the trigger, the key holds the practice together with its owner.
reset role;
alter table public.recommendation_checkins disable trigger checkin_practice_of_owner;
select throws_ok(
  $$update public.recommendation_checkins set practice_id = 'b2b2b2b2-0000-4000-8000-000000000002'
    where practice_title = 'Caminar'$$,
  '23503', null,
  'The foreign key refuses a practice of another person on its own'
);
alter table public.recommendation_checkins enable trigger checkin_practice_of_owner;

select * from finish();
rollback;
