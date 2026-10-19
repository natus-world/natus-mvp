#!/bin/sh
# Same as `pnpm test:db`, but against the edge runtime already running (relaunched by run-edge.py):
# `pnpm test:db` spawns `supabase functions serve`, which replaces that container and fails in this sandbox.
set -e
cd "$(dirname "$0")/../.."
S=$(supabase status -o json 2>/dev/null)
j() { printf '%s' "$S" | python3 -I -c "import json,sys;print(json.load(sys.stdin)['$1'])"; }
supabase test db
SUPABASE_TEST_URL=$(j API_URL) SUPABASE_TEST_ANON_KEY=$(j ANON_KEY) SUPABASE_TEST_SERVICE_KEY=$(j SERVICE_ROLE_KEY) \
SUPABASE_TEST_DB_CONTAINER=supabase_db_natus-mvp pnpm exec vitest run src/store/remote.integration.test.ts
