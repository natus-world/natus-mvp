-- Package 05 «Carta completa» (owner, 16 Oct 2026): «la lectura de Davraz»
-- for each point of the person's chart.
--
-- One row per person, written only by the chart-points function: one or two
-- sentences per point, read the Hellenistic way and in the language of
-- possibility, as `{ point, text }` pairs keyed by the names
-- src/lib/natal-chart.ts gives the points.
--
-- `chart_calculated_at` is the `natal_charts.calculated_at` the readings were
-- written for. A birth-data change (M-02) or a rebuild calculates the chart
-- again with a new `calculated_at`, and the readings are stale from that
-- moment: the browser asks again and the function overwrites the row. While
-- they match, the function refuses to spend.
--
-- Deleted with the account (the cascade from auth.users).

create table public.chart_point_readings (
  user_id             uuid primary key references auth.users (id) on delete cascade,
  chart_calculated_at timestamptz not null,
  prompt_version      text not null,
  readings            jsonb not null check (jsonb_typeof(readings) = 'array'),
  created_at          timestamptz not null default now()
);

alter table public.chart_point_readings enable row level security;

create policy "own chart readings are readable"
  on public.chart_point_readings for select to authenticated
  using (auth.uid() = user_id);

grant select on public.chart_point_readings to authenticated;
grant select, insert, update, delete on public.chart_point_readings to service_role;

alter table public.claude_api_calls
  drop constraint claude_api_calls_purpose_check,
  add constraint claude_api_calls_purpose_check
    check (purpose in ('soul_map', 'match', 'chat', 'meditation', 'comparison', 'routine', 'memory', 'routine_review', 'chart_points'));
