-- Natus — the meditation's voice (20261029200000): the scripts and the audio
-- are read by their owner only and written by the server only; the month's
-- spend and the settings are the server's.
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
  ('bbbbbbbb-0000-4000-8000-0000000000b2', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'beto@example.test', false);
insert into public.meditation_voice_scripts (id, user_id, passages, characters) values
  ('cccccccc-0000-4000-8000-0000000000c1', 'bbbbbbbb-0000-4000-8000-0000000000b1',
   '[{"text":"Quédate como estés.","rate":0.82}]', 19);
insert into public.meditation_voice_audio (script_id, voice, passage, user_id, model, voice_name, path, characters, cost_usd)
values ('cccccccc-0000-4000-8000-0000000000c1', 'mujer', 0, 'bbbbbbbb-0000-4000-8000-0000000000b1',
        'gemini-3.1-flash-tts-preview', 'Sulafat', 'x/0.mp3', 19, 0.0012);

select is((select monthly_cap_usd from public.voice_settings), 10.00::numeric(10,2), 'The ceiling starts at ten dollars');
select is(public.voice_spent_this_month(), 0.0012::numeric, 'This month''s spend is what was recorded');

select pg_temp.act_as('bbbbbbbb-0000-4000-8000-0000000000b1');
select is((select count(*) from public.meditation_voice_scripts), 1::bigint, 'Ana reads her script');
select is((select count(*) from public.meditation_voice_audio), 1::bigint, '... and its audio');
select throws_ok($$
  insert into public.meditation_voice_scripts (user_id, passages, characters)
  values ('bbbbbbbb-0000-4000-8000-0000000000b1', '[{"text":"Lee esto"}]', 8)
$$, '42501', null, 'Nobody writes a script from the browser: the voice reads only what the server kept');
select throws_ok($$ select public.voice_spent_this_month() $$, '42501', null, 'The month''s spend is the server''s');
select throws_ok($$ select * from public.voice_settings $$, '42501', null, 'So are the settings');

select pg_temp.act_as('bbbbbbbb-0000-4000-8000-0000000000b2');
select is((select count(*) from public.meditation_voice_scripts), 0::bigint, 'Beto does not see Ana''s script');
select is((select count(*) from public.meditation_voice_audio), 0::bigint, '... nor her audio');

select * from finish();
rollback;
