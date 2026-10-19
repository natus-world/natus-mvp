# Herramientas de trabajo

Estas herramientas sirven para hacer maquetas, sacar capturas y probar la app (y la entrada de la web) antes de mostrarle algo a Nico.

Vivían en la carpeta temporal de una sesión. Se guardaron aquí el 19 oct 2026 para que no se pierdan.

**Requisitos:**
- Node 22, Python 3 con Pillow y ffmpeg.
- `playwright-core` y Chromium. En la nube ya están: `/opt/node-tools/...` y `/opt/pw-browsers/...`. En otro lugar, se cambian con `PW_CORE` y `CHROMIUM`.
- Las capturas quedan en `SALIDA` (por defecto `/tmp/natus-capturas`).

Todos los comandos se corren desde la raíz del repo `natus-mvp`.

## Capturas y maquetas de la app

Primero se levanta la app en modo demo, **sin `.env.local`**:
```
VITE_DEMO_MODE=true pnpm dev --port 5173
```

| Archivo | Para qué sirve | Cómo se usa |
|---|---|---|
| `capturas.mjs` | Saca una captura de una pantalla en celular (390 × 844, al doble) y en computador (1440 × 900), con una persona de ejemplo cargada. Avisa si hay scroll de lado. | `SEED=scripts/herramientas/semillas/con-hora.json ROUTE=/hoy node scripts/herramientas/capturas.mjs hoy`. Pasos opcionales: `'[["click","…"],["scroll",300],["wait",500]]'`. |
| `semillas/con-hora.json`, `semillas/sin-hora.json` | Una persona **inventada** («Francisca Rojas»), con y sin hora de nacimiento: su mapa, sus caminos y su rutina hechos en modo demo. | Se pasan a `capturas.mjs` con `SEED=…`. Para ver la versión premium, agrega a la semilla `"natus:demo_tier": "premium"`. |
| `crear-semilla.mjs` | Recorre el onboarding con esa persona inventada (quién eres, lo que te preguntas, cómo trabajar, mapa, para cuidarte, caminos y rutina) y guarda una semilla nueva. El buscador de ciudad responde «Santiago» sin internet. | `node scripts/herramientas/crear-semilla.mjs /tmp/semilla.json` o `… /tmp/semilla.json sin-hora`. Úsala cuando la app cambie y las semillas queden viejas. |
| `comparar-con-paquete.py` | Pone la pantalla aprobada del paquete de branding al lado de nuestra captura. En celular van lado a lado; en computador, una arriba de la otra. | `python3 -I scripts/herramientas/comparar-con-paquete.py <paquete>/pantallas/03-hoy-celular-01-1-free.png /tmp/natus-capturas/hoy-tel.png /tmp/cmp.png`. Después **se mira**. |
| `tira.py` | Una hoja de contactos: cuadros de un video cada N segundos, o varias PNG en una grilla con su nombre. Sirve para revisar un movimiento sin ver el video entero. | `python3 -I scripts/herramientas/tira.py video.mp4 /tmp/tira.png 0.5` o `… a.png b.png c.png /tmp/tira.png` |
| `captura-produccion.mjs` | Captura de una página en vivo (por defecto app.natus.world) en las dos medidas, y muestra los errores de la página. | `node scripts/herramientas/captura-produccion.mjs https://app.natus.world/hoy hoy-vivo` |
| `_navegador.mjs` | Lo comparten las demás: dónde está Chromium, las dos medidas y la carpeta de salida. | No se corre solo. |

**El paquete de branding no está en este repo.** Son los dos zip de Nico: `natus-para-la-ia.zip` y `natus-pantallas-png.zip`. Hay que pedírselos.

## Entrada de la web (natus.world)

Primero se sirve la build de `natus-soul-path`:
```
npx vite build && npx vite preview --host 127.0.0.1 --port 4177
```
Ver la skill `natus-lovable` para instalar sus dependencias.

| Archivo | Para qué sirve | Cómo se usa |
|---|---|---|
| `web-entrada.mjs` | Recorre la entrada en computador: la puerta, la pregunta, «Con música», «Nadie nace perdido». Saca capturas o graba un video para mostrarle a Nico. | `MEDIOS=<carpeta> node scripts/herramientas/web-entrada.mjs capturas` o `… video`. `MEDIOS` tiene `apertura.webm` y `ojo.webm`; adentro del archivo explica cómo hacerlos. |
| `web-celular.mjs` | La entrada en celular (390 × 844, táctil): «Entrar» y la primera frase. Avisa si hay scroll de lado. | `node scripts/herramientas/web-celular.mjs` o `… /usuarios` |

Para pasar un video a mp4 y mandárselo a Nico:
```
ffmpeg -ss 0.5 -i grabacion.webm -c:v libx264 -pix_fmt yuv420p -movflags +faststart video.mp4
```
El `-ss 0.5` recorta el primer medio segundo, que sale en blanco.

## Probar todo antes de subir a `main`

Primero se levanta el entorno local con la skill `natus-entorno-local`: Docker, `supabase start`, el edge runtime y Deno.

| Archivo | Para qué sirve | Cómo se usa |
|---|---|---|
| `chequeo-seis-capas.sh` | El chequeo completo: typecheck, tests, build, `deno check` de las funciones, la base desde cero con pgTAP e integración, y las funciones contra el entorno local. Al final dice «TODO OK» o en qué falló. Borra el `.env.local` temporal que usa. | `sh scripts/herramientas/chequeo-seis-capas.sh`. Si los archivos del edge runtime o de Deno están en otro lugar, se cambian con `EDGE` y `DENO`. |
| `run-edge.py` | Vuelve a levantar el edge runtime con el límite de archivos que permite la nube y con el certificado del proxy. Sin esto, las funciones no corren en local. | `python3 -I scripts/herramientas/run-edge.py /tmp/claude-0/edge/inspect.json`. Una función nueva hay que agregarla al `FUNCTIONS_CONFIG` de `inspect.json`; si no, en local responde 404. |
| `test-db-local.sh` | Lo mismo que `pnpm test:db` (pgTAP e integración), pero sin reemplazar el edge runtime que ya está corriendo. | `sh scripts/herramientas/test-db-local.sh` |
| `sembrar-panel-local.sh` | Llena la base **local** con datos inventados para ver el panel de admin: un admin, dos personas (Camila y Diego), pasos del embudo, llamadas al modelo, sugerencias, una alerta de crisis, una conversación y una entrada de bitácora. La clave del admin se crea al azar y se muestra al final. **Nunca se usa contra producción.** | Después de `supabase db reset`: `sh scripts/herramientas/sembrar-panel-local.sh`. Luego, en `natus-admin`: `pnpm dev`, y se entra con `admin@natus.test`. |

Lo que estas herramientas no pueden probar: la respuesta real del modelo. En local no hay clave de Anthropic y las funciones paran en `no_model`.
