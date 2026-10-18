-- Premium given from the panel (provider manual) is not paid, so Perfil must
-- not say it renews for US$ 10 nor offer to cancel it at PayPal. `my_quota`
-- now says whether premium is a gift and until when.
create or replace function public.my_quota(p_feature text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  gift_ends timestamptz;
  is_gift   boolean;
begin
  if me is null then
    return null;
  end if;
  select s.ends_at into gift_ends
  from public.subscriptions s
  where s.user_id = me and s.provider = 'manual' and s.status = 'active'
    and (s.ends_at is null or s.ends_at > now());
  is_gift := found;
  return jsonb_build_object(
    'tier', public.plan_tier(me),
    'remaining', public.quota_remaining(me, p_feature),
    'resets_on', to_char((date_trunc('month', now(), 'UTC') + interval '1 month') at time zone 'UTC', 'YYYY-MM-DD'),
    'offer_premium', not exists (
      select 1 from public.crisis_events e
      where e.user_id = me
        and e.created_at > now() - interval '7 days'
        and e.false_positive is not true
    ),
    'gift', is_gift,
    'gift_ends_on', case when gift_ends is not null
      then to_char(gift_ends at time zone 'America/Santiago', 'YYYY-MM-DD') end
  ) || coalesce(public.quota_parts(me, p_feature), '{}'::jsonb);
end
$$;
