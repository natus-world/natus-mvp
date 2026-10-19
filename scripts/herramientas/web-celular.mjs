// natus.world on a phone (390x844, touch): the entry, then «Entrar», then the first phrase.
// node web-celular.mjs [path]   (WEB defaults to the local preview on :4177)
import fs from 'node:fs';
import { lanzar, SALIDA } from './_navegador.mjs';
const WEB = process.env.WEB || 'http://127.0.0.1:4177';
const ruta = process.argv[2] || '/';
fs.mkdirSync(SALIDA, { recursive: true });
const b = await lanzar();
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'es-CL' });
const p = await ctx.newPage();
p.on('pageerror', (e) => console.log('ERR', e.message));
await p.goto(WEB + ruta); await p.waitForTimeout(3000);
console.log('scrollWidth', await p.evaluate(() => document.documentElement.scrollWidth));
await p.screenshot({ path: SALIDA + '/web-tel-entrada.png' });
if (ruta === '/' && await p.locator('.ap-entrar').count()) {
  await p.locator('.ap-entrar').tap(); await p.waitForTimeout(4500);
  await p.screenshot({ path: SALIDA + '/web-tel-frase.png' });
}
await b.close();
console.log('listo en', SALIDA);
