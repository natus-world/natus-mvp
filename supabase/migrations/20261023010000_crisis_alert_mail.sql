-- A mail to the team when a high crisis alert is recorded (owner, 22 Oct
-- 2026). The panel only shows what somebody opens it to see, and at night
-- nobody is looking.
--
-- The mail says that there is an alert, where and when, and links to the
-- panel. Never what the person wrote, never their name. It goes to every
-- admin's address, through Resend, with the key kept in Vault as
-- `resend_api_key` (the owner adds it; until then nothing is sent). One mail
-- per person every 30 minutes, so a long conversation does not flood the
-- inbox. Sending is asynchronous (pg_net) and can never stop the alert from
-- being kept: any failure is swallowed.

create extension if not exists pg_net with schema extensions;

create function public.notify_high_crisis()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  api_key text;
  recipients text[];
  place text;
begin
  if new.severity is distinct from 'high' then
    return new;
  end if;
  begin
    select s.decrypted_secret into api_key
    from vault.decrypted_secrets s where s.name = 'resend_api_key' limit 1;
    if api_key is null or api_key = '' then
      return new;
    end if;
    if exists (
      select 1 from public.crisis_events e
      where e.user_id = new.user_id and e.id <> new.id
        and e.admin_notified_at > now() - interval '30 minutes'
    ) then
      return new;
    end if;
    select array_agg(distinct u.email) into recipients
    from public.admins a join auth.users u on u.id = a.user_id
    where u.email is not null;
    if recipients is null then
      return new;
    end if;
    place := case new.source_surface
      when 'chat' then 'el chat con Davraz'
      when 'journal' then 'la bitácora'
      when 'onboarding' then 'el ingreso'
      when 'meditation_intent' then 'una meditación'
      when 'practice_comment' then 'un comentario de práctica'
      when 'memory' then 'la memoria'
      else coalesce(new.source_surface, 'la app')
    end;
    perform net.http_post(
      url := 'https://api.resend.com/emails',
      headers := jsonb_build_object('Authorization', 'Bearer ' || api_key, 'Content-Type', 'application/json'),
      body := jsonb_build_object(
        'from', 'Natus <alertas@mail.natus.world>',
        'to', to_jsonb(recipients),
        'subject', 'Natus: alerta de crisis alta',
        'text', format(
          E'Hay una alerta de crisis alta en %s (%s, hora de Chile).\n\n'
          'Revísala en el panel: https://admin.natus.world/#alertas\n\n'
          'Este correo no incluye lo que escribió la persona ni su nombre.',
          place,
          to_char(new.created_at at time zone 'America/Santiago', 'DD-MM-YYYY HH24:MI')
        )
      )
    );
    update public.crisis_events set admin_notified_at = now() where id = new.id;
  exception when others then
    -- A mail must never be the reason an alert is lost.
    return new;
  end;
  return new;
end
$$;

revoke execute on function public.notify_high_crisis() from public, anon, authenticated;

create trigger crisis_events_notify_team
  after insert on public.crisis_events
  for each row execute function public.notify_high_crisis();
