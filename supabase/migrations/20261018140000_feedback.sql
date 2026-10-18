-- Suggestions during the beta (owner, 15 and 18 Oct 2026): a small
-- conversation, open from every screen, where the person writes whatever
-- they want about the app and the team answers from the panel.
--
-- Free text, so the browser runs it through the crisis detector before it is
-- sent, as the journal does, and keeps the row either way with
-- `crisis_flagged`. It never enters a model payload or the funnel. Only the
-- person and the team read it; the person cannot edit or delete what the
-- team wrote.

create table public.feedback_messages (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users (id) on delete cascade,
  author          text not null check (author in ('person', 'team')),
  body            text not null check (char_length(body) between 1 and 4000),
  -- The route the person was on, so a complaint has its place.
  screen          text check (screen ~ '^/[a-z0-9/_-]{0,80}$'),
  crisis_flagged  boolean not null default false,
  -- The admin who answered (author team).
  admin_id        uuid references auth.users (id) on delete set null,
  -- When the team read a person's message; when the person read the team's.
  read_at         timestamptz,
  created_at      timestamptz not null default now()
);

create index feedback_messages_user_idx on public.feedback_messages (user_id, created_at);
create index feedback_messages_admin_idx on public.feedback_messages (admin_id);
create index feedback_messages_inbox_idx on public.feedback_messages (created_at desc) where author = 'person';

alter table public.feedback_messages enable row level security;

create policy "own feedback is readable"
  on public.feedback_messages for select to authenticated
  using (auth.uid() = user_id);
create policy "own feedback is writable, as the person"
  on public.feedback_messages for insert to authenticated
  with check (auth.uid() = user_id and author = 'person' and admin_id is null and read_at is null);

grant select, insert on public.feedback_messages to authenticated;
grant select, insert, update, delete on public.feedback_messages to service_role;

-- The person marks the team's answers as read.
create function public.feedback_mark_read()
returns void
language sql
volatile
security definer
set search_path = ''
as $$
  update public.feedback_messages
     set read_at = now()
   where user_id = auth.uid() and author = 'team' and read_at is null;
$$;

revoke execute on function public.feedback_mark_read() from public, anon;
grant execute on function public.feedback_mark_read() to authenticated;

alter table public.crisis_events drop constraint crisis_events_source_surface_check;
alter table public.crisis_events add constraint crisis_events_source_surface_check
  check (source_surface in ('onboarding', 'chat', 'meditation_intent', 'practice_comment', 'journal', 'memory', 'feedback'));

-- ── the panel's side ───────────────────────────────────────────────────────

-- The inbox: one line per person, newest message first.
create function public.admin_feedback_inbox(p_limit integer default 100)
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
  order by l.created_at desc
  limit least(greatest(p_limit, 1), 500);
end
$$;

-- One person's conversation. Opening it marks their messages read.
create function public.admin_feedback_thread(p_user uuid)
returns table (id uuid, author text, body text, screen text, crisis_flagged boolean, created_at timestamptz)
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
  select m.id, m.author, m.body, m.screen, m.crisis_flagged, m.created_at
  from public.feedback_messages m
  where m.user_id = p_user
  order by m.created_at;
end
$$;

create function public.admin_feedback_reply(p_user uuid, p_body text)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  new_id uuid;
begin
  perform public.admin_require('feedback_reply', p_user);
  if not exists (select 1 from auth.users u where u.id = p_user) then
    raise exception 'no_account' using errcode = 'P0002';
  end if;
  insert into public.feedback_messages (user_id, author, body, admin_id)
  values (p_user, 'team', trim(p_body), auth.uid())
  returning id into new_id;
  return new_id;
end
$$;

do $$
declare f text;
begin
  foreach f in array array[
    'admin_feedback_inbox(integer)',
    'admin_feedback_thread(uuid)',
    'admin_feedback_reply(uuid, text)'
  ] loop
    execute format('revoke execute on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end
$$;
