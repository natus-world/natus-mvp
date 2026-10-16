-- v1.2 M-01: the memory. What Natus knows about the person, premium only.
--
-- Separate items, each in one of five categories and each keeping where it
-- came from: a journal entry, a conversation or a rated check-in. The model
-- (Sonnet, the `memory` function) updates it when a journal entry is saved,
-- when a practice is rated and when a conversation has gone thirty minutes
-- without a message — never on every message. The chat receives it on every
-- answer; the comparison never does.
--
-- Deleting a source deletes what it contributed: an item left with no source
-- goes, unless the person wrote or corrected it. The person can see, correct
-- and delete every item, and add their own.
--
-- What raised a crisis signal never enters: the function refuses a flagged
-- entry and scans every source again before reading it.
--
-- It needs the person's express consent (Ley 21.719), recorded in
-- `preferences.memory_consent_at`. Without consent, or without premium, the
-- memory is kept but paused: nothing is added and the chat does not read it.

alter table public.claude_api_calls
  drop constraint claude_api_calls_purpose_check,
  add constraint claude_api_calls_purpose_check
    check (purpose in ('soul_map', 'match', 'chat', 'meditation', 'comparison', 'routine', 'memory'));

alter table public.preferences
  add column memory_consent_at timestamptz;

comment on column public.preferences.memory_consent_at is
  'v1.2 M-01: when the person agreed that Natus learns from what they write. Null: not agreed, or withdrawn.';

-- How far each source has been read, so nothing is read twice. Written only
-- by the memory function; the browser never sends these columns.
alter table public.journal_entries add column memory_processed_at timestamptz;
alter table public.conversations add column memory_processed_at timestamptz;
alter table public.recommendation_checkins add column memory_processed_at timestamptz;

create table public.memory_items (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users (id) on delete cascade,
  category       text not null
                   check (category in ('lo_que_vive', 'le_funciona', 'no_le_funciona', 'tema_recurrente', 'contexto')),
  content        text not null check (char_length(content) between 1 and 400),
  -- The person wrote or corrected it: it stays even when its sources go, and
  -- the model may not rewrite it.
  edited_by_user boolean not null default false,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index memory_items_user_idx on public.memory_items (user_id, category);

create table public.memory_item_sources (
  id               uuid primary key default gen_random_uuid(),
  memory_item_id   uuid not null references public.memory_items (id) on delete cascade,
  user_id          uuid not null references auth.users (id) on delete cascade,
  journal_entry_id uuid references public.journal_entries (id) on delete cascade,
  conversation_id  uuid references public.conversations (id) on delete cascade,
  checkin_id       uuid references public.recommendation_checkins (id) on delete cascade,
  created_at       timestamptz not null default now(),
  check (num_nonnulls(journal_entry_id, conversation_id, checkin_id) = 1)
);

create unique index memory_item_sources_once
  on public.memory_item_sources (memory_item_id, coalesce(journal_entry_id, conversation_id, checkin_id));
create index memory_item_sources_user_idx on public.memory_item_sources (user_id);
create index memory_item_sources_journal_idx on public.memory_item_sources (journal_entry_id);
create index memory_item_sources_conversation_idx on public.memory_item_sources (conversation_id);
create index memory_item_sources_checkin_idx on public.memory_item_sources (checkin_id);

alter table public.memory_items enable row level security;
alter table public.memory_item_sources enable row level security;

-- The person sees, corrects, deletes and adds. Sources are the function's.
create policy "own memory is readable"
  on public.memory_items for select to authenticated
  using (auth.uid() = user_id);
create policy "own memory can be added to"
  on public.memory_items for insert to authenticated
  with check (auth.uid() = user_id);
create policy "own memory is correctable"
  on public.memory_items for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
create policy "own memory is deletable"
  on public.memory_items for delete to authenticated
  using (auth.uid() = user_id);

create policy "own memory sources are readable"
  on public.memory_item_sources for select to authenticated
  using (auth.uid() = user_id);

grant select, delete on public.memory_items to authenticated;
grant insert (user_id, category, content), update (category, content) on public.memory_items to authenticated;
grant select on public.memory_item_sources to authenticated;
grant select, insert, update, delete on public.memory_items, public.memory_item_sources to service_role;

-- Whatever the person writes or changes is theirs: marked, so it outlives its
-- sources and the model leaves it as they put it.
create function public.memory_item_by_person()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    new.edited_by_user := true;
  end if;
  new.updated_at := now();
  return new;
end
$$;

create trigger memory_item_by_person
  before insert or update on public.memory_items
  for each row execute function public.memory_item_by_person();

-- A source gone (its entry, conversation or check-in deleted) takes with it
-- the items that rested only on it, except the person's own.
create function public.memory_item_orphaned()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.memory_items m
  where m.id = old.memory_item_id
    and not m.edited_by_user
    and not exists (select 1 from public.memory_item_sources s where s.memory_item_id = m.id);
  return old;
end
$$;

revoke execute on function public.memory_item_orphaned() from public, anon, authenticated;

create trigger memory_item_orphaned
  after delete on public.memory_item_sources
  for each row execute function public.memory_item_orphaned();

-- What the person writes into their memory is scanned like any free text.
alter table public.crisis_events drop constraint crisis_events_source_surface_check;
alter table public.crisis_events add constraint crisis_events_source_surface_check
  check (source_surface in ('onboarding', 'chat', 'meditation_intent', 'practice_comment', 'journal', 'memory'));
