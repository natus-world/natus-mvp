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

create index admins_added_by_idx on public.admins (added_by);

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
create index admin_access_log_admin_idx on public.admin_access_log (admin_id);
create index admin_access_log_subject_idx on public.admin_access_log (subject_id);

alter table public.admin_access_log enable row level security;
grant select, insert on public.admin_access_log to service_role;

-- The door every admin_* function goes through. Raises for anybody who is
-- not an admin, so a function cannot forget to check and still return rows.
create function public.admin_require(p_what text, p_subject uuid default null, p_log boolean default false)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'not_admin' using errcode = '42501';
  end if;
  -- Aggregates are not logged one by one. A sign-in, a list of people and
  -- every look at one person are.
  if p_log or p_subject is not null or p_what = 'signed_in' then
    insert into public.admin_access_log (admin_id, what, subject_id)
    values (auth.uid(), p_what, p_subject);
  end if;
end
$$;

revoke execute on function public.admin_require(text, uuid, boolean) from public, anon, authenticated;

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
  premium_paying    bigint,  -- through PayPal
  premium_gifted    bigint,  -- given by hand from the panel
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
       where s.status = 'active' and (s.ends_at is null or s.ends_at > now())
         and s.provider is distinct from 'manual'),
    (select count(*) from public.subscriptions s
       where s.status = 'active' and (s.ends_at is null or s.ends_at > now())
         and s.provider = 'manual'),
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

-- ── Premium given by hand (owner, 18 Oct 2026) ─────────────────────────────
-- For the people who review the app and to give it away for a while: a
-- number of months, or no end. Never over a PayPal subscription, and never
-- counted as paying.

alter table public.subscriptions drop constraint subscriptions_provider_check;
alter table public.subscriptions add constraint subscriptions_provider_check
  check (provider in ('paypal', 'manual'));
alter table public.subscriptions
  add column granted_by uuid references auth.users (id) on delete set null;

create index subscriptions_granted_by_idx on public.subscriptions (granted_by);

comment on column public.subscriptions.granted_by is
  'The admin who gave this premium by hand (provider manual).';

create function public.admin_grant_premium(p_email text, p_months integer default null)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  who uuid;
begin
  perform public.admin_require('grant_premium');
  if p_months is not null and (p_months < 1 or p_months > 36) then
    raise exception 'months_out_of_range' using errcode = '22023';
  end if;

  select u.id into who
  from auth.users u
  where lower(u.email) = lower(trim(p_email)) and not coalesce(u.is_anonymous, false)
  limit 1;
  if who is null then
    raise exception 'no_account' using errcode = 'P0002';
  end if;

  if exists (
    select 1 from public.subscriptions s
    where s.user_id = who and s.provider = 'paypal' and s.status = 'active'
      and (s.ends_at is null or s.ends_at > now())
  ) then
    raise exception 'already_paying' using errcode = '23505';
  end if;

  insert into public.subscriptions (user_id, status, activated_at, provider, provider_subscription_id, ends_at, granted_by)
  values (who, 'active', now(), 'manual', null,
          case when p_months is null then null else now() + make_interval(months => p_months) end,
          auth.uid())
  on conflict (user_id) do update set
    status = 'active',
    activated_at = now(),
    provider = 'manual',
    provider_subscription_id = null,
    ends_at = excluded.ends_at,
    granted_by = excluded.granted_by;

  insert into public.admin_access_log (admin_id, what, subject_id) values (auth.uid(), 'grant_premium', who);
  return who;
end
$$;

create function public.admin_revoke_premium(p_user uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.admin_require('revoke_premium', p_user);
  update public.subscriptions
     set status = 'none', ends_at = now()
   where user_id = p_user and provider = 'manual';
  if not found then
    raise exception 'not_gifted' using errcode = 'P0002';
  end if;
end
$$;

-- ── level 2: people, with who they are (owner, 18 Oct 2026) ─────────────────
-- The owner wants to know who each person is and see everything about them.
-- Every list and every look at one person is written to admin_access_log.

create function public.admin_plan(p_user uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((
    select case when s.provider = 'manual' then 'gift' else 'premium' end
    from public.subscriptions s
    where s.user_id = p_user and s.status = 'active' and (s.ends_at is null or s.ends_at > now())
  ), 'free')
$$;

revoke execute on function public.admin_plan(uuid) from public, anon, authenticated;

-- Accounts, newest first, or those whose email or name carries the query.
create function public.admin_people(p_query text default '', p_limit integer default 50)
returns table (
  user_id     uuid,
  email       text,
  name        text,
  country     text,
  created_at  timestamptz,
  plan        text,
  last_opened timestamptz
)
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
  select
    c.user_id,
    coalesce(u.email::text, c.email),
    c.legal_birth_name,
    c.country,
    c.created_at,
    public.admin_plan(c.user_id),
    (select max(f.occurred_at) from public.funnel_events f
      where f.user_id = c.user_id and f.step = 'app_opened')
  from public.clients c
  join auth.users u on u.id = c.user_id
  where lower(coalesce(u.email, c.email, '')) like q or lower(coalesce(c.legal_birth_name, '')) like q
  order by c.created_at desc
  limit least(greatest(p_limit, 1), 500);
end
$$;

-- One person: who they are, what they gave at the start, where they are,
-- their plan, what they used and what it cost. One document, so a new field
-- is one more line here and nothing else changes.
create function public.admin_person(p_user uuid)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  result jsonb;
begin
  perform public.admin_require('person', p_user);
  select jsonb_build_object(
    'user_id',        c.user_id,
    'email',          coalesce(u.email, c.email),
    'name',           c.legal_birth_name,
    'gender',         c.grammatical_gender,
    'created_at',     c.created_at,
    'last_sign_in',   u.last_sign_in_at,
    'birth', jsonb_build_object(
      'date', c.birth_date, 'time', c.birth_time, 'city', c.birth_city,
      'country', c.birth_country, 'place', c.birth_place),
    'country',        c.country,
    'need_text',      c.presenting_need_text,
    'need_topics',    to_jsonb(c.presenting_need_slugs),
    'openness',       to_jsonb(c.openness_to_modalities),
    'clinical', jsonb_build_object(
      'ideation_6m', c.clinical_ideation_6m, 'in_treatment', c.clinical_in_treatment,
      'psychiatric_medication', c.clinical_psychiatric_medication,
      'prefer_not_to_say', to_jsonb(c.clinical_prefer_not_to_say),
      'notes', c.clinical_additional_notes),
    'plan',           public.admin_plan(c.user_id),
    'subscription', (select to_jsonb(s) - 'provider_subscription_id'
                       from public.subscriptions s where s.user_id = c.user_id),
    'memory_consent', (select p.memory_consent_at from public.preferences p where p.user_id = c.user_id),
    'quota', jsonb_build_object(
      'chat',       public.quota_remaining(c.user_id, 'chat'),
      'meditation', public.quota_remaining(c.user_id, 'meditation'),
      'comparison', public.quota_remaining(c.user_id, 'comparison')),
    'steps', coalesce((
      select jsonb_agg(jsonb_build_object('step', f.step, 'detail', f.detail, 'source', f.source,
                                          'campaign', f.campaign, 'at', f.occurred_at)
                       order by f.occurred_at)
      from public.funnel_events f where f.user_id = c.user_id), '[]'),
    'counts', jsonb_build_object(
      'messages',      (select count(*) from public.messages m where m.user_id = c.user_id and m.role = 'user'),
      'journal',       (select count(*) from public.journal_entries j where j.user_id = c.user_id),
      'checkins',      (select count(*) from public.recommendation_checkins r where r.user_id = c.user_id),
      'practices',     (select count(*) from public.routine_practices r where r.user_id = c.user_id and r.is_active),
      'memory',        (select count(*) from public.memory_items m where m.user_id = c.user_id),
      'friends',       (select count(*) from public.friendships fr
                          where (fr.requester_id = c.user_id or fr.addressee_id = c.user_id)),
      'crisis_alerts', (select count(*) from public.crisis_events e where e.user_id = c.user_id)),
    'ai', (select jsonb_build_object(
              'calls', count(*),
              'cost_usd', coalesce(round(sum(public.admin_call_cost(a)), 4), 0),
              'cost_month_usd', coalesce(round(sum(public.admin_call_cost(a))
                  filter (where a.created_at >= date_trunc('month', now(), 'UTC')), 4), 0))
           from public.claude_api_calls a where a.user_id = c.user_id and a.mode = 'server')
  ) into result
  from public.clients c
  join auth.users u on u.id = c.user_id
  where c.user_id = p_user;

  if result is null then
    raise exception 'no_account' using errcode = 'P0002';
  end if;
  return result;
end
$$;

-- What one person wrote and received, one kind at a time, newest first.
-- Each kind is logged by name: person_chat, person_journal, and so on.
create function public.admin_person_content(p_user uuid, p_kind text, p_limit integer default 200)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  n integer := least(greatest(p_limit, 1), 1000);
  result jsonb;
begin
  if p_kind not in ('chat', 'journal', 'checkins', 'routine', 'memory', 'crisis', 'soul_map', 'chart', 'paths') then
    raise exception 'unknown_kind' using errcode = '22023';
  end if;
  perform public.admin_require('person_' || p_kind, p_user);

  if p_kind = 'chat' then
    select coalesce(jsonb_agg(x order by x->>'at' desc), '[]') into result from (
      select jsonb_build_object('conversation', m.conversation_id, 'role', m.role, 'type', m.type,
                                'text', m.text, 'at', m.created_at) as x
      from public.messages m where m.user_id = p_user order by m.created_at desc limit n) t;
  elsif p_kind = 'journal' then
    select coalesce(jsonb_agg(x order by x->>'at' desc), '[]') into result from (
      select jsonb_build_object('date', j.entry_date, 'body', j.body, 'source', j.source, 'mood', j.mood,
                                'modality', j.modality_slug, 'crisis_flagged', j.crisis_flagged,
                                'at', j.created_at) as x
      from public.journal_entries j where j.user_id = p_user order by j.created_at desc limit n) t;
  elsif p_kind = 'checkins' then
    select coalesce(jsonb_agg(x order by x->>'date' desc), '[]') into result from (
      select jsonb_build_object('practice', r.practice_title, 'date', r.checked_on,
                                'rating', r.rating, 'comment', r.comment) as x
      from public.recommendation_checkins r where r.user_id = p_user order by r.checked_on desc limit n) t;
  elsif p_kind = 'routine' then
    select coalesce(jsonb_agg(x order by x->>'at' desc), '[]') into result from (
      select jsonb_build_object('title', r.title, 'body', r.body, 'cadence', r.cadence,
                                'modality', r.connects_modality, 'origin', r.origin,
                                'active', r.is_active, 'at', r.created_at) as x
      from public.routine_practices r where r.user_id = p_user order by r.created_at desc limit n) t;
  elsif p_kind = 'memory' then
    select coalesce(jsonb_agg(x order by x->>'at' desc), '[]') into result from (
      select jsonb_build_object('category', m.category, 'content', m.content,
                                'edited_by_person', m.edited_by_user, 'at', m.updated_at) as x
      from public.memory_items m where m.user_id = p_user order by m.updated_at desc limit n) t;
  elsif p_kind = 'crisis' then
    select coalesce(jsonb_agg(x order by x->>'at' desc), '[]') into result from (
      select jsonb_build_object('severity', e.severity, 'category', e.category, 'surface', e.source_surface,
                                'matched', to_jsonb(e.matched), 'excerpt', e.excerpt,
                                'not_their_case', e.false_positive, 'at', e.created_at) as x
      from public.crisis_events e where e.user_id = p_user order by e.created_at desc limit n) t;
  elsif p_kind = 'soul_map' then
    select coalesce(jsonb_agg(x order by x->>'at' desc), '[]') into result from (
      select jsonb_build_object('synthesis', s.synthesis, 'numerology', s.numerology,
                                'trigger', s.trigger, 'current', s.is_current, 'at', s.created_at) as x
      from public.soul_map_syntheses s where s.user_id = p_user order by s.created_at desc limit n) t;
  elsif p_kind = 'chart' then
    select coalesce(jsonb_agg(jsonb_build_object('chart', nc.chart, 'has_time', nc.has_birth_time,
                                                 'at', nc.calculated_at)), '[]')
      into result from public.natal_charts nc where nc.user_id = p_user;
  elsif p_kind = 'paths' then
    select coalesce(jsonb_agg(x order by x->>'at' desc), '[]') into result from (
      select to_jsonb(mm) - 'user_id' as x
      from public.modality_matches mm where mm.user_id = p_user order by mm.created_at desc limit n) t;
  end if;
  return result;
end
$$;

do $$
declare f text;
begin
  foreach f in array array[
    'admin_grant_premium(text, integer)',
    'admin_revoke_premium(uuid)',
    'admin_people(text, integer)',
    'admin_person(uuid)',
    'admin_person_content(uuid, text, integer)'
  ] loop
    execute format('revoke execute on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end
$$;
