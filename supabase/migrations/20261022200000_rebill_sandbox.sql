-- Rebill, tried in its sandbox next to PayPal (owner, 22 Oct 2026): a card
-- without an account, the first month free with the card saved.
--
-- The premium logic stays the same: only the server writes `subscriptions`,
-- now with `provider = 'rebill'`. What is new is how a Rebill event finds its
-- account. The checkout function makes one payment link per person and keeps
-- which person it was made for here; the first payment of the subscription
-- (US$0 in the trial) names its link, and from then on the subscription id
-- is on the person's row.

alter table public.subscriptions drop constraint subscriptions_provider_check;
alter table public.subscriptions add constraint subscriptions_provider_check
  check (provider in ('paypal', 'manual', 'rebill'));

-- One payment link per checkout, and whose it is. Server only: nobody reads
-- or writes it through the API.
create table public.rebill_checkouts (
  payment_link_id text primary key,
  user_id         uuid not null references auth.users (id) on delete cascade,
  created_at      timestamptz not null default now()
);

create index rebill_checkouts_user_idx on public.rebill_checkouts (user_id);

alter table public.rebill_checkouts enable row level security;
grant select, insert on public.rebill_checkouts to service_role;

-- The Premium plan in Rebill, created once by the checkout function through
-- the API (the trial cannot be set in Rebill's dashboard). Keyed by a hash of
-- the API key, so the sandbox plan and the live one never mix: a new key
-- finds no plan and makes its own. The key itself is never stored.
create table public.rebill_plans (
  key_hash   text primary key,
  plan_id    text not null,
  created_at timestamptz not null default now()
);

alter table public.rebill_plans enable row level security;
grant select, insert on public.rebill_plans to service_role;
