-- «No encontró su ciudad» counted only what matters (owner, 22 Oct 2026):
-- `birth_city_not_found` fires on any empty search, also halfway through
-- typing a name. What stops somebody is a search that found nothing and no
-- birth step after it. Both numbers, by the day of the empty search.

create function public.admin_birth_city(p_from date, p_to date)
returns table (empty_search bigint, did_not_continue bigint)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.admin_require('birth_city');
  return query
  with hit as (
    select distinct f.user_id
    from public.funnel_events f
    where f.step = 'birth_city_not_found'
      and (f.occurred_at at time zone 'America/Santiago')::date between p_from and p_to
      and not public.is_internal_user(f.user_id)
  )
  select
    count(*),
    count(*) filter (where not exists (
      select 1 from public.funnel_events b where b.user_id = hit.user_id and b.step = 'birth_data_done'
    ))
  from hit;
end
$$;

revoke execute on function public.admin_birth_city(date, date) from public, anon;
grant execute on function public.admin_birth_city(date, date) to authenticated;
