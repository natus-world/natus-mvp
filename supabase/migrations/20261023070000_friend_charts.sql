-- «Las dos cartas» (owner, 23 Oct 2026): friends see each other's whole
-- chart, houses and Ascendant included, which tells the hour of birth. The
-- owner decided being friends is enough, and the invitation says so.
--
-- Read through this function only, never through a policy on natal_charts:
-- the chart is shown while the friendship is accepted and stops the moment it
-- ends, like the comparison itself. Nothing else of the friend travels —
-- no birth date, no place, no name beyond what my_friends() already shows.

create function public.friend_charts(p_friendship uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'mine', (select c.chart from public.natal_charts c where c.user_id = auth.uid()),
    'theirs', (
      select c.chart from public.natal_charts c
      where c.user_id = case when f.requester_id = auth.uid() then f.addressee_id else f.requester_id end
    )
  )
  from public.friendships f
  where f.id = p_friendship
    and f.status = 'accepted'
    and auth.uid() in (f.requester_id, f.addressee_id);
$$;

revoke execute on function public.friend_charts(uuid) from public, anon;
grant execute on function public.friend_charts(uuid) to authenticated;
