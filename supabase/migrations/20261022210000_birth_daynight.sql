-- Without the hour of birth, whether the person was born by day or by night,
-- or that they do not know it (owner, 22 Oct 2026). The chart is cast with
-- it: day or night is then the person's word, and the Moon is kept only when
-- its sign is certain (src/lib/natal-chart.ts).
alter table public.clients
  add column birth_daynight text check (birth_daynight in ('dia', 'noche', 'no_se'));
alter table public.anonymous_sessions
  add column birth_daynight text check (birth_daynight in ('dia', 'noche', 'no_se'));
