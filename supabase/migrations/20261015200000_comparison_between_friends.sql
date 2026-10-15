-- v1.2 C-01: comparisons are between friends inside Natus, and nothing else.
--
-- External profiles (people outside Natus) and the simulated consent by email
-- are out. Their rows go with them, decided by the product owner on
-- 15 Oct 2026: they hold data about somebody who never really consented.
--
-- A comparison is now read by both friends, through the friendship, and only
-- while it is accepted. Ending the friendship closes every comparison between
-- them on the next request; the rows stay, unreadable by policy, as the
-- non-negotiable on revoking access requires.

delete from public.chart_comparisons;

drop policy "comparisons are readable only under live consent" on public.chart_comparisons;
drop policy "comparisons are writable only under live consent" on public.chart_comparisons;
drop policy "own comparisons may always be deleted" on public.chart_comparisons;

drop index if exists public.chart_comparisons_consent_idx;
drop index if exists public.chart_comparisons_profile_idx;

alter table public.chart_comparisons
  drop column consent_id,
  drop column external_profile_id,
  add column friendship_id uuid not null references public.friendships (id) on delete cascade;

create index chart_comparisons_friendship_idx on public.chart_comparisons (friendship_id, created_at desc);

comment on table public.chart_comparisons is
  'Written only by the comparison function. user_id is who asked for it. '
  'Readable by both friends while the friendship is accepted, and by nobody '
  'once it ends. See the comparison_between_friends migration.';

drop table public.comparison_consents;
drop table public.external_profiles;

create policy "comparisons are readable by both friends while they are friends"
  on public.chart_comparisons for select to authenticated
  using (
    exists (
      select 1
      from public.friendships f
      where f.id = chart_comparisons.friendship_id
        and f.status = 'accepted'
        and auth.uid() in (f.requester_id, f.addressee_id)
    )
  );

-- The browser never writes a comparison: the function builds the payload from
-- both people's stored data and stores the result. Denied at the grant layer,
-- so no later policy can reopen it by accident.
revoke insert, update, delete on public.chart_comparisons from authenticated;
grant select, insert on public.chart_comparisons to service_role;

-- The function reads the friend's birth data and name with the service role,
-- after checking the friendship. Nothing new is granted to the browser.
grant select on public.friendships to service_role;

-- Only the columns a comparison is built from. Never the clinical answers,
-- never what the person wrote: those stay out of reach of the function
-- altogether, which is stronger than trusting it not to read them.
grant select (user_id, legal_birth_name, birth_date, birth_time, birth_city, birth_country, grammatical_gender)
  on public.clients to service_role;
