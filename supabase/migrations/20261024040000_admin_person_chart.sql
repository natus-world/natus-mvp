-- The full chart of one person in the admin panel (owner, 24 Oct 2026): to
-- set it beside what Davraz told them and find a chart calculated wrong. It
-- returns what the chart was cast from (the birth data as stored), the chart
-- as `natal-chart` stored it, and Davraz's reading of each point. Logged, as
-- every look at one person.

create function public.admin_person_chart(p_user uuid)
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
  where c.user_id = p_user;
  return out;
end
$$;

revoke execute on function public.admin_person_chart(uuid) from public, anon;
grant execute on function public.admin_person_chart(uuid) to authenticated;
