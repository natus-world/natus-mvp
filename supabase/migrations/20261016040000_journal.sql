-- v1.2 B-01: the journal. The person's own account of their days, of how the
-- practices and therapies are going and of what is happening to them.
--
-- There is no "only for me": everything written belongs to the person's
-- record, and — for premium, once the memory exists (M-01) — feeds what
-- Natus learns about them. Every entry is scanned for crisis in the browser
-- before it is saved; an entry that raised one is kept (it is their diary)
-- and marked, so the memory never reads it.
--
-- Written entries are for everyone. Voice is premium and needs a
-- transcription provider that does not exist yet, so the browser may only
-- write `escrito`.
--
-- Deleting is real: the row goes, and only a `journal_entry_deleted` event
-- with no content stays in `system_audit_log`, as an indicator.

create table public.journal_entries (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users (id) on delete cascade,
  entry_date     date not null,
  body           text not null check (char_length(body) between 1 and 10000),
  source         text not null default 'escrito' check (source in ('escrito', 'voz')),
  mood           smallint check (mood between 1 and 5),
  practice_id    uuid references public.routine_practices (id) on delete set null,
  modality_slug  text check (modality_slug ~ '^[a-z0-9-]{1,64}$'),
  crisis_flagged boolean not null default false,
  created_at     timestamptz not null default now()
);

create index journal_entries_user_idx on public.journal_entries (user_id, entry_date desc);
create index journal_entries_practice_idx on public.journal_entries (practice_id);

alter table public.journal_entries enable row level security;

create policy "own journal is readable"
  on public.journal_entries for select to authenticated
  using (auth.uid() = user_id);
create policy "own journal is writable, in writing"
  on public.journal_entries for insert to authenticated
  with check (auth.uid() = user_id and source = 'escrito');
create policy "own journal is editable"
  on public.journal_entries for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id and source = 'escrito');
create policy "own journal is deletable"
  on public.journal_entries for delete to authenticated
  using (auth.uid() = user_id);

grant select, insert, update, delete on public.journal_entries to authenticated;
grant select, insert, update, delete on public.journal_entries to service_role;

-- ── the audit log ──────────────────────────────────────────────────────────
-- Events about a person's data with no content in them. Nobody reads it
-- through the API.
create table public.system_audit_log (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users (id) on delete cascade,
  event       text not null check (event in ('journal_entry_deleted')),
  occurred_at timestamptz not null default now()
);

create index system_audit_log_user_idx on public.system_audit_log (user_id);

alter table public.system_audit_log enable row level security;
grant select, insert on public.system_audit_log to service_role;

create function public.audit_journal_delete()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Not when the whole account is going: then there is nobody left to
  -- describe, and the row would point at a user that no longer exists.
  if exists (select 1 from auth.users u where u.id = old.user_id) then
    insert into public.system_audit_log (user_id, event) values (old.user_id, 'journal_entry_deleted');
  end if;
  return old;
end
$$;

revoke execute on function public.audit_journal_delete() from public, anon, authenticated;

create trigger journal_entry_deleted
  after delete on public.journal_entries
  for each row execute function public.audit_journal_delete();

-- A crisis can now be detected in a journal entry.
alter table public.crisis_events drop constraint crisis_events_source_surface_check;
alter table public.crisis_events add constraint crisis_events_source_surface_check
  check (source_surface in ('onboarding', 'chat', 'meditation_intent', 'practice_comment', 'journal'));
