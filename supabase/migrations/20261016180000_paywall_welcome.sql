-- The Premium invitation right after the map (owner, 16 Oct 2026): a sixth
-- place a paywall is seen, «welcome», recorded like the others so the funnel
-- can tell which place each free month started from.
create or replace function public.track_step(
  p_step text, p_source text default null, p_campaign text default null, p_detail text default null
)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    return;
  end if;
  if p_step not in ('onboarding_started', 'birth_data_done', 'care_done', 'paths_seen',
                    'paywall_seen', 'app_opened', 'friend_invited') then
    raise exception 'not a step the browser records' using errcode = '22023';
  end if;
  -- Origin travels only on the first step; the place a paywall appeared,
  -- only on the paywall.
  if p_step <> 'onboarding_started' then
    p_source := null;
    p_campaign := null;
  end if;
  if p_step <> 'paywall_seen' then
    p_detail := null;
  elsif p_detail not in ('chat', 'meditation', 'comparison', 'profile', 'welcome') then
    p_detail := null;
  end if;

  perform public.record_step(auth.uid(), p_step, p_source, p_campaign, p_detail);
end
$$;
