-- The crisis alerts one by one (owner, 18 Oct 2026): from the panel's count,
-- who, when, where it fired, what was matched and the excerpt, and whether the
-- person said it was not their case. A person without an account still shows,
-- with the name from their anonymous session. Every look is logged.

create function public.admin_crisis_list(p_days integer default 30)
returns table (
  id              uuid,
  user_id         uuid,
  has_account     boolean,
  name            text,
  email           text,
  at              timestamptz,
  severity        text,
  category        text,
  surface         text,
  matched         text[],
  excerpt         text,
  from_clinical   boolean,
  not_their_case  boolean
)
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  since timestamptz := now() - make_interval(days => least(greatest(p_days, 1), 3650));
begin
  perform public.admin_require('crisis_list', null, true);
  return query
  select
    e.id,
    e.user_id,
    c.user_id is not null,
    coalesce(c.legal_birth_name, s.legal_birth_name),
    u.email::text,
    e.created_at,
    e.severity,
    e.category,
    e.source_surface,
    e.matched,
    e.excerpt,
    e.from_clinical_answer,
    e.false_positive
  from public.crisis_events e
  join auth.users u on u.id = e.user_id
  left join public.clients c on c.user_id = e.user_id
  left join lateral (
    select a.legal_birth_name from public.anonymous_sessions a
    where a.user_id = e.user_id order by a.created_at desc limit 1
  ) s on true
  where e.created_at >= since
  order by e.created_at desc;
end
$$;

revoke execute on function public.admin_crisis_list(integer) from public, anon;
grant execute on function public.admin_crisis_list(integer) to authenticated;
