// El revisor (owner, 27 Oct 2026): recorre cada pantalla de la app en modo
// demo, en tres tamaños y con varias personas de ejemplo, y falla si algo no
// se puede usar: un botón o campo al que no se llega, uno tapado por otra
// cosa, una página más ancha que la pantalla o un error en la consola.
//
// Nació del 27 oct: «Tus datos de nacimiento» no bajaba y «Guardar cambios»
// quedaba fuera de la pantalla, y nos enteramos por los reclamos.
//
// Uso: con la app servida en modo demo (VITE_DEMO_MODE=true) en APP,
//   node scripts/revisor/revisar.mjs
// Variables: APP (por defecto http://127.0.0.1:4173), CHROMIUM (un Chromium
// ya instalado, opcional), SOLO (una ruta, para probar una sola), SALIDA
// (carpeta del informe y las capturas de lo que falló).

import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright';

const APP = process.env.APP || 'http://127.0.0.1:4173';
const SALIDA = process.env.SALIDA || 'revisor-salida';
const SOLO = process.env.SOLO || null;
const aqui = new URL('.', import.meta.url);
const leer = (archivo) => JSON.parse(readFileSync(new URL(archivo, aqui), 'utf8'));

const TAMANOS = [
  ['celular-chico', { width: 360, height: 640 }, true],
  ['celular', { width: 390, height: 844 }, true],
  ['computador', { width: 1440, height: 800 }, false],
];

const conHora = leer('../herramientas/semillas/con-hora.json');
// La carta de Francisca (la persona de las semillas), para que Carta, la carta
// completa y «Pregúntale a tu carta» tengan qué mostrar.
const carta = leer('./carta-de-ejemplo.json');
const sinHora = leer('../herramientas/semillas/sin-hora.json');

/** La semilla con su sesión vigente: las guardadas caducan a los 7 días. */
function vigente(semilla, cambiosAlBorrador = {}) {
  const copia = { ...semilla };
  // Ya pasó por el adelanto del mapa: Carta muestra el mapa entero.
  delete copia['natus:revelation_pending'];
  const sesion = JSON.parse(copia['natus:anonymous_session']);
  const ahora = Date.now();
  sesion.created_at = ahora;
  sesion.expires_at = ahora + 6 * 24 * 3600 * 1000;
  sesion.draft = { ...sesion.draft, ...cambiosAlBorrador };
  copia['natus:anonymous_session'] = JSON.stringify(sesion);
  return copia;
}

const DE_LA_APP = [
  '/hoy', '/carta', '/carta/completa', '/caminos', '/recorrido', '/bitacora', '/bitacora/nueva',
  '/chat', '/meditaciones', '/biblioteca', '/comparacion', '/perfil', '/perfil/nacimiento', '/cuidarte',
];

const PERSONAS = [
  { nombre: 'recien-llega', semilla: {}, rutas: ['/', '/onboarding', '/volver', '/privacidad', '/terminos', '/no-existe'] },
  { nombre: 'con-hora', semilla: vigente(conHora, { natal_chart: carta }), rutas: DE_LA_APP },
  { nombre: 'sin-hora', semilla: vigente(sinHora, { natal_chart: carta }), rutas: ['/carta', '/carta/completa', '/perfil/nacimiento'] },
  {
    // Quien entró sin ciudad ni fecha y vuelve a completarlas (el caso del 27 oct).
    nombre: 'sin-ciudad-ni-fecha',
    semilla: vigente(conHora, { birth_city: '', birth_place: null, birth_date: '', birth_time: '' }),
    rutas: ['/perfil/nacimiento', '/carta'],
  },
];

/**
 * Recorridos con acciones: lo que solo aparece al tocar algo. `alcance` limita
 * la revisión a lo que se abrió (detrás de una ventana todo queda tapado, y
 * así debe ser).
 */
const RECORRIDOS = [
  {
    nombre: 'ciudad-en-el-ingreso',
    persona: 'recien-llega',
    ruta: '/onboarding',
    pasos: [['elegir', '#birth-country', 'MX'], ['escribir', 'input[role="combobox"]', 'Guadalajara'], ['esperar', '.sug li']],
    alcance: '.ciudad',
  },
  {
    nombre: 'ciudad-en-perfil',
    persona: 'sin-ciudad-ni-fecha',
    ruta: '/perfil/nacimiento',
    pasos: [['elegir', '#birth-country', 'MX'], ['escribir', 'input[role="combobox"]', 'Guadalajara'], ['esperar', '.sug li']],
    alcance: '.ciudad',
  },
  { nombre: 'ayuda', persona: 'con-hora', ruta: '/hoy', pasos: [['tocar', 'button:has-text("Necesito ayuda")']], alcance: '[role="dialog"]' },
  { nombre: 'sugerir', persona: 'con-hora', ruta: '/hoy', pasos: [['tocar', 'button:has-text("Sugerir")']], alcance: '[role="dialog"]' },
  { nombre: 'preguntale-a-tu-carta', persona: 'con-hora', ruta: '/carta', pasos: [['tocar', 'button:has-text("Pregúntale a tu carta")']], alcance: '[role="dialog"]' },
];

/** El buscador de ciudades responde siempre lo mismo, sin internet. */
const CIUDADES = leer('../../src/lib/places.answers.test-data.json');

const permitidos = leer('./permitidos.json');
const permitido = (problema) =>
  permitidos.some(
    (p) =>
      (!p.ruta || p.ruta === problema.ruta) &&
      (!p.tamano || p.tamano === problema.tamano) &&
      (!p.tipo || p.tipo === problema.tipo) &&
      (!p.elemento || problema.elemento?.includes(p.elemento)),
  );

/** Corre dentro de la página: revisa todo lo que se puede tocar. */
async function revisarPagina(alcance) {
  const problemas = [];
  const describir = (el) => {
    const texto = (el.getAttribute('aria-label') || el.textContent || el.getAttribute('placeholder') || '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 40);
    const clases = [...el.classList].slice(0, 3).join('.');
    return `${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''}${clases ? '.' + clases : ''}${texto ? ` «${texto}»` : ''}`;
  };
  const seVe = (el) => {
    if (el.closest('[aria-hidden="true"], [inert], .sr-only')) return false;
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) return false;
    for (let e = el; e; e = e.parentElement) {
      const cs = getComputedStyle(e);
      if (cs.display === 'none' || cs.visibility === 'hidden' || cs.visibility === 'collapse') return false;
      if (Number(cs.opacity) === 0 && e !== el) return false;
    }
    return true;
  };
  const esperar = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

  const raiz = alcance ? document.querySelector(alcance) : document;
  if (!raiz) return { problemas: [{ tipo: 'no-se-abrio', detalle: alcance }], revisados: 0 };
  const ancho = document.scrollingElement.scrollWidth;
  if (ancho > innerWidth + 1) problemas.push({ tipo: 'mas-ancha-que-la-pantalla', detalle: `${ancho}px en ${innerWidth}px` });

  const candidatos = [
    ...raiz.querySelectorAll(
      'button, a[href], input:not([type="hidden"]), select, textarea, [role="button"], [role="combobox"], [role="tab"], summary',
    ),
  ].filter(seVe);

  // Lo que flota fijo (la pastilla de la carta, la barra de pestañas) no se
  // mueve al bajar, y algunas cosas se apartan mientras la persona baja: se
  // revisan primero, con la página arriba, como al entrar.
  const flota = (el) => {
    for (let e = el; e; e = e.parentElement) {
      const cs = getComputedStyle(e);
      if (cs.position === 'fixed') return true;
      // Dentro de algo que se desplaza no flota, aunque esa caja sea fija.
      if (e !== el && /(auto|scroll)/.test(cs.overflowY) && e.scrollHeight > e.clientHeight + 1) return false;
    }
    return false;
  };
  candidatos.sort((a, b) => Number(flota(b)) - Number(flota(a)));

  // Una persona solo desplaza lo que tiene overflow auto o scroll; el
  // navegador automático también mueve lo que tiene overflow hidden, y así
  // «alcanzaba» botones que nadie podía alcanzar (27 oct: la página no bajaba
  // y el revisor no lo vio). Si para llegar hubo que mover una caja que la
  // persona no puede mover, no se alcanza.
  const cajasFijas = (el) => {
    const lista = [];
    for (let e = el.parentElement; e; e = e.parentElement) {
      const cs = getComputedStyle(e);
      const raiz = e === document.documentElement || e === document.body;
      const mueveY = /(auto|scroll)/.test(cs.overflowY) || (raiz && !/(hidden|clip)/.test(cs.overflowY));
      const mueveX = /(auto|scroll)/.test(cs.overflowX) || (raiz && !/(hidden|clip)/.test(cs.overflowX));
      if (!mueveY || !mueveX) lista.push({ e, top: e.scrollTop, left: e.scrollLeft, mueveY, mueveX });
    }
    return lista;
  };

  for (const el of candidatos) {
    const fijas = cajasFijas(el);
    if (flota(el)) {
      const q = el.getBoundingClientRect();
      const x = q.left + q.width / 2;
      const y = q.top + q.height / 2;
      if (y < 0 || y > innerHeight || x < 0 || x > innerWidth) {
        problemas.push({ tipo: 'no-se-alcanza', elemento: describir(el), detalle: 'flota fuera de la pantalla' });
        continue;
      }
      const encima = document.elementFromPoint(x, y);
      if (encima && !(encima === el || el.contains(encima) || encima.contains(el))) {
        problemas.push({ tipo: 'tapado', elemento: describir(el), detalle: `encima: ${describir(encima)}` });
      }
      continue;
    }
    el.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'instant' });
    await esperar();
    // Lo que movió el navegador en cajas que la persona no puede mover, se
    // devuelve; después se mira si el elemento quedó a la vista igual.
    const forzada = fijas.find(
      (f) => (!f.mueveY && f.e.scrollTop !== f.top) || (!f.mueveX && f.e.scrollLeft !== f.left),
    );
    for (const f of fijas) {
      if (!f.mueveY) f.e.scrollTop = f.top;
      if (!f.mueveX) f.e.scrollLeft = f.left;
    }
    await esperar();
    const r = el.getBoundingClientRect();
    const cx = Math.min(Math.max(r.left + r.width / 2, r.left + 1), r.right - 1);
    const cy = Math.min(Math.max(r.top + r.height / 2, r.top + 1), r.bottom - 1);
    if (cy < 0 || cy > innerHeight || cx < 0 || cx > innerWidth) {
      problemas.push({
        tipo: 'no-se-alcanza',
        elemento: describir(el),
        detalle: forzada
          ? `está fuera de la pantalla y ${describir(forzada.e)} no se puede desplazar`
          : `queda en (${Math.round(cx)}, ${Math.round(cy)}) y la pantalla mide ${innerWidth}×${innerHeight}`,
      });
      continue;
    }
    // Tapado solo si la persona no puede sacarlo de debajo: se prueba
    // dejarlo arriba, al medio y abajo (moviendo solo lo que se desplaza),
    // porque una barra fija tapa lo que queda en el borde y la persona baja
    // un poco más.
    const quienTapa = () => {
      const q = el.getBoundingClientRect();
      const x = Math.min(Math.max(q.left + q.width / 2, q.left + 1), q.right - 1);
      const y = Math.min(Math.max(q.top + q.height / 2, q.top + 1), q.bottom - 1);
      if (y < 0 || y > innerHeight || x < 0 || x > innerWidth) return 'fuera';
      const encima = document.elementFromPoint(x, y);
      if (!encima) return null;
      const svg = el.closest('svg');
      const propio =
        encima === el ||
        el.contains(encima) ||
        encima.contains(el) ||
        (svg && svg.contains(encima)) ||
        (encima.closest('label') && encima.closest('label').contains(el)) ||
        (el.id && encima.closest(`label[for="${CSS.escape(el.id)}"]`));
      return propio ? null : encima;
    };
    let tapa = quienTapa();
    for (const block of ['center', 'start', 'end']) {
      if (!tapa) break;
      el.scrollIntoView({ block, inline: 'nearest', behavior: 'instant' });
      for (const f of fijas) {
        if (!f.mueveY) f.e.scrollTop = f.top;
        if (!f.mueveX) f.e.scrollLeft = f.left;
      }
      await esperar();
      tapa = quienTapa();
    }
    if (tapa && tapa !== 'fuera') {
      problemas.push({ tipo: 'tapado', elemento: describir(el), detalle: `encima: ${describir(tapa)}` });
    }
  }
  return { problemas, revisados: candidatos.length };
}

const navegador = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
mkdirSync(SALIDA, { recursive: true });
const hallazgos = [];
let paginas = 0;

async function contexto(persona, viewport, tactil) {
  const ctx = await navegador.newContext({ viewport, isMobile: tactil, hasTouch: tactil, reducedMotion: 'reduce' });
  await ctx.addInitScript((semilla) => {
    if (sessionStorage.getItem('revisor')) return;
    for (const [k, v] of Object.entries(semilla)) localStorage.setItem(k, v);
    // La ventana de aviso de las casas se da por vista: tapa la pantalla a propósito.
    localStorage.setItem('natus.houses-notice-seen', '1');
    sessionStorage.setItem('revisor', '1');
  }, persona.semilla);
  await ctx.route(/geocoding-api\.open-meteo\.com/, (route) => {
    const url = new URL(route.request().url());
    const clave = `${url.searchParams.get('countryCode')}|${url.searchParams.get('name')}`;
    route.fulfill({ json: { results: CIUDADES[clave] ?? CIUDADES['MX|Guadalajara'] } });
  });
  return ctx;
}

for (const persona of PERSONAS) {
  for (const [tamano, viewport, tactil] of TAMANOS) {
    const ctx = await contexto(persona, viewport, tactil);
    const pagina = await ctx.newPage();
    const errores = [];
    pagina.on('pageerror', (e) => errores.push(String(e.message || e)));
    pagina.on('console', (m) => {
      if (m.type() === 'error') errores.push(m.text());
    });

    for (const ruta of persona.rutas) {
      if (SOLO && ruta !== SOLO) continue;
      errores.length = 0;
      await pagina.goto(APP + ruta, { waitUntil: 'load' });
      await pagina.waitForTimeout(1500);
      const { problemas } = await pagina.evaluate(revisarPagina, null);
      paginas += 1;
      const llegó = new URL(pagina.url()).pathname;
      const base = { persona: persona.nombre, tamano, ruta, llego: llegó };
      for (const p of problemas) hallazgos.push({ ...base, ...p });
      for (const e of new Set(errores)) hallazgos.push({ ...base, tipo: 'error-en-consola', detalle: e.slice(0, 200) });
      if (problemas.length || errores.length) {
        const nombre = `${persona.nombre}-${tamano}${ruta.replace(/\//g, '_') || '_inicio'}.png`;
        await pagina.evaluate(() => window.scrollTo(0, 0));
        await pagina.screenshot({ path: `${SALIDA}/${nombre}` });
      }
    }
    await ctx.close();
  }
}
for (const r of RECORRIDOS) {
  if (SOLO && r.ruta !== SOLO) continue;
  const persona = PERSONAS.find((p) => p.nombre === r.persona);
  for (const [tamano, viewport, tactil] of TAMANOS) {
    const ctx = await contexto(persona, viewport, tactil);
    const pagina = await ctx.newPage();
    const errores = [];
    pagina.on('pageerror', (e) => errores.push(String(e.message || e)));
    const base = { persona: persona.nombre, tamano, ruta: `${r.ruta} (${r.nombre})` };
    try {
      await pagina.goto(APP + r.ruta, { waitUntil: 'load' });
      await pagina.waitForTimeout(1200);
      for (const [accion, selector, valor] of r.pasos) {
        const el = pagina.locator(selector).first();
        if (accion === 'tocar') await el.click({ timeout: 5000 });
        if (accion === 'elegir') await el.selectOption(valor, { timeout: 5000 });
        if (accion === 'escribir') await el.pressSequentially(valor, { delay: 60, timeout: 10000 });
        if (accion === 'esperar') await el.waitFor({ timeout: 8000 });
      }
      await pagina.waitForTimeout(800);
      const { problemas } = await pagina.evaluate(revisarPagina, r.alcance);
      paginas += 1;
      for (const p of problemas) hallazgos.push({ ...base, ...p });
    } catch (e) {
      hallazgos.push({ ...base, tipo: 'no-se-pudo-recorrer', detalle: String(e.message || e).split('\n')[0].slice(0, 200) });
    }
    for (const e of new Set(errores)) hallazgos.push({ ...base, tipo: 'error-en-consola', detalle: e.slice(0, 200) });
    if (hallazgos.some((h) => h.ruta === base.ruta && h.tamano === tamano && h.persona === base.persona)) {
      await pagina.screenshot({ path: `${SALIDA}/${r.nombre}-${tamano}.png` }).catch(() => {});
    }
    await ctx.close();
  }
}

await navegador.close();

const nuevos = hallazgos.filter((h) => !permitido(h));
const conocidos = hallazgos.length - nuevos.length;
writeFileSync(`${SALIDA}/informe.json`, JSON.stringify({ paginas, hallazgos: nuevos, conocidos }, null, 1));

console.log(`Revisor: ${paginas} pantallas revisadas, ${nuevos.length} problemas${conocidos ? ` (y ${conocidos} conocidos, permitidos)` : ''}.`);
const agrupar = new Map();
for (const h of nuevos) {
  const clave = `${h.tipo} · ${h.ruta} · ${h.elemento ?? ''} · ${h.detalle ?? ''}`;
  const lista = agrupar.get(clave) ?? [];
  lista.push(`${h.persona}/${h.tamano}`);
  agrupar.set(clave, lista);
}
for (const [clave, donde] of agrupar) console.log(`- ${clave}\n    en: ${[...new Set(donde)].join(', ')}`);
process.exit(nuevos.length ? 1 : 0);
