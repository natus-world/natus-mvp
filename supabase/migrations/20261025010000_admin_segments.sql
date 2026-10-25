-- Segments in the admin panel (owner, 24 Oct 2026, from the approved mockup
-- «Panel Natus · segmentos»): a filter on top by country (where they live or
-- where they were born), age band and how they asked to be addressed; a page
-- «Quiénes son» with those groups; and a map by country.
--
-- The filter is kept here, one per admin, so it stays put across pages and
-- reloads. Every panel number already leaves people out through
-- is_internal_user (the team and the QA robot); that check now also leaves
-- out, for the admin looking, everybody outside the segment they chose. It is
-- called only inside admin_* functions, after admin_require, so auth.uid() is
-- always the admin whose segment applies.
--
-- The app does not ask for sex: «cómo le hablan» is grammatical_gender, what
-- each person chose for how Natus addresses them.

create table public.admin_segments (
  admin_id   uuid primary key references auth.users (id) on delete cascade,
  segment    jsonb not null default '{}'::jsonb check (jsonb_typeof(segment) = 'object'),
  updated_at timestamptz not null default now()
);
alter table public.admin_segments enable row level security;
comment on table public.admin_segments is
  'The segment each admin is looking at in the panel. Read and written only through admin_segment_* functions.';

-- What a person is, for a segment: from their account, else from the latest
-- anonymous session they own (the onboarding before an account).
create function public.admin_traits(p_user uuid)
returns table (country text, birth_country text, age_band text, gender text)
language sql
stable
security definer
set search_path = ''
as $$
  with src as (
    select c.country, c.birth_country, c.birth_date, c.grammatical_gender, 0 as rank
    from public.clients c where c.user_id = p_user
    union all
    select * from (
      select a.country, a.birth_country, a.birth_date, a.grammatical_gender, 1 as rank
      from public.anonymous_sessions a where a.user_id = p_user
      order by a.created_at desc limit 1
    ) s
  )
  select src.country, src.birth_country,
    case
      when src.birth_date is null then null
      when date_part('year', age(src.birth_date)) < 25 then '18-24'
      when date_part('year', age(src.birth_date)) < 35 then '25-34'
      when date_part('year', age(src.birth_date)) < 45 then '35-44'
      when date_part('year', age(src.birth_date)) < 55 then '45-54'
      else '55+'
    end,
    src.grammatical_gender
  from src order by src.rank limit 1;
$$;
revoke execute on function public.admin_traits(uuid) from public, anon, authenticated;

-- Whether a person is inside a segment:
-- {"place": "vive"|"nacio", "countries": ["MX", …], "age": "25-34", "gender": "femenino"}.
-- An empty segment holds everybody.
create function public.admin_in_segment(p_user uuid, p_segment jsonb)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(p_segment, '{}'::jsonb) = '{}'::jsonb or exists (
    select 1 from public.admin_traits(p_user) t
    where (not (p_segment ? 'countries')
           or (case when p_segment ->> 'place' = 'nacio' then t.birth_country else t.country end)
              in (select jsonb_array_elements_text(p_segment -> 'countries')))
      and (not (p_segment ? 'age') or t.age_band = p_segment ->> 'age')
      and (not (p_segment ? 'gender') or t.gender = p_segment ->> 'gender')
  );
$$;
revoke execute on function public.admin_in_segment(uuid, jsonb) from public, anon, authenticated;

-- The segment of the admin calling; '{}' when none.
create function public.admin_current_segment()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select s.segment from public.admin_segments s where s.admin_id = auth.uid()), '{}'::jsonb);
$$;
revoke execute on function public.admin_current_segment() from public, anon, authenticated;

-- The team and the QA robot, as before.
create function public.is_team_or_qa(p_user uuid)
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
revoke execute on function public.is_team_or_qa(uuid) from public, anon, authenticated;

-- Who the panel leaves out: the team, the QA robot, and — for the admin
-- looking — everybody outside the segment they chose.
create or replace function public.is_internal_user(p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_team_or_qa(p_user)
      or not public.admin_in_segment(p_user, public.admin_current_segment());
$$;
revoke execute on function public.is_internal_user(uuid) from public, anon, authenticated;

-- ── the panel's calls ───────────────────────────────────────────────────────

create function public.admin_segment_get()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.admin_require('segment');
  return public.admin_current_segment();
end
$$;

-- Sets the caller's segment; '{}' clears it. Only the four keys, each checked.
create function public.admin_segment_set(p_segment jsonb)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  seg jsonb := coalesce(p_segment, '{}'::jsonb);
  k text;
begin
  perform public.admin_require('segment_set');
  if jsonb_typeof(seg) <> 'object' then
    raise exception 'bad_segment' using errcode = '22023';
  end if;
  for k in select jsonb_object_keys(seg) loop
    if k not in ('place', 'countries', 'age', 'gender') then
      raise exception 'bad_segment' using errcode = '22023';
    end if;
  end loop;
  if seg ? 'place' and seg ->> 'place' not in ('vive', 'nacio') then
    raise exception 'bad_segment' using errcode = '22023';
  end if;
  if seg ? 'countries' and (
       jsonb_typeof(seg -> 'countries') <> 'array'
       or jsonb_array_length(seg -> 'countries') not between 1 and 50
       or exists (select 1 from jsonb_array_elements(seg -> 'countries') e
                  where jsonb_typeof(e) <> 'string' or e #>> '{}' !~ '^[A-Z]{2}$')) then
    raise exception 'bad_segment' using errcode = '22023';
  end if;
  if seg ? 'age' and seg ->> 'age' not in ('18-24', '25-34', '35-44', '45-54', '55+') then
    raise exception 'bad_segment' using errcode = '22023';
  end if;
  if seg ? 'gender' and seg ->> 'gender' not in ('femenino', 'masculino', 'neutro') then
    raise exception 'bad_segment' using errcode = '22023';
  end if;
  if seg ? 'countries' and not seg ? 'place' then
    seg := seg || '{"place":"vive"}'::jsonb;
  end if;
  if not seg ? 'countries' then
    seg := seg - 'place';
  end if;
  insert into public.admin_segments (admin_id, segment, updated_at)
  values (auth.uid(), seg, now())
  on conflict (admin_id) do update set segment = excluded.segment, updated_at = now();
  return seg;
end
$$;

-- How many accounts the segment holds, out of all (the team and the robot left out).
create function public.admin_segment_count()
returns table (in_segment bigint, total bigint)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.admin_require('segment');
  return query
  select count(*) filter (where not public.is_internal_user(u.id)),
         count(*) filter (where not public.is_team_or_qa(u.id))
  from auth.users u
  where not u.is_anonymous;
end
$$;

-- «Quiénes son»: accounts by country where they live, country of birth, age
-- band and how they are addressed, inside the segment chosen (p_all: ignore
-- it, for the filter's own menus). Activated: something of value in their
-- first 7 days (owner, 22 Oct 2026). Active: opened the app in 7 days.
create function public.admin_who(p_all boolean default false)
returns table (dimension text, value text, accounts bigint, activated bigint, trial bigint, active_7d bigint)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.admin_require('who');
  return query
  with people as (
    select u.id, t.country, t.birth_country, t.age_band, t.gender,
      coalesce(public.first_value_at(u.id) < public.admin_account_at(u.id) + interval '7 days', false) as act,
      exists (select 1 from public.funnel_events f where f.user_id = u.id and f.step = 'trial_started') as tri,
      exists (select 1 from public.funnel_events f where f.user_id = u.id and f.step = 'app_opened'
              and f.occurred_at > now() - interval '7 days') as act7
    from auth.users u
    left join lateral public.admin_traits(u.id) t on true
    where not u.is_anonymous
      and (case when p_all then not public.is_team_or_qa(u.id) else not public.is_internal_user(u.id) end)
  ),
  dims as (
    select 'vive' as d, coalesce(p.country, '') as v, p.* from people p
    union all select 'nacio', coalesce(p.birth_country, ''), p.* from people p
    union all select 'edad', coalesce(p.age_band, ''), p.* from people p
    union all select 'genero', coalesce(p.gender, ''), p.* from people p
  )
  select dims.d, dims.v, count(*), count(*) filter (where dims.act), count(*) filter (where dims.tri),
         count(*) filter (where dims.act7)
  from dims
  group by dims.d, dims.v
  order by dims.d, count(*) desc;
end
$$;

-- The people list follows the segment too (the team stays in it, as before).
create or replace function public.admin_people_list(p_query text default '', p_limit integer default 100)
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
  seg jsonb;
begin
  perform public.admin_require('people', null, true);
  seg := public.admin_current_segment();
  return query
  with base as (
    select c.user_id, coalesce(u.email::text, c.email) as email, c.legal_birth_name as name,
           c.country, public.admin_account_at(c.user_id) as joined_at
    from public.clients c
    join auth.users u on u.id = c.user_id
    where not u.is_anonymous
      and (lower(coalesce(u.email, c.email, '')) like q or lower(coalesce(c.legal_birth_name, '')) like q)
      and public.admin_in_segment(c.user_id, seg)
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

do $$
declare fn text;
begin
  foreach fn in array array[
    'admin_segment_get()', 'admin_segment_set(jsonb)', 'admin_segment_count()', 'admin_who(boolean)'
  ] loop
    execute format('revoke execute on function public.%s from public, anon', fn);
    execute format('grant execute on function public.%s to authenticated', fn);
  end loop;
end
$$;
