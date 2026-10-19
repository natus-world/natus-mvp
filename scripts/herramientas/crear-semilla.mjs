// Walk the onboarding in demo mode with an invented person and save the browser's storage as a seed
// for capturas.mjs. Needs the app running with VITE_DEMO_MODE=true (no .env.local).
// node crear-semilla.mjs <out.json> [sin-hora]
// Steps: who you are -> what you ask yourself -> how you'd like to work -> map -> care (three «No»)
// -> paths -> routine. The geocoder is answered locally with Santiago, so no network is needed.
import { writeFileSync } from 'node:fs';
import { lanzar, APP } from './_navegador.mjs';
const [out, sinHora] = process.argv.slice(2);
if (!out) { console.error('uso: node crear-semilla.mjs <salida.json> [sin-hora]'); process.exit(1); }
const SANTIAGO = { name: 'Santiago', admin1: 'Región Metropolitana', country_code: 'CL', latitude: -33.45, longitude: -70.66, timezone: 'America/Santiago', population: 4800000, feature_code: 'PPLC' };
const b = await lanzar();
const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
const p = await ctx.newPage();
p.on('pageerror', (e) => console.log('ERR', e.message));
const lugar = (r) => r.fulfill({ contentType: 'application/json', body: JSON.stringify({ results: [SANTIAGO] }) });
await p.route('**/geocoding-api.open-meteo.com/**', lugar);
await p.route('**/functions/v1/geocode**', lugar);
const paso = async (n) => { console.log('·', n, p.url()); };

await p.goto(APP + '/onboarding');
await p.waitForTimeout(1000);
// 1 · who you are (an invented person)
await p.fill('#legal-name', 'Francisca Rojas');
await p.selectOption('[aria-label="Día de nacimiento"]', '09');
await p.selectOption('[aria-label="Mes de nacimiento"]', '05');
await p.selectOption('[aria-label="Año de nacimiento"]', '1992');
if (!sinHora) {
  await p.selectOption('[aria-label="Hora de nacimiento (opcional)"]', '08');
  await p.selectOption('[aria-label="Minutos"]', '30');
}
await p.selectOption('#birth-country', 'CL');
await p.getByRole('combobox', { name: /Ciudad/ }).fill('Santiago');
await p.waitForTimeout(1200);
await p.locator('[role=listbox] li, [role=option]').first().click();
await p.selectOption('#country', 'CL');
// without the hour the step asks whether to calculate the chart anyway: the first option (yes)
if (sinHora) await p.locator('[aria-labelledby="without-time-label"] [role=radio]').first().click();
await p.getByRole('button', { name: /Continuar/ }).click();
await p.waitForTimeout(600); await paso('quién eres');
// 2 · what you ask yourself
await p.getByText('Estoy atravesando una pérdida').click();
await p.getByRole('button', { name: /Continuar/ }).click();
await p.waitForTimeout(600); await paso('lo que te preguntas');
// 3 · how you'd like to work: the first option, then on to the map
await p.locator('main button[aria-pressed], main [role=checkbox]').first().click();
await p.getByRole('button', { name: /Continuar|Crear|Ver/ }).last().click();
await p.waitForTimeout(9000); await paso('mapa');
// care: three «No», then paths
await p.goto(APP + '/cuidarte');
await p.waitForTimeout(1200);
for (let i = 0; i < 3; i++) await p.getByText('No', { exact: true }).nth(i).click();
await p.getByRole('button', { name: /Ver mis caminos|Continuar/ }).click();
await p.waitForTimeout(6000); await paso('caminos');
// the routine is written after the paths
await p.goto(APP + '/recorrido');
await p.waitForTimeout(6000); await paso('rutina');
const ls = await p.evaluate(() => Object.fromEntries(Object.entries(localStorage).filter(([k]) => k.startsWith('natus:'))));
writeFileSync(out, JSON.stringify(ls));
console.log('semilla:', out, Object.keys(ls).join(', '));
await b.close();
