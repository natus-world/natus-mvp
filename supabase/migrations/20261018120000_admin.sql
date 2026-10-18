-- The admin panel, first piece (owner, 15 and 18 Oct 2026): who may enter,
-- a record of what they looked at, and the aggregate metrics.
--
-- The panel is its own site (admin.natus.world) on this same project. It
-- signs in with Google like the app, and an account is an admin only when
-- it has a row in `admins` — a row written by hand through SQL, never by
-- the API. Adding the owner's partner later is one more row.
--
-- Every read the panel makes is a function named `admin_*`, security
-- definer, that starts with `admin_require()`. A new metric is one more
-- such function; nothing else has to change. The three levels agreed:
--   1. aggregate metrics, for every admin — this migration;
--   2. one person's operational record, without content — later, and every
--      call is written to `admin_access_log` with the person looked at;
--   3. sensitive content — last, restricted, after the lawyer.
-- Nothing here returns a person's text, clinical answer, chart, email or
-- name, and no count is narrower than a day.

-- ── who is an admin ─────────────────────────────────────────────────────────

create table public.admins (
  user_id   uuid primary key references auth.users (id) on delete cascade,
  role      text not null default 'admin' check (role in ('owner', 'admin')),
  added_at  timestamptz not null default now(),
  added_by  uuid references auth.users (id) on delete set null
);

alter table public.admins enable row level security;
-- No policy and no grant: nobody reads or writes this through the API.
grant select, insert, update, delete on public.admins to service_role;

create function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.admins a
    join auth.users u on u.id = a.user_id
    where a.user_id = auth.uid()
      and coalesce(u.is_anonymous, false) = false
  )
$$;

revoke execute on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated, service_role;

-- ── what each admin looked at ───────────────────────────────────────────────

create table public.admin_access_log (
  id          bigint generated always as identity primary key,
  admin_id    uuid not null references auth.users (id) on delete cascade,
  -- Which function, from a closed vocabulary of names.
  what        text not null check (what ~ '^[a-z0-9_]{1,64}$'),
  -- The person looked at, for levels 2 and 3. Null for aggregates.
  subject_id  uuid references auth.users (id) on delete set null,
  at          timestamptz not null default now()
);

create index admin_access_log_at_idx on public.admin_access_log (at);

alter table public.admin_access_log enable row level security;
grant select, insert on public.admin_access_log to service_role;

-- The door every admin_* function goes through. Raises for anybody who is
-- not an admin, so a function cannot forget to check and still return rows.
create function public.admin_require(p_what text, p_subject uuid default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'not_admin' using errcode = '42501';
  end if;
  -- Aggregates are not logged one by one; a sign-in and every look at one
  -- person are.
  if p_subject is not null or p_what = 'signed_in' then
    insert into public.admin_access_log (admin_id, what, subject_id)
    values (auth.uid(), p_what, p_subject);
  end if;
end
$$;

revoke execute on function public.admin_require(text, uuid) from public, anon, authenticated;

-- What the panel asks first: am I in, and as what.
create function public.admin_whoami()
returns table (role text)
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.admin_require('signed_in');
  return query select a.role from public.admins a where a.user_id = auth.uid();
end
$$;

-- ── prices, for the spend ───────────────────────────────────────────────────
-- US dollars per million tokens, the same table as PRICE_PER_MTOK in
-- src/lib/budget.ts; `admin-prices.test.ts` fails when the two differ.
-- '*' prices a model the table does not know, as UNKNOWN_MODEL_PRICES does.

create table public.model_prices (
  model        text primary key,
  input        numeric not null,
  output       numeric not null,
  cache_write  numeric not null,
  cache_read   numeric not null
);

alter table public.model_prices enable row level security;
grant select on public.model_prices to service_role;

insert into public.model_prices (model, input, output, cache_write, cache_read) values
  ('claude-opus-5-5',   4, 20, 5,    0.2),
  ('claude-sonnet-5-5', 2, 10, 2.5,  0.2),
  ('claude-opus-5',     5, 25, 6.25, 0.5),
  ('*',                 5, 25, 6.25, 0.5);

-- ── level 1: the aggregates ─────────────────────────────────────────────────
-- Days are Santiago's, as the funnel's are.

-- The numbers at the top of the panel.
create function public.admin_overview()
returns table (
  accounts          bigint,  -- people who signed in with Google
  anonymous         bigint,  -- sessions that never made an account
  accounts_7d       bigint,
  premium_active    bigint,
  active_7d         bigint,  -- opened the app in the last seven days
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
  select
    (select count(*) from auth.users u where not coalesce(u.is_anonymous, false)),
    (select count(*) from auth.users u where coalesce(u.is_anonymous, false)),
    (select count(*) from auth.users u
       where not coalesce(u.is_anonymous, false) and u.created_at >= now() - interval '7 days'),
    (select count(*) from public.subscriptions s
       where s.status = 'active' and (s.ends_at is null or s.ends_at > now())),
    (select count(distinct f.user_id) from public.funnel_events f
       where f.step = 'app_opened' and f.occurred_at >= now() - interval '7 days'),
    (select coalesce(round(sum(public.admin_call_cost(c)), 2), 0)
       from public.claude_api_calls c
       where c.mode = 'server' and c.created_at >= date_trunc('month', now(), 'UTC')),
    (select count(*) from public.crisis_events e where e.created_at >= now() - interval '7 days');
end
$$;

-- One call's price. Internal: used by the metrics, never exposed.
create function public.admin_call_cost(c public.claude_api_calls)
returns numeric
language sql
stable
security definer
set search_path = ''
as $$
  select (
    coalesce(c.input_tokens, 0)       * p.input +
    coalesce(c.output_tokens, 0)      * p.output +
    coalesce(c.cache_write_tokens, 0) * p.cache_write +
    coalesce(c.cache_read_tokens, 0)  * p.cache_read
  ) / 1000000
  from public.model_prices p
  where p.model in (c.model, '*')
  order by (p.model = '*')
  limit 1
$$;

revoke execute on function public.admin_call_cost(public.claude_api_calls) from public, anon, authenticated;

-- How many distinct people reached each step, in a range of days.
create function public.admin_funnel(p_from date, p_to date)
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
  group by f.step;
end
$$;

-- Where the paywall was seen, and from where the free month started.
create function public.admin_funnel_detail(p_step text, p_from date, p_to date)
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
  group by 1;
end
$$;

-- Per day: new accounts, people who started the onboarding, people who
-- opened the app.
create function public.admin_daily(p_days integer default 30)
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
    where f.occurred_at >= first_day::timestamp at time zone 'America/Santiago'
      and f.step in ('account_created', 'onboarding_started', 'app_opened')
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

-- Model use per day and purpose: calls, failures, US$.
create function public.admin_ai_spend(p_days integer default 30)
returns table (day date, purpose text, calls bigint, failed bigint, cost_usd numeric)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  first_day date := (now() at time zone 'America/Santiago')::date - (least(greatest(p_days, 1), 366) - 1);
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
    and c.created_at >= first_day::timestamp at time zone 'America/Santiago'
  group by 1, 2
  order by 1, 2;
end
$$;

-- Crisis alerts per day, by severity and where they fired. Counts only:
-- never the excerpt, the terms matched or who.
create function public.admin_crisis_counts(p_days integer default 30)
returns table (day date, severity text, surface text, alerts bigint, not_their_case bigint)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  first_day date := (now() at time zone 'America/Santiago')::date - (least(greatest(p_days, 1), 366) - 1);
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
  where e.created_at >= first_day::timestamp at time zone 'America/Santiago'
  group by 1, 2, 3
  order by 1, 2, 3;
end
$$;

do $$
declare f text;
begin
  foreach f in array array[
    'admin_whoami()',
    'admin_overview()',
    'admin_funnel(date, date)',
    'admin_funnel_detail(text, date, date)',
    'admin_daily(integer)',
    'admin_ai_spend(integer)',
    'admin_crisis_counts(integer)'
  ] loop
    execute format('revoke execute on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end
$$;
