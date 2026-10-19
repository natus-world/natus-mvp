// Screenshot a live page (default app.natus.world) on phone and desktop, and print page errors.
// node captura-produccion.mjs [url] [name]
import { mkdirSync } from 'node:fs';
import { lanzar, SALIDA, VISTAS } from './_navegador.mjs';
const url = process.argv[2] || 'https://app.natus.world/';
const name = process.argv[3] || 'prod';
mkdirSync(SALIDA, { recursive: true });
const b = await lanzar();
for (const [tag, vp, dpr] of VISTAS) {
  const p = await (await b.newContext({ viewport: vp, deviceScaleFactor: dpr })).newPage();
  p.on('pageerror', (e) => console.log(tag, 'ERR', e.message));
  await p.goto(url);
  await p.waitForTimeout(5000);
  await p.screenshot({ path: `${SALIDA}/${name}-${tag}.png` });
}
await b.close();
console.log('listo en', SALIDA);
