-- v1.2 R-03: after marking a practice, how useful it was, 1 to 5, and an
-- optional comment. Only practices of the routine are rated.
--
-- The rating is not a score of the person and never becomes one: no average
-- is shown, nothing is won. It is read later by the memory (le_funciona /
-- no_le_funciona) and by the routine's adjustment, without a model.
--
-- The comment is the person's own words about their practice, so it is
-- treated like any free text: scanned for crisis in the browser before it is
-- saved, readable only by its owner under the existing policy, never sent to
-- a model and never recorded in the funnel.

alter table public.recommendation_checkins
  add column rating smallint check (rating between 1 and 5),
  add column comment text check (char_length(comment) between 1 and 1000);

comment on column public.recommendation_checkins.rating is
  'v1.2 R-03: how useful the practice was that day, 1 (nada) to 5 (mucho). Null until rated.';
comment on column public.recommendation_checkins.comment is
  'v1.2 R-03: optional. Free text: crisis-scanned before saving, never in a model payload.';

-- A crisis can now be detected in a practice comment.
alter table public.crisis_events drop constraint crisis_events_source_surface_check;
alter table public.crisis_events add constraint crisis_events_source_surface_check
  check (source_surface in ('onboarding', 'chat', 'meditation_intent', 'practice_comment'));
