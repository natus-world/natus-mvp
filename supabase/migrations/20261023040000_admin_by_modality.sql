-- «Les hace sentido, por terapia» in the panel (owner, 22 Oct 2026), now
-- that a check-in keeps which practice it is for (20261023030000).
--
-- For each therapy, in a range of days: to how many people it was
-- recommended, how many saved it, how many said «No me hace sentido», how
-- many marked a practice that comes from it, and how those practices were
-- rated. Counts and averages only; the team and the QA robot are left out.
-- Ratings before 22 Oct 2026 are joined only where the title matched one
-- practice for certain.

create function public.admin_by_modality(p_from date, p_to date)
returns table (
  slug text, name text, recommended bigint, saved bigint, dismissed bigint,
  marked bigint, ratings bigint, avg_rating numeric
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.admin_require('by_modality');
  return query
  with rec as (
    select distinct m.user_id, x.slug
    from public.modality_matches m
    cross join lateral (
      select e->>'modality_slug' as slug
      from jsonb_array_elements(coalesce(m.result->'matched_modalities', '[]'::jsonb)) e
    ) x
    where (m.created_at at time zone 'America/Santiago')::date between p_from and p_to
      and not public.is_internal_user(m.user_id)
  ),
  react as (
    select r.user_id, r.modality_slug as slug, r.reaction
    from public.match_reactions r
    where (r.reacted_at at time zone 'America/Santiago')::date between p_from and p_to
      and not public.is_internal_user(r.user_id)
  ),
  marks as (
    select c.user_id, p.connects_modality as slug, c.rating
    from public.recommendation_checkins c
    join public.routine_practices p on p.id = c.practice_id
    where c.checked_on between p_from and p_to
      and p.connects_modality is not null
      and not public.is_internal_user(c.user_id)
  )
  select
    mo.slug,
    mo.name_es,
    (select count(*) from rec where rec.slug = mo.slug),
    (select count(distinct react.user_id) from react where react.slug = mo.slug and react.reaction = 'saved'),
    (select count(distinct react.user_id) from react where react.slug = mo.slug and react.reaction = 'dismissed'),
    (select count(distinct marks.user_id) from marks where marks.slug = mo.slug),
    (select count(marks.rating) from marks where marks.slug = mo.slug),
    (select round(avg(marks.rating)::numeric, 1) from marks where marks.slug = mo.slug)
  from public.modalities mo
  order by 3 desc, 1;
end
$$;

revoke execute on function public.admin_by_modality(date, date) from public, anon;
grant execute on function public.admin_by_modality(date, date) to authenticated;
