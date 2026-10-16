-- v1.2 P-01, automatic (owner, 15 Oct 2026): PayPal tells the server when
-- somebody subscribes, pays or cancels, and the paypal-webhook function keeps
-- `subscriptions` in step. Nobody activates premium by hand any more, and a
-- cancellation is not left waiting for somebody to notice it.
--
-- A cancellation keeps premium until the end of what was already paid
-- (`ends_at`); a suspended or expired subscription ends it at once.

alter table public.subscriptions
  add column provider text check (provider in ('paypal')),
  add column provider_subscription_id text unique,
  add column ends_at timestamptz;

comment on column public.subscriptions.ends_at is
  'Set when a subscription is cancelled: premium lasts until then. Null while it renews.';

-- Every notification once, by PayPal's own id, so a retry changes nothing.
-- Who and what only: never the payer's name, email or amount.
create table public.payment_events (
  id          text primary key,
  event_type  text not null,
  user_id     uuid references auth.users (id) on delete set null,
  received_at timestamptz not null default now()
);

create index payment_events_user_idx on public.payment_events (user_id);

alter table public.payment_events enable row level security;
grant select, insert, update on public.payment_events to service_role;

-- The tier now honours the end of a cancelled subscription.
create or replace function public.plan_tier(p_user uuid)
returns text
language sql
stable
security invoker
set search_path = ''
as $$
  select case
    when exists (
      select 1 from public.subscriptions s
      where s.user_id = p_user
        and s.status = 'active'
        and (s.ends_at is null or s.ends_at > now())
    )
      then 'premium'
    else 'free'
  end
$$;

-- This month's use had an upper bound, `created_at <= p_now`, and `p_now`
-- defaults to now() — the start of the *transaction*. A request that waited
-- on the reservation lock had started before the one ahead of it inserted
-- its row, so that row looked like the future and was not counted: parallel
-- requests got past the quota now and then. Found by the integration test
-- that fires ten at once. The month is bounded below only.
create or replace function public.quota_remaining(p_user uuid, p_feature text, p_now timestamptz default now())
returns integer
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  q            record;
  month_start  timestamptz := date_trunc('month', p_now, 'UTC');
  gift_spent   integer;
  used_now     integer;
begin
  select pq.initial, pq.monthly into q
  from public.plan_quotas pq
  where pq.tier = public.plan_tier(p_user) and pq.feature = p_feature;

  if not found or q.monthly is null then
    return null;
  end if;

  select coalesce(sum(greatest(0, m.n - q.monthly)), 0) into gift_spent
  from (
    select count(*) as n
    from public.claude_api_calls c
    where c.user_id = p_user
      and c.purpose = p_feature
      and c.mode = 'server'
      and (case when p_feature = 'chat' then c.charged else c.outcome in ('ok', 'pending') end)
      and c.created_at < month_start
    group by date_trunc('month', c.created_at, 'UTC')
  ) m;

  select count(*) into used_now
  from public.claude_api_calls c
  where c.user_id = p_user
    and c.purpose = p_feature
    and c.mode = 'server'
    and (case when p_feature = 'chat' then c.charged else c.outcome in ('ok', 'pending') end)
    and c.created_at >= month_start;

  return greatest(0, greatest(0, coalesce(q.initial, 0) - gift_spent) + q.monthly - used_now);
end
$$;
