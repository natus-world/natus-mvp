-- Three onboarding steps the funnel could not see (owner, 18 Oct 2026), so
-- the panel can tell where people leave: after the birth data, at the
-- question, at the openness, or at the Google screen.
--   need_done      the question step («¿Qué te trae a Natus?») left forward
--   openness_done  the openness step left forward (the map starts to be written)
--   signup_seen    the «Tu mapa está listo» screen that asks for Google
-- Like the others: that it happened, never what was answered.

alter table public.funnel_events drop constraint funnel_events_step_check;
alter table public.funnel_events add constraint funnel_events_step_check check (step in (
  'onboarding_started', 'birth_data_done', 'need_done', 'openness_done', 'signup_seen',
  'soul_map_seen', 'care_done', 'paths_seen', 'account_created', 'first_practice',
  'first_chat', 'paywall_seen', 'trial_started', 'first_charge', 'canceled',
  'app_opened', 'friend_invited', 'friend_accepted'
));

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
  if p_step not in ('onboarding_started', 'birth_data_done', 'need_done', 'openness_done',
                    'signup_seen', 'care_done', 'paths_seen', 'paywall_seen', 'app_opened',
                    'friend_invited') then
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
