import { MATCH_PROMPT_VERSION } from './versions.ts';
import { JSON_DISCIPLINE, TONE_RULES, addressLine, personText } from './shared.ts';
import { HOUSE_NUMBER_RULE } from './chart-reading.ts';
import type { FilterOutcome } from '@/lib/matching.ts';
import type { GrammaticalGender, MatchSymbols } from '@/lib/model-input.ts';
import type { SoulMapSynthesis } from '@/lib/schemas/index.ts';

/**
 * Ranking therapy modalities. PDR 7.3 and 7.4. Reconstructed — see
 * `shared.ts` for provenance.
 *
 * This prompt is where the August scope change lives. The vault ranked
 * people, using five dimensions of therapeutic alliance; those dimensions are
 * defined for a person and do not transfer to a technique. PDR 7.3 replaces
 * them with four dimensions of fit between modality and person, in an
 * explicit priority order rather than a weighted sum — the PDR is direct that
 * a model does not do the arithmetic of weights well, so it is told to order,
 * not to score.
 *
 * PDR 0.2 also asks for a change of register. Recommending a technique cannot
 * claim what recommending a person claimed: not "this person will connect
 * with you" but "this modality works on what you are describing, and here is
 * what it feels like".
 */

export { MATCH_PROMPT_VERSION };

export const MATCH_SYSTEM_PROMPT = `
${TONE_RULES}

TAREA
Recibes la síntesis del mapa de una persona y un catálogo acotado de
modalidades candidatas. Ordenas entre 3 y 5, y escribes por qué cada una tiene
que ver con lo que esa persona contó. No propones prácticas: la rutina se
arma después, viendo las terapias que elijas.

LAS CUATRO DIMENSIONES, EN ESTE ORDEN DE PRIORIDAD
No las promedies ni les pongas pesos. Es un orden, no una cuenta.

1. AJUSTE AL TEMA
   Lo que la persona describe contra works_well_for y what_happens.
   Es la dimensión que más manda.

2. AJUSTE A LA APERTURA Y AL ESTILO
   Su apertura declarada y el registro de su lenguaje contra family e
   intensity. Alguien que escribe de forma concreta y racional probablemente no
   empieza por constelaciones, aunque el tema encaje.

3. AJUSTE AL MOMENTO Y AL HORIZONTE
   La fase detectada contra typical_horizon y typical_format.
   En "pregunta": modalidades exploratorias, no directivas.
   En "integracion": horizontes cortos y prácticas autónomas.

4. RESONANCIA SIMBÓLICA
   Numerología y carta contra el lenguaje de la modalidad.
   Es desempate, nunca criterio de selección. Si los datos son pobres — texto
   genérico, sin carta — baja su peso a cero y apóyate en el ajuste al tema
   y en el ajuste a la apertura y al estilo. Citar la carta o los números en
   el reasoning no les da más peso en el orden.

REGLAS DURAS
- Solo puedes devolver slugs de la lista provista. No inventes modalidades ni
  slugs, aunque se te ocurra una que encajaría mejor.
- Ninguna modalidad es "la correcta" ni "la ideal". Son caminos posibles.
- Si una modalidad tiene requires_clinical_support y aun así la incluyes, el
  caution_note es obligatorio y concreto.
- Nunca porcentajes, nunca scores, nunca "98% de compatibilidad".

EL SUMMARY
- Lo que se lee en la tarjeta antes de tocarla. Una o dos oraciones.
- Sale de lo que la persona contó, con sus palabras cuando se pueda. Sin
  términos de carta ni números: eso va en el reasoning.

EL REASONING
- Es el porqué completo, el que se abre al tocar la tarjeta.
- Entre 2 y 4 oraciones. Ni más ni menos.
- Cita al menos un elemento concreto de cada fuente disponible: algo que la
  persona contó, un elemento de su carta (un planeta en un signo o en una
  casa) y uno de sus números. Si una fuente no te llega, no la nombres ni la
  inventes. Planetas y signos, en español.
${HOUSE_NUMBER_RULE}
- La carta y los números se citan como lenguaje, no como prueba: "tu Luna en
  Cáncer sugiere…", "tu camino de vida 4 habla de…".
- Conecta lo específico con lo específico: algo textual que la persona dijo
  contra algo concreto que pasa en esa modalidad.
  Ejemplo del tono: "Mencionas que el enojo se te queda en el cuerpo; la
  terapia somática trabaja exactamente ahí, con atención a la sensación física
  antes que al relato."
  Ejemplo del tono con una modalidad clínica: "Mencionas un recuerdo que
  sigue doliendo igual que el primer día. En EMDR se vuelve a ese recuerdo en
  tandas cortas mientras sigues con la mirada un movimiento de lado a lado,
  sin tener que contarlo en detalle; suele acompañar procesos parecidos cuando
  lo vivido no bajó con el tiempo."
- Lenguaje de posibilidad: "puede dialogar con", "suele acompañar procesos
  parecidos", "resuena con lo que cuentas".
- Di qué pasa realmente en una sesión. La gente no sabe qué es EMDR ni
  constelaciones. Sin eso la recomendación no sirve para nada.

CONTRATO
{
  "prompt_version": "${MATCH_PROMPT_VERSION}",
  "matched_modalities": [
    { "modality_slug": "...", "rank": 1, "summary": "...", "reasoning": "...", "caution_note": null }
  ]
}

${JSON_DISCIPLINE}
`.trim();

export function buildMatchUserMessage(input: {
  synthesis: SoulMapSynthesis;
  outcome: FilterOutcome;
  presentingNeedText: string;
  symbols: MatchSymbols;
  gender: GrammaticalGender;
}): string {
  const catalogue = input.outcome.candidates
    .map((m) =>
      [
        `slug: ${m.slug}`,
        `nombre: ${m.name_es}`,
        `familia: ${m.family}`,
        `qué pasa en una sesión: ${m.what_happens}`,
        `sirve para: ${m.works_well_for.join(', ')}`,
        `formato: ${m.typical_format} · horizonte: ${m.typical_horizon} · intensidad: ${m.intensity}/5`,
        `nivel de evidencia: ${m.evidence_level}`,
        m.requires_clinical_support ? 'REQUIERE ACOMPAÑAMIENTO CLÍNICO' : '',
        m.contraindications.length ? `contraindicaciones: ${m.contraindications.join(' ')}` : '',
      ]
        .filter(Boolean)
        .join('\n'),
    )
    .join('\n---\n');

  return [
    addressLine(input.gender),
    '',
    'LA PERSONA',
    `Fase detectada: ${input.synthesis.detected_phase} · modo: ${input.synthesis.detected_mode}`,
    `Lo que se está preguntando, en sus palabras: ${input.presentingNeedText ? personText(input.presentingNeedText) : '(no escribió texto libre)'}`,
    '',
    'SÍNTESIS VIGENTE',
    input.synthesis.soul_map_synthesis.tu_camino,
    input.synthesis.soul_map_synthesis.lo_que_estas_trabajando,
    input.synthesis.soul_map_synthesis.que_necesitas_ahora,
    '',
    `TEMAS INFERIDOS: ${input.synthesis.inferred_topics.join(', ') || 'ninguno'}`,
    '',
    describeSymbols(input.symbols),
    '',
    // Telling the model how the pool was reached matters: a relaxed or
    // fallback pool should not be presented with the confidence of a
    // topically matched one.
    `CÓMO SE ARMÓ ESTE POOL: ${describeStrategy(input.outcome)}`,
    '',
    'MODALIDADES CANDIDATAS (solo puedes elegir de aquí)',
    catalogue,
  ].join('\n');
}

/** v1.2 R-02: the symbols the reasoning may cite, as given; never recomputed. */
function describeSymbols(symbols: MatchSymbols): string {
  const n = symbols.numerology;
  const numbers = n
    ? [
        `Camino de vida ${n.life_path}`,
        `expresión ${n.expression}`,
        `alma ${n.soul_urge}`,
        `personalidad ${n.personality}`,
        `cumpleaños ${n.birthday}`,
        ...(n.master_numbers_present.length > 0 ? [`números maestros ${n.master_numbers_present.join(', ')}`] : []),
      ].join(' · ')
    : 'No hay numerología.';
  const chart = symbols.chart?.length
    ? symbols.chart
        .map((p) => `${p.name} en ${p.sign}${p.house ? `, casa ${p.house}` : ''}`)
        .join(' · ')
    : 'No hay carta.';
  return [
    'SUS SÍMBOLOS (ya calculados; trátalos como dados, no los recalcules)',
    `Numerología: ${numbers}`,
    `Carta: ${chart}`,
  ].join('\n');
}

function describeStrategy(outcome: FilterOutcome): string {
  switch (outcome.strategy) {
    case 'topical':
      return 'filtrado por temas en común. Puedes hablar con confianza normal.';
    case 'relaxed':
      return 'ningún tema coincidió, así que se amplió. Sé más prudente: no afirmes que encaja con un tema puntual.';
    case 'contemplative-fallback':
      return 'no quedó nada tras los filtros. Son prácticas de punto de partida. Dilo con honestidad en el reasoning.';
  }
}
