-- Houses in Placidus, with whole sign one touch away (owner, 27–30 Oct 2026,
-- after people found their houses did not match other apps).
--
-- `natal_charts.house_system` now says which system the stored chart's houses
-- are in: Placidus, or whole sign for a birth so near a pole that Placidus
-- cannot be drawn (and for the charts not yet rebuilt). Davraz reads it.
--
-- `preferences.house_view` is how the person chose to see the houses in the
-- full chart: only the screen follows it. The panel shows it beside the chart.

alter table public.natal_charts
  drop constraint natal_charts_house_system_check,
  add constraint natal_charts_house_system_check check (house_system in ('placidus', 'whole_sign')),
  alter column house_system set default 'placidus';

alter table public.preferences add column house_view text not null default 'placidus'
  check (house_view in ('placidus', 'whole_sign'));

create or replace function public.admin_person_chart(p_user uuid)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  out jsonb;
begin
  perform public.admin_require('person_chart', p_user);
  select jsonb_build_object(
    'birth', jsonb_build_object(
      'date', c.birth_date, 'time', c.birth_time, 'city', c.birth_city,
      'country', c.birth_country, 'place', c.birth_place, 'daynight', c.birth_daynight),
    'chart', nc.chart,
    'has_birth_time', nc.has_birth_time,
    'house_system', nc.house_system,
    'house_view', coalesce(p.house_view, 'placidus'),
    'provider', nc.provider,
    'calculated_at', nc.calculated_at,
    'readings', cpr.readings,
    'readings_version', cpr.prompt_version,
    'readings_current', cpr.chart_calculated_at is not distinct from nc.calculated_at
  )
  into out
  from public.clients c
  left join public.natal_charts nc on nc.user_id = c.user_id
  left join public.chart_point_readings cpr on cpr.user_id = c.user_id
  left join public.preferences p on p.user_id = c.user_id
  where c.user_id = p_user;
  return out;
end
$$;

revoke execute on function public.admin_person_chart(uuid) from public, anon;
grant execute on function public.admin_person_chart(uuid) to authenticated;
