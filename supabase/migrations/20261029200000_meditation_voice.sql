-- The meditation's voice (owner, 29 Oct 2026): Google's Gemini 3.1 Flash TTS
-- reads each passage of the script, a woman's voice or a man's as the person
-- chooses, instead of the phone's own. Paid by use, so it stops at a monthly
-- ceiling in dollars, and the phone's voice reads the rest of that month.

-- ── the script the voice may read ───────────────────────────────────────────
-- Written by the meditation function only, so the voice function never reads
-- aloud a text the browser wrote (the browser can write its own `meditations`
-- row; it cannot write this one).
create table public.meditation_voice_scripts (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  -- The passages to speak, in order: [{ "text": "...", "rate": 0.82 }].
  passages    jsonb not null,
  characters  integer not null check (characters > 0),
  created_at  timestamptz not null default now()
);
create index meditation_voice_scripts_user_idx on public.meditation_voice_scripts (user_id);

alter table public.meditation_voice_scripts enable row level security;
create policy "own scripts are readable"
  on public.meditation_voice_scripts for select to authenticated
  using (auth.uid() = user_id);
grant select on public.meditation_voice_scripts to authenticated;
grant select, insert, delete on public.meditation_voice_scripts to service_role;

-- ── the audio, once per passage and voice ───────────────────────────────────
-- Recorded a few passages at a time, so the practice starts while the rest is
-- still being read.
create table public.meditation_voice_audio (
  script_id   uuid not null references public.meditation_voice_scripts (id) on delete cascade,
  voice       text not null check (voice in ('mujer', 'hombre')),
  passage     smallint not null check (passage >= 0),
  user_id     uuid not null references auth.users (id) on delete cascade,
  model       text not null,
  voice_name  text not null,
  -- In the bucket `meditation-voice`.
  path        text not null,
  characters  integer not null,
  -- Estimated from the characters: Google answers with the audio, not a bill.
  cost_usd    numeric(10, 5) not null,
  created_at  timestamptz not null default now(),
  primary key (script_id, voice, passage)
);
create index meditation_voice_audio_user_idx on public.meditation_voice_audio (user_id);
create index meditation_voice_audio_month_idx on public.meditation_voice_audio (created_at);

alter table public.meditation_voice_audio enable row level security;
create policy "own audio is readable"
  on public.meditation_voice_audio for select to authenticated
  using (auth.uid() = user_id);
grant select on public.meditation_voice_audio to authenticated;
grant select, insert, delete on public.meditation_voice_audio to service_role;

-- What the voice has cost this calendar month (UTC), for its ceiling.
create function public.voice_spent_this_month()
returns numeric
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(sum(cost_usd), 0) from public.meditation_voice_audio
  where created_at >= date_trunc('month', now() at time zone 'utc') at time zone 'utc';
$$;
revoke all on function public.voice_spent_this_month() from public, anon, authenticated;
grant execute on function public.voice_spent_this_month() to service_role;

-- ── what the voice uses, editable without a deploy ──────────────────────────
-- One row. The ceiling is in US dollars per calendar month (UTC); the voices
-- and the model are Google's names, chosen by the owner by ear.
create table public.voice_settings (
  id               boolean primary key default true check (id),
  monthly_cap_usd  numeric(10, 2) not null,
  model            text not null,
  voice_mujer      text not null,
  voice_hombre     text not null,
  language_code    text not null
);
alter table public.voice_settings enable row level security;
grant select on public.voice_settings to service_role;
insert into public.voice_settings (monthly_cap_usd, model, voice_mujer, voice_hombre, language_code)
values (20, 'gemini-3.1-flash-tts-preview', 'Sulafat', 'Charon', 'es-US');

-- ── the team hears when the ceiling is reached (owner, 29 Oct 2026) ────────
-- Once a month, by mail to the admins, through Resend as the crisis alert
-- does (`resend_api_key` in Vault). Called by the voice function the first
-- time it refuses for the ceiling.
create table public.voice_cap_notices (
  month       date primary key,
  notified_at timestamptz not null default now()
);
alter table public.voice_cap_notices enable row level security;
grant select, insert on public.voice_cap_notices to service_role;

create function public.notify_voice_cap(p_cap numeric)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  api_key text;
  recipients text[];
  this_month date := (date_trunc('month', now() at time zone 'utc'))::date;
begin
  insert into public.voice_cap_notices (month) values (this_month) on conflict do nothing;
  if not found then
    return;
  end if;
  begin
    select s.decrypted_secret into api_key
    from vault.decrypted_secrets s where s.name = 'resend_api_key' limit 1;
    if api_key is null or api_key = '' then
      return;
    end if;
    select array_agg(distinct u.email) into recipients
    from public.admins a join auth.users u on u.id = a.user_id
    where u.email is not null;
    if recipients is null then
      return;
    end if;
    perform net.http_post(
      url := 'https://api.resend.com/emails',
      headers := jsonb_build_object('Authorization', 'Bearer ' || api_key, 'Content-Type', 'application/json'),
      body := jsonb_build_object(
        'from', 'Natus <alertas@mail.natus.world>',
        'to', to_jsonb(recipients),
        'subject', format('Natus: la voz de las meditaciones llegó a US$ %s este mes', p_cap),
        'text', format(
          E'La voz de Google para las meditaciones llegó al tope de US$ %s de este mes.

'
          'Desde ahora y hasta fin de mes, las meditaciones nuevas se escuchan con la voz del celular. '
          'Las que ya se grabaron siguen con la voz de Google.

'
          'Para subir el tope, pídeselo a Claude (es un número en voice_settings).',
          p_cap
        )
      )
    );
  exception when others then
    return;
  end;
end
$$;
revoke all on function public.notify_voice_cap(numeric) from public, anon, authenticated;
grant execute on function public.notify_voice_cap(numeric) to service_role;

-- ── the meditation remembers its script ─────────────────────────────────────
alter table public.meditations add column voice_script_id uuid
  references public.meditation_voice_scripts (id) on delete set null;
create index meditations_voice_script_idx on public.meditations (voice_script_id);

-- ── the person's choice of voice ────────────────────────────────────────────
alter table public.preferences add column meditation_voice text not null default 'mujer'
  check (meditation_voice in ('mujer', 'hombre'));

-- ── the files ───────────────────────────────────────────────────────────────
-- Private: the function hands out signed links that expire.
insert into storage.buckets (id, name, public)
values ('meditation-voice', 'meditation-voice', false)
on conflict (id) do nothing;

-- ── the ledger knows the voice ──────────────────────────────────────────────
alter table public.claude_api_calls
  drop constraint claude_api_calls_purpose_check,
  add constraint claude_api_calls_purpose_check
    check (purpose in ('soul_map', 'match', 'chat', 'meditation', 'comparison', 'routine', 'memory',
                       'routine_review', 'chart_points', 'daily_tip', 'voice'));

insert into public.model_prices (model, input, output, cache_write, cache_read)
values ('gemini-3.1-flash-tts-preview', 1, 20, 0, 0)
on conflict (model) do nothing;

-- ── epilepsy, before the first meditation (owner, 29 Oct 2026) ──────────────
-- The recorded music is binaural; binaural beats are not advised with
-- epilepsy. Asked once; only an explicit «No» hears the binaural version,
-- everybody else a mono one, the same in both ears. A clinical answer like
-- the others: never in a model payload.
alter table public.clients add column clinical_epilepsy boolean;
alter table public.anonymous_sessions add column clinical_epilepsy boolean;

-- ── the recorded beds (owner, 29 Oct 2026) ──────────────────────────────────
-- Five Pixabay tracks, binaural in the original: `file.path` is a mono
-- downmix everybody hears, `file.binaural_path` the original for whoever
-- answered «No» to epilepsy. The synthesised beds stay, inactive, so the
-- meditations made with them still play. Kept equal to data/bed-tracks.json.
alter table public.bed_tracks alter column synthesis drop not null;
alter table public.bed_tracks add column file jsonb;
update public.bed_tracks set is_active = false where id <> 'silencio';
insert into public.bed_tracks (id, name, frequency_hz, suits, synthesis, file, license, is_active) values
  ('calma-profunda', 'Calma profunda', null, 'Intenciones de calma, soltar la tensión, bajar el ritmo.', null, '{"path": "audio/beds/zen-ambient-for-deep-calm.mono.mp3", "binaural_path": "audio/beds/zen-ambient-for-deep-calm.binaural.mp3", "license": "Pixabay Content License (pixabay.com/service/license-summary), autor AmbiNet; uso dentro de la app permitido, sin atribución obligatoria; prohibido distribuirla suelta.", "source": "https://pixabay.com/music/meditationspiritual-zen-ambient-for-deep-calm-315406/"}'::jsonb, 'Pixabay Content License (pixabay.com/service/license-summary), autor AmbiNet; uso dentro de la app permitido, sin atribución obligatoria; prohibido distribuirla suelta.', true),
  ('ecos-suaves', 'Ecos suaves', null, 'Intenciones de atención al cuerpo, presencia, escucha interior.', null, '{"path": "audio/beds/soft-echoes-for-meditation.mono.mp3", "binaural_path": "audio/beds/soft-echoes-for-meditation.binaural.mp3", "license": "Pixabay Content License (pixabay.com/service/license-summary), autor AmbiNet; uso dentro de la app permitido, sin atribución obligatoria; prohibido distribuirla suelta.", "source": "https://pixabay.com/music/meditationspiritual-soft-echoes-for-meditation-315382/"}'::jsonb, 'Pixabay Content License (pixabay.com/service/license-summary), autor AmbiNet; uso dentro de la app permitido, sin atribución obligatoria; prohibido distribuirla suelta.', true),
  ('olas-en-silencio', 'Olas en silencio', null, 'Intenciones de descanso profundo, cansancio, dejar ir.', null, '{"path": "audio/beds/silent-waves-for-deep-relaxation.mono.mp3", "binaural_path": "audio/beds/silent-waves-for-deep-relaxation.binaural.mp3", "license": "Pixabay Content License (pixabay.com/service/license-summary), autor AmbiNet; uso dentro de la app permitido, sin atribución obligatoria; prohibido distribuirla suelta.", "source": "https://pixabay.com/music/meditationspiritual-silent-waves-for-deep-relaxation-315369/"}'::jsonb, 'Pixabay Content License (pixabay.com/service/license-summary), autor AmbiNet; uso dentro de la app permitido, sin atribución obligatoria; prohibido distribuirla suelta.', true),
  ('antes-de-dormir', 'Antes de dormir', null, 'Intenciones de cierre del día, sueño, aflojar la mente.', null, '{"path": "audio/beds/gentle-ambient-for-deep-sleep.mono.mp3", "binaural_path": "audio/beds/gentle-ambient-for-deep-sleep.binaural.mp3", "license": "Pixabay Content License (pixabay.com/service/license-summary), autor AmbiNet; uso dentro de la app permitido, sin atribución obligatoria; prohibido distribuirla suelta.", "source": "https://pixabay.com/music/meditationspiritual-gentle-ambient-for-deep-sleep-315296/"}'::jsonb, 'Pixabay Content License (pixabay.com/service/license-summary), autor AmbiNet; uso dentro de la app permitido, sin atribución obligatoria; prohibido distribuirla suelta.', true),
  ('tonos-armonicos', 'Tonos armónicos', null, 'Intenciones de equilibrio, ansiedad, volver al centro.', null, '{"path": "audio/beds/harmonic-tones-for-relaxation.mono.mp3", "binaural_path": "audio/beds/harmonic-tones-for-relaxation.binaural.mp3", "license": "Pixabay Content License (pixabay.com/service/license-summary), autor AmbiNet; uso dentro de la app permitido, sin atribución obligatoria; prohibido distribuirla suelta.", "source": "https://pixabay.com/music/meditationspiritual-harmonic-tones-for-relaxation-315301/"}'::jsonb, 'Pixabay Content License (pixabay.com/service/license-summary), autor AmbiNet; uso dentro de la app permitido, sin atribución obligatoria; prohibido distribuirla suelta.', true)
on conflict (id) do update set
  name = excluded.name, frequency_hz = excluded.frequency_hz, suits = excluded.suits,
  synthesis = excluded.synthesis, file = excluded.file, license = excluded.license,
  is_active = excluded.is_active;
