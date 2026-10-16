# CLAUDE.md

Guidance for Claude Code working in this repository.

## What this is

The Natus user product — the consumer side of a self-knowledge platform for
Spanish-speaking LATAM. It is **not** a Waterplan project; it happens to live
inside that workspace. It is expected to be transferred to another GitHub
owner once presentable.

It began as a static demo and is no longer one: there is a Supabase project
behind it, with Postgres under Row Level Security, Google sign-in, and Edge
Functions holding the API keys. The curated fixtures run only in a build with
`VITE_DEMO_MODE=true` (changes v1.2 `S-01`): anywhere else a model path that is
unavailable shows the error state, never a fixture, and no internal label
(prompt version, pool strategy, `/lab/safety`) renders. Keep the demo path
working — it is how the app runs offline and how the tests exercise it.

**The product spec in force is Nico's package `~/Downloads/natus-paquete-tomas 2/`**
(v1.2, 14 Oct 2026, final: read `LEEME.md` and `00-NOVEDADES-version-final.md`
first; `02-cambios-pdr-natus-v1.2.md` wins on logic, `03-natus-guia-interfaz-app.md`
on everything visual and every UI string), which overrides the PDR v1.0 wherever they disagree, and
works through its items in the order of its §13. Items marked `[ABIERTO]`
are not to be built without the product owner's answer.

Live at https://app.natus.world/

**It is a prototype, not a health service.** It presents crisis resources and
asks about suicidal ideation because the product it demonstrates does. Nobody
is monitoring it and the hotline numbers are unverified.

## Work in progress

`docs/DESIGN-LAYER.md` is a live plan, not a record. The design layer is now
isolated in `src/design/` and fenced by a test; one step is left, and the file
carries the verification protocol this repository expects of visual work. Read
it before touching `src/design`, `src/styles` or anything visual. Delete it
when that step is done and fold what is still true into this file.

## Where the reasoning lives

**This file is it.** The design record — two implementation plans, a decision
log and a migration map, about 2,900 lines — was deleted once the product ran
end to end, deliberately and with the owner's decision on record. What is
below is what survived that, because it is still true rather than because it
happened. `git log` has the rest.

The consequence is worth stating plainly: nothing in this repository now
explains why a rejected alternative was rejected. Before reversing something
under **Non-negotiables**, ask — do not assume the absence of a reason means
there was not one.

The source documents are `PDR — MVP Natus_ Producto del Usuario.txt` and
`natus-mockups (3).html`, both in `~/Downloads`. When they disagree, the
mockups are the **visual** truth (palette, typography, glass, photography) and
the PDR is the **functional** truth (flow, scope, copy rules, safety).
`README.md` carries the deployment configuration; `docs/ASSETS.md` the image
licensing; `docs/DESIGN-LAYER.md` the plan currently in flight.

## Resuming work

The product runs end to end in production: onboarding, natal chart by
ephemeris, Soul Map, recommendations, chat, meditations and synastry, all with
real generation, all walked on the deployed site.

**v1.2 is being implemented, and most of it is not built yet:** today's
sky, notifications, the full chart.
The memory (M-01) is built (16 Oct 2026). «Lo que Natus sabe de ti» in the
profile shows it, asks for consent and lets the person correct, delete and
add; its texts are not in the guide and were approved by the owner on
16 Oct 2026. How it works: `memory_items` and
`memory_item_sources`; the `memory` function (Sonnet, memory-v1.0) reads one
source — a journal entry, a rated check-in, a conversation quiet for 30
minutes — as the person, scans it for crisis again, and adds, confirms or
corrects items; the browser hands it pending sources from the last 30 days
on opening, after a journal entry or a practice comment, and every ten
minutes (`learnFromPending`). Premium and consent
(`preferences.memory_consent_at`) are checked on the server; otherwise it is
paused, and the chat (chat-v1.4) reads it only when alive. Deleting a source
deletes what rested only on it, except what the person wrote or corrected.
Check-ins are now reconciled by (practice, day) instead of replaced, so
their rows — which the memory points at — survive a save. «Descargar mis
datos» adds the memory and the routine proposals, read from the server
(`store/server-export.ts`), since they are not mirrored.

The journal (B-01) is built (16 Oct 2026): its own tab, typed entries in
`journal_entries`, each scanned for crisis and kept either way with
`crisis_flagged` so the memory never reads it; deleting leaves only a
`journal_entry_deleted` row in `system_audit_log`. Voice (premium) is
built (16 Oct 2026) with the browser's own dictation (Web Speech API, no
provider, no audio kept by Natus — Chrome sends it to Google, Safari to
Apple), premium only: the insert policy lets only premium write `voz`, and
editing keeps whatever source an entry has. The guide's notice is shown by plan: premium with consent is told
Davraz reads it, free is told premium would, and premium without consent
only that it is theirs and deletable. Friends and the
comparison between them (C-01, C-02) are built, and so is the routine
(R-01): written after the therapies, by its own function, each practice
saying what it converses with and keeping its origin in `routine_practices`.
Marking a practice asks how useful it was, 1 to 5, with an optional comment
(R-03), stored on `recommendation_checkins`; the memory and the review read it.
The routine is reviewed (R-04, built 16 Oct 2026): premium every week and
earlier when a practice is rated 2 or less twice or a daily or weekly one
goes two weeks undone, or when the memory keeps something new in «Lo que no
te funciona» or «Lo que estás viviendo» (`memory_shift`, the definition the
owner delegated, 16 Oct 2026); free every two months. The `routine-review` function
(routine-review-v1.0) decides from the rows whether a review is due — the
rule is `src/lib/routine-review.ts` — and writes a proposal to
`routine_change_proposals` (or `no_change`, which restarts the week); the
Rutina screen asks on opening and shows it with «Aceptar el cambio» and
«Mantener mi rutina». Accepting deactivates what leaves (its check-ins stay)
and adds what enters. The review may bring back a therapy dismissed over a
week ago (R-05). The kicker «Un ajuste para tu rutina» and the labels
«Sale», «Entra», «Vuelve a tus caminos» are not in the guide.
«No me hace sentido» (R-05, built 16 Oct 2026) takes the therapy off the
paths for 7 days — out of the cards, the constellation and the count —
with «Quitamos {nombre} de tus caminos.» and «Deshacer».
A therapy card shows a one-or-two-sentence summary and opens, on touch, the
full why — citing what the person told, a placement of their chart and one
of their numbers when there are — and what happens in a session (R-02,
match-v1.5). The browser sends the symbols; matches made before keep their
reasoning on the card.
The chart is read the Hellenistic way (A-02) by the Soul Map (soul-map-v2.6)
and the comparison (comparison-v2.1): both receive the chart calculated by
`src/lib/natal-chart.ts`, never the provider's text. The comparison reads
both friends' rows in `natal_charts` and crosses them by sign between the
visible planets and the Ascendant — no ephemeris call, no orb; a friend with
no stored chart means no aspects. The model picks 3 to 8 and decides, for
each, whether it flows naturally or asks for more work (owner, 15 Oct 2026).
Davraz does not do work for the person (a thesis, a report, code) and turns
the conversation back to how they are living it (chat-v1.5, 16 Oct 2026).
The chat counter adds «Este mes tienes 1 pregunta nueva» for a returning
free person whose month brought one (`quota_parts` behind `my_quota`).
The chat can talk over a comparison with a friend (chat-v1.6, 16 Oct 2026):
«Conversar sobre esto con Davraz» under the result opens the chat with the
friendship id; the function reads the latest result itself, only while the
friendship is accepted and never for somebody clinically vulnerable, and
holds the answer to `lintChartJudgement`. The Soul Map is written again every
30 days with Sonnet (`store/monthly-map.ts`, on opening); a monthly rewrite
keeps the paths, the routine and the conversation (`onlyMonthlySince`), and
Carta shows «Actualizado el …» and the previous version. Texts approved by
the owner, 16 Oct 2026.
The birth data is editable in the profile (M-02, built 16 Oct 2026,
`/perfil/nacimiento`, the onboarding's own «¿Quién eres?» step): a change to
the birth fields recalculates the chart and numbers and writes the Soul Map
again with Opus (`base_data_changed`); Caminos then chooses the therapies
again (`currentMatchFor` stops matching across such a rewrite, the
reactions carry over) and the routine follows, because the why of each
therapy cites the chart (owner, 16 Oct 2026). Until Caminos runs, Rutina
shows its empty state rather than the old routine.
Sign-in for the launch is Google only (owner, 16 Oct 2026); the email link
and Apple come later. Saving the map links Google to the anonymous row
(`linkGoogle`, which needs manual linking on in the project's Auth settings)
and `completeLinkedSignup` creates the account on the way back; the landing
offers «Ya tengo cuenta: entrar con Google» for another device. Both appear
only once the project has Google switched on (`googleSignInEnabled` reads
the published Auth settings); until then the email form stays. The texts «Guardar con Google», «Ya tengo cuenta: entrar con
Google» and the note under the button are proposals. The
plan, its order and the questions still open for the owner are in his doc
«Guía de actualización de la app Natus»
(https://claude.ai/artifact/9rw3grB3r7FQ6FVmnWfbbw); the requirements as agreed,
with what was deliberately left for later (admin panel and funnels, the
therapist side, the marketplace), in «Lo que acordamos para la app de Natus»
(https://claude.ai/artifact/HhbMJH5C46SUhKxZsz9fJ3). Read v1.2 before asking the
owner anything: a question it already answers costs his trust.

**The admin funnel records from 15 Oct 2026** in `funnel_events`: who, which
step, when, and nothing else — never content, never a step only a vulnerable
person reaches, never anything sent to an ad platform. The browser records
its own steps through `track_step`; rows that prove a step record it by
trigger; nobody reads the table through the API. The steps about money
(`trial_started`, `first_charge`, `canceled`) are the server's: while premium
is activated by hand, record them with `select public.record_step('<user
id>', 'first_charge')` in the same session that writes the subscription.
Campaign links carry `utm_source` and `utm_campaign`; the first one a browser
arrives with travels on `onboarding_started`.

**The admin panel comes after launch (owner, 15 Oct 2026),** on its own link —
`admin.natus.world`, never inside the user app — with its own sign-in for the
team's addresses and the three levels agreed: aggregate metrics for everyone,
an operational record per person without content, and sensitive content
only with restricted access and a log of who looked. First piece: the funnel
already being recorded in `funnel_events`. Until then, numbers are pulled on
request with SQL.

**Beta notice and feedback (owner, 15 Oct 2026), for later:** while in beta,
a message saying the app is being tested and a place to leave suggestions,
changes and annoyances. Being designed in the branding conversation. When
built: the feedback is free text, so it goes through the crisis detector,
never into a model payload or the funnel, and is readable only by the team.
The suggestions and complaints arrive in the admins' panel (owner, 15 Oct
2026): its own section there, beside each person's operational record —
not rows in `funnel_events`.

What is left outside the code, in rough order of weight:

- Chile's *4141 (Minsal's suicide prevention line, free, 24 h) was added
  first among Chile's lines on 16 Oct 2026, accepted by the owner from
  minsal.cl. The other sixteen crisis numbers carry `2026-08-19`, which records the product
  owner accepting them as transcribed from the PDR — not a call placed to each
  line. The PDR calls telephone verification an absolute launch blocker; the
  owner decided on 16 Oct 2026 to launch without the calls, with the numbers
  shown and dialled on touch. The calls are still the way to verify them.
- Nine of the seventeen — *4141, 1515, 131, 911, 192, 106, 135, 113, 123 — are short
  codes and cannot be dialled from abroad. Nothing in the data records that, so
  somebody living abroad who selected their home country is shown a number they
  cannot ring. The international fallback on the same screen is all that covers
  it today.
- **The help lines follow the country the phone is in (owner, 16 Oct 2026,
  built).** `countryFromTimeZone` (lib/crisis-resources.ts) reads the
  phone's IANA zone — no permission, no network — for the five countries and
  zones no other country shares; `linesCountry` (components/help-country.ts)
  is what every list of lines goes through, and falls back to «País donde
  vives», which Perfil can change. Away from home the help sheet says «Tu
  teléfono está en {país}: te mostramos sus líneas.» (proposal). A phone in a
  country outside the five still shows the home lines, short codes included.
- **Anybody may be born or live in any country (owner, 16 Oct 2026, built).**
  `components/countries.ts` lists every ISO 3166 country with the browser's
  own Spanish names; the birth step and «País donde vives» offer them all —
  the five with help lines first — and Perfil picks the rest from one list.
  «Otro país» (`XX`) stays only for who chose it before. A country without
  lines of its own shows the international directory and the emergency
  instruction. Open: Anthropic does not serve people physically in Venezuela
  or Cuba (its supported-regions policy), and nothing blocks the model
  surfaces there yet — the owner has not answered whether to.
- The door is open: `REQUIRE_INVITE=false`, so anybody with the link is in.
  Closing it needs a Google Cloud OAuth client first — the code is built and
  waiting, the console work is not done. Access control on GitHub Pages is an
  Enterprise feature, so the site itself cannot be restricted; the gate is the
  sign-in. Google rather than magic links because Supabase's built-in mail
  refuses anyone outside the project team, at two messages an hour.
- The free-tier pause question is still open.
- The type scale has 24 sizes across 9 roles, and several roles carry more
  than one: `title` has four, `heading` seven for nine uses. Named at their
  values so the drift is countable, and deliberately not collapsed — that is
  a design decision, and a designer is reviewing it. Line-height is the same
  story one axis over: `--fs-body-13` alone ships with four.
- `supabase/functions/_shared` is 3,933 lines copied from `src/lib` and
  `src/ai/prompts` by `pnpm sync:shared`, with a parity test to catch drift.
  It works. It is still duplication held together by tooling, and the fix is
  a pnpm workspace package — the shape `waterplan-frontend` already uses.
- **A protocol for a panic or anxiety attack — the owner calls it of the
  highest importance (15 Oct 2026); to be designed over the long term (16 Oct
  2026).** Nothing built yet. Today
  the detector has a `panico` category in `crisis-keywords.json` and routes it
  like any other crisis; there is no dedicated in-the-moment response.
- A chart without the hour is calculated at noon, so for somebody born on a
  day the Moon changed sign, the Moon's sign may be wrong. The fix is a
  second call (00:00 and 23:59) to tell whether it changed; left for later.
- `crisis-keywords.json` is `"status": "preliminary"` and wants a clinician.
  For that review, the owner's rule since 15 Oct 2026 is better too many
  alerts than too few (v3): a negation never silences a direct term ("no
  quiero morirme" fires, and so does "no quiero morirme sin conocer
  Japón"), and silences an indirect marker only when it is the word right
  before it; "ojalá" is not a negation; chat spellings ("kiero", "q") and
  one typo per word are read through, never across a person ending
  ("matarse" is not "matarme"). Fourteen phrasings that slipped through
  were added. Known false alarms the clinician should weigh: "me pega el
  sol", "no puedo respirar bien con la mascarilla", "no cortarme las uñas".
- The privacy policy and the terms are at `/privacidad` and `/terminos`
  (`screens/Legal.tsx`, texts in `copy.legal`), readable at the door. Written
  on 16 Oct 2026 to launch, from what the code does; the owner's lawyer
  reviews them. The contact address is hola@natus.world (owner, 16 Oct 2026).

**What each plan gets (F-01) is built (15 Oct 2026)** and lives in
`plan_quotas`, edited there without a deploy: free has 3 chat questions as a
gift + 1 a month, 1 meditation in all and 2 comparisons a month; premium has
unlimited chat, 10 meditations a month and unlimited comparisons. The first
month a free person therefore has 4 questions. "Unlimited" is bounded by
`plan_caps`: US$4 of model use per premium person per calendar month (UTC),
priced with `src/lib/budget.ts` (`PREMIUM_MONTHLY_CAP_USD` is the seed, and
`budget.test.ts` prices the worst month with it — change both). Usage is
counted from `claude_api_calls`: only answers that worked, plus those in
flight; `quota_remaining` does the arithmetic, `my_quota` shows the person
theirs, and the reservations check it under their lock. A used quota is a
402 and shows the paywall to free; premium's cap is a 429 with `scope: cap`
and the day it renews. Premium is read from `subscriptions`, which only the
server writes. Payment is PayPal, US$10 a month with the first month free,
shown in dollars because that is what PayPal charges (owner, 15 Oct 2026),
VAT included (owner, 16 Oct 2026). The v1.2 documents in the project say
US$7 (F-02, P-04); the owner confirmed on 16 Oct 2026 that US$10 stands.
Premium is activated by PayPal's notifications, not by hand: the
`paypal-webhook` function (no JWT; PayPal's signature is verified with
PayPal before anything is written) reads the Natus id the button stamps as
`custom_id`, records each event once in `payment_events` (who and what,
never name, email or amount) and keeps `subscriptions` in step. A
cancellation keeps premium until what was paid runs out (`ends_at`); a
suspension or expiry ends it at once. It needs three secrets the owner sets:
`PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `PAYPAL_WEBHOOK_ID`; until then
it answers 503 and PayPal retries. The secrets were set on 15 Oct 2026
and checked (an unsigned call is refused by PayPal, so the credentials
work); a real event has not been seen yet. **PayPal asks for a PayPal
account even to pay a subscription by card** (the owner tried it, 15 Oct
2026) — a large barrier. The payment provider is the owner's to settle
and is off the build list (owner, 16 Oct 2026): if it changes, the premium
logic stays and only the notifier changes.

**Where Premium is offered — decided 15 Oct 2026, mostly not built.** Built
(16 Oct 2026): the crisis rule — `my_quota` returns `offer_premium: false`
for seven days after an alert the person did not mark as not their case, and
the paywall then says what is used up without the offer. Three
levels, never pressure: (1) always at hand — «Tu plan» in the profile (what
each plan includes, the free month, and for premium the next charge and
«Cancelar» in the same place: Chile's Ley 21.398) and a «Ver Premium» link
beside each quota counter; (2) once each, in the moment — under the chat
counter when one question is left, after the gift meditation has played,
after a comparison; «Ahora no» means it does not come back; (3) full screen
only twice — after the Soul Map at the end of onboarding, and when a free
quota runs out. Not in Carta, Caminos, Rutina or Bitácora; no notification
or email to sell. After a crisis alert (chat, journal or the clinical
answers) no invitation and no «Ver Premium» for that session and the 7 days
after, decided by the server. The premium screen says what is kept («Tu
mapa, tus caminos y tu rutina siguen siendo tuyos»), what is added (only
what works), a day-by-day calendar of the free month, and two buttons of
equal weight. A reminder before the first charge is owed (Mexico's 2025
reform requires five days); until there is an email service it is sent by
hand. Record in the funnel which place each free month started from. The
«¿No te alcanza?» free-premium request is out for now. Visuals come from
the branding conversation.

**The launch (owner, 16 Oct 2026): today, with Google sign-in only and without
notifications** (N-01 goes last). Google is switched on in production
(16 Oct 2026, 09:47): consent screen published, web client created, the
provider on in Supabase, Site URL and redirect set, manual linking on. The
owner walked a new map through Google on the deployed site (16 Oct 2026,
12:04): the account, the map, the chart and the funnel steps all landed on
one non-anonymous row. Not yet walked, on hold by the owner: signing in on a
second device, and a real PayPal subscription. Also owed: the project is on
Supabase's free plan (pauses after a week idle, low limits) — Pro before
paying users; and a total spend limit in Anthropic's console.

**Google before the map is seen (owner, 16 Oct 2026, built).** Once the
project has Google on, a map made from then on is saved before it is shown:
the onboarding ends on `/registro` with «Tu mapa está listo» and «Continuar
con Google», no «Ahora no», and every other route sends there until the
account exists (`store/account-required.ts`; the policies stay readable).
Back from Google, the account is created and the map opens. Somebody who
started without an account before keeps «Guardar mi mapa» as an offer. When
the Google account already has its own space, «Entrar con esa cuenta»
signs into it and the new map stays behind on the anonymous row (that text
and the message above it are proposals). Anonymous rows are still created at
the first page load and nothing purges them.

**The birth place is picked, not guessed (owner, 16 Oct 2026).** The birth
step asks the country of birth first, then the city with suggestions inside
that country (Open-Meteo, from the browser; `components/onboarding/
BirthPlaceField.tsx`, ranking and aliases in `lib/places.ts`). The pick —
name, region, coordinates, IANA timezone — is stored in `birth_place` on
`clients` and `anonymous_sessions` and sent to `natal-chart`, which casts the
chart for it. A city typed and not picked blocks «Continuar». A draft from
before has no `birth_place`: the function then looks the typed name up and
takes only a place whose name carries it (`bestPlace`), so no chart rather
than a wrong one. Before this, the first geocoder hit was used blind: «León»
(MX) became a village in Baja California, «CABA» a hamlet in Tucumán,
«Santiago» (EC) Gualaquiza; «CDMX», «DF» and «Capital Federal» found
nothing; and a missing birth country meant no chart. Charts already cast
from a wrong place have not been recalculated — the owner's call. Carta
now says when the chart was asked for and could not be calculated, with a
link to the birth data. The texts of the field and of that notice are
proposals; the privacy policy names Open-Meteo.

**Davraz reads the whole person (chat-v1.7, owner, 16 Oct 2026).** The chat
function reads, as the person (`_shared/person.ts`): the chart stored in
`natal_charts`, described with the Hellenistic and propositive rules; the
numbers, computed there from the birth name and date; where and when they
were born; what they told at the start; and their active routine. Never the
clinical answers. It recommends stones, aromas, colours, plants and other
spiritual practices (rituals, the Moon, tarot as reflection) from a fixed
table of correspondences by sign and element (`prompts/spiritual.ts`: Sun,
Moon, Ascendant and the scarce elements) — as tradition and support for a
practice, never cure or protection, nothing ingested, no psychoactives,
nothing to buy. The table is the commonest Western one and waits for the
owner's review. Before, the chat saw only the Soul Map's summary and said
crystals were not part of the map. `lintChartJudgement` still holds only the
answers about a comparison.

**The branding package is the look (owner, 16 Oct 2026, built).** Every
screen is rebuilt from Nico's package (`natus-para-la-ia`: `html/NN-*/index.html`
with its CSS, `notas/`, PNGs): `src/design/pieces.css` carries the package's
own pieces (`.k .t .vid .fila .p2 .tile .scroll`, measured in `--u`, 1px at
390, and `--d` on desktop) scoped under `.pz`, and each screen has its file in
`src/design/screens/`. `Screen` takes a bank photo (`BANK`, `public/img/banco`)
with its family tone, an even veil and the glass alpha; the frame is the whole
viewport at every width (no phone drawn on desktop): a floating tab bar below
1024px, the rail above. Screens opened from another show «Volver»
(`subScreenOf`). Decided against the package: US$ 10; no today's sky, Davraz
tip, notifications or e-mail export until built; Google only; the app's order
of onboarding (account after the map); the Care button lights when the three
questions are answered (the package's rule, owner). Right after the
revelation (option B) Premium is offered once with the free month day by day
(`Paywall feature="welcome"`, funnel detail `welcome`), never to premium nor
after a crisis alert. The crisis screen always has «Volver» (owner). Carta
completa (05) is `screens/FullChart.tsx`, with Davraz's reading of each point
from the server (below). Open with the owner: the why of a therapy in three parts needs a
prompt change; texts the package marks «propuesta» were applied unless they
broke a rule.

**«La lectura de Davraz» in the full chart (owner, 16 Oct 2026, built).** One
or two sentences per point of the chart — every point `buildNatalChart`
returns but the Descendant and the Imum Coeli; without the hour, no houses
and no axes — read with the Hellenistic and propositive rules of
`prompts/chart-reading.ts` (chart-points-v1.0, Sonnet). The `chart-points`
function takes nothing from the browser: it reads the person's row in
`natal_charts` under RLS, refuses `no_chart`, and refuses `current` while the
row in `chart_point_readings` was written for that chart's `calculated_at` —
once per chart, not a plan feature, but under the same reservation, ceiling
(`chart_points`, 10 a month) and budget as the rest. The answer must read
exactly the points asked for, one or two sentences each, nothing rated
(`lib/chart-points.ts`); that check runs inside the model call through
`serveModel`'s `lint` hook, so it is retried once with the reason, like the
copy lint. A birth-data change gives the chart a new `calculated_at`, the
readings go stale and `store/chart-readings.ts` asks again (kept in the
browser as `chart_readings`, hidden as soon as the draft's chart changes);
a rebuild that changes nothing now keeps `calculated_at`, so a new device does
not pay for new readings. The demo reads `ai/fixtures/chart-points.ts`. The
readings are in «Descargar mis datos» and go with the account.

**Adults only, the home country chosen, a second try (owner, 16 Oct 2026).**
The birth step refuses a date that is not 18 years past (`lib/age.ts`), so
also any date to come, with «Natus es para personas mayores de 18 años»
(proposed). «País donde vives» starts empty and must be chosen: it decides
the help lines. Accounts and sessions made before by people under 18 were
to be deleted later, with three anonymous test users made on 16 Oct 2026
(owner: all tests): 136f25bc-0f04-48ca-bb45-e970bb34e7e1,
14945aac-dee1-47a6-92ef-4928b5fbf632, d15715b0-4cc1-4243-9a67-b52ecec8e883,
175c72c4-dfcb-46f8-9576-ac766300d2a1, d446a420-6ec3-409f-92a7-ef529180faa0.
A delete through the Supabase connector needs the owner's approval in the
moment; it was cancelled twice. A copy violation is retried once,
telling the model the rule it broke (closes the open question about
retries); the `command` rule lets a negation through («no tienes que hacerlo
perfecto»), which had failed a person's Caminos and gift meditation.
Numerology joins the correspondences (chat-v1.8): the life path's ruling
planet, stones and colours.

**An open question with the data now being collected for it:** whether the
prompt cache is worth its 25% write surcharge on the once-per-account surfaces
(`cache_read_tokens` answers it).

**The prompts in the repo are the official ones** (S-06, decided 14 Oct 2026;
the vault versions are reference only). Every change bumps the version in
`src/ai/prompts/versions.ts` and adds a line to `PROMPT_HISTORY` there;
`versions.test.ts` fails when a prompt's text changes under the same version,
and prints the fingerprint to record in `prompt-fingerprints.json`. Do not
edit prompt text without a decided item behind it — the design is somebody's
work.

Keep this section current. It is now the only handover there is: when one of
the items above closes, delete it, and when something new is left open, write
it down here.

## Architecture

An SPA on GitHub Pages, a Supabase project behind it. No secret is ever in the
bundle: the publishable key is a public identifier and is safe only because
RLS is on for every table.

```
src/lib/     Deterministic core. NO React, NO localStorage, NO browser API,
             NO `@/` imports, and relative imports carry their extension.
             numerology · safety · matching · copy-lint · schemas · ssml
             · model-input · model-json
             Copied verbatim into supabase/functions/_shared/lib by
             `pnpm sync:shared`. `shared-parity.test.ts` fails if the two
             ever differ — run the sync after touching anything in here.

src/store/   Postgres behind a synchronous in-memory mirror, hydrated once at
             session start. localStorage is the last-known-good fallback.
             Call sites stayed synchronous by design.

src/ai/      One runAi with two paths: an Edge Function when the backend is
             configured and the person is signed in, curated fixtures
             otherwise. Both parse the same zod schema and pass the same copy
             lint. Prompts also cross into _shared, under the same parity test.

src/screens/ Route-level components. Wrapped per route by `ErrorBoundary`,
             which consults the crisis store before deciding what a failed
             screen shows.

src/design/  The visual source of truth, and the only place a surface may be
             written. tokens.css holds palette, glass, geometry and a type
             scale of 36 tokens over 9 roles; primitives.css holds the nine
             named parts every screen composes from; Screen.tsx holds the
             backdrop, the scrim and the photo opacity.
             Named by role and value — four `title-*` and four `surface-p*`
             exist because four of each ship, not because four were designed.
             `architecture.test.ts` fails on a font size written as a literal,
             and on any screen that writes its own glass.
src/styles/  Wiring, not design: the Tailwind import, the `@theme` mapping,
             the base layer, and the contrast test.
data/        Seed JSON: modalities, topics, crisis resources, bed tracks.

supabase/functions/
             soul-map · match · routine · routine-review · chat · meditation
             · comparison · memory · chart-points · natal-chart
             · paypal-webhook
             One directory, URL and worker each. Four share the sequence in
             _shared/serve-model.ts; chat has a quota to consult mid-flow.
```

**The module graph is only real when something serves it.** `tsc` does not see
the Edge runtime's resolution, and a missing file extension once took every
function down with nothing in the suite noticing. Before trusting a change to
`_shared`, run it:

```
supabase start && supabase functions serve
pnpm verify:chat && pnpm verify:models
```

## Validation

```
pnpm typecheck      tsc --noEmit
pnpm test           vitest, about 1,030 tests
pnpm test:db        pgTAP policies + the adapters and functions against a
                    real Postgres; needs `supabase start`
pnpm build          production build
pnpm dev            development server
pnpm sync:shared    re-copy src/lib and src/ai/prompts into _shared
```

On every event the `verify` job runs typecheck, tests, build and `deno check`
on the Edge Functions. On a push to `main`, the `functions` job waits on it and
applies migrations, then deploys functions; the site job waits on that. Nothing
deploys from a commit whose tests fail, and a missing `SUPABASE_ACCESS_TOKEN`
fails the run instead of skipping the backend. A migration that fails stops
the functions and the site behind it — the order matters, because a function
deployed ahead of a column it writes can fail silently. `pnpm deploy:functions` pushes
functions without a commit, which is what to use while iterating on one; it
does not apply migrations, so push those first with `supabase db push`.

All three must pass before a commit. CI runs the same and deploys on push to
`main`.

Run `pnpm test:db` after touching `src/store/remote.ts`, a migration or a
function. The store's adapters passed every unit test while three of them
failed against Postgres — a policy or a constraint is only tested by the
database that enforces it.

Verify UI work in a browser, not by reasoning about it. Every defect found
during the build — a stopped wizard, an overlapping constellation, a stale
match — was invisible to the type checker and the test suite.

## The rules that run

`src/architecture.test.ts` executes what this file used to only assert. Layer
direction, `src/lib` importing nothing outside itself and touching no browser
global, file extensions on its relative imports, and no font size or heading
line-height written as a literal.

They exist because the alternative is visible next door.
`waterplan-frontend` is fifty times this size, has a design-system package, a
token library and a Storybook, and writes `font-size:` with a number in it in
five hundred and fifty-three places — nothing there fails when it does. Its
colour tokens, in the same folder, are used in five hundred and sixty-one
files. A hex code is hard to invent from memory and `13px` is not.

Every rule was proven to fail before being trusted. If you add one, break it
on purpose first; a guard nobody has seen fail is a guard nobody has checked.

## Non-negotiables

These are product decisions, not preferences. Each one was argued and settled;
the argument is no longer written down, which is a reason to ask rather than a
licence to reverse.

- **No streaks, badges, or manipulative notifications.** Notifications exist
  (v1.2 G-06, N-01): reflection phrases, practices the person chose, an
  invitation to the journal, the daily tip — configured and switchable by the
  person. What is banned is the pattern: streaks, badges, guilt, loss, false
  urgency, "te extrañamos". `store/matches.ts` computes a total, never a
  consecutive run. The number a streak needs is not calculated anywhere.
- **No match percentages, ever.** The ranking orders; it does not score.
- **Nothing is rated good, bad or so-so (owner, 15 Oct 2026).** Not a
  planet, an aspect, a number, a day, nor what happens between two people:
  no grades, faces or traffic lights — the thing Co-Star does in its
  comparisons, which Natus does not. What flows is said as what flows
  naturally; what is hard, as what asks for more work, always with how it
  can be worked. It is a mirror: it gives back what is there for the person
  to look at and decide. Same rule for one chart and for two. It lives in
  the prompts that read a chart (`prompts/chart-reading.ts`: the Soul Map,
  the comparison, later the full chart and today's sky), not in Davraz's
  general voice — the owner chose not to touch the other answers — and
  `lintChartJudgement` refuses "maléfico", "favorable" and their kin there.
- **No facilitator names.** The MVP recommends modalities, not people.
- **Revoking access hides the reading; it does not delete it.** Confirmed by
  the product owner on 2026-09-25, and kept by v1.2 C-01: comparisons are
  between friends inside Natus (built 15 Oct 2026), read by both while the
  friendship is accepted. Ending it makes every comparison between them
  unreadable on the next request; the rows stay in `chart_comparisons` until
  an account is deleted. Only the comparison function writes one, from both
  people's stored birth data — the browser sends a friendship id and nothing
  else. Invitations are links, never a search by email.
- **Safety runs in front of the model, deterministically.** Clinical
  exclusions are a predicate, not a prompt instruction — applied in the
  browser for the screen and again on the server by
  `supabase/functions/_shared/clinical.ts` — for the match and for every chat
  turn — from the person's stored answers, failing closed. The server's is
  the one that counts.
- **Raw `clinical_basics` never enters a model payload.** A derived risk level
  instead.
- **The copy lint governs fixtures as well as model output.** A hand-written
  fixture breaking a copy rule must fail a test.

## Dependencies

Exact pins only, no floating ranges. Every version is checked against a 7-day
release-age gate before installing — including GitHub Actions, which are
pinned to exact release tags. `vite` and `@types/node` are deliberately one
version behind for this reason.

## Language

Product copy is neutral Spanish, addressed with tú, no voseo and no country idioms (G-01). It lives in `src/i18n/es.ts`, never inside a component, and the copy lint fails on voseo.
Everything else — code, comments, commits, docs, this file — is English.

## Deploying

Automatic on push to `main`. `VITE_BASE` is set in the workflow, so attaching
a custom domain or moving the repository to a new owner needs no source
change. See the deployment configuration table in `README.md`.

A nested route returns HTTP 404 with the application as its body. That is the
GitHub Pages SPA fallback working correctly, not a bug — the browser renders
it and the router takes over.
