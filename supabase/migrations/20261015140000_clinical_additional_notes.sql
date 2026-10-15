-- v1.2 O-06: the fourth clinical question, free text and optional.
--
-- Scanned for crisis in the browser on submit, like every free text. It never
-- reaches a model: no model payload carries the clinical answers, and the
-- server's clinical check (_shared/clinical.ts) reads only ideation and
-- medication. Covered by the existing "own client row" and "own anonymous
-- session" policies, so nobody but the person can read it.

alter table public.clients
  add column clinical_additional_notes text
    check (char_length(clinical_additional_notes) <= 2000);

alter table public.anonymous_sessions
  add column clinical_additional_notes text
    check (char_length(clinical_additional_notes) <= 2000);
