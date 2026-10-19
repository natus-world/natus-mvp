// Screenshot one route of the app in demo mode, phone (390x844 @2x) and desktop (1440x900).
// SEED=semillas/con-hora.json ROUTE=/hoy node capturas.mjs <name> [steps-json] [tel|desk]
// steps: [["click", selector], ["scroll", y], ["wait", ms], ["eval", js]], applied in both sizes.
import { readFileSync, mkdirSync } from 'node:fs';
import { lanzar, SALIDA, APP, VISTAS } from './_navegador.mjs';
const [name, stepsJson, only] = process.argv.slice(2);
if (!name) { console.error('uso: SEED=… ROUTE=… node capturas.mjs <nombre> [pasos] [tel|desk]'); process.exit(1); }
const steps = stepsJson ? JSON.parse(stepsJson) : [];
const seed = process.env.SEED ? JSON.parse(readFileSync(process.env.SEED, 'utf8')) : {};
const route = process.env.ROUTE || '/hoy';
mkdirSync(SALIDA, { recursive: true });
const browser = await lanzar();
for (const [tag, vp, dpr] of VISTAS) {
  if (only && only !== tag) continue;
  const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: dpr });
  // seed once per session, so the app's own writes after that are kept
  await ctx.addInitScript((s) => { if (!sessionStorage.getItem('seeded')) { for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v); sessionStorage.setItem('seeded', '1'); } }, seed);
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.log('ERR', e.message));
  page.on('console', (m) => { if (m.type() === 'error') console.log('CONSOLE', m.text()); });
  await page.goto(APP + route);
  await page.waitForTimeout(1500);
  for (const [k, v] of steps) {
    if (k === 'click') await page.locator(v).first().click();
    else if (k === 'scroll') await page.evaluate((y) => document.querySelectorAll('*').forEach((e) => { if (e.scrollHeight > e.clientHeight + 4 && /auto|scroll/.test(getComputedStyle(e).overflowY)) e.scrollTop = y; }), Number(v));
    else if (k === 'wait') await page.waitForTimeout(Number(v));
    else if (k === 'eval') console.log(tag, await page.evaluate(v));
    await page.waitForTimeout(250);
  }
  await page.waitForTimeout(600);
  console.log(tag, 'scrollWidth', await page.evaluate(() => document.documentElement.scrollWidth));
  await page.screenshot({ path: `${SALIDA}/${name}-${tag}.png` });
  await ctx.close();
}
await browser.close();
console.log('listo en', SALIDA);
