-- «Macro datos» in the admin panel (owner, 25 Oct 2026): one screen with the
-- business's main numbers in one table, for a period, inside the segment the
-- admin chose (is_internal_user leaves out the team, the QA robot and
-- whoever is outside that segment). The panel asks it twice, for the period
-- and the one before, to show the change.

create function public.admin_macro(p_from date, p_to date)
returns table (
  accounts_total  bigint,  -- accounts made up to the end of the period
  accounts_new    bigint,  -- accounts made in the period
  activated_new   bigint,  -- of those, something of value in their first 7 days (22 Oct 2026)
  active          bigint,  -- accounts that opened the app in the period
  accounts_before bigint,  -- accounts made before the period
  returned        bigint,  -- of those, opened the app in the period
  trials          bigint,  -- free months started in the period
  paying_now      bigint,  -- PayPal with a first charge, active today
  trial_now       bigint,  -- PayPal in the free month, today
  gifted_now      bigint,  -- Premium given from the panel, today
  ai_spend        numeric  -- US$ of model calls in the period, their people only
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  t0 timestamptz := (p_from::timestamp at time zone 'America/Santiago');
  t1 timestamptz := ((p_to + 1)::timestamp at time zone 'America/Santiago');
begin
  perform public.admin_require('macro');
  return query
  with acc as (
    select u.id, public.admin_account_at(u.id) as at
    from auth.users u
    where not u.is_anonymous and not public.is_internal_user(u.id)
  ),
  opened as (
    select distinct f.user_id from public.funnel_events f
    where f.step = 'app_opened' and f.occurred_at >= t0 and f.occurred_at < t1
  ),
  live as (
    select s.user_id, s.provider from public.subscriptions s
    where s.status = 'active' and (s.ends_at is null or s.ends_at > now())
      and not public.is_internal_user(s.user_id)
  ),
  charged as (
    select distinct f.user_id from public.funnel_events f where f.step = 'first_charge'
  )
  select
    (select count(*) from acc where acc.at < t1),
    (select count(*) from acc where acc.at >= t0 and acc.at < t1),
    (select count(*) from acc where acc.at >= t0 and acc.at < t1
       and public.first_value_at(acc.id) < acc.at + interval '7 days'),
    (select count(*) from acc where acc.id in (select user_id from opened)),
    (select count(*) from acc where acc.at < t0),
    (select count(*) from acc where acc.at < t0 and acc.id in (select user_id from opened)),
    (select count(distinct f.user_id) from public.funnel_events f
       where f.step = 'trial_started' and f.occurred_at >= t0 and f.occurred_at < t1
         and not public.is_internal_user(f.user_id)),
    (select count(*) from live where live.provider is distinct from 'manual'
       and live.user_id in (select user_id from charged)),
    (select count(*) from live where live.provider is distinct from 'manual'
       and live.user_id not in (select user_id from charged)),
    (select count(*) from live where live.provider = 'manual'),
    (select coalesce(round(sum(public.admin_call_cost(c)), 2), 0)
       from public.claude_api_calls c
       where c.mode = 'server' and c.created_at >= t0 and c.created_at < t1
         and c.user_id is not null and not public.is_internal_user(c.user_id));
end
$$;

revoke execute on function public.admin_macro(date, date) from public, anon;
grant execute on function public.admin_macro(date, date) to authenticated;
