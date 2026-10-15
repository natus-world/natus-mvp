alter table public.anonymous_sessions
  add column grammatical_gender text not null default 'neutro'
    check (grammatical_gender in ('femenino', 'masculino', 'neutro'));

alter table public.clients
  add column grammatical_gender text not null default 'neutro'
    check (grammatical_gender in ('femenino', 'masculino', 'neutro'));
