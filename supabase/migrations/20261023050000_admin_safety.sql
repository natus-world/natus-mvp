-- After the owner deleted his own account on the launch night (22 Oct 2026)
-- the panel had no admin left, and the record of who looked at whom went
-- with him. Two guards, both the owner's choice the same night:
--
-- 1. The access log outlives the admin: deleting an admin's account empties
--    `admin_id` instead of deleting the rows.
-- 2. The last admin cannot be removed: not by hand, and not by deleting the
--    account (the cascade from auth.users stops here, so the whole deletion
--    is refused; `delete-account` checks first and says why).

alter table public.admin_access_log alter column admin_id drop not null;
alter table public.admin_access_log drop constraint admin_access_log_admin_id_fkey;
alter table public.admin_access_log
  add constraint admin_access_log_admin_id_fkey
  foreign key (admin_id) references auth.users (id) on delete set null;

create function public.keep_one_admin()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (select 1 from public.admins a where a.user_id <> old.user_id) then
    raise exception 'last_admin' using errcode = 'P0001',
      hint = 'Add another admin before removing this one.';
  end if;
  return old;
end
$$;

revoke execute on function public.keep_one_admin() from public, anon, authenticated;

create trigger admins_keep_one
  before delete on public.admins
  for each row execute function public.keep_one_admin();

-- What delete-account asks before deleting: is this person the only admin?
create function public.is_last_admin(p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.admins a where a.user_id = p_user)
     and not exists (select 1 from public.admins a where a.user_id <> p_user);
$$;

revoke execute on function public.is_last_admin(uuid) from public, anon, authenticated;
grant execute on function public.is_last_admin(uuid) to service_role;
