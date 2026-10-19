-- v1.2 D-01: today's sky — the day's transits over one's chart and one's
-- personal day, calculated (src/lib/daily-sky.ts), never written by a model.
--
-- `sky_days` holds where the seven visible planets are on a day, asked of the
-- ephemeris once for everybody: positions do not depend on where one is.
-- `daily_insights` holds each person's day, once per (person, day), so
-- opening Hoy again costs nothing. Both are written only by the daily-sky
-- function; `tips` stays null until Davraz's tip of the day (premium) is
-- written for it.

create table public.sky_days (
  day         date primary key,
  -- The seven planets: name, sign, degree, longitude, retrograde.
  points      jsonb not null,
  provider    text not null default 'astrologer',
  created_at  timestamptz not null default now()
);

alter table public.sky_days enable row level security;

-- Where the planets are is nobody's data.
create policy "the sky is readable"
  on public.sky_days for select to authenticated
  using (true);

grant select on public.sky_days to authenticated;
grant select, insert, update on public.sky_days to service_role;

create table public.daily_insights (
  user_id             uuid not null references auth.users (id) on delete cascade,
  -- The person's own calendar day, as their phone has it.
  insight_date        date not null,
  personal_day        smallint not null check (personal_day between 1 and 33),
  -- DailySky: the transits, the Moon, the lord of the year.
  sky                 jsonb not null,
  -- The chart it was calculated from: a new chart makes the day stale.
  chart_calculated_at timestamptz not null,
  tips                jsonb,
  claude_api_call_id  uuid references public.claude_api_calls (id) on delete set null,
  created_at          timestamptz not null default now(),
  primary key (user_id, insight_date)
);

create index daily_insights_call_idx on public.daily_insights (claude_api_call_id);

alter table public.daily_insights enable row level security;

create policy "own day is readable"
  on public.daily_insights for select to authenticated
  using (auth.uid() = user_id);

grant select on public.daily_insights to authenticated;
grant select, insert, update, delete on public.daily_insights to service_role;
