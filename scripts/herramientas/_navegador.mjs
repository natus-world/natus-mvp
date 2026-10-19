// Shared by the screenshot tools: where playwright-core and Chromium live.
// Defaults are the cloud sandbox's; override with PW_CORE and CHROMIUM.
const PW_CORE = process.env.PW_CORE || '/opt/node-tools/node_modules/playwright-core/index.mjs';
export const { chromium, devices } = await import(PW_CORE);
export const CHROMIUM = process.env.CHROMIUM || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
export const SALIDA = process.env.SALIDA || '/tmp/natus-capturas';
export const APP = process.env.APP || 'http://127.0.0.1:5173';
export const VISTAS = [
  ['tel', { width: 390, height: 844 }, 2],
  ['desk', { width: 1440, height: 900 }, 1],
];
export const lanzar = (args = []) => chromium.launch({ executablePath: CHROMIUM, args });
