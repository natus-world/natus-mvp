#!/bin/sh
# Fill the LOCAL stack with invented people so the admin panel (natus-admin) has something to show:
# an admin, two people (Camila and Diego, invented), funnel steps, model calls, suggestions, a crisis
# alert, a conversation and a journal entry. Never against production.
# Run after `supabase db reset`:  sh scripts/herramientas/sembrar-panel-local.sh
# Then in natus-admin: `pnpm dev`, and sign in with admin@natus.test and the password printed at the end.
cd "$(dirname "$0")/../.." || exit 1
ADMIN=${ADMIN:-$(cd .. && pwd)/natus-admin}
PASS=${PASS:-$(python3 -I -c "import secrets;print(secrets.token_urlsafe(12))")}
eval "$(supabase status -o json 2>/dev/null | python3 -I -c "import json,sys; d=json.load(sys.stdin); print(f\"SR={d['SERVICE_ROLE_KEY']}; PK={d['PUBLISHABLE_KEY']}\")")"
mk() { curl -s -X POST http://127.0.0.1:54321/auth/v1/admin/users -H "apikey: $SR" -H "Authorization: Bearer $SR" -H 'Content-Type: application/json' -d "{\"email\":\"$1\",\"password\":\"$PASS\",\"email_confirm\":true}" | python3 -c "import json,sys; print(json.load(sys.stdin).get('id'))"; }
A=$(mk admin@natus.test); P1=$(mk camila@example.test); P2=$(mk diego@example.test)
docker exec -i supabase_db_natus-mvp psql -U postgres -q -v ON_ERROR_STOP=1 <<SQL
insert into public.admins (user_id, role) values ('$A', 'owner');
insert into public.clients (user_id, email, legal_birth_name, birth_date, birth_city, birth_country, country, presenting_need_text, clinical_ideation_6m, clinical_in_treatment, clinical_psychiatric_medication, grammatical_gender)
values ('$P1','camila@example.test','Camila Fuentes','1994-03-12','Valparaíso','CL','CL','Ando con mucha ansiedad por el trabajo y no duermo bien','no',false,false,'femenino'),
       ('$P2','diego@example.test','Diego Ramírez','1989-11-02','Guadalajara','MX','MX','Quiero entender por qué repito las mismas relaciones','no',true,false,'masculino');
select public.record_step('$P1','onboarding_started','instagram','lanzamiento');
select public.record_step('$P1', s) from unnest(array['birth_data_done','need_done','openness_done','soul_map_seen','signup_seen','care_done','paths_seen','first_practice','first_chat']) s;
select public.record_step('$P1','paywall_seen',null,null,'welcome');
select public.record_step('$P2', s) from unnest(array['onboarding_started','birth_data_done','need_done','openness_done','soul_map_seen','signup_seen']) s;
select public.record_step('$P2','paywall_seen',null,null,'chat');
insert into public.funnel_events (user_id, step, dedupe_key, occurred_at) values ('$P1','app_opened','app_opened:x1', now() - interval '1 day'),('$P2','app_opened','app_opened:x2', now());
insert into public.claude_api_calls (user_id, purpose, prompt_version, model, mode, outcome, input_tokens, output_tokens, created_at) values
 ('$P1','soul_map','soul-map-v2.6','claude-opus-5-5','server','ok',9000,3500, now() - interval '3 days'),
 ('$P1','chat','chat-v1.8','claude-sonnet-5-5','server','ok',6000,700, now() - interval '1 day'),
 ('$P2','soul_map','soul-map-v2.6','claude-opus-5-5','server','ok',9200,3600, now()),
 ('$P2','match','match-v1.5','claude-sonnet-5-5','server','api_error',0,0, now());
insert into public.feedback_messages (user_id, author, body, screen, created_at) values
 ('$P1','person','Me costó encontrar dónde marcar la práctica de hoy, el botón se pierde con la foto.','/hoy', now() - interval '2 hours'),
 ('$P2','person','La pantalla de Google me dio desconfianza, no entendí por qué la pedían.','/registro', now() - interval '30 minutes');
insert into public.crisis_events (user_id, severity, category, source_surface, matched, excerpt, created_at) values ('$P2','low','ideacion','chat','{"no aguanto"}','ya no aguanto este trabajo', now() - interval '1 day');
insert into public.soul_map_syntheses (id, user_id, prompt_version, synthesis, numerology, mode, is_current) values ('22222222-2222-4222-8222-222222222222', '$P1', 'soul-map-v2.6', '{"summary":"Una mente que ordena para sentirse a salvo."}', '{"life_path":7}', 'server', true);
insert into public.conversations (id, user_id, synthesis_id) values ('11111111-1111-4111-8111-111111111111', '$P1', '22222222-2222-4222-8222-222222222222');
insert into public.messages (user_id, conversation_id, role, type, text, created_at) values
 ('$P1','11111111-1111-4111-8111-111111111111','user','reflection','¿Por qué me cuesta tanto descansar?', now() - interval '1 day'),
 ('$P1','11111111-1111-4111-8111-111111111111','assistant','reflection','Tu Luna en Virgo pide orden antes de soltar. ¿Qué pasa en tu cuerpo cuando intentas parar?', now() - interval '1 day' + interval '1 minute');
insert into public.journal_entries (user_id, entry_date, body, mood) values ('$P1', current_date, 'Hoy hice la respiración antes de dormir y dormí un poco mejor.', 4);
SQL
printf 'VITE_SUPABASE_URL=http://127.0.0.1:54321\nVITE_SUPABASE_KEY=%s\n' "$PK" > "$ADMIN/.env.local"
echo "listo: entra al panel local con admin@natus.test y la clave $PASS"
