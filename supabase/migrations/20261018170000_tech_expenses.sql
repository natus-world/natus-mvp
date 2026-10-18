-- What Natus pays for its technology (owner, 18 Oct 2026), kept in the admin
-- panel so the finances can move to the company's account with a clear
-- record: each service, its plan, what it costs, how often, whether it is
-- active or still to buy, and who pays it today. Read and written only by
-- admins, through the functions below.

create table public.tech_expenses (
  id          uuid primary key default gen_random_uuid(),
  service     text not null check (char_length(service) between 1 and 120),
  purpose     text not null default '' check (char_length(purpose) <= 300),
  plan        text not null default '' check (char_length(plan) <= 200),
  amount_usd  numeric(10, 2) check (amount_usd is null or amount_usd >= 0),
  frequency   text not null default 'monthly' check (frequency in ('monthly', 'yearly', 'usage', 'once')),
  status      text not null default 'active' check (status in ('active', 'to_buy', 'canceled')),
  paid_by     text not null default 'personal' check (paid_by in ('personal', 'company', 'free')),
  since       date,
  notes       text not null default '' check (char_length(notes) <= 2000),
  updated_at  timestamptz not null default now(),
  updated_by  uuid references auth.users (id) on delete set null
);

create index tech_expenses_updated_by_idx on public.tech_expenses (updated_by);

alter table public.tech_expenses enable row level security;
grant select, insert, update, delete on public.tech_expenses to service_role;

create function public.admin_expenses()
returns setof public.tech_expenses
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.admin_require('expenses');
  return query select * from public.tech_expenses order by status, service;
end
$$;

-- Creates when p_id is null, replaces otherwise.
create function public.admin_expense_save(p_id uuid, p jsonb)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  saved uuid;
begin
  perform public.admin_require('expense_save');
  if p_id is null then
    insert into public.tech_expenses (service, purpose, plan, amount_usd, frequency, status, paid_by, since, notes, updated_by)
    values (trim(p->>'service'), coalesce(p->>'purpose', ''), coalesce(p->>'plan', ''),
            nullif(p->>'amount_usd', '')::numeric, coalesce(p->>'frequency', 'monthly'),
            coalesce(p->>'status', 'active'), coalesce(p->>'paid_by', 'personal'),
            nullif(p->>'since', '')::date, coalesce(p->>'notes', ''), auth.uid())
    returning id into saved;
  else
    update public.tech_expenses set
      service = trim(p->>'service'), purpose = coalesce(p->>'purpose', ''), plan = coalesce(p->>'plan', ''),
      amount_usd = nullif(p->>'amount_usd', '')::numeric, frequency = coalesce(p->>'frequency', 'monthly'),
      status = coalesce(p->>'status', 'active'), paid_by = coalesce(p->>'paid_by', 'personal'),
      since = nullif(p->>'since', '')::date, notes = coalesce(p->>'notes', ''),
      updated_at = now(), updated_by = auth.uid()
    where id = p_id
    returning id into saved;
    if saved is null then
      raise exception 'not_found' using errcode = 'P0002';
    end if;
  end if;
  return saved;
end
$$;

create function public.admin_expense_delete(p_id uuid)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  perform public.admin_require('expense_delete');
  delete from public.tech_expenses where id = p_id;
end
$$;

do $$
declare f text;
begin
  foreach f in array array['admin_expenses()', 'admin_expense_save(uuid, jsonb)', 'admin_expense_delete(uuid)'] loop
    execute format('revoke execute on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end
$$;

-- What was known on 18 Oct 2026.
insert into public.tech_expenses (service, purpose, plan, amount_usd, frequency, status, paid_by, since, notes) values
  ('Supabase', 'Base de datos, entrada con Google y funciones de la app', 'Free', 0, 'monthly', 'active', 'free', '2026-08-13',
   'Se pausa tras una semana sin uso y tiene límites bajos. Pasar a Pro antes del lanzamiento.'),
  ('Supabase', 'Base de datos, entrada con Google y funciones de la app', 'Pro', 25, 'monthly', 'to_buy', 'personal', null,
   'Necesario para ~10.000 personas (la base pasa los 500 MB del plan gratis). Puede subir a ~US$40 si hay que agrandar el servidor en un pico.'),
  ('Open-Meteo', 'Buscador de ciudades de nacimiento', 'Standard (1 millón de búsquedas al mes)', 29, 'monthly', 'to_buy', 'personal', null,
   'Hoy se usa el plan gratis, solo para uso no comercial y con 10.000 búsquedas al día. Al contratar da una clave que hay que poner en la app.'),
  ('Astrologer (RapidAPI)', 'Cálculo de la carta natal', 'Basic (75 cartas al mes)', 0, 'monthly', 'active', 'free', '2026-06-13',
   'Al 18 oct iba en 34,67% del cupo. Se corta al llegar a 75.'),
  ('Astrologer (RapidAPI)', 'Cálculo de la carta natal', 'Ultra (50.000 cartas al mes)', 18, 'monthly', 'to_buy', 'personal', null,
   'Cubre unas 45.000 personas al mes. Pro (US$9, 5.000) no alcanza para 10.000. La clave sigue igual.'),
  ('Anthropic (Claude API)', 'La IA: mapas, caminos, rutina, chat, meditaciones', 'Por uso', null, 'usage', 'active', 'personal', '2026-08-13',
   'El gasto del mes sale del Resumen del panel. Cada mapa nuevo cuesta ~US$0,08; una persona que sigue usando la app ~US$0,20. Falta poner un tope de gasto en la consola.'),
  ('PayPal', 'Cobro de Premium', 'Comisión por venta', null, 'usage', 'active', 'company', '2026-10-15',
   'Cobra un porcentaje más un fijo por cada pago; se descuenta de lo cobrado. Primera suscripción real el 18 oct.'),
  ('GitHub', 'Código y publicación de la app y del panel', 'Free', 0, 'monthly', 'active', 'free', null,
   'Pages publica gratis la app y el panel.'),
  ('GitHub', 'Volver privado el repositorio del panel', 'Team (2 personas)', 8, 'monthly', 'to_buy', 'personal', null,
   'Más adelante, para Nico y Bryante (unos US$4 por persona).'),
  ('GoDaddy', 'Dominio natus.world (app, panel y web)', 'Dominio', null, 'yearly', 'active', 'personal', null,
   'Falta anotar cuánto cuesta y cuándo renueva.');
