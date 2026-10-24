-- «Sugerir un cambio» inside the admin panel (owner, 23 Oct 2026): the team
-- leaves suggestions about the panel itself, each with the section it was
-- written from, kept here so none is lost and every admin reads them all.
-- Nobody reads the table through the API; only the functions below, each
-- behind admin_require().

create table public.admin_suggestions (
  id         uuid primary key default gen_random_uuid(),
  author_id  uuid references auth.users (id) on delete set null,
  section    text not null check (section ~ '^[a-z]{1,32}$'),
  body       text not null check (char_length(btrim(body)) between 1 and 2000),
  created_at timestamptz not null default now()
);
create index admin_suggestions_author_idx on public.admin_suggestions (author_id);
create index admin_suggestions_created_idx on public.admin_suggestions (created_at);
alter table public.admin_suggestions enable row level security;

comment on table public.admin_suggestions is
  'The team''s suggestions about the admin panel. Read and written only through admin_suggestion_* functions.';

-- Every suggestion, oldest first, with who wrote it as the team knows them.
create function public.admin_suggestions_list()
returns table (id uuid, author_id uuid, author_name text, section text, body text,
               created_at timestamptz, mine boolean)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.admin_require('team_suggestions');
  return query
  select s.id, s.author_id,
    coalesce(nullif(u.raw_user_meta_data ->> 'full_name', ''), nullif(c.legal_birth_name, ''), u.email::text),
    s.section, s.body, s.created_at, s.author_id = auth.uid()
  from public.admin_suggestions s
  left join auth.users u on u.id = s.author_id
  left join public.clients c on c.user_id = s.author_id
  order by s.created_at
  limit 1000;
end
$$;

create function public.admin_suggestion_add(p_section text, p_body text)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  new_id uuid;
begin
  perform public.admin_require('team_suggestion_add');
  insert into public.admin_suggestions (author_id, section, body)
  values (auth.uid(), coalesce(nullif(p_section, ''), 'general'), btrim(p_body))
  returning id into new_id;
  return new_id;
end
$$;

-- Each admin deletes only what they wrote.
create function public.admin_suggestion_delete(p_id uuid)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  perform public.admin_require('team_suggestion_delete');
  delete from public.admin_suggestions where id = p_id and author_id = auth.uid();
  if not found then
    raise exception 'not_yours' using errcode = '42501';
  end if;
end
$$;

revoke execute on function public.admin_suggestions_list() from public, anon;
revoke execute on function public.admin_suggestion_add(text, text) from public, anon;
revoke execute on function public.admin_suggestion_delete(uuid) from public, anon;
grant execute on function public.admin_suggestions_list() to authenticated;
grant execute on function public.admin_suggestion_add(text, text) to authenticated;
grant execute on function public.admin_suggestion_delete(uuid) to authenticated;
