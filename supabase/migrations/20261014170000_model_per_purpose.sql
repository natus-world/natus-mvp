alter table public.soul_map_syntheses
  add column trigger text not null default 'onboarding'
    check (trigger in ('onboarding', 'base_data_changed', 'memory_shift', 'monthly', 'admin')),
  add column model text;

drop function public.deployment_token_totals(timestamptz);

create function public.deployment_token_totals(since timestamptz)
returns table (
  model              text,
  input_tokens       bigint,
  output_tokens      bigint,
  cache_write_tokens bigint,
  cache_read_tokens  bigint
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    c.model,
    coalesce(sum(c.input_tokens), 0)::bigint,
    coalesce(sum(c.output_tokens), 0)::bigint,
    coalesce(sum(c.cache_write_tokens), 0)::bigint,
    coalesce(sum(c.cache_read_tokens), 0)::bigint
  from public.claude_api_calls c
  where c.mode = 'server' and c.created_at >= since
  group by c.model
$$;

revoke execute on function public.deployment_token_totals(timestamptz)
  from public, anon, authenticated;
grant execute on function public.deployment_token_totals(timestamptz) to service_role;
