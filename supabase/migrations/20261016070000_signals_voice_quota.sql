-- Three small things, decided on 16 Oct 2026.
--
-- 1. The chat counter can say «Este mes tienes 1 pregunta nueva» (guide 9.9):
--    `my_quota` now also says how much of what is left is this month's and how
--    much is the gift.
--
-- 2. R-04's third signal, defined by the owner's delegation: an important
--    change in the memory is a new item in «Lo que no te funciona» or «Lo que
--    estás viviendo». It brings a premium review forward (`memory_shift`).
--
-- 3. Voice entries in the journal (B-01) are dictated by the browser's own
--    speech recognition: no audio is kept and no provider is paid. They are
--    premium, so the browser may write `voz` only for a premium person.

-- ── 1 ──────────────────────────────────────────────────────────────────────
create function public.quota_parts(p_user uuid, p_feature text, p_now timestamptz default now())
returns jsonb
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

  -- This month's allowance is used first, so the gift lasts. `used_before`
  -- tells a returning person from a new one: only the first is told that
  -- this month brought a new question.
  return jsonb_build_object(
    'monthly_left', greatest(0, q.monthly - used_now),
    'gift_left', greatest(0, coalesce(q.initial, 0) - gift_spent - greatest(0, used_now - q.monthly)),
    'used_before', exists (
      select 1 from public.claude_api_calls c
      where c.user_id = p_user and c.purpose = p_feature and c.mode = 'server'
        and (case when p_feature = 'chat' then c.charged else c.outcome in ('ok', 'pending') end)
        and c.created_at < month_start
    )
  );
end
$$;

revoke execute on function public.quota_parts(uuid, text, timestamptz) from public, anon, authenticated;
grant execute on function public.quota_parts(uuid, text, timestamptz) to service_role;

create or replace function public.my_quota(p_feature text)
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
  ) || coalesce(public.quota_parts(me, p_feature), '{}'::jsonb);
end
$$;

-- ── 2 ──────────────────────────────────────────────────────────────────────
alter table public.routine_change_proposals
  drop constraint routine_change_proposals_trigger_check,
  add constraint routine_change_proposals_trigger_check
    check (trigger in ('weekly', 'bimonthly_free', 'low_rating', 'abandoned', 'memory_shift'));

-- ── 3 ──────────────────────────────────────────────────────────────────────
-- Whether the caller is premium, for a policy. Definer, so it can read the
-- tier, and only ever about auth.uid().
create function public.i_am_premium()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select auth.uid() is not null and public.plan_tier(auth.uid()) = 'premium'
$$;

revoke execute on function public.i_am_premium() from public, anon;
grant execute on function public.i_am_premium() to authenticated;

drop policy "own journal is writable, in writing" on public.journal_entries;
drop policy "own journal is editable" on public.journal_entries;

create policy "own journal is writable"
  on public.journal_entries for insert to authenticated
  with check (auth.uid() = user_id and (source = 'escrito' or public.i_am_premium()));
-- Editing keeps whatever source the entry has: a voice entry written while
-- premium stays editable (and the browser's save of the whole journal keeps
-- working) after premium ends.
create policy "own journal is editable"
  on public.journal_entries for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
