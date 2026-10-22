-- The panel, second round of the launch night (owner, 22 Oct 2026).
--
-- 1. Any range of dates, not only the last 7/30/90 days: the per-day
--    charts, the spend and the crisis counts by `p_from`–`p_to`.
-- 2. How long people take between two steps of a funnel (the median).
-- 3. Use and return: by the week the account was made, how many were
--    activated (owner: in their first 7 days they marked a practice, wrote
--    to Davraz or wrote in the journal) and how many came back; what they
--    did first; what each week's active people used.
-- 4. What the team has pending, and for one person, what Davraz could adapt
--    to (logged, like every look at one person).
-- The team and the QA robot are left out (`is_internal_user`), as in the
-- first round.

-- ── 1. ranges ───────────────────────────────────────────────────────────────

create function public.admin_daily_range(p_from date, p_to date)
returns table (day date, accounts bigint, started bigint, opened bigint)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.admin_require('daily');
  if p_to < p_from or p_to - p_from > 1100 then
    raise exception 'bad_range' using errcode = '22023';
  end if;
  return query
  with days as (
    select generate_series(p_from, p_to, interval '1 day')::date as d
  ),
  ev as (
    select (f.occurred_at at time zone 'America/Santiago')::date as d, f.step, f.user_id
    from public.funnel_events f
    join auth.users u on u.id = f.user_id
    where (f.occurred_at at time zone 'America/Santiago')::date between p_from and p_to
      and f.step in ('account_created', 'onboarding_started', 'app_opened')
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

create function public.admin_ai_spend_range(p_from date, p_to date)
returns table (day date, purpose text, calls bigint, failed bigint, cost_usd numeric)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.admin_require('ai_spend');
  return query
  select
    (c.created_at at time zone 'America/Santiago')::date,
    c.purpose,
    count(*),
    count(*) filter (where c.outcome not in ('ok', 'pending')),
    round(sum(public.admin_call_cost(c)), 4)
  from public.claude_api_calls c
  where c.mode = 'server'
    and (c.created_at at time zone 'America/Santiago')::date between p_from and p_to
  group by 1, 2
  order by 1, 2;
end
$$;

create function public.admin_crisis_counts_range(p_from date, p_to date)
returns table (day date, severity text, surface text, alerts bigint, not_their_case bigint)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.admin_require('crisis_counts');
  return query
  select
    (e.created_at at time zone 'America/Santiago')::date,
    e.severity,
    e.source_surface,
    count(*),
    count(*) filter (where e.false_positive is true)
  from public.crisis_events e
  where (e.created_at at time zone 'America/Santiago')::date between p_from and p_to
  group by 1, 2, 3
  order by 1, 2, 3;
end
$$;

-- ── 2. time between steps ───────────────────────────────────────────────────

-- For each step after the first in `p_steps`, the median and the people
-- who did both it and the step before, counted by when the later one
-- happened. Seconds; only forward times.
create function public.admin_step_times(p_steps text[], p_from date, p_to date)
returns table (step text, people bigint, median_seconds numeric)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.admin_require('step_times');
  return query
  with pairs as (
    select p_steps[i - 1] as prev, p_steps[i] as cur
    from generate_series(2, coalesce(array_length(p_steps, 1), 0)) as i
  ),
  firsts as (
    select f.user_id, f.step, min(f.occurred_at) as at
    from public.funnel_events f
    where f.step = any (p_steps) and not public.is_internal_user(f.user_id)
    group by f.user_id, f.step
  ),
  gaps as (
    select pairs.cur, extract(epoch from (b.at - a.at)) as secs
    from pairs
    join firsts a on a.step = pairs.prev
    join firsts b on b.step = pairs.cur and b.user_id = a.user_id
    where b.at >= a.at
      and (b.at at time zone 'America/Santiago')::date between p_from and p_to
  )
  select gaps.cur, count(*), round(percentile_cont(0.5) within group (order by gaps.secs)::numeric, 0)
  from gaps
  group by gaps.cur;
end
$$;

-- ── 3. use and return ───────────────────────────────────────────────────────

-- The first moment a person did something of value: a practice, a question
-- to Davraz, a journal entry. Internal.
create function public.first_value_at(p_user uuid)
returns timestamptz
language sql
stable
security definer
set search_path = ''
as $$
  select min(t) from (
    select min(f.occurred_at) as t from public.funnel_events f
      where f.user_id = p_user and f.step in ('first_practice', 'first_chat')
    union all
    select min(j.created_at) from public.journal_entries j where j.user_id = p_user
  ) x;
$$;

revoke execute on function public.first_value_at(uuid) from public, anon, authenticated;

-- By the week (Monday, Santiago) the account was made: how many, how many
-- activated within 7 days, and how many opened the app again on the next
-- day, in days 1–7, 8–14, 15–30 and after 30. The panel decides which
-- windows have fully passed (`week_start` + 6 + the window's end).
create function public.admin_retention(p_weeks integer default 12)
returns table (
  week_start date, accounts bigint, activated bigint,
  back_d1 bigint, back_w1 bigint, back_w2 bigint, back_m1 bigint, back_after bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.admin_require('retention');
  return query
  with acc as (
    select f.user_id, min(f.occurred_at) as at,
           (min(f.occurred_at) at time zone 'America/Santiago')::date as d
    from public.funnel_events f
    where f.step = 'account_created' and not public.is_internal_user(f.user_id)
    group by f.user_id
  ),
  cohort as (
    select acc.*, date_trunc('week', acc.d)::date as w
    from acc
    where acc.d >= date_trunc('week', (now() at time zone 'America/Santiago')::date)::date
                   - 7 * (least(greatest(p_weeks, 1), 104) - 1)
  ),
  opens as (
    select c.user_id, (f.occurred_at at time zone 'America/Santiago')::date - c.d as k
    from cohort c
    join public.funnel_events f on f.user_id = c.user_id and f.step = 'app_opened'
  )
  select
    c.w,
    count(*),
    count(*) filter (where public.first_value_at(c.user_id) < c.at + interval '7 days'),
    count(*) filter (where exists (select 1 from opens o where o.user_id = c.user_id and o.k = 1)),
    count(*) filter (where exists (select 1 from opens o where o.user_id = c.user_id and o.k between 1 and 7)),
    count(*) filter (where exists (select 1 from opens o where o.user_id = c.user_id and o.k between 8 and 14)),
    count(*) filter (where exists (select 1 from opens o where o.user_id = c.user_id and o.k between 15 and 30)),
    count(*) filter (where exists (select 1 from opens o where o.user_id = c.user_id and o.k > 30))
  from cohort c
  group by c.w
  order by c.w;
end
$$;

-- What people whose account was made in the range did first, within 7 days.
create function public.admin_first_action(p_from date, p_to date)
returns table (action text, people bigint)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.admin_require('first_action');
  return query
  with acc as (
    select f.user_id, min(f.occurred_at) as at
    from public.funnel_events f
    where f.step = 'account_created' and not public.is_internal_user(f.user_id)
    group by f.user_id
    having (min(f.occurred_at) at time zone 'America/Santiago')::date between p_from and p_to
  ),
  firsts as (
    select acc.user_id, x.action, x.t
    from acc
    cross join lateral (
      select 'chat'::text as action, min(f.occurred_at) as t from public.funnel_events f
        where f.user_id = acc.user_id and f.step = 'first_chat'
      union all
      select 'practica', min(f.occurred_at) from public.funnel_events f
        where f.user_id = acc.user_id and f.step = 'first_practice'
      union all
      select 'bitacora', min(j.created_at) from public.journal_entries j where j.user_id = acc.user_id
    ) x
    where x.t is not null and x.t < acc.at + interval '7 days'
  ),
  first_one as (
    select distinct on (firsts.user_id) firsts.user_id, firsts.action
    from firsts order by firsts.user_id, firsts.t
  )
  select coalesce(first_one.action, 'nada'), count(*)
  from acc left join first_one on first_one.user_id = acc.user_id
  group by 1;
end
$$;

-- Per week (Monday, Santiago): people with an account who opened the app,
-- and how many of them used each part.
create function public.admin_weekly_use(p_weeks integer default 8)
returns table (
  week_start date, active bigint, practices bigint, chat bigint,
  journal bigint, meditations bigint, comparisons bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  first_week date := date_trunc('week', (now() at time zone 'America/Santiago')::date)::date
                     - 7 * (least(greatest(p_weeks, 1), 52) - 1);
begin
  perform public.admin_require('weekly_use');
  return query
  with weeks as (
    select generate_series(first_week, date_trunc('week', (now() at time zone 'America/Santiago')::date)::date,
                           interval '7 days')::date as w
  ),
  act as (
    select date_trunc('week', (f.occurred_at at time zone 'America/Santiago')::date)::date as w, f.user_id
    from public.funnel_events f
    join auth.users u on u.id = f.user_id
    where f.step = 'app_opened' and not coalesce(u.is_anonymous, false)
      and (f.occurred_at at time zone 'America/Santiago')::date >= first_week
      and not public.is_internal_user(f.user_id)
  ),
  used as (
    select date_trunc('week', r.checked_on)::date as w, r.user_id, 'practices' as what
      from public.recommendation_checkins r where r.checked_on >= first_week
    union all
    select date_trunc('week', (m.created_at at time zone 'America/Santiago')::date)::date, m.user_id, 'chat'
      from public.messages m where m.role = 'user' and m.created_at >= first_week::timestamp at time zone 'America/Santiago'
    union all
    select date_trunc('week', (j.created_at at time zone 'America/Santiago')::date)::date, j.user_id, 'journal'
      from public.journal_entries j where j.created_at >= first_week::timestamp at time zone 'America/Santiago'
    union all
    select date_trunc('week', (d.created_at at time zone 'America/Santiago')::date)::date, d.user_id, 'meditations'
      from public.meditations d where d.created_at >= first_week::timestamp at time zone 'America/Santiago'
    union all
    select date_trunc('week', (c.created_at at time zone 'America/Santiago')::date)::date, c.user_id, 'comparisons'
      from public.chart_comparisons c where c.created_at >= first_week::timestamp at time zone 'America/Santiago'
  )
  select
    weeks.w,
    (select count(distinct a.user_id) from act a where a.w = weeks.w),
    (select count(distinct x.user_id) from used x where x.w = weeks.w and x.what = 'practices' and not public.is_internal_user(x.user_id)),
    (select count(distinct x.user_id) from used x where x.w = weeks.w and x.what = 'chat' and not public.is_internal_user(x.user_id)),
    (select count(distinct x.user_id) from used x where x.w = weeks.w and x.what = 'journal' and not public.is_internal_user(x.user_id)),
    (select count(distinct x.user_id) from used x where x.w = weeks.w and x.what = 'meditations' and not public.is_internal_user(x.user_id)),
    (select count(distinct x.user_id) from used x where x.w = weeks.w and x.what = 'comparisons' and not public.is_internal_user(x.user_id))
  from weeks
  order by weeks.w;
end
$$;

-- ── 4. what is pending, and one person ──────────────────────────────────────

create function public.admin_pending()
returns table (
  unread_suggestions bigint, app_errors_7d bigint, top_error_path text,
  crisis_7d bigint, payment_failures_7d bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.admin_require('pending');
  return query
  select
    (select count(*) from public.feedback_messages m where m.author = 'person' and m.read_at is null),
    (select count(*) from public.client_errors e where e.created_at >= now() - interval '7 days'),
    (select e.path from public.client_errors e where e.created_at >= now() - interval '7 days'
       group by e.path order by count(*) desc limit 1),
    (select count(*) from public.crisis_events c
       where c.created_at >= now() - interval '7 days' and c.false_positive is not true),
    (select count(*) from public.payment_events p
       where p.received_at >= now() - interval '7 days'
         and (p.event_type ilike '%failed%' or p.event_type ilike '%denied%' or p.event_type ilike '%suspended%'));
end
$$;

-- What Davraz could adapt to, for one person, in one look: what brought
-- them, what works and what does not, the routine, what Natus knows, how
-- they use the chat. Logged like every look at one person.
create function public.admin_person_summary(p_user uuid)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  result jsonb;
begin
  perform public.admin_require('person_summary', p_user);
  select jsonb_build_object(
    'need', coalesce(c.presenting_need_text, s.presenting_need_text),
    'topics', to_jsonb(coalesce(c.presenting_need_slugs, s.presenting_need_slugs)),
    'openness', to_jsonb(coalesce(c.openness_to_modalities, s.openness_to_modalities)),
    'works', (
      select coalesce(jsonb_agg(jsonb_build_object('title', t.practice_title, 'avg', t.avg, 'times', t.times)
                                order by t.avg desc, t.times desc), '[]'::jsonb)
      from (
        select r.practice_title, round(avg(r.rating)::numeric, 1) as avg, count(*) as times
        from public.recommendation_checkins r
        where r.user_id = p_user and r.rating is not null
        group by r.practice_title
        having avg(r.rating) >= 4
        order by 2 desc, 3 desc
        limit 5
      ) t
    ),
    'marked', (select count(*) from public.recommendation_checkins r where r.user_id = p_user),
    'low_rated', (
      select coalesce(jsonb_agg(jsonb_build_object('title', t.practice_title, 'avg', t.avg)), '[]'::jsonb)
      from (
        select r.practice_title, round(avg(r.rating)::numeric, 1) as avg
        from public.recommendation_checkins r
        where r.user_id = p_user and r.rating is not null
        group by r.practice_title
        having avg(r.rating) <= 2
        limit 5
      ) t
    ),
    'dismissed', (
      select coalesce(jsonb_agg(jsonb_build_object('slug', m.modality_slug, 'at', m.reacted_at)
                                order by m.reacted_at desc), '[]'::jsonb)
      from public.match_reactions m where m.user_id = p_user and m.reaction = 'dismissed'
    ),
    'saved', (
      select coalesce(jsonb_agg(m.modality_slug order by m.reacted_at desc), '[]'::jsonb)
      from public.match_reactions m where m.user_id = p_user and m.reaction = 'saved'
    ),
    'proposals', jsonb_build_object(
      'accepted', (select count(*) from public.routine_change_proposals p where p.user_id = p_user and p.status = 'accepted'),
      'total', (select count(*) from public.routine_change_proposals p
                where p.user_id = p_user and p.status in ('accepted', 'rejected'))
    ),
    'memory', (
      select coalesce(jsonb_agg(jsonb_build_object('category', t.category, 'content', t.content)), '[]'::jsonb)
      from (
        select mi.category, mi.content from public.memory_items mi
        where mi.user_id = p_user order by mi.updated_at desc limit 6
      ) t
    ),
    'memory_count', (select count(*) from public.memory_items mi where mi.user_id = p_user),
    'chat_month', (
      select count(*) from public.messages m
      where m.user_id = p_user and m.role = 'user'
        and m.created_at >= date_trunc('month', now() at time zone 'America/Santiago') at time zone 'America/Santiago'
    ),
    'chat_hour', (
      select extract(hour from m.created_at at time zone 'America/Santiago')::int
      from public.messages m where m.user_id = p_user and m.role = 'user'
      group by 1 order by count(*) desc limit 1
    ),
    'first_value_at', public.first_value_at(p_user)
  )
  into result
  from (select 1) one
  left join public.clients c on c.user_id = p_user
  left join public.anonymous_sessions s on s.user_id = p_user and c.user_id is null;
  return result;
end
$$;

do $$
declare f text;
begin
  foreach f in array array[
    'admin_daily_range(date, date)',
    'admin_ai_spend_range(date, date)',
    'admin_crisis_counts_range(date, date)',
    'admin_step_times(text[], date, date)',
    'admin_retention(integer)',
    'admin_first_action(date, date)',
    'admin_weekly_use(integer)',
    'admin_pending()',
    'admin_person_summary(uuid)'
  ] loop
    execute format('revoke execute on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end
$$;
