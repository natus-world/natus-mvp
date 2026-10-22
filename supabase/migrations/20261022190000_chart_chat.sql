-- «Pregúntale a tu carta» (owner, 22 Oct 2026): a bubble on Carta opens a
-- conversation about the chart only, kept apart from the Chat's own (it does
-- not appear in the Chat), read by the memory like any other conversation,
-- and counted against the same chat quota.

-- Which conversation a row is: the Chat's, or the one opened from Carta.
alter table public.conversations
  add column kind text not null default 'chat';
alter table public.conversations
  add constraint conversations_kind_check check (kind in ('chat', 'carta'));

-- A question that is not about the chart gets a short answer that sends the
-- person to the Chat; it is not charged. The type joins the four of
-- chatResponseSchema (src/lib/schemas/ai.ts), the source of truth.
alter table public.messages drop constraint messages_type_check;
alter table public.messages add constraint messages_type_check
  check (type in ('reflection', 'recommendation', 'clarifying_question', 'crisis', 'off_chart'));
