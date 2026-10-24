/**
 * Two friends with their charts and a comparison, on the local stack, to look
 * at «La carta» and «Las dos cartas» without calling the model. The charts are
 * the mockup's Francisca and Tomás (las-dos-cartas, 23 Oct 2026); the readings
 * are placeholders written here, never Davraz's.
 *
 *   npx vite-node scripts/herramientas/semilla-dos-cartas.ts > /tmp/dos-cartas.json
 *
 * Prints Francisca's session (to put in the browser) and the friendship id.
 * `--sin-areas` stores a comparison made before the areas.
 */
import { execSync } from 'node:child_process';
import { createClient } from '@supabase/supabase-js';
import { buildNatalChart, aspectsBetween } from '../../src/lib/natal-chart.ts';
import { areasBetween, crossesToLabel } from '../../src/lib/comparison-areas.ts';
import { SEED_CONTEXT } from '../../src/ai/fixtures/chart-seed.testing.ts';

const env = Object.fromEntries(
  execSync('supabase status -o env', { encoding: 'utf8' })
    .split('\n')
    .map((l) => /^([A-Z_]+)="?(.*?)"?$/.exec(l))
    .filter((m): m is RegExpExecArray => m !== null)
    .map((m) => [m[1], m[2]]),
);
const API = env['API_URL']!;
const ANON = env['ANON_KEY']!;
const SERVICE = env['SERVICE_ROLE_KEY']!;
const withoutAreas = process.argv.includes('--sin-areas');

const p = (name: string, position: number, sign: string, abs: number, motion = 'direct') =>
  `<point name="${name}" position="${position.toFixed(2)}" sign="${sign}" abs_pos="${abs.toFixed(2)}" house="First House" motion="${motion}" />`;
const TOMAS = `<chart_analysis type="Natal"><chart name="Tomás"><planets>
${p('Sun', 10, 'Aries', 10)}
${p('Moon', 5, 'Scorpio', 215)}
${p('Mercury', 20, 'Pisces', 350)}
${p('Venus', 3, 'Virgo', 153)}
${p('Mars', 12, 'Libra', 192)}
${p('Jupiter', 8, 'Capricorn', 278)}
${p('Saturn', 14, 'Cancer', 104, 'retrograde')}
${p('Uranus', 2, 'Aquarius', 302)}
${p('Neptune', 25, 'Capricorn', 295)}
${p('Pluto', 1, 'Sagittarius', 241)}
</planets><axes>
${p('Ascendant', 22, 'Leo', 142)}
${p('Medium_Coeli', 15, 'Taurus', 45)}
</axes></chart></chart_analysis>`;

const francisca = buildNatalChart(SEED_CONTEXT, true);
const tomas = buildNatalChart(TOMAS, true);

const service = createClient(API, SERVICE, { auth: { persistSession: false } });
const a = createClient(API, ANON, { auth: { persistSession: false } });
const b = createClient(API, ANON, { auth: { persistSession: false } });
const { data: authA } = await a.auth.signInAnonymously();
const { data: authB } = await b.auth.signInAnonymously();
const idA = authA.session!.user.id;
const idB = authB.session!.user.id;

for (const [who, id, name, date, time] of [
  [a, idA, 'Francisca Soto', '1992-05-09', '08:30'],
  [b, idB, 'Tomás Rojas', '1990-03-31', '19:10'],
] as const) {
  const { error } = await who.from('clients').insert({
    user_id: id,
    email: `${id}@example.test`,
    legal_birth_name: name,
    birth_date: date,
    birth_time: time,
    birth_city: 'Santiago',
    birth_country: 'CL',
    clinical_ideation_6m: 'no',
  });
  if (error) throw new Error(`account: ${error.message}`);
}
const { data: token } = await a.rpc('my_invite_token');
const { data: friendship, error: fe } = await b.rpc('accept_friend_invite', { p_token: token });
if (fe) throw new Error(`friendship: ${fe.message}`);

for (const [id, chart] of [
  [idA, francisca],
  [idB, tomas],
] as const) {
  const { error } = await service.from('natal_charts').insert({ user_id: id, has_birth_time: true, chart });
  if (error) throw new Error(`chart: ${error.message}`);
}

const aspects = aspectsBetween(francisca.points, tomas.points);
const areas = areasBetween(francisca, tomas);
const chosen = aspects.filter((x) => ['trine', 'sextile', 'square', 'opposition'].includes(x.type)).slice(0, 6);
const flowOf = (type: string) => (type === 'square' || type === 'opposition' ? 'pide_trabajo' : 'fluye');
const READINGS: Record<string, [string, string]> = {
  quienes_son: [
    'Los dos se encienden con lo nuevo: Francisca con las ideas, Tomás con la acción. Si uno propone y el otro se lanza, arman planes rápido; si nadie da el primer paso, se quedan en la idea.',
    '¿Qué te entusiasma hoy?',
  ],
  lo_que_se_dan: [
    'Lo que es uno y lo que necesita el otro no se cruzan solos. No se adivinan: les sirve preguntarse qué hace sentir acompañado a cada uno.',
    '¿Qué gesto te hace sentir que te acompañan?',
  ],
  lo_que_sienten: [
    'Sienten de forma parecida: los dos registran lo que no se dice en voz alta. Les sirve nombrarlo, porque lo intuyen igual.',
    '¿Qué sentiste hoy que no dijiste?',
  ],
  como_se_hablan: [
    'Francisca piensa en voz alta y salta de idea en idea; Tomás piensa en imágenes y necesita tiempo. Preguntar «¿cómo lo ves tú?» antes de responder les abre la conversación.',
    '¿Cuándo sientes que te escuchan de verdad?',
  ],
  lo_que_disfrutan: [
    'A los dos les gusta lo concreto: una buena comida, un lugar ordenado, un regalo útil. El cariño se nota en los gestos más que en las palabras.',
    '¿Cómo sería un domingo perfecto para los dos?',
  ],
  atraccion: [
    'La chispa está en lo distinto: lo que a uno le atrae del otro se descubre conociéndose. Mirarse con curiosidad les abre la química.',
    '¿Qué fue lo primero que te llamó la atención del otro?',
  ],
  sexualidad: [
    'El deseo de cada uno tiene su ritmo: uno quiere fuego y el otro calma. Acordar quién propone y cuándo les evita sentirse apurados o esperando.',
    '¿Qué necesitas para sentirte en confianza en la intimidad?',
  ],
  desacuerdo: [
    'Los dos son firmes: Francisca defiende con fuego y Tomás busca el equilibrio. Les ayuda pausar y volver al tema cuando bajó la temperatura.',
    '¿Qué te ayuda a calmarte después de una discusión?',
  ],
  conviven: [
    'En casa se entienden sin hablar mucho: los dos necesitan un lugar tranquilo para recargarse. Acordar ratos de cada uno y turnos claros para las tareas ayuda.',
    '¿Qué necesitas para sentirte en casa?',
  ],
  trabajan: [
    'Los dos se toman en serio lo que hacen, pero desde lados opuestos: Francisca ordena desde el plan y los plazos; Tomás, desde el cuidado del equipo. Juntos cubren las dos mitades si se reparten roles.',
    '¿Qué necesita cada uno para sentir que el trabajo avanza?',
  ],
  sostiene: [
    'Hay base para la constancia: el Saturno de cada uno toca con calma lo que el otro siente. Reconocer lo que sí hace el otro les ayuda a sostenerlo.',
    '¿Qué quieren cuidar de esto en un año?',
  ],
  como_se_ven: [
    'Juntos se ven luminosos y sociables: Francisca pone la armonía, Tomás el brillo. Funciona mejor cuando los dos se dan espacio para destacar.',
    '¿Cómo crees que los ven los demás?',
  ],
};
const result = {
  prompt_version: withoutAreas ? 'comparison-v2.3' : 'comparison-v2.4',
  headline: 'Francisca y Tomás, lado a lado',
  numerology_dialogue: {
    summary: 'Sus números conversan desde lugares distintos.',
    pairs: [{ a_number: 8, b_number: 5, kind: 'life_path', reading: 'Uno construye con paciencia y el otro abre caminos nuevos.' }],
  },
  astro_dialogue: {
    available: true,
    summary: 'Las dos cartas se tocan en lo esencial y en lo cotidiano.',
    aspects: chosen.map((x) => ({
      ...x,
      flow: flowOf(x.type),
      reading:
        flowOf(x.type) === 'fluye'
          ? 'Esto les sale fácil: se encuentran sin tener que buscarse.'
          : 'Acá tiran hacia lados distintos; acordar los tiempos antes de decidir les ahorra roces.',
    })),
  },
  lo_bueno: ['Se encienden con las ideas del otro.', 'Les gusta lo concreto.'],
  tener_en_cuenta: ['Cada uno tiene su ritmo.', 'A veces se adivinan en vez de preguntarse.'],
  que_trabajar: ['Acordar los tiempos.', 'Nombrar lo que intuyen.'],
  disfrutar_juntos: ['Planes nuevos.', 'Una buena comida.'],
  disclaimer: 'Esto es un espejo para conversar, no un veredicto sobre la relación.',
  ...(withoutAreas
    ? {}
    : {
        areas: areas.map((x) => ({ key: x.key, reading: READINGS[x.key]![0], question: READINGS[x.key]![1] })),
        cross_labels: crossesToLabel(areas).map((x, i) => ({
          a_body: x.a_body,
          b_body: x.b_body,
          label: chosen.some((c) => c.a_body === x.a_body && c.b_body === x.b_body)
            ? flowOf(x.type) === 'fluye'
              ? 'fluye'
              : 'trabajo'
            : (['fluye', 'cultiva', 'trabajo'] as const)[i % 3],
        })),
      }),
};
const { error: ce } = await service.from('chart_comparisons').insert({
  user_id: idA,
  friendship_id: friendship,
  prompt_version: result.prompt_version,
  result,
  mode: 'server',
});
if (ce) throw new Error(`comparison: ${ce.message}`);

console.log(JSON.stringify({ session: authA.session, sessionB: authB.session, friendship, idA, idB }));
