-- «Conversaciones» can show everybody again (owner, 27 Oct 2026: «ya no veo a
-- todos los que les mandábamos mensajes»): p_all brings back the people who
-- only received a message to many, and each line says whether its last
-- message went to many and when the person saw it.

drop function public.admin_feedback_inbox(integer);
create function public.admin_feedback_inbox(p_limit integer default 100, p_all boolean default false)
returns table (
  user_id         uuid,
  email           text,
  name            text,
  last_body       text,
  last_author     text,
  last_at         timestamptz,
  unread          bigint,
  crisis          boolean,
  last_broadcast  boolean,
  last_seen_at    timestamptz
)
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  perform public.admin_require('feedback_inbox', null, true);
  return query
  with last as (
    select distinct on (m.user_id) m.user_id, m.body, m.author, m.created_at, m.broadcast_id, m.read_at
    from public.feedback_messages m
    where p_all or m.broadcast_id is null
    order by m.user_id, m.created_at desc
  )
  select
    l.user_id,
    u.email::text,
    c.legal_birth_name,
    l.body,
    l.author,
    l.created_at,
    (select count(*) from public.feedback_messages m
      where m.user_id = l.user_id and m.author = 'person' and m.read_at is null),
    exists (select 1 from public.feedback_messages m where m.user_id = l.user_id and m.crisis_flagged),
    l.broadcast_id is not null,
    case when l.author = 'team' then l.read_at end
  from last l
  join auth.users u on u.id = l.user_id
  left join public.clients c on c.user_id = l.user_id
  where public.admin_in_segment(l.user_id, public.admin_current_segment())
  order by l.created_at desc
  limit least(greatest(p_limit, 1), 500);
end
$$;

revoke execute on function public.admin_feedback_inbox(integer, boolean) from public, anon;
grant execute on function public.admin_feedback_inbox(integer, boolean) to authenticated;
