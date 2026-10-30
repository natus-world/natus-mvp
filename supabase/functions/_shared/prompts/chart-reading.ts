/**
 * Reading a chart (v1.2 A-02), for the prompts that interpret one — the Soul
 * Map, the comparison and, since chat-v1.7, the chat — and no other. Kept apart from shared.ts so the
 * prompts that do not read a chart do not change with it; versions.test.ts
 * fingerprints a prompt together with every local file it imports.
 */
import type { ChartAspect, NatalChart } from '@/lib/natal-chart.ts';

/**
 * v1.2 A-02: the chart is read the Hellenistic way. Only in the prompts that
 * interpret a chart — the Soul Map and the comparison — not in every answer.
 * The chart arrives calculated (src/lib/natal-chart.ts); the model reads it.
 */
export const HELLENISTIC_RULES = `
BASE HELENÍSTICA
- Lees la carta desde la astrología helenística. Te llega ya calculada:
  las casas en el sistema que se indica (Placidus o signo entero), aspectos por signo, regencias tradicionales,
  regente del Ascendente, si nació de día o de noche, y dignidades. No las
  recalcules ni las corrijas.
- Los siete planetas visibles (Sol, Luna, Mercurio, Venus, Marte, Júpiter,
  Saturno) rigen los signos. Urano, Neptuno, Plutón, Quirón y Lilith puedes
  comentarlos como complemento, pero no rigen nada.
- Dignidades: domicilio o exaltación son recursos más disponibles, que suelen
  fluir con menos esfuerzo; exilio o caída son áreas que piden más trabajo
  consciente.
- Haber nacido de día o de noche dice qué planetas trabajan con más soltura
  en esta carta. Nómbralo solo si suma a la lectura, siempre como «naciste de
  día» o «naciste de noche»; nunca uses la palabra «secta».
- Sin predicción: nada de profecciones ni pronósticos. La carta es una lente
  para conocerse, no un calendario.
- Planetas, signos y aspectos, siempre en español.
`.trim();

/**
 * Houses in Placidus, whole sign one touch away on the screen (owner, 28–30 Oct
 * 2026, text approved by him): what is written once and kept — the Soul Map,
 * the comparison, the why of a therapy — names a house by its area of life,
 * never its number, so it never contradicts the wheel the person has chosen.
 * The chat, the tip and the readings per point may say the number.
 */
export const HOUSE_NUMBER_RULE = `
- Cuando hables de una casa, no digas su número: nombra el área de la vida que representa (por ejemplo, «en tu forma de estar en pareja» y no «en tu casa 7»). La persona puede estar mirando su carta con otro sistema de casas, y el número podría no coincidir.
`.trim();

/**
 * The owner's rule of 15 Oct 2026, beside the Hellenistic one and in the same
 * prompts only: nothing in a chart is rated, and the reading is a mirror.
 */
export const PROPOSITIVE_RULES = `
HABLAR PROPOSITIVAMENTE (lógica del espejo)
- Nada se califica como bueno, malo o regular: ni un planeta, ni un aspecto,
  ni un número, ni un día, ni lo que pasa entre dos personas. Sin notas,
  caras ni semáforos. Nunca "malo", "débil", "maléfico", "benéfico",
  "favorable" ni "desfavorable".
- Lo que fluye se dice como algo que fluye naturalmente. Lo que cuesta, como
  algo que pide más trabajo, y siempre con de qué forma se puede trabajar.
- Es un espejo: devuelves lo que hay para que la persona lo mire y decida.
  No sentencias.
`.trim();

const LILITH = new Set(['Mean_Lilith', 'True_Lilith', 'Lilith']);

const ASPECT_ES: Record<ChartAspect['type'], string> = {
  conjunction: 'conjunción',
  sextile: 'sextil',
  square: 'cuadratura',
  trine: 'trígono',
  opposition: 'oposición',
};

/**
 * v1.2 A-02: a calculated chart, as the model reads it. Positions, whole-sign
 * houses, dignities, the Ascendant's ruler, the sect and the aspects by sign,
 * all given; the separation in degrees is left out, as the orb is never shown.
 */
export function describeChart(chart: NatalChart, options: { lilith?: boolean } = {}): string {
  const lines: string[] = [];
  // Lilith only where the owner put it (28 Oct 2026): the full chart and the chat.
  const shown = (name: string) => options.lilith !== false || !LILITH.has(name);
  if (chart.has_birth_time && chart.ascendant) {
    lines.push(`Ascendente: ${chart.ascendant.sign} ${chart.ascendant.degree}°`);
    lines.push(chart.house_system === 'placidus' ? 'Casas: Placidus' : 'Casas: signo entero');
    if (chart.ascendant_ruler) {
      const r = chart.ascendant_ruler;
      lines.push(`Regente del Ascendente: ${r.planet}, en ${r.sign}${r.house ? `, casa ${r.house}` : ''}`);
    }
    if (chart.sect) {
      const when = chart.sect.kind === 'diurna' ? 'de día' : 'de noche';
      lines.push(`Nació ${when}; planetas que trabajan con más soltura: ${chart.sect.planets.join(', ')}`);
    }
  } else {
    // Without the hour (owner, 22 Oct 2026): only what is known. Day or night
    // when the person said it; the Moon only when its sign is certain.
    if (chart.sect) {
      const when = chart.sect.kind === 'diurna' ? 'de día' : 'de noche';
      lines.push('Sin hora de nacimiento: no hay Ascendente ni casas. No los menciones ni los deduzcas.');
      lines.push(`Nació ${when} (lo dijo la persona); planetas que trabajan con más soltura: ${chart.sect.planets.join(', ')}`);
    } else {
      lines.push('Sin hora de nacimiento: no hay Ascendente ni casas, y no se sabe si nació de día o de noche. No los menciones ni los deduzcas.');
    }
    if (!chart.points.some((p) => p.name === 'Moon')) {
      lines.push('Sin la hora no se sabe en qué signo estaba la Luna: no la menciones ni deduzcas su signo.');
    }
  }
  lines.push('Puntos:');
  for (const p of chart.points.filter((q) => shown(q.name))) {
    // Without the hour the Moon's sign is certain, its degree is not.
    const parts = [!chart.has_birth_time && p.name === 'Moon' ? p.sign : `${p.sign} ${p.degree}°`];
    if (p.house) parts.push(`casa ${p.house}`);
    if (p.dignity) parts.push(p.dignity);
    if (p.retrograde) parts.push('retrógrado');
    lines.push(`- ${p.name}: ${parts.join(', ')}`);
  }
  lines.push('Aspectos por signo:');
  lines.push(
    ...(chart.aspects.length
      ? chart.aspects.filter((a) => shown(a.a) && shown(a.b)).map((a) => `- ${a.a} ${ASPECT_ES[a.type]} ${a.b}`)
      : ['- Ninguno.']),
  );
  return lines.join('\n');
}
