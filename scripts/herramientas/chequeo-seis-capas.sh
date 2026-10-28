#!/bin/sh
# The full local check before anything goes to main: what CI runs (1-3) and what it never runs (4-6).
# Needs the local stack up (skill natus-entorno-local): Docker, `supabase start`, the edge runtime
# relaunched with run-edge.py, and Deno 2.1.4.
#   sh scripts/herramientas/chequeo-seis-capas.sh
# EDGE (default /tmp/claude-0/edge) holds inspect.json and main-index.ts; DENO is the deno binary.
REPO=$(cd "$(dirname "$0")/../.." && pwd)
EDGE=${EDGE:-/tmp/claude-0/edge}
DENO=${DENO:-/tmp/claude-0/deno/deno}
LOGS=${LOGS:-/tmp/natus-chequeo}
mkdir -p "$LOGS"
cd "$REPO" || exit 1
fail=0
step() { printf '\n== %s\n' "$1"; }
step "1 typecheck"
pnpm typecheck >"$LOGS/1.log" 2>&1 && echo ok || { tail -20 "$LOGS/1.log"; fail=1; }
step "2 test"
pnpm test >"$LOGS/2.log" 2>&1 && grep -E "Test Files|Tests " "$LOGS/2.log" || { grep -E "FAIL|Test Files|Tests " "$LOGS/2.log" | tail -20; fail=1; }
step "3 build"
pnpm build >"$LOGS/3.log" 2>&1 && echo ok || { tail -20 "$LOGS/3.log"; fail=1; }
step "4 deno check (Edge Functions)"
( cd supabase/functions && DENO_CERT=/root/.ccr/ca-bundle.crt DENO_DIR="${DENO_DIR:-/tmp/claude-0/deno/cache}" "$DENO" check --no-lock --config deno.json */index.ts >"$LOGS/4.log" 2>&1 ) && echo ok || { grep -v "Download" "$LOGS/4.log" | tail -20; fail=1; }
rm -f supabase/functions/deno.lock
step "5 database: migrations from zero + pgTAP + integration"
supabase db reset >"$LOGS/5.log" 2>&1 || { tail -20 "$LOGS/5.log"; fail=1; }
python3 -I "$(dirname "$0")/run-edge.py" "$EDGE/inspect.json" >/dev/null 2>&1; sleep 8
sh "$(dirname "$0")/test-db-local.sh" >"$LOGS/5b.log" 2>&1 && grep -E "Result|Tests " "$LOGS/5b.log" || { grep -E "Result|Tests |FAIL|not ok" "$LOGS/5b.log" | tail -20; fail=1; }
step "6 functions against the local stack"
ANON=$(supabase status -o json 2>/dev/null | python3 -I -c "import json,sys;print(json.load(sys.stdin)['ANON_KEY'])")
SUPABASE_SERVICE_ROLE_KEY=$(supabase status -o json 2>/dev/null | python3 -I -c "import json,sys;print(json.load(sys.stdin)['SERVICE_ROLE_KEY'])")
export SUPABASE_SERVICE_ROLE_KEY
# a temporary .env.local, removed below: a leftover one turns on the invite gate and breaks demo screenshots
printf 'VITE_SUPABASE_URL=http://127.0.0.1:54321\nVITE_SUPABASE_ANON_KEY=%s\n' "$ANON" > .env.local
pnpm verify:chat >"$LOGS/6a.log" 2>&1 && grep -E "passed" "$LOGS/6a.log" || { tail -15 "$LOGS/6a.log"; fail=1; }
pnpm verify:models >"$LOGS/6b.log" 2>&1 && grep -E "passed" "$LOGS/6b.log" || { tail -15 "$LOGS/6b.log"; fail=1; }
rm -f .env.local
step "7 revisor: every screen, three sizes"
CHROMIUM=${CHROMIUM:-/opt/pw-browsers/chromium-1194/chrome-linux/chrome} PUERTO=4179 SALIDA="$LOGS/revisor" sh scripts/revisor/revisar.sh >"$LOGS/7.log" 2>&1 && head -1 "$LOGS/7.log" || { tail -25 "$LOGS/7.log"; fail=1; }
step "git status (nothing unexpected)"
git status --short
[ $fail = 0 ] && echo "\nTODO OK" || echo "\nFALLÓ ALGO (logs en $LOGS)"
exit $fail
