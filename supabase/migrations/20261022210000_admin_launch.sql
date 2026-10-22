-- The panel for the launch night (owner, 22 Oct 2026).
--
-- 1. The team and the QA robot leave every number: an admin, or anybody
--    whose first step came with `utm_source=qa-natus`, is internal.
-- 2. «Usaron la app» counts people with an account, not every visitor whose
--    anonymous session opened the app once.
-- 3. Premium through PayPal is split into the free month and paying: paying
--    is a subscription with a first charge recorded.
-- 4. Hour by hour for one day, to watch a launch as it happens.
-- 5. The funnel by origin.
-- 6. The browser may say, on the first step, the kind of device and whether
--    it is the in-app browser of a social network; on the birth step, whether
--    the hour was given; and, once, that a typed city found nothing.
--    A closed vocabulary each: never content, never what was typed.

-- ── what the browser may record ─────────────────────────────────────────────

alter table public.funnel_events drop constraint funnel_events_step_check;
alter table public.funnel_events add constraint funnel_events_step_check check (step in (
  'onboarding_started', 'birth_data_done', 'need_done', 'openness_done', 'signup_seen',
  'soul_map_seen', 'care_done', 'paths_seen', 'account_created', 'first_practice',
  'first_chat', 'paywall_seen', 'trial_started', 'first_charge', 'canceled',
  'app_opened', 'friend_invited', 'friend_accepted', 'birth_city_not_found'
));

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
                    'friend_invited', 'birth_city_not_found') then
    raise exception 'not a step the browser records' using errcode = '22023';
  end if;
  -- Origin travels only on the first step.
  if p_step <> 'onboarding_started' then
    p_source := null;
    p_campaign := null;
  end if;
  -- A detail from a closed list, on three steps only: where a paywall
  -- appeared; the device and browser of the first step; whether the hour
  -- was given on the birth step.
  if p_step = 'paywall_seen' then
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
  else
    p_detail := null;
  end if;

  perform public.record_step(auth.uid(), p_step, p_source, p_campaign, p_detail);
end
$$;

revoke execute on function public.track_step(text, text, text, text) from public, anon;
grant execute on function public.track_step(text, text, text, text) to authenticated;

-- ── who is internal ─────────────────────────────────────────────────────────

create function public.is_internal_user(p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.admins a where a.user_id = p_user)
      or exists (select 1 from public.funnel_events f
                 where f.user_id = p_user and f.step = 'onboarding_started' and f.source = 'qa-natus');
$$;

revoke execute on function public.is_internal_user(uuid) from public, anon, authenticated;

-- ── the numbers at the top ──────────────────────────────────────────────────

drop function public.admin_overview();
create function public.admin_overview()
returns table (
  accounts          bigint,  -- people with an account (Google or the e-mail code)
  anonymous         bigint,  -- sessions that never made an account
  accounts_7d       bigint,
  premium_paying    bigint,  -- PayPal, with a first charge
  premium_trial     bigint,  -- PayPal, in the free month (no charge yet)
  premium_gifted    bigint,  -- given by hand from the panel
  active_7d         bigint,  -- people with an account who opened the app in seven days
  ai_spend_month    numeric, -- US$, this calendar month (UTC), server calls
  crisis_alerts_7d  bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.admin_require('overview');
  return query
  with live as (
    select s.user_id, s.provider from public.subscriptions s
    where s.status = 'active' and (s.ends_at is null or s.ends_at > now())
      and not public.is_internal_user(s.user_id)
  ),
  charged as (
    select distinct f.user_id from public.funnel_events f where f.step = 'first_charge'
  )
  select
    (select count(*) from auth.users u
       where not coalesce(u.is_anonymous, false) and not public.is_internal_user(u.id)),
    (select count(*) from auth.users u
       where coalesce(u.is_anonymous, false) and not public.is_internal_user(u.id)),
    (select count(*) from auth.users u
       where not coalesce(u.is_anonymous, false) and u.created_at >= now() - interval '7 days'
         and not public.is_internal_user(u.id)),
    (select count(*) from live where live.provider is distinct from 'manual'
       and live.user_id in (select user_id from charged)),
    (select count(*) from live where live.provider is distinct from 'manual'
       and live.user_id not in (select user_id from charged)),
    (select count(*) from live where live.provider = 'manual'),
    (select count(distinct f.user_id) from public.funnel_events f
       join auth.users u on u.id = f.user_id
       where f.step = 'app_opened' and f.occurred_at >= now() - interval '7 days'
         and not coalesce(u.is_anonymous, false) and not public.is_internal_user(f.user_id)),
    (select coalesce(round(sum(public.admin_call_cost(c)), 2), 0)
       from public.claude_api_calls c
       where c.mode = 'server' and c.created_at >= date_trunc('month', now(), 'UTC')),
    (select count(*) from public.crisis_events e where e.created_at >= now() - interval '7 days');
end
$$;

-- ── the funnels, without the team ───────────────────────────────────────────

create or replace function public.admin_funnel(p_from date, p_to date)
returns table (step text, people bigint)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.admin_require('funnel');
  return query
  select f.step, count(distinct f.user_id)
  from public.funnel_events f
  where (f.occurred_at at time zone 'America/Santiago')::date between p_from and p_to
    and not public.is_internal_user(f.user_id)
  group by f.step;
end
$$;

create or replace function public.admin_funnel_detail(p_step text, p_from date, p_to date)
returns table (detail text, people bigint)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.admin_require('funnel_detail');
  return query
  select coalesce(f.detail, ''), count(distinct f.user_id)
  from public.funnel_events f
  where f.step = p_step
    and (f.occurred_at at time zone 'America/Santiago')::date between p_from and p_to
    and not public.is_internal_user(f.user_id)
  group by 1;
end
$$;

-- Each step, by the origin the person's first step came with.
create function public.admin_funnel_by_source(p_from date, p_to date)
returns table (source text, step text, people bigint)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.admin_require('funnel_by_source');
  return query
  with origin as (
    select distinct on (o.user_id) o.user_id, coalesce(o.source, '') as source
    from public.funnel_events o
    where o.step = 'onboarding_started'
    order by o.user_id, o.occurred_at
  )
  select coalesce(origin.source, ''), f.step, count(distinct f.user_id)
  from public.funnel_events f
  left join origin on origin.user_id = f.user_id
  where (f.occurred_at at time zone 'America/Santiago')::date between p_from and p_to
    and not public.is_internal_user(f.user_id)
  group by 1, 2;
end
$$;

-- ── per day and per hour ────────────────────────────────────────────────────

create or replace function public.admin_daily(p_days integer default 30)
returns table (day date, accounts bigint, started bigint, opened bigint)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  first_day date := (now() at time zone 'America/Santiago')::date - (least(greatest(p_days, 1), 366) - 1);
begin
  perform public.admin_require('daily');
  return query
  with days as (
    select generate_series(first_day, (now() at time zone 'America/Santiago')::date, interval '1 day')::date as d
  ),
  ev as (
    select (f.occurred_at at time zone 'America/Santiago')::date as d, f.step, f.user_id
    from public.funnel_events f
    join auth.users u on u.id = f.user_id
    where f.occurred_at >= first_day::timestamp at time zone 'America/Santiago'
      and f.step in ('account_created', 'onboarding_started', 'app_opened')
      -- «Abrieron la app» is people with an account; the other two are not.
      and (f.step <> 'app_opened' or not coalesce(u.is_anonymous, false))
      and not public.is_internal_user(f.user_id)
  )
  select
    days.d,
    count(distinct ev.user_id) filter (where ev.step = 'account_created'),
    count(distinct ev.user_id) filter (where ev.step = 'onboarding_started'),
    count(distinct ev.user_id) filter (where ev.step = 'app_opened')
  from days left join ev on ev.d = days.d
  group by days.d
  order by days.d;
end
$$;

-- One day, hour by hour (Santiago): started, saw their map, made an account.
create function public.admin_hourly(p_day date)
returns table (hour integer, started bigint, map_seen bigint, accounts bigint)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.admin_require('hourly');
  return query
  with hours as (select generate_series(0, 23) as h),
  ev as (
    select extract(hour from f.occurred_at at time zone 'America/Santiago')::integer as h, f.step, f.user_id
    from public.funnel_events f
    where (f.occurred_at at time zone 'America/Santiago')::date = p_day
      and f.step in ('onboarding_started', 'soul_map_seen', 'account_created')
      and not public.is_internal_user(f.user_id)
  )
  select
    hours.h,
    count(distinct ev.user_id) filter (where ev.step = 'onboarding_started'),
    count(distinct ev.user_id) filter (where ev.step = 'soul_map_seen'),
    count(distinct ev.user_id) filter (where ev.step = 'account_created')
  from hours left join ev on ev.h = hours.h
  group by hours.h
  order by hours.h;
end
$$;

do $$
declare f text;
begin
  foreach f in array array[
    'admin_overview()',
    'admin_funnel(date, date)',
    'admin_funnel_detail(text, date, date)',
    'admin_funnel_by_source(date, date)',
    'admin_daily(integer)',
    'admin_hourly(date)'
  ] loop
    execute format('revoke execute on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end
$$;
