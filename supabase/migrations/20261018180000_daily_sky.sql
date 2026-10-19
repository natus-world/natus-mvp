-- v1.2 D-01: today's sky — the day's transits over one's chart and one's
-- personal day, calculated (src/lib/daily-sky.ts), never written by a model.
--
-- `sky_days` holds where the seven visible planets are on a day, asked of the
-- ephemeris once for everybody: positions do not depend on where one is.
-- `daily_insights` holds each person's day, once per (person, day), so
-- opening Hoy again costs nothing. Both are written only by the daily-sky
-- function and `tips` by daily-tip, Davraz's tip of the day (premium).

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
  -- Davraz's tips of the day, written by the daily-tip function (premium).
  tips                jsonb,
  created_at          timestamptz not null default now(),
  primary key (user_id, insight_date)
);

alter table public.daily_insights enable row level security;

create policy "own day is readable"
  on public.daily_insights for select to authenticated
  using (auth.uid() = user_id);

grant select on public.daily_insights to authenticated;
grant select, insert, update, delete on public.daily_insights to service_role;

alter table public.claude_api_calls
  drop constraint claude_api_calls_purpose_check,
  add constraint claude_api_calls_purpose_check
    check (purpose in ('soul_map', 'match', 'chat', 'meditation', 'comparison', 'routine', 'memory', 'routine_review', 'chart_points', 'daily_tip'));

-- Premium seen from Hoy's line «Con Premium, Davraz te deja un tip para el día».
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
                    'friend_invited') then
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
  elsif p_detail not in ('chat', 'meditation', 'comparison', 'profile', 'welcome', 'tip') then
    p_detail := null;
  end if;

  perform public.record_step(auth.uid(), p_step, p_source, p_campaign, p_detail);
end
$$;
