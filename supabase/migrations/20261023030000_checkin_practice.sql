-- Which practice a check-in is for (owner, 22 Oct 2026), so the panel can
-- tell which therapies help: a mark and its rating joined with certainty to
-- its row in routine_practices, and through it to the therapy it comes from
-- (connects_modality). practice_title stays as it is, and so does the
-- reconciliation by (practice_title, checked_on) the browser and the memory
-- rely on. Invisible to the person.

-- A practice is pointed at together with its owner, so a check-in can only
-- point at a practice of the same person.
alter table public.routine_practices
  add constraint routine_practices_id_user_key unique (id, user_id);

alter table public.recommendation_checkins
  add column practice_id uuid;

alter table public.recommendation_checkins
  add constraint recommendation_checkins_practice_fkey
  foreign key (practice_id, user_id)
  references public.routine_practices (id, user_id)
  on delete set null (practice_id);

create index recommendation_checkins_practice_idx
  on public.recommendation_checkins (practice_id)
  where practice_id is not null;

comment on column public.recommendation_checkins.practice_id is
  'The practice this check-in is for, when it is known for certain. Null for '
  'a practice of somebody else, one not saved yet, or a title that matched '
  'more than one practice when this column was filled in (22 Oct 2026).';

-- A practice that is not this person's (or not saved yet: the routine and
-- the check-ins reach the server in their own queues) is left unknown rather
-- than refusing the mark: a check-in is never lost over it. The next save,
-- once the practice is there, fills it in.
create function public.checkin_practice_of_owner()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.practice_id is not null and not exists (
    select 1 from public.routine_practices p
    where p.id = new.practice_id and p.user_id = new.user_id
  ) then
    new.practice_id := null;
  end if;
  return new;
end;
$$;

create trigger checkin_practice_of_owner
  before insert or update of practice_id, user_id on public.recommendation_checkins
  for each row execute function public.checkin_practice_of_owner();

-- The marks made before: only where the title is the title of exactly one
-- practice of that same person. In doubt, left empty.
update public.recommendation_checkins c
set practice_id = p.id
from (
  select user_id, title, (array_agg(id))[1] as id
  from public.routine_practices
  group by user_id, title
  having count(*) = 1
) p
where c.practice_id is null
  and p.user_id = c.user_id
  and p.title = c.practice_title;
