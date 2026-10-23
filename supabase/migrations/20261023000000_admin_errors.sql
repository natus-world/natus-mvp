-- Errors in the panel (owner, 22 Oct 2026: «necesito que en el panel pueda
-- revisar los errores que aparecen»).
--
-- Two kinds: what broke in the app (`client_errors`, sent by the browser),
-- and the model answers that failed (`claude_api_calls`), with whether the
-- person got an answer anyway (an `ok` call of the same purpose within five
-- minutes: the retry). The list of app errors names the person, so asking
-- for it is logged like any list of people.

create function public.admin_app_errors(p_from date, p_to date, p_limit integer default 300)
returns table (
  id uuid, created_at timestamptz, kind text, message text, path text, release text,
  user_agent text, stack text, user_id uuid, name text, email text
)
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  perform public.admin_require('app_errors', null, true);
  return query
  select e.id, e.created_at, e.kind, e.message, e.path, e.release, e.user_agent, e.stack, e.user_id,
         c.legal_birth_name, c.email
  from public.client_errors e
  left join public.clients c on c.user_id = e.user_id
  where (e.created_at at time zone 'America/Santiago')::date between p_from and p_to
  order by e.created_at desc
  limit least(greatest(p_limit, 1), 1000);
end
$$;

create function public.admin_ai_failures(p_from date, p_to date)
returns table (
  purpose text, outcome text, error_kind text, calls bigint, people bigint,
  recovered bigint, last_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.admin_require('ai_failures');
  return query
  select c.purpose, c.outcome, coalesce(c.error_kind, ''), count(*), count(distinct c.user_id),
         count(*) filter (where exists (
           select 1 from public.claude_api_calls ok
           where ok.user_id is not distinct from c.user_id and ok.purpose = c.purpose and ok.outcome = 'ok'
             and ok.created_at between c.created_at and c.created_at + interval '5 minutes'
         )),
         max(c.created_at)
  from public.claude_api_calls c
  where c.mode = 'server'
    and c.outcome not in ('ok', 'pending')
    and (c.created_at at time zone 'America/Santiago')::date between p_from and p_to
  group by 1, 2, 3;
end
$$;

do $$
declare f text;
begin
  foreach f in array array[
    'admin_app_errors(date, date, integer)',
    'admin_ai_failures(date, date)'
  ] loop
    execute format('revoke execute on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end
$$;
