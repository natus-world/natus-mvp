-- «Pregúntale a tu carta» keeps its own conversation beside the Chat's, for
-- the same map (20261022190000_chart_chat.sql). The unique key on
-- (user_id, synthesis_id) refused that second row: the browser saves every
-- conversation in one upsert, so after opening the bubble no conversation and
-- no message of that person reached the account — the Chat's included
-- (QA-21, launch night, 22 Oct 2026). One of each kind per map.
alter table public.conversations
  drop constraint conversations_user_id_synthesis_id_key;
alter table public.conversations
  add constraint conversations_user_id_synthesis_id_kind_key unique (user_id, synthesis_id, kind);
