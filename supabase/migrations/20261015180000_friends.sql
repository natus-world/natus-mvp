-- v1.2 C-01: friends inside Natus. Accepting a friendship is the consent to
-- compare charts; ending it closes every comparison between the two.
--
-- Invitations travel as a link (decided 15 Oct 2026), never as a search by
-- email: a search would let anybody find out whether a given address uses a
-- mental-health product, which is precisely what Ley 21.719 protects.
--
-- Nothing here is written by the browser directly. Every change goes through
-- one of the functions below, which check who is calling; the tables grant the
-- browser read access to its own rows and nothing else.

-- ═══════════════════════════════════════════════════════════════════════════
-- The link
-- ═══════════════════════════════════════════════════════════════════════════

create table public.friend_invites (
  token      text primary key default replace(gen_random_uuid()::text, '-', ''),
  inviter_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);

-- One live link per person. Making a new one revokes the old.
create unique index friend_invites_one_live
  on public.friend_invites (inviter_id) where revoked_at is null;
-- Every foreign key indexed, so deleting an account does not scan the table.
create index friend_invites_inviter_idx on public.friend_invites (inviter_id);

alter table public.friend_invites enable row level security;

create policy "own invites are readable"
  on public.friend_invites for select to authenticated
  using (auth.uid() = inviter_id);

-- ═══════════════════════════════════════════════════════════════════════════
-- The friendship
-- ═══════════════════════════════════════════════════════════════════════════

create type public.friendship_status as enum ('pending', 'accepted', 'declined', 'removed');

create table public.friendships (
  id           uuid primary key default gen_random_uuid(),
  requester_id uuid not null references auth.users (id) on delete cascade,
  addressee_id uuid not null references auth.users (id) on delete cascade,
  status       public.friendship_status not null default 'pending',
  created_at   timestamptz not null default now(),
  responded_at timestamptz,
  ended_by     uuid references auth.users (id) on delete set null,
  constraint friendships_not_self check (requester_id <> addressee_id)
);

-- One row per pair, whichever of the two invited.
create unique index friendships_one_per_pair
  on public.friendships (least(requester_id, addressee_id), greatest(requester_id, addressee_id));
create index friendships_requester_idx on public.friendships (requester_id);
create index friendships_addressee_idx on public.friendships (addressee_id);
create index friendships_ended_by_idx on public.friendships (ended_by);

alter table public.friendships enable row level security;

create policy "own friendships are readable"
  on public.friendships for select to authenticated
  using (auth.uid() in (requester_id, addressee_id));

grant select on public.friend_invites, public.friendships to authenticated;
grant select, insert, update, delete on public.friend_invites, public.friendships to service_role;

-- ═══════════════════════════════════════════════════════════════════════════
-- Who may have friends: a person with an account
-- ═══════════════════════════════════════════════════════════════════════════
--
-- An anonymous session is a visitor who has not signed up. A friendship has to
-- outlive the browser it was made in, so it needs an account: a `clients` row.

create function public.caller_has_account()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.clients c where c.user_id = auth.uid());
$$;

-- The name shown to a friend: the first word of the birth name, nothing else.
create function public.first_name_of(p_user uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select nullif(split_part(trim(c.legal_birth_name), ' ', 1), '')
  from public.clients c
  where c.user_id = p_user;
$$;

revoke execute on function public.first_name_of(uuid) from public, anon, authenticated;

-- ═══════════════════════════════════════════════════════════════════════════
-- The functions the browser calls
-- ═══════════════════════════════════════════════════════════════════════════

-- The caller's live link, made on first use.
create function public.my_invite_token()
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  found text;
begin
  if auth.uid() is null or not public.caller_has_account() then
    raise exception 'an account is needed to invite' using errcode = '42501';
  end if;

  select i.token into found
  from public.friend_invites i
  where i.inviter_id = auth.uid() and i.revoked_at is null;

  if found is null then
    insert into public.friend_invites (inviter_id) values (auth.uid())
    returning token into found;
  end if;

  return found;
end
$$;

-- A new link; the old one stops working.
create function public.renew_invite_token()
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or not public.caller_has_account() then
    raise exception 'an account is needed to invite' using errcode = '42501';
  end if;

  update public.friend_invites set revoked_at = now()
  where inviter_id = auth.uid() and revoked_at is null;

  return public.my_invite_token();
end
$$;

-- What the person who opens a link sees before accepting: who invited them,
-- by first name, and whether the link still works. Readable without an
-- account, so the screen can say who is inviting before asking to sign up.
create function public.invite_preview(p_token text)
returns table (inviter_first_name text, valid boolean, already_friends boolean, own_link boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select
    public.first_name_of(i.inviter_id),
    i.revoked_at is null,
    exists (
      select 1 from public.friendships f
      where f.status = 'accepted'
        and least(f.requester_id, f.addressee_id) = least(i.inviter_id, auth.uid())
        and greatest(f.requester_id, f.addressee_id) = greatest(i.inviter_id, auth.uid())
    ),
    i.inviter_id = auth.uid()
  from public.friend_invites i
  where i.token = p_token;
$$;

-- Accepting a link. The inviter consented by sharing it; the person accepting
-- consents now. A pair that was friends before and ended it can become friends
-- again the same way.
create function public.accept_friend_invite(p_token text)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  inviter uuid;
  existing uuid;
  result uuid;
begin
  if auth.uid() is null or not public.caller_has_account() then
    raise exception 'an account is needed to accept' using errcode = '42501';
  end if;

  select i.inviter_id into inviter
  from public.friend_invites i
  where i.token = p_token and i.revoked_at is null;

  if inviter is null then
    raise exception 'this invitation no longer works' using errcode = 'P0002';
  end if;
  if inviter = auth.uid() then
    raise exception 'that is your own invitation' using errcode = '22023';
  end if;

  select f.id into existing
  from public.friendships f
  where least(f.requester_id, f.addressee_id) = least(inviter, auth.uid())
    and greatest(f.requester_id, f.addressee_id) = greatest(inviter, auth.uid());

  if existing is null then
    insert into public.friendships (requester_id, addressee_id, status, responded_at)
    values (inviter, auth.uid(), 'accepted', now())
    returning id into result;
  else
    update public.friendships
      set status = 'accepted', responded_at = now(), ended_by = null
    where id = existing
    returning id into result;
  end if;

  return result;
end
$$;

-- Ending a friendship, from either side. Every comparison between the two
-- stops being readable on the next request (the policy on chart_comparisons
-- checks the status), and the row stays so the history is honest.
create function public.end_friendship(p_friendship uuid)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  update public.friendships
    set status = 'removed', responded_at = now(), ended_by = auth.uid()
  where id = p_friendship
    and auth.uid() in (requester_id, addressee_id)
    and status = 'accepted';

  if not found then
    raise exception 'no such friendship' using errcode = 'P0002';
  end if;
end
$$;

-- The caller's friends, by first name. The other person's row in `clients` is
-- not readable by policy, and it should stay that way: this returns the one
-- thing a friend is shown.
create function public.my_friends()
returns table (friendship_id uuid, friend_id uuid, first_name text, since timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select
    f.id,
    case when f.requester_id = auth.uid() then f.addressee_id else f.requester_id end,
    public.first_name_of(case when f.requester_id = auth.uid() then f.addressee_id else f.requester_id end),
    f.responded_at
  from public.friendships f
  where f.status = 'accepted'
    and auth.uid() in (f.requester_id, f.addressee_id)
  order by f.responded_at desc;
$$;

revoke execute on function
  public.caller_has_account(),
  public.my_invite_token(),
  public.renew_invite_token(),
  public.invite_preview(text),
  public.accept_friend_invite(text),
  public.end_friendship(uuid),
  public.my_friends()
from public, anon;

grant execute on function
  public.caller_has_account(),
  public.my_invite_token(),
  public.renew_invite_token(),
  public.invite_preview(text),
  public.accept_friend_invite(text),
  public.end_friendship(uuid),
  public.my_friends()
to authenticated;
