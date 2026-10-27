-- «Mensajes a todos» in the panel's Sugerencias (owner, 27 Oct 2026): the
-- conversations with people who wrote, apart from the messages the team sends
-- to many at once; how many each message reached and how many opened it; and
-- sending one from the panel, to everybody or to the segment on top.
--
-- A message to many is one row in feedback_broadcasts and one team message
-- per person in feedback_messages, tied by broadcast_id. The person sees it as
-- before: a dot on «Sugerir» and the message signed «Equipo Natus»; read_at
-- says when they opened it. The two sent by hand before (26 Oct, the wrong
-- birth places, one text per person; 27 Oct, the houses) are gathered here.

create table public.feedback_broadcasts (
  id            uuid primary key default gen_random_uuid(),
  admin_id      uuid references auth.users (id) on delete set null,
  -- The text sent; for one written person by person, the first of them.
  body          text not null check (char_length(btrim(body)) between 1 and 4000),
  personalized  boolean not null default false,
  -- The segment it went to ('{}' everybody), as admin_segment_set keeps it.
  segment       jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now()
);
alter table public.feedback_broadcasts enable row level security;
create index feedback_broadcasts_admin_idx on public.feedback_broadcasts (admin_id);
comment on table public.feedback_broadcasts is
  'Messages the team sent to many people at once from «Sugerencias». Read and written only through admin_broadcast_* functions.';

alter table public.feedback_messages
  add column broadcast_id uuid references public.feedback_broadcasts (id) on delete set null;
create index feedback_messages_broadcast_idx on public.feedback_messages (broadcast_id);

-- The messages already sent to many: team messages written in one statement
-- (the same instant and the same admin) to more than one person.
do $$
declare
  g record;
  new_id uuid;
begin
  for g in
    select m.created_at, m.admin_id, count(*) as n, count(distinct m.body) as texts,
           (array_agg(m.body order by m.id))[1] as sample
    from public.feedback_messages m
    where m.author = 'team' and m.broadcast_id is null
    group by m.created_at, m.admin_id
    having count(*) > 1
  loop
    insert into public.feedback_broadcasts (admin_id, body, personalized, created_at)
    values (g.admin_id, g.sample, g.texts > 1, g.created_at)
    returning id into new_id;
    update public.feedback_messages m set broadcast_id = new_id
     where m.author = 'team' and m.created_at = g.created_at
       and m.admin_id is not distinct from g.admin_id;
  end loop;
end
$$;

-- ── the conversations: only threads with something besides a message to many,
-- inside the segment on top, as every list of the panel.

create or replace function public.admin_feedback_inbox(p_limit integer default 100)
returns table (
  user_id       uuid,
  email         text,
  name          text,
  last_body     text,
  last_author   text,
  last_at       timestamptz,
  unread        bigint,
  crisis        boolean
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
    select distinct on (m.user_id) m.user_id, m.body, m.author, m.created_at
    from public.feedback_messages m
    where m.broadcast_id is null
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
    exists (select 1 from public.feedback_messages m where m.user_id = l.user_id and m.crisis_flagged)
  from last l
  join auth.users u on u.id = l.user_id
  left join public.clients c on c.user_id = l.user_id
  where public.admin_in_segment(l.user_id, public.admin_current_segment())
  order by l.created_at desc
  limit least(greatest(p_limit, 1), 500);
end
$$;

-- One person's conversation, now with when they opened each team message and
-- whether it went to many. The return type changes, so it is made again.
drop function public.admin_feedback_thread(uuid);
create function public.admin_feedback_thread(p_user uuid)
returns table (id uuid, author text, body text, screen text, crisis_flagged boolean, created_at timestamptz,
               read_at timestamptz, broadcast boolean)
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  perform public.admin_require('feedback_thread', p_user);
  update public.feedback_messages m set read_at = now()
   where m.user_id = p_user and m.author = 'person' and m.read_at is null;
  return query
  select m.id, m.author, m.body, m.screen, m.crisis_flagged, m.created_at,
         case when m.author = 'team' then m.read_at end, m.broadcast_id is not null
  from public.feedback_messages m
  where m.user_id = p_user
  order by m.created_at;
end
$$;

-- ── messages to many ────────────────────────────────────────────────────────

-- Every message to many, newest first, with how many it reached and opened it.
create function public.admin_broadcasts()
returns table (id uuid, created_at timestamptz, author_name text, body text, personalized boolean,
               segment jsonb, recipients bigint, seen bigint, answered bigint)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.admin_require('broadcasts');
  return query
  select b.id, b.created_at,
    coalesce(nullif(u.raw_user_meta_data ->> 'full_name', ''), u.email::text),
    b.body, b.personalized, b.segment,
    (select count(*) from public.feedback_messages m where m.broadcast_id = b.id),
    (select count(*) from public.feedback_messages m where m.broadcast_id = b.id and m.read_at is not null),
    (select count(distinct m.user_id) from public.feedback_messages m
      join public.feedback_messages p on p.user_id = m.user_id and p.author = 'person' and p.created_at > m.created_at
      where m.broadcast_id = b.id)
  from public.feedback_broadcasts b
  left join auth.users u on u.id = b.admin_id
  order by b.created_at desc;
end
$$;

-- Who received one, and when each opened it (and whether they answered).
create function public.admin_broadcast_recipients(p_id uuid)
returns table (user_id uuid, name text, email text, read_at timestamptz, answered boolean)
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  perform public.admin_require('broadcast_recipients', null, true);
  return query
  select m.user_id, c.legal_birth_name, u.email::text, m.read_at,
    exists (select 1 from public.feedback_messages p
            where p.user_id = m.user_id and p.author = 'person' and p.created_at > m.created_at)
  from public.feedback_messages m
  join auth.users u on u.id = m.user_id
  left join public.clients c on c.user_id = m.user_id
  where m.broadcast_id = p_id
  order by m.read_at desc nulls last, c.legal_birth_name;
end
$$;

-- Who a new message would reach: the accounts in the admin's segment, without
-- the team and the QA robot (is_internal_user).
create function public.admin_broadcast_audience()
returns bigint
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.admin_require('broadcast_audience');
  return (select count(*) from auth.users u where not u.is_anonymous and not public.is_internal_user(u.id));
end
$$;

-- Sends it: one team message per account in the segment. p_expected is the
-- number the admin confirmed; if the audience changed meanwhile, nothing goes.
create function public.admin_broadcast_send(p_body text, p_expected bigint)
returns bigint
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  body text := btrim(coalesce(p_body, ''));
  n bigint;
  new_id uuid;
begin
  perform public.admin_require('broadcast_send');
  if char_length(body) not between 1 and 4000 then
    raise exception 'bad_body' using errcode = '22023';
  end if;
  select count(*) into n from auth.users u where not u.is_anonymous and not public.is_internal_user(u.id);
  if n = 0 then
    raise exception 'nobody' using errcode = 'P0002';
  end if;
  if n is distinct from p_expected then
    raise exception 'audience_changed' using errcode = '40001';
  end if;
  insert into public.feedback_broadcasts (admin_id, body, segment)
  values (auth.uid(), body, public.admin_current_segment())
  returning id into new_id;
  insert into public.feedback_messages (user_id, author, body, admin_id, broadcast_id)
  select u.id, 'team', body, auth.uid(), new_id
  from auth.users u
  where not u.is_anonymous and not public.is_internal_user(u.id);
  return n;
end
$$;

do $$
declare f text;
begin
  foreach f in array array[
    'admin_feedback_inbox(integer)', 'admin_feedback_thread(uuid)',
    'admin_broadcasts()', 'admin_broadcast_recipients(uuid)',
    'admin_broadcast_audience()', 'admin_broadcast_send(text, bigint)'
  ] loop
    execute format('revoke execute on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end
$$;
