// natus.world (natus-soul-path) on desktop: the entry screen, the choice, and the start of the opening.
// Captures stills, or records a video to show Nico. Serve the website build first:
//   npx vite preview --host 127.0.0.1 --port 4177   (in natus-soul-path, launched with setsid nohup)
// MEDIOS=<dir with apertura.webm and ojo.webm> node web-entrada.mjs capturas|video
// The test Chromium has no H.264, so the opening videos (Lovable assets) are answered from webm copies.
// Make them from https://natus.world/__l5e/assets-v1/<id>/<file>.mp4 (ids in src/assets/*.asset.json):
//   ffmpeg -i natus-apertura.mp4 -an -vf scale=640:-2 -c:v libvpx -deadline realtime -b:v 1M -g 12 apertura.webm
// At 640 px: in full size the recording runs slow and its timing is false.
import fs from 'node:fs';
import { lanzar, SALIDA } from './_navegador.mjs';
const modo = process.argv[2] || 'capturas';
const WEB = process.env.WEB || 'http://127.0.0.1:4177';
const MEDIOS = process.env.MEDIOS;
fs.mkdirSync(SALIDA, { recursive: true });
const b = await lanzar(['--autoplay-policy=no-user-gesture-required']);
const opts = { viewport: { width: 1440, height: 900 }, locale: 'es-CL' }; // without es-CL the site jumps to /en
if (modo === 'video') opts.recordVideo = { dir: SALIDA + '/grabacion', size: { width: 1440, height: 900 } };
const ctx = await b.newContext(opts);
const p = await ctx.newPage();
p.on('pageerror', (e) => console.log('ERR', e.message));
if (MEDIOS) for (const [pat, f] of [['**/natus-apertura.mp4', 'apertura.webm'], ['**/natus-ojo.mp4', 'ojo.webm']])
  await p.route(pat, (r) => r.fulfill({ status: 200, contentType: 'video/webm', body: fs.readFileSync(MEDIOS + '/' + f) }));
else console.log('sin MEDIOS: «Con música» espera el video hasta 12 s y la intro no avanza');
const shot = async (n) => { if (modo !== 'video') await p.screenshot({ path: `${SALIDA}/web-${n}.png` }); };
await p.goto(WEB + '/');
const t = Date.now();
for (const ms of [800, 2000, 4500]) { await p.waitForTimeout(Math.max(0, ms - (Date.now() - t))); await shot(String(ms)); }
// «Con música» is enabled once the opening video has loaded past the eyes
await p.waitForFunction(() => { const x = document.querySelector('.ap-op'); return x && !x.disabled; }, null, { timeout: 15000 }).catch(() => console.log('«Con música» sigue deshabilitado'));
await p.waitForTimeout(modo === 'video' ? 1500 : 200);
await p.locator('.ap-op').first().click();
const t0 = Date.now();
for (const ms of [400, 900, 1500, 2300, 3300, 4500, 6200, 9000]) { await p.waitForTimeout(Math.max(0, ms - (Date.now() - t0))); await shot('c' + ms); }
await p.waitForTimeout(modo === 'video' ? 2000 : 0);
await ctx.close(); await b.close();
if (modo === 'video') console.log('video (webm) en', SALIDA + '/grabacion; a mp4: ffmpeg -ss 0.5 -i <webm> -c:v libx264 -pix_fmt yuv420p -movflags +faststart salida.mp4');
else console.log('listo en', SALIDA);
