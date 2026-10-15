-- The admin funnel (agreed 15 Oct 2026), recorded from now so the panel does
-- not start empty the day it is built.
--
-- One row is: who (the internal id), which step, when. Nothing else, ever:
-- no text the person wrote, no clinical answer, no chart, no therapy chosen,
-- no step that only happens to somebody vulnerable (a crisis screen, a
-- withheld comparison), no email, name, IP or device fingerprint. For a
-- mental-health product even the fact of using it can be health data
-- (Ley 21.719; the FTC's BetterHelp order), so nothing here leaves for an ad
-- platform either. Deleting the account deletes the rows.
--
-- Nobody reads this table through the API — not even the person it is about.
-- The panel will have its own access levels when it exists.

create table public.funnel_events (
  id           bigint generated always as identity primary key,
  user_id      uuid not null references auth.users (id) on delete cascade,
  step         text not null check (step in (
                 'onboarding_started',  -- with its origin, when the link carries one
                 'birth_data_done',
                 'soul_map_seen',
                 'care_done',           -- that it was answered, never what
                 'paths_seen',
                 'account_created',
                 'first_practice',
                 'first_chat',
                 'paywall_seen',        -- with where it appeared
                 'trial_started',
                 'first_charge',
                 'canceled',            -- with a reason from a closed list
                 'app_opened',          -- once a day, for retention
                 'friend_invited',      -- once a day
                 'friend_accepted'      -- once per friendship, for the inviter
               )),
  -- Closed vocabularies only. Free text could carry anything, so there is none.
  source       text check (source ~ '^[a-z0-9_.-]{1,64}$'),
  campaign     text check (campaign ~ '^[a-z0-9_.-]{1,64}$'),
  detail       text check (detail ~ '^[a-z0-9_.-]{1,64}$'),
  dedupe_key   text not null,
  occurred_at  timestamptz not null default now(),
  unique (user_id, dedupe_key)
);

create index funnel_events_step_idx on public.funnel_events (step, occurred_at);

alter table public.funnel_events enable row level security;
-- No policy and no grant for `authenticated`: the browser records through
-- `track_step` below and reads nothing.
grant select, insert on public.funnel_events to service_role;

-- Which steps repeat, and how often they may.
create function public.funnel_dedupe_key(p_step text, p_detail text)
returns text
language sql
stable
set search_path = ''
as $$
  select case
    when p_step in ('app_opened', 'friend_invited')
      then p_step || ':' || (now() at time zone 'America/Santiago')::date::text
    when p_step = 'friend_accepted' then p_step || ':' || coalesce(p_detail, '')
    else p_step
  end;
$$;

create function public.record_step(
  p_user uuid, p_step text, p_source text default null, p_campaign text default null, p_detail text default null
)
returns void
language sql
volatile
security definer
set search_path = ''
as $$
  insert into public.funnel_events (user_id, step, source, campaign, detail, dedupe_key)
  values (p_user, p_step, p_source, p_campaign, p_detail, public.funnel_dedupe_key(p_step, p_detail))
  on conflict (user_id, dedupe_key) do nothing;
$$;

revoke execute on function public.record_step(uuid, text, text, text, text) from public, anon, authenticated;
grant execute on function public.record_step(uuid, text, text, text, text) to service_role;

-- What the browser may record about itself. The steps that are facts about
-- money (trial, charge, cancellation) and the ones a trigger records more
-- reliably are not in this list: nobody can claim them for themselves.
create function public.track_step(
  p_step text, p_source text default null, p_campaign text default null, p_detail text default null
)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    return;
  end if;
  if p_step not in ('onboarding_started', 'birth_data_done', 'care_done', 'paths_seen',
                    'paywall_seen', 'app_opened', 'friend_invited') then
    raise exception 'not a step the browser records' using errcode = '22023';
  end if;
  -- Origin travels only on the first step; the place a paywall appeared,
  -- only on the paywall.
  if p_step <> 'onboarding_started' then
    p_source := null;
    p_campaign := null;
  end if;
  if p_step <> 'paywall_seen' then
    p_detail := null;
  elsif p_detail not in ('chat', 'meditation', 'comparison', 'profile') then
    p_detail := null;
  end if;

  perform public.record_step(auth.uid(), p_step, p_source, p_campaign, p_detail);
end
$$;

revoke execute on function public.track_step(text, text, text, text) from public, anon;
grant execute on function public.track_step(text, text, text, text) to authenticated;

-- ═══════════════════════════════════════════════════════════════════════════
-- Steps the database records itself, from rows that prove them
-- ═══════════════════════════════════════════════════════════════════════════

create function public.funnel_on_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_table_name = 'clients' then
    perform public.record_step(new.user_id, 'account_created');
  elsif tg_table_name = 'soul_map_syntheses' then
    perform public.record_step(new.user_id, 'soul_map_seen');
  elsif tg_table_name = 'recommendation_checkins' then
    perform public.record_step(new.user_id, 'first_practice');
  elsif tg_table_name = 'messages' and new.role = 'user' then
    perform public.record_step(new.user_id, 'first_chat');
  end if;
  return null;
end
$$;

create trigger funnel_account_created after insert on public.clients
  for each row execute function public.funnel_on_insert();
create trigger funnel_soul_map_seen after insert on public.soul_map_syntheses
  for each row execute function public.funnel_on_insert();
create trigger funnel_first_practice after insert on public.recommendation_checkins
  for each row execute function public.funnel_on_insert();
create trigger funnel_first_chat after insert on public.messages
  for each row execute function public.funnel_on_insert();

-- A friend accepted: recorded for the person who invited, once per
-- friendship. Same body as in 20261015180000_friends.sql, plus the record.
create or replace function public.accept_friend_invite(p_token text)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  inviter uuid;
  existing uuid;
  result uuid;
begin
  if auth.uid() is null or not public.caller_has_account() then
    raise exception 'an account is needed to accept' using errcode = '42501';
  end if;

  select i.inviter_id into inviter
  from public.friend_invites i
  where i.token = p_token and i.revoked_at is null;

  if inviter is null then
    raise exception 'this invitation no longer works' using errcode = 'P0002';
  end if;
  if inviter = auth.uid() then
    raise exception 'that is your own invitation' using errcode = '22023';
  end if;

  select f.id into existing
  from public.friendships f
  where least(f.requester_id, f.addressee_id) = least(inviter, auth.uid())
    and greatest(f.requester_id, f.addressee_id) = greatest(inviter, auth.uid());

  if existing is null then
    insert into public.friendships (requester_id, addressee_id, status, responded_at)
    values (inviter, auth.uid(), 'accepted', now())
    returning id into result;
  else
    update public.friendships
      set status = 'accepted', responded_at = now(), ended_by = null
    where id = existing
    returning id into result;
  end if;

  perform public.record_step(inviter, 'friend_accepted', null, null, replace(result::text, '-', ''));
  return result;
end
$$;
