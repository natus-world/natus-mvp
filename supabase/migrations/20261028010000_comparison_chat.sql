-- «Pregúntale a las dos cartas» (owner, 27 Oct 2026): the sheet of
-- «Pregúntale a tu carta» over a comparison and its areas. One conversation
-- for each friendship, kept apart from the Chat's, read by the memory like
-- any other, and counted against the same chat quota.

alter table public.conversations drop constraint conversations_kind_check;
alter table public.conversations
  add constraint conversations_kind_check check (kind in ('chat', 'carta', 'comparacion'));

-- Which friendship a comparison's conversation is about. The friendship going
-- leaves the conversation (it is the person's own writing) without its label.
alter table public.conversations
  add column friendship_id uuid references public.friendships (id) on delete set null;
comment on column public.conversations.friendship_id is
  'The friendship of a «Pregúntale a las dos cartas» conversation (owner, 27 Oct 2026). Kept only when it is the writer''s own.';

alter table public.conversations
  add constraint conversations_friendship_only_comparison
  check (friendship_id is null or kind = 'comparacion');

-- A label, never a door, as on messages: a friendship that is not the
-- writer's leaves it empty rather than refusing the row.
create trigger conversations_friendship_own
  before insert or update of friendship_id on public.conversations
  for each row execute function public.messages_friendship_own();

-- One Chat and one chart conversation per map, as before; one comparison
-- conversation per map and friendship.
alter table public.conversations
  drop constraint conversations_user_id_synthesis_id_kind_key;
create unique index conversations_one_per_kind
  on public.conversations (user_id, synthesis_id, kind)
  where kind in ('chat', 'carta');
create unique index conversations_one_per_friendship
  on public.conversations (user_id, synthesis_id, friendship_id)
  where kind = 'comparacion' and friendship_id is not null;

-- The unique key that went also indexed user_id; partial indexes do not
-- count for a foreign key, so both keys get their own.
create index conversations_user_idx on public.conversations (user_id);
create index conversations_friendship_idx on public.conversations (friendship_id);
