#!/bin/sh
# Arma la app en modo demo, la sirve y corre el revisor contra ella. Lo usan
# la publicación automática (verify) y el chequeo local completo.
#   sh scripts/revisor/revisar.sh
# PUERTO (por defecto 4173); CHROMIUM si hay un Chromium ya instalado.
REPO=$(cd "$(dirname "$0")/../.." && pwd)
cd "$REPO" || exit 1
PUERTO=${PUERTO:-4173}
VITE_DEMO_MODE=true pnpm exec vite build --outDir dist-revisor >/dev/null 2>&1 || { echo "No se pudo armar la app en modo demo"; exit 1; }
pnpm exec vite preview --outDir dist-revisor --port "$PUERTO" --strictPort --host 127.0.0.1 >/dev/null 2>&1 &
SERVIDOR=$!
for i in $(seq 1 30); do curl -sf "http://127.0.0.1:$PUERTO/" >/dev/null && break; sleep 1; done
APP="http://127.0.0.1:$PUERTO" node scripts/revisor/revisar.mjs
RESULTADO=$?
kill "$SERVIDOR" 2>/dev/null
exit $RESULTADO
