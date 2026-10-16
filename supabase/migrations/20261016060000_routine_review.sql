-- v1.2 R-04: the routine adjusts with the person, and only with their yes.
--
-- Premium is reviewed every week and earlier on two signals — a practice
-- rated 2 or less twice, or a daily or weekly practice not done in two
-- weeks. Free renews every two months. In every case the model proposes and
-- the person accepts or keeps their routine: nothing changes on its own.
--
-- The `routine-review` function decides, from what the server holds, whether
-- a review is due, and writes the proposal here. A review that found nothing
-- worth changing is recorded too (`no_change`): it is what restarts the
-- week. The person answers a pending proposal; they cannot write one.
--
-- A therapy dismissed more than seven days ago may come back in a proposal
-- (R-05).

alter table public.claude_api_calls
  drop constraint claude_api_calls_purpose_check,
  add constraint claude_api_calls_purpose_check
    check (purpose in ('soul_map', 'match', 'chat', 'meditation', 'comparison', 'routine', 'memory', 'routine_review'));

create table public.routine_change_proposals (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users (id) on delete cascade,
  match_id       uuid references public.modality_matches (id) on delete cascade,
  trigger        text not null check (trigger in ('weekly', 'bimonthly_free', 'low_rating', 'abandoned')),
  proposal       jsonb not null,
  status         text not null default 'pending'
                   check (status in ('pending', 'accepted', 'rejected', 'expired', 'no_change')),
  prompt_version text not null,
  created_at     timestamptz not null default now(),
  responded_at   timestamptz
);

create index routine_change_proposals_user_idx on public.routine_change_proposals (user_id, created_at desc);
create index routine_change_proposals_match_idx on public.routine_change_proposals (match_id);

alter table public.routine_change_proposals enable row level security;

create policy "own proposals are readable"
  on public.routine_change_proposals for select to authenticated
  using (auth.uid() = user_id);

-- Answering is the only write: a pending proposal, accepted or kept.
create policy "own pending proposals are answerable"
  on public.routine_change_proposals for update to authenticated
  using (auth.uid() = user_id and status = 'pending')
  with check (auth.uid() = user_id and status in ('accepted', 'rejected'));

grant select on public.routine_change_proposals to authenticated;
grant update (status, responded_at) on public.routine_change_proposals to authenticated;
grant select, insert, update, delete on public.routine_change_proposals to service_role;
