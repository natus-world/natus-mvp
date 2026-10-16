-- Where Premium is offered (decided 15 Oct 2026): after a crisis alert — in
-- the chat, the journal or the clinical answers — no invitation to Premium
-- for that session and the seven days after, decided by the server. The
-- quota screens still say what is used up; only the offer is held back.
--
-- `my_quota` now says whether to offer. An alert the person marked as not
-- their case does not count, as everywhere else.

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
    'resets_on', to_char((date_trunc('month', now(), 'UTC') + interval '1 month') at time zone 'UTC', 'YYYY-MM-DD'),
    'offer_premium', not exists (
      select 1 from public.crisis_events e
      where e.user_id = me
        and e.created_at > now() - interval '7 days'
        and e.false_positive is not true
    )
  ) || coalesce(public.quota_parts(me, p_feature), '{}'::jsonb);
end
$$;
