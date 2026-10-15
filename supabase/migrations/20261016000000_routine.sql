-- v1.2 R-01: one routine, written after the therapies, and each practice
-- keeping where it came from.
--
-- The routine used to live inside the match result, beside the therapies,
-- and the Soul Map carried a second list of tips. Now there is one list, in
-- its own table, one row per practice: what it is, what it converses with
-- (the map, a therapy, or both) and its origin — the model today, a therapist
-- or the person later, without changing the structure (agreed 15 Oct 2026).

alter table public.claude_api_calls
  drop constraint claude_api_calls_purpose_check,
  add constraint claude_api_calls_purpose_check
    check (purpose in ('soul_map', 'match', 'chat', 'meditation', 'comparison', 'routine'));

create table public.routine_practices (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users (id) on delete cascade,
  match_id          uuid references public.modality_matches (id) on delete set null,
  title             text not null check (char_length(title) between 1 and 200),
  body              text not null check (char_length(body) between 1 and 2000),
  invitation        text not null check (char_length(invitation) between 1 and 500),
  cadence           text not null check (cadence in ('daily', 'weekly', 'process', 'one_off')),
  connects_soul_map boolean not null default false,
  connects_modality text,
  origin            text not null default 'ia' check (origin in ('ia', 'terapeuta', 'persona')),
  prompt_version    text,
  is_active         boolean not null default true,
  created_at        timestamptz not null default now()
);

create index routine_practices_user_idx on public.routine_practices (user_id, created_at);
create index routine_practices_match_idx on public.routine_practices (match_id);

alter table public.routine_practices enable row level security;

create policy "own practices are readable"
  on public.routine_practices for select to authenticated
  using (auth.uid() = user_id);

-- The browser writes the routine the model wrote for it, and nothing else:
-- a practice that claims to come from a therapist is the server's to write.
create policy "own practices from the model are writable"
  on public.routine_practices for insert to authenticated
  with check (auth.uid() = user_id and origin = 'ia');

create policy "own practices from the model are updatable"
  on public.routine_practices for update to authenticated
  using (auth.uid() = user_id and origin = 'ia')
  with check (auth.uid() = user_id and origin = 'ia');

create policy "own practices from the model are removable"
  on public.routine_practices for delete to authenticated
  using (auth.uid() = user_id and origin = 'ia');

grant select, insert, update, delete on public.routine_practices to authenticated;
grant select, insert, update on public.routine_practices to service_role;
