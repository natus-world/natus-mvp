-- The admin panel ordered by four questions (owner, 23 Oct 2026, from the
-- approved mockup «Panel Natus como la app»): ¿Llegan? ¿Les sirve? ¿Vuelven?
-- ¿Pagan?, the Pulso on top, each person's file and each friendship.
--
-- Read-only functions over what the app already stores. Every one starts with
-- admin_require(); the team and the QA robot are left out (is_internal_user);
-- only accounts count as people (auth.users.is_anonymous = false). Days and
-- weeks are Chile's (America/Santiago), weeks start on Monday.
--
-- Decided by the owner on 23 Oct 2026 for friendships: one lasts until
-- somebody disconnects or deletes the account. A disconnected friendship is
-- still shown (that it existed, who ended it, when), never the text of its
-- comparisons — the app hides it from both, and so does the panel.

-- ── helpers ─────────────────────────────────────────────────────────────────

-- When a person became an account: the funnel's account_created, else the
-- row's own creation for accounts older than the funnel.
create function public.admin_account_at(p_user uuid)
returns timestamptz
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select min(f.occurred_at) from public.funnel_events f
      where f.user_id = p_user and f.step = 'account_created'),
    (select u.created_at from auth.users u where u.id = p_user))
$$;
revoke execute on function public.admin_account_at(uuid) from public, anon, authenticated;

-- Fixed monthly costs: monthly expenses plus a twelfth of the yearly ones.
-- Usage-priced services (the model provider) are counted per person apart.
create function public.admin_fixed_monthly()
returns numeric
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(sum(case e.frequency when 'monthly' then e.amount_usd
                                        when 'yearly' then e.amount_usd / 12 end), 0)
  from public.tech_expenses e
  where e.status = 'active' and e.paid_by <> 'free' and e.amount_usd is not null
$$;
revoke execute on function public.admin_fixed_monthly() from public, anon, authenticated;

-- ── ¿Vuelven? growth accounting ─────────────────────────────────────────────
-- Per week: active people who were active the week before (kept), whose
-- account is from this week (new), who came back after a pause (returned),
-- and who were active the week before and not this one (lost).
create function public.admin_growth(p_weeks integer default 12)
returns table (week_start date, kept bigint, new_people bigint, returned bigint, lost bigint)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  n  integer := least(greatest(coalesce(p_weeks, 12), 1), 52);
  w1 date := date_trunc('week', now() at time zone 'America/Santiago')::date;
  w0 date := w1 - 7 * (n - 1);
begin
  perform public.admin_require('growth');
  return query
  with people as (
    select u.id as user_id,
           date_trunc('week', public.admin_account_at(u.id) at time zone 'America/Santiago')::date as born
    from auth.users u
    where not u.is_anonymous and not public.is_internal_user(u.id)
  ),
  act as (
    select distinct f.user_id,
           date_trunc('week', f.occurred_at at time zone 'America/Santiago')::date as wk
    from public.funnel_events f
    join people p on p.user_id = f.user_id
    where f.step in ('app_opened', 'account_created')
      and f.occurred_at >= ((w0 - 7)::timestamp at time zone 'America/Santiago')
  ),
  weeks as (select generate_series(w0, w1, interval '7 days')::date as wk)
  select w.wk,
    (select count(*) from act a join people p using (user_id)
      where a.wk = w.wk and p.born < w.wk
        and exists (select 1 from act b where b.user_id = a.user_id and b.wk = w.wk - 7)),
    (select count(*) from people p where p.born = w.wk),
    (select count(*) from act a join people p using (user_id)
      where a.wk = w.wk and p.born < w.wk
        and not exists (select 1 from act b where b.user_id = a.user_id and b.wk = w.wk - 7)),
    (select count(*) from act b
      where b.wk = w.wk - 7
        and not exists (select 1 from act a where a.user_id = b.user_id and a.wk = w.wk))
  from weeks w
  order by w.wk;
end
$$;

-- ── ¿Vuelven? retention curves ──────────────────────────────────────────────
-- For each week of arrival, how many of its accounts used the app in each
-- week since (week 0 is the week they arrived).
create function public.admin_cohort_curve(p_weeks integer default 8)
returns table (cohort date, week_n integer, accounts bigint, active bigint)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  n  integer := least(greatest(coalesce(p_weeks, 8), 1), 26);
  w1 date := date_trunc('week', now() at time zone 'America/Santiago')::date;
begin
  perform public.admin_require('cohort_curve');
  return query
  with people as (
    select u.id as user_id,
           date_trunc('week', public.admin_account_at(u.id) at time zone 'America/Santiago')::date as born
    from auth.users u
    where not u.is_anonymous and not public.is_internal_user(u.id)
  ),
  cohorts as (
    select p.born, count(*) as accounts from people p
    where p.born between w1 - 7 * (n - 1) and w1
    group by p.born
  ),
  act as (
    select distinct f.user_id,
           date_trunc('week', f.occurred_at at time zone 'America/Santiago')::date as wk
    from public.funnel_events f
    where f.step in ('app_opened', 'account_created')
  )
  select c.born, s.k::integer, c.accounts,
    (select count(distinct p.user_id) from people p join act a on a.user_id = p.user_id
      where p.born = c.born and a.wk = c.born + 7 * s.k)
  from cohorts c
  cross join lateral generate_series(0, ((w1 - c.born) / 7)) as s(k)
  order by c.born, s.k;
end
$$;

-- ── ¿Les sirve? how many days a week, when, how rated ───────────────────────
create function public.admin_open_days(p_from date, p_to date)
returns table (bucket text, people bigint)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.admin_require('open_days');
  return query
  with d as (
    select f.user_id, count(distinct (f.occurred_at at time zone 'America/Santiago')::date) as days
    from public.funnel_events f
    join auth.users u on u.id = f.user_id
    where f.step = 'app_opened' and not u.is_anonymous
      and (f.occurred_at at time zone 'America/Santiago')::date between p_from and p_to
      and not public.is_internal_user(f.user_id)
    group by f.user_id
  )
  select b.bucket, count(d.user_id)
  from (values ('1', 1, 1), ('2-3', 2, 3), ('4+', 4, 10000)) as b(bucket, lo, hi)
  left join d on d.days between b.lo and b.hi
  group by b.bucket, b.lo
  order by b.lo;
end
$$;

-- What people do, by weekday (1 = Monday) and hour: messages to Davraz,
-- journal entries and the day's first opening. Counts only.
create function public.admin_activity_heatmap(p_from date, p_to date)
returns table (dow integer, hour integer, actions bigint)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.admin_require('activity_heatmap');
  return query
  with ev as (
    select m.user_id, m.created_at as ts from public.messages m where m.role = 'user'
    union all
    select j.user_id, j.created_at from public.journal_entries j
    union all
    select f.user_id, f.occurred_at from public.funnel_events f where f.step = 'app_opened'
  )
  select extract(isodow from ev.ts at time zone 'America/Santiago')::integer,
         extract(hour from ev.ts at time zone 'America/Santiago')::integer,
         count(*)
  from ev
  where (ev.ts at time zone 'America/Santiago')::date between p_from and p_to
    and not public.is_internal_user(ev.user_id)
  group by 1, 2
  order by 1, 2;
end
$$;

create function public.admin_ratings(p_from date, p_to date)
returns table (rating integer, n bigint)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.admin_require('ratings');
  return query
  select r.v, count(c.id)
  from generate_series(1, 5) as r(v)
  left join public.recommendation_checkins c
    on c.rating = r.v and c.checked_on between p_from and p_to
   and not public.is_internal_user(c.user_id)
  group by r.v
  order by r.v desc;
end
$$;

-- ── ¿Vuelven? the last thing done by who left ───────────────────────────────
-- People active the week before p_week and not in p_week: their last step
-- (openings aside), counted.
create function public.admin_last_steps(p_week date)
returns table (step text, people bigint)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  wk date := date_trunc('week', p_week)::date;
begin
  perform public.admin_require('last_steps');
  return query
  with act as (
    select distinct f.user_id,
           date_trunc('week', f.occurred_at at time zone 'America/Santiago')::date as w
    from public.funnel_events f
    join auth.users u on u.id = f.user_id
    where f.step in ('app_opened', 'account_created') and not u.is_anonymous
      and not public.is_internal_user(f.user_id)
  ),
  lost as (
    select a.user_id from act a
    where a.w = wk - 7
      and not exists (select 1 from act b where b.user_id = a.user_id and b.w = wk)
  ),
  lst as (
    select distinct on (f.user_id) f.user_id, f.step
    from public.funnel_events f
    join lost l on l.user_id = f.user_id
    where f.step <> 'app_opened'
      and f.occurred_at < (wk::timestamp at time zone 'America/Santiago')
    order by f.user_id, f.occurred_at desc
  )
  select lst.step, count(*) from lst group by lst.step order by 2 desc;
end
$$;

-- ── ¿Pagan? what the free plan gives, used up ───────────────────────────────
-- Free accounts with nothing left of a feature today, and what they did after
-- the call that used the last of it: started the free month, kept opening the
-- app, or did not come back. The three are exclusive, in that order.
create function public.admin_free_usage()
returns table (feature text, free_people bigint, used_all bigint,
               started_trial bigint, kept_using bigint, did_not_return bigint)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.admin_require('free_usage');
  return query
  with free as (
    select u.id as user_id from auth.users u
    where not u.is_anonymous and not public.is_internal_user(u.id)
      and public.plan_tier(u.id) = 'free'
  ),
  feats as (select unnest(array['chat', 'meditation', 'comparison']) as feature),
  spent as (
    select fr.user_id, ft.feature,
      (select max(c.created_at) from public.claude_api_calls c
        where c.user_id = fr.user_id and c.purpose = ft.feature and c.mode = 'server'
          and (case when ft.feature = 'chat' then c.charged else c.outcome in ('ok', 'pending') end)) as hit
    from free fr cross join feats ft
    where public.quota_remaining(fr.user_id, ft.feature) = 0
  ),
  aft as (
    select s.*,
      exists (select 1 from public.funnel_events f where f.user_id = s.user_id
                and f.step = 'trial_started' and f.occurred_at >= s.hit) as trial,
      exists (select 1 from public.funnel_events f where f.user_id = s.user_id
                and f.step = 'app_opened'
                and (f.occurred_at at time zone 'America/Santiago')::date
                    > (s.hit at time zone 'America/Santiago')::date) as back
    from spent s
  )
  select ft.feature,
    (select count(*) from free),
    count(a.user_id),
    count(a.user_id) filter (where a.trial),
    count(a.user_id) filter (where not a.trial and a.back),
    count(a.user_id) filter (where not a.trial and not a.back)
  from feats ft
  left join aft a on a.feature = ft.feature
  group by ft.feature
  order by array_position(array['chat', 'meditation', 'comparison'], ft.feature);
end
$$;

-- One person's free plan, feature by feature: how many used, how many left.
create function public.admin_person_quota(p_user uuid)
returns table (feature text, used bigint, remaining integer)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.admin_require('person_quota');
  return query
  select ft.feature,
    (select count(*) from public.claude_api_calls c
      where c.user_id = p_user and c.purpose = ft.feature and c.mode = 'server'
        and (case when ft.feature = 'chat' then c.charged else c.outcome in ('ok', 'pending') end)),
    public.quota_remaining(p_user, ft.feature)
  from unnest(array['chat', 'meditation', 'comparison']) as ft(feature);
end
$$;

-- ── ¿Pagan? every Premium and what each costs this month ────────────────────
-- kind: paying (PayPal with a first charge), trial (PayPal, free month) or
-- gifted (given from the panel). AI is this calendar month (UTC, as the cap);
-- the fixed share is the month's fixed costs over the people who opened the
-- app this month. paid is what the plan charges in a month (US$ 10, the price
-- the owner confirmed on 16 Oct 2026); a trial and a gift pay nothing.
create function public.admin_premium_list()
returns table (user_id uuid, name text, email text, kind text,
               since timestamptz, until timestamptz, granted_by_name text,
               ai_month numeric, fixed_share numeric, paid_month numeric)
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  month_utc  timestamptz := date_trunc('month', now(), 'UTC');
  month_cl   date := date_trunc('month', now() at time zone 'America/Santiago')::date;
  actives    bigint;
  share      numeric;
begin
  perform public.admin_require('premium_list', null, true);
  select count(distinct f.user_id) into actives
  from public.funnel_events f
  join auth.users u on u.id = f.user_id
  where f.step = 'app_opened' and not u.is_anonymous
    and (f.occurred_at at time zone 'America/Santiago')::date >= month_cl
    and not public.is_internal_user(f.user_id);
  share := round(public.admin_fixed_monthly() / greatest(actives, 1), 2);
  return query
  select s.user_id,
    c.legal_birth_name,
    coalesce(u.email::text, c.email),
    k.kind,
    s.activated_at,
    case k.kind when 'trial' then s.activated_at + interval '30 days' else s.ends_at end,
    case when s.granted_by is null then null
         else coalesce(g.legal_birth_name, gu.email::text) end,
    round(coalesce((select sum(public.admin_call_cost(cc)) from public.claude_api_calls cc
                     where cc.user_id = s.user_id and cc.mode = 'server'
                       and cc.created_at >= month_utc), 0), 2),
    share,
    case k.kind when 'paying' then 10::numeric else 0::numeric end
  from public.subscriptions s
  join auth.users u on u.id = s.user_id
  left join public.clients c on c.user_id = s.user_id
  left join public.clients g on g.user_id = s.granted_by
  left join auth.users gu on gu.id = s.granted_by
  cross join lateral (
    select case
      when s.provider = 'manual' then 'gifted'
      when exists (select 1 from public.funnel_events f
                    where f.user_id = s.user_id and f.step = 'first_charge') then 'paying'
      else 'trial' end as kind
  ) k
  where s.status = 'active' and (s.ends_at is null or s.ends_at > now())
    and not public.is_internal_user(s.user_id)
  order by 8 desc;
end
$$;

-- ── Invitations and friendships ─────────────────────────────────────────────
-- Somebody arrived through an invitation when they started Natus within a day
-- before the friendship was made. An estimate until the link marks its origin.
create function public.admin_arrived_by_invite(p_friendship uuid)
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
      and f.occurred_at between fs.created_at - interval '1 day' and fs.created_at
      and not exists (select 1 from public.funnel_events e
                       where e.user_id = fs.addressee_id and e.step = 'onboarding_started'
                         and e.occurred_at < fs.created_at - interval '1 day'))
$$;
revoke execute on function public.admin_arrived_by_invite(uuid) from public, anon, authenticated;

create function public.admin_friends(p_from date, p_to date)
returns table (accounts bigint, shared bigint, accepted bigint, new_by_invite bigint,
               befriended bigint, compared bigint, comparisons bigint,
               active_friendships bigint, ended bigint)
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
       and (fs.responded_at at time zone 'America/Santiago')::date between p_from and p_to);
end
$$;

create function public.admin_top_inviters(p_from date, p_to date, p_limit integer default 20)
returns table (user_id uuid, name text, shared bigint, accepted bigint,
               new_people bigint, comparisons bigint, last_at timestamptz)
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  perform public.admin_require('top_inviters', null, true);
  return query
  with fs as (
    select f.* from public.friendships f
    where f.status in ('accepted', 'removed')
      and (f.created_at at time zone 'America/Santiago')::date between p_from and p_to
      and not public.is_internal_user(f.requester_id)
  )
  select fs.requester_id,
    c.legal_birth_name,
    (select count(*) from public.funnel_events e
      where e.user_id = fs.requester_id and e.step = 'friend_invited'
        and (e.occurred_at at time zone 'America/Santiago')::date between p_from and p_to),
    count(*),
    count(*) filter (where public.admin_arrived_by_invite(fs.id)),
    (select count(*) from public.chart_comparisons cc
      join public.friendships f2 on f2.id = cc.friendship_id
      where (f2.requester_id = fs.requester_id or f2.addressee_id = fs.requester_id)
        and (cc.created_at at time zone 'America/Santiago')::date between p_from and p_to),
    max(fs.created_at)
  from fs
  left join public.clients c on c.user_id = fs.requester_id
  group by fs.requester_id, c.legal_birth_name
  order by 4 desc, 7 desc
  limit least(greatest(coalesce(p_limit, 20), 1), 200);
end
$$;

-- One person's friends. Logged, like every look at one person.
create function public.admin_person_friends(p_user uuid)
returns table (friendship_id uuid, friend_id uuid, friend_name text, invited_by_them boolean,
               status text, since timestamptz, ended_at timestamptz, ended_by_them boolean,
               comparisons bigint, friend_arrived_by_invite boolean)
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  perform public.admin_require('person_friends', p_user);
  return query
  select f.id,
    case when f.requester_id = p_user then f.addressee_id else f.requester_id end,
    c.legal_birth_name,
    f.requester_id = p_user,
    f.status::text,
    f.created_at,
    case when f.status = 'removed' then f.responded_at end,
    f.ended_by = p_user,
    (select count(*) from public.chart_comparisons cc where cc.friendship_id = f.id),
    f.requester_id = p_user and public.admin_arrived_by_invite(f.id)
  from public.friendships f
  left join public.clients c
    on c.user_id = case when f.requester_id = p_user then f.addressee_id else f.requester_id end
  where (f.requester_id = p_user or f.addressee_id = p_user)
    and f.status in ('accepted', 'removed')
  order by f.created_at desc;
end
$$;

-- One friendship: who invited, who accepted, its comparisons. The text of a
-- comparison only while the friendship is accepted (owner, 23 Oct 2026).
-- Logged for both people.
create function public.admin_friendship(p_id uuid)
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
      'arrived_by_invite', public.admin_arrived_by_invite(f.id)),
    'readable', f.status = 'accepted',
    'comparisons', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', cc.id,
        'created_at', cc.created_at,
        'asked_by', cc.user_id,
        'aspects', coalesce(jsonb_array_length(cc.result -> 'astro_dialogue' -> 'aspects'), 0),
        'result', case when f.status = 'accepted' then cc.result end
      ) order by cc.created_at desc)
      from public.chart_comparisons cc where cc.friendship_id = f.id), '[]'::jsonb)
  );
end
$$;

-- ── Personas, with what the list needs to choose whom to look at ────────────
create function public.admin_people_list(p_query text default '', p_limit integer default 100)
returns table (user_id uuid, email text, name text, country text, joined_at timestamptz,
               plan text, last_opened timestamptz, source text, device text, activated boolean,
               invited bigint, chat_left integer, meditation_left integer, comparison_left integer)
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  q text := '%' || lower(trim(coalesce(p_query, ''))) || '%';
begin
  perform public.admin_require('people', null, true);
  return query
  with base as (
    select c.user_id, coalesce(u.email::text, c.email) as email, c.legal_birth_name as name,
           c.country, public.admin_account_at(c.user_id) as joined_at
    from public.clients c
    join auth.users u on u.id = c.user_id
    where not u.is_anonymous
      and (lower(coalesce(u.email, c.email, '')) like q or lower(coalesce(c.legal_birth_name, '')) like q)
    order by 5 desc nulls last
    limit least(greatest(coalesce(p_limit, 100), 1), 500)
  )
  select b.user_id, b.email, b.name, b.country, b.joined_at,
    public.admin_plan(b.user_id),
    (select max(f.occurred_at) from public.funnel_events f
      where f.user_id = b.user_id and f.step = 'app_opened'),
    (select f.source from public.funnel_events f
      where f.user_id = b.user_id and f.step = 'onboarding_started' order by f.occurred_at limit 1),
    (select f.detail from public.funnel_events f
      where f.user_id = b.user_id and f.step = 'onboarding_started' order by f.occurred_at limit 1),
    coalesce(public.first_value_at(b.user_id) < b.joined_at + interval '7 days', false),
    (select count(*) from public.friendships fs
      where fs.requester_id = b.user_id and fs.status in ('accepted', 'removed')),
    public.quota_remaining(b.user_id, 'chat'),
    public.quota_remaining(b.user_id, 'meditation'),
    public.quota_remaining(b.user_id, 'comparison')
  from base b
  order by b.joined_at desc nulls last;
end
$$;

-- ── who may call ────────────────────────────────────────────────────────────
do $$
declare fn text;
begin
  foreach fn in array array[
    'admin_growth(integer)', 'admin_cohort_curve(integer)', 'admin_open_days(date, date)',
    'admin_activity_heatmap(date, date)', 'admin_ratings(date, date)', 'admin_last_steps(date)',
    'admin_free_usage()', 'admin_person_quota(uuid)', 'admin_premium_list()',
    'admin_friends(date, date)', 'admin_top_inviters(date, date, integer)',
    'admin_person_friends(uuid)', 'admin_friendship(uuid)', 'admin_people_list(text, integer)'
  ] loop
    execute format('revoke execute on function public.%s from public, anon', fn);
    execute format('grant execute on function public.%s to authenticated', fn);
  end loop;
end
$$;
