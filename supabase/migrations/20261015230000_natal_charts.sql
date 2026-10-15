-- v1.2 O-01, A-01, A-02, O-07: the calculated chart, read the Hellenistic way.
--
-- One row per person, written only by the natal-chart function: positions by
-- sign and degree, houses by whole sign, the dignities of the seven visible
-- planets, the ruler of the Ascendant and the sect, all derived in
-- src/lib/natal-chart.ts from the provider's answer. Without the hour of birth
-- there is no Ascendant, no house and no sect, and `has_birth_time` says so.
--
-- The provider's own text stays where it was (the profile's `natal_chart`),
-- because the Soul Map prompt reads it; this table is what the full chart and
-- the prompts of A-02 are built on.

create table public.natal_charts (
  user_id        uuid primary key references auth.users (id) on delete cascade,
  provider       text not null default 'astrologer',
  house_system   text not null default 'whole_sign' check (house_system = 'whole_sign'),
  has_birth_time boolean not null,
  chart          jsonb not null,
  calculated_at  timestamptz not null default now()
);

alter table public.natal_charts enable row level security;

create policy "own chart is readable"
  on public.natal_charts for select to authenticated
  using (auth.uid() = user_id);

grant select on public.natal_charts to authenticated;
grant select, insert, update on public.natal_charts to service_role;
