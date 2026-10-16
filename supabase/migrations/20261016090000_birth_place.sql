-- The birth place the person picked from suggestions (16 Oct 2026): name,
-- region, country, coordinates and IANA timezone, so the chart is cast for
-- exactly that place. Null on drafts saved before the pick existed; the chart
-- function then looks the typed name up, and refuses a place whose name does
-- not carry it.
alter table public.anonymous_sessions add column birth_place jsonb;
alter table public.clients add column birth_place jsonb;

comment on column public.clients.birth_place is
  'Picked birth place: {name, region, country, latitude, longitude, timezone}. Null before 16 Oct 2026.';
