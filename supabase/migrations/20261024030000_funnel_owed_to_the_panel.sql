-- What the admin panel marked «dato nuevo» (owner, 23 Oct 2026: built once the
-- other work in flight was done). Still who, which step, when — never content.
--
--   screen_viewed   a screen of the app opened, once a day per screen; the
--                   detail is the screen's name from a closed list
--   trial_tapped    «Empezar mes gratis» touched (PayPal's window opened),
--                   with where; once a day
--   trial_approved  back from PayPal with the subscription approved, with
--                   where; once. The server's trial_started still decides.
--   invite_opened   a friend's invitation link opened; once a day
--
-- Arriving by an invitation is now said by the link itself: the browser keeps
-- `invitacion` as the first touch when the first page is /amigos/<token>, so
-- onboarding_started carries it (store/funnel.ts).
--
-- Beside the funnel, two marks the panel's friendship view reads:
--   comparison_reads    the first time each friend read a comparison the
--                       other asked for (mark_comparison_read)
--   messages.friendship_id  a chat turn about a comparison with that friend

alter table public.funnel_events drop constraint funnel_events_step_check;
alter table public.funnel_events add constraint funnel_events_step_check check (step in (
  'onboarding_started', 'birth_data_done', 'need_done', 'openness_done', 'signup_seen',
  'soul_map_seen', 'care_done', 'paths_seen', 'account_created', 'first_practice',
  'first_chat', 'paywall_seen', 'trial_started', 'first_charge', 'canceled',
  'app_opened', 'friend_invited', 'friend_accepted', 'birth_city_not_found',
  'screen_viewed', 'trial_tapped', 'trial_approved', 'invite_opened'
));

create or replace function public.funnel_dedupe_key(p_step text, p_detail text)
returns text
language sql
stable
set search_path = ''
as $$
  select case
    when p_step in ('app_opened', 'friend_invited', 'invite_opened', 'trial_tapped')
      then p_step || ':' || (now() at time zone 'America/Santiago')::date::text
    when p_step = 'screen_viewed'
      then p_step || ':' || coalesce(p_detail, '') || ':' || (now() at time zone 'America/Santiago')::date::text
    when p_step = 'friend_accepted' then p_step || ':' || coalesce(p_detail, '')
    else p_step
  end;
$$;

create or replace function public.track_step(
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
  if p_step not in ('onboarding_started', 'birth_data_done', 'need_done', 'openness_done',
                    'signup_seen', 'care_done', 'paths_seen', 'paywall_seen', 'app_opened',
                    'friend_invited', 'birth_city_not_found',
                    'screen_viewed', 'trial_tapped', 'trial_approved', 'invite_opened') then
    raise exception 'not a step the browser records' using errcode = '22023';
  end if;
  -- Origin travels only on the first step.
  if p_step <> 'onboarding_started' then
    p_source := null;
    p_campaign := null;
  end if;
  -- A detail from a closed list: where Premium appeared or was taken; the
  -- device and browser of the first step; whether the hour was given; which
  -- screen was opened.
  if p_step in ('paywall_seen', 'trial_tapped', 'trial_approved') then
    if p_detail not in ('chat', 'meditation', 'comparison', 'profile', 'welcome', 'tip') then
      p_detail := null;
    end if;
  elsif p_step = 'onboarding_started' then
    if p_detail !~ '^(movil|tablet|computador)-(instagram|facebook|tiktok|whatsapp|threads|linkedin|navegador)$' then
      p_detail := null;
    end if;
  elsif p_step = 'birth_data_done' then
    if p_detail not in ('con-hora', 'sin-hora', 'solo-numeros') then
      p_detail := null;
    end if;
  elsif p_step = 'screen_viewed' then
    if p_detail not in ('hoy', 'carta', 'carta-completa', 'caminos', 'recorrido', 'bitacora', 'chat',
                        'perfil', 'meditaciones', 'biblioteca', 'comparacion', 'comparacion-resultado',
                        'comparacion-cartas') then
      return;
    end if;
  else
    p_detail := null;
  end if;

  perform public.record_step(auth.uid(), p_step, p_source, p_campaign, p_detail);
end
$$;

-- ── a comparison read by the friend who did not ask for it ──────────────────
create table public.comparison_reads (
  comparison_id uuid not null references public.chart_comparisons (id) on delete cascade,
  user_id       uuid not null references auth.users (id) on delete cascade,
  first_read_at timestamptz not null default now(),
  primary key (comparison_id, user_id)
);
create index comparison_reads_user_idx on public.comparison_reads (user_id);
alter table public.comparison_reads enable row level security;
comment on table public.comparison_reads is
  'When each friend first read a comparison the other asked for. Written only by mark_comparison_read; read by the admin panel.';

-- Recorded only for the other friend, only while the friendship is accepted.
create function public.mark_comparison_read(p_comparison uuid)
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
  insert into public.comparison_reads (comparison_id, user_id)
  select c.id, auth.uid()
  from public.chart_comparisons c
  join public.friendships f on f.id = c.friendship_id
  where c.id = p_comparison
    and f.status = 'accepted'
    and auth.uid() in (f.requester_id, f.addressee_id)
    and c.user_id <> auth.uid()
  on conflict do nothing;
end
$$;
revoke execute on function public.mark_comparison_read(uuid) from public, anon;
grant execute on function public.mark_comparison_read(uuid) to authenticated;

-- ── a chat turn about a comparison ──────────────────────────────────────────
alter table public.messages
  add column friendship_id uuid references public.friendships (id) on delete set null;
create index messages_friendship_idx on public.messages (friendship_id);
comment on column public.messages.friendship_id is
  'Set when the turn talked over a comparison with this friend (owner, 23 Oct 2026). Kept only when the friendship is the writer''s own.';

-- A label, never a door: a friendship that is not the writer's leaves it empty
-- rather than refusing the message.
create function public.messages_friendship_own()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.friendship_id is not null and not exists (
    select 1 from public.friendships f
    where f.id = new.friendship_id and new.user_id in (f.requester_id, f.addressee_id)
  ) then
    new.friendship_id := null;
  end if;
  return new;
end
$$;
create trigger messages_friendship_own
  before insert or update of friendship_id on public.messages
  for each row execute function public.messages_friendship_own();

-- ── the panel reads them ────────────────────────────────────────────────────
-- An arrival by invitation: the link said so (first touch `invitacion`), or,
-- for arrivals before it did, a first step within a day before the friendship.
create or replace function public.admin_arrived_by_invite(p_friendship uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.friendships fs
    join public.funnel_events f on f.user_id = fs.addressee_id and f.step = 'onboarding_started'
    where fs.id = p_friendship
      and f.occurred_at <= fs.created_at
      and (f.source = 'invitacion'
           or (f.occurred_at >= fs.created_at - interval '1 day'
               and not exists (select 1 from public.funnel_events e
                                where e.user_id = fs.addressee_id and e.step = 'onboarding_started'
                                  and e.occurred_at < fs.created_at - interval '1 day'))))
$$;

drop function public.admin_friends(date, date);
create function public.admin_friends(p_from date, p_to date)
returns table (accounts bigint, shared bigint, accepted bigint, new_by_invite bigint,
               befriended bigint, compared bigint, comparisons bigint,
               active_friendships bigint, ended bigint, talked bigint, opened_invite bigint)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.admin_require('friends');
  return query
  with fs as (
    select f.* from public.friendships f
    where f.status in ('accepted', 'removed')
      and not public.is_internal_user(f.requester_id) and not public.is_internal_user(f.addressee_id)
  ),
  made as (
    select * from fs where (fs.created_at at time zone 'America/Santiago')::date between p_from and p_to
  ),
  cmp as (
    select c.* from public.chart_comparisons c join fs on fs.id = c.friendship_id
    where (c.created_at at time zone 'America/Santiago')::date between p_from and p_to
  )
  select
    (select count(*) from auth.users u
      where not u.is_anonymous and not public.is_internal_user(u.id)
        and (public.admin_account_at(u.id) at time zone 'America/Santiago')::date between p_from and p_to),
    (select count(distinct f.user_id) from public.funnel_events f
      where f.step = 'friend_invited' and not public.is_internal_user(f.user_id)
        and (f.occurred_at at time zone 'America/Santiago')::date between p_from and p_to),
    (select count(distinct made.requester_id) from made),
    (select count(*) from made where public.admin_arrived_by_invite(made.id)),
    (select count(*) from made),
    (select count(distinct cmp.friendship_id) from cmp),
    (select count(*) from cmp),
    (select count(*) from fs where fs.status = 'accepted'),
    (select count(*) from fs where fs.status = 'removed'
       and (fs.responded_at at time zone 'America/Santiago')::date between p_from and p_to),
    (select count(distinct m.friendship_id) from public.messages m join fs on fs.id = m.friendship_id
      where m.role = 'user' and (m.created_at at time zone 'America/Santiago')::date between p_from and p_to),
    (select count(distinct f.user_id) from public.funnel_events f
      where f.step = 'invite_opened' and not public.is_internal_user(f.user_id)
        and (f.occurred_at at time zone 'America/Santiago')::date between p_from and p_to);
end
$$;
revoke execute on function public.admin_friends(date, date) from public, anon;
grant execute on function public.admin_friends(date, date) to authenticated;

-- One friendship, now with who read each comparison, the invitee opening the
-- link, and the chat turns about it. The comparison's text only while the
-- friendship lasts; the chat stays, as every message of a person does in the
-- panel (owner, 23 Oct 2026).
create or replace function public.admin_friendship(p_id uuid)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  f public.friendships;
begin
  select * into f from public.friendships where id = p_id;
  if not found then
    perform public.admin_require('friendship');
    return null;
  end if;
  perform public.admin_require('friendship', f.requester_id);
  perform public.admin_require('friendship', f.addressee_id);
  return jsonb_build_object(
    'id', f.id,
    'status', f.status,
    'since', f.created_at,
    'ended_at', case when f.status = 'removed' then f.responded_at end,
    'ended_by', f.ended_by,
    'requester', jsonb_build_object('id', f.requester_id,
      'name', (select legal_birth_name from public.clients where user_id = f.requester_id)),
    'addressee', jsonb_build_object('id', f.addressee_id,
      'name', (select legal_birth_name from public.clients where user_id = f.addressee_id),
      'arrived_by_invite', public.admin_arrived_by_invite(f.id),
      'arrived_by_link', exists (select 1 from public.funnel_events e
                                  where e.user_id = f.addressee_id and e.step = 'onboarding_started'
                                    and e.source = 'invitacion'),
      'opened_invite_at', (select min(e.occurred_at) from public.funnel_events e
                            where e.user_id = f.addressee_id and e.step = 'invite_opened'
                              and e.occurred_at <= f.created_at
                              and e.occurred_at >= f.created_at - interval '30 days')),
    'readable', f.status = 'accepted',
    'comparisons', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', cc.id,
        'created_at', cc.created_at,
        'asked_by', cc.user_id,
        'aspects', coalesce(jsonb_array_length(cc.result -> 'astro_dialogue' -> 'aspects'), 0),
        'read_by_other_at', (select r.first_read_at from public.comparison_reads r
                              where r.comparison_id = cc.id and r.user_id <> cc.user_id limit 1),
        'result', case when f.status = 'accepted' then cc.result end
      ) order by cc.created_at desc)
      from public.chart_comparisons cc where cc.friendship_id = f.id), '[]'::jsonb),
    'chat', coalesce((
      select jsonb_agg(jsonb_build_object(
        'user_id', m.user_id, 'role', m.role, 'text', m.text, 'at', m.created_at
      ) order by m.created_at)
      from public.messages m where m.friendship_id = f.id), '[]'::jsonb)
  );
end
$$;

-- Which screens people open, in a range of days: people per screen.
create function public.admin_screens(p_from date, p_to date)
returns table (screen text, people bigint)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.admin_require('screens');
  return query
  -- Accounts only, as «Usaron la app»: somebody with no map who opens /carta
  -- sees an empty state, not the chart.
  select f.detail, count(distinct f.user_id)
  from public.funnel_events f
  join auth.users u on u.id = f.user_id and not u.is_anonymous
  where f.step = 'screen_viewed'
    and (f.occurred_at at time zone 'America/Santiago')::date between p_from and p_to
    and not public.is_internal_user(f.user_id)
  group by f.detail
  order by 2 desc;
end
$$;
revoke execute on function public.admin_screens(date, date) from public, anon;
grant execute on function public.admin_screens(date, date) to authenticated;
