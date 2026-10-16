-- v1.2 F-01: what each plan gets, as data rather than code.
--
-- The numbers are the owner's (15 Oct 2026) and change here, without a deploy:
--
--   free:    chat 3 as a gift + 1 a month · meditation 1 in all ·
--            comparison 2 a month
--   premium: chat unlimited · meditation 10 a month · comparison unlimited
--
-- `initial` is a one-time gift; `monthly` renews on the first of each month
-- (UTC) and does not accumulate; a null `monthly` is unlimited. A feature
-- with no row here has no product quota.
--
-- Usage is counted from `claude_api_calls`, which only the functions write
-- (decided 15 Oct 2026), never from a counter the person could reach. Only
-- answers that worked count (F-01: "solo descuenta respuestas exitosas"),
-- plus the ones in flight, so two requests at once cannot both take the last.
--
-- "Unlimited" is bounded by a technical cap measured in money: `plan_caps`,
-- US$4 of model use a month per premium person (owner, 15 Oct 2026), checked
-- by the functions with the prices in src/lib/budget.ts.

create table public.plan_quotas (
  tier    text not null check (tier in ('free', 'premium')),
  feature text not null check (feature in ('chat', 'meditation', 'comparison')),
  initial integer check (initial >= 0),
  monthly integer check (monthly >= 0),
  primary key (tier, feature)
);

comment on table public.plan_quotas is
  'v1.2 F-01. initial: one-time gift; monthly: renews each calendar month (UTC), null = unlimited. Edit the numbers here; no deploy.';

insert into public.plan_quotas (tier, feature, initial, monthly) values
  ('free',    'chat',       3,    1),
  ('free',    'meditation', 1,    0),
  ('free',    'comparison', null, 2),
  ('premium', 'chat',       null, null),
  ('premium', 'meditation', null, 10),
  ('premium', 'comparison', null, null);

create table public.plan_caps (
  tier        text primary key check (tier in ('free', 'premium')),
  monthly_usd numeric(8, 2) not null check (monthly_usd > 0)
);

comment on table public.plan_caps is
  'v1.2 F-01: the technical cap on "unlimited", in US dollars of model use per person per calendar month (UTC).';

insert into public.plan_caps (tier, monthly_usd) values ('premium', 4.00);

-- Not secret: the app shows what a plan includes. Nobody writes them through
-- the API; they are edited in the dashboard or by migration.
alter table public.plan_quotas enable row level security;
alter table public.plan_caps enable row level security;

create policy "plan quotas are readable" on public.plan_quotas for select to anon, authenticated using (true);
create policy "plan caps are readable" on public.plan_caps for select to anon, authenticated using (true);

grant select on public.plan_quotas, public.plan_caps to anon, authenticated, service_role;

-- ── the tier ───────────────────────────────────────────────────────────────
-- Read from `subscriptions`, which only the server writes (P-01).
create function public.plan_tier(p_user uuid)
returns text
language sql
stable
security invoker
set search_path = ''
as $$
  select case
    when exists (select 1 from public.subscriptions s where s.user_id = p_user and s.status = 'active')
      then 'premium'
    else 'free'
  end
$$;

-- ── what is left ───────────────────────────────────────────────────────────
-- Null when unlimited. The gift is spent only by what went past each earlier
-- month's own quota, so a month's allowance is used first and the gift lasts.
create function public.quota_remaining(p_user uuid, p_feature text, p_now timestamptz default now())
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
    and c.created_at >= month_start
    and c.created_at <= p_now;

  return greatest(0, greatest(0, coalesce(q.initial, 0) - gift_spent) + q.monthly - used_now);
end
$$;

revoke execute on function public.plan_tier(uuid) from public, anon, authenticated;
revoke execute on function public.quota_remaining(uuid, text, timestamptz) from public, anon, authenticated;
grant execute on function public.plan_tier(uuid) to service_role;
grant execute on function public.quota_remaining(uuid, text, timestamptz) to service_role;

-- ── what the app shows ─────────────────────────────────────────────────────
-- The caller's own quota, so the screen can say what is left before it is
-- used. Definer, so it can count the ledger, but only ever for auth.uid().
create function public.my_quota(p_feature text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
begin
  if me is null then
    return null;
  end if;
  return jsonb_build_object(
    'tier', public.plan_tier(me),
    'remaining', public.quota_remaining(me, p_feature),
    'resets_on', to_char((date_trunc('month', now(), 'UTC') + interval '1 month') at time zone 'UTC', 'YYYY-MM-DD')
  );
end
$$;

revoke execute on function public.my_quota(text) from public, anon;
grant execute on function public.my_quota(text) to authenticated;

-- ── reservations that respect the plan ─────────────────────────────────────
-- Same lock as before; the plan is checked inside it, so two requests at once
-- cannot both take the last one.
create or replace function public.reserve_model_call(
  p_user           uuid,
  p_purpose        text,
  p_limit          integer,
  p_since          timestamptz,
  p_prompt_version text,
  p_model          text
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  used     integer;
  reserved uuid;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_user::text || ':' || p_purpose, 0));

  select count(*) into used
  from public.claude_api_calls c
  where c.user_id = p_user
    and c.purpose = p_purpose
    and c.mode = 'server'
    and (c.output_tokens is not null or c.outcome = 'pending')
    and c.created_at >= p_since;

  if used >= p_limit then
    return null;
  end if;

  -- v1.2 F-01. Null (unlimited, or no plan for this purpose) passes.
  if public.quota_remaining(p_user, p_purpose) <= 0 then
    return null;
  end if;

  insert into public.claude_api_calls
    (user_id, purpose, prompt_version, model, mode, outcome)
  values
    (p_user, p_purpose, p_prompt_version, p_model, 'server', 'pending')
  returning id into reserved;

  return reserved;
end
$$;

create function public.reserve_plan_chat_turn(
  p_user           uuid,
  p_prompt_version text,
  p_model          text
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  reserved uuid;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_user::text, 0));

  if public.quota_remaining(p_user, 'chat') <= 0 then
    return null;
  end if;

  insert into public.claude_api_calls
    (user_id, purpose, prompt_version, model, mode, outcome, charged)
  values
    (p_user, 'chat', p_prompt_version, p_model, 'server', 'pending', true)
  returning id into reserved;

  return reserved;
end
$$;

revoke execute on function public.reserve_plan_chat_turn(uuid, text, text) from public, anon, authenticated;
grant execute on function public.reserve_plan_chat_turn(uuid, text, text) to service_role;

-- ── the cap on "unlimited" ─────────────────────────────────────────────────
-- One person's tokens since a moment, by model, for the functions to price
-- with src/lib/budget.ts. Every server row counts, as in the deployment's.
create function public.user_token_totals(p_user uuid, since timestamptz)
returns table (
  model              text,
  input_tokens       bigint,
  output_tokens      bigint,
  cache_write_tokens bigint,
  cache_read_tokens  bigint
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    c.model,
    coalesce(sum(c.input_tokens), 0)::bigint,
    coalesce(sum(c.output_tokens), 0)::bigint,
    coalesce(sum(c.cache_write_tokens), 0)::bigint,
    coalesce(sum(c.cache_read_tokens), 0)::bigint
  from public.claude_api_calls c
  where c.user_id = p_user and c.mode = 'server' and c.created_at >= since
  group by c.model
$$;

revoke execute on function public.user_token_totals(uuid, timestamptz) from public, anon, authenticated;
grant execute on function public.user_token_totals(uuid, timestamptz) to service_role;
