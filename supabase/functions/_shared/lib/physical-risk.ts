import type { CopyViolation } from './copy-lint.ts';

const NOT_LETTER = '(?![a-záéíóúüñ])';

const CONDITIONED = new RegExp(
  [
    'ayun[a-záéíóúñ]*',
    'duchas?\\s+fr[ií][oa]s?',
    'ba[ñn]os?\\s+(?:de\\s+)?(?:hielo|agua\\s+(?:fr[ií]a|helada))',
    'inmersi[oó]n(?:es)?\\s+en\\s+(?:hielo|agua)',
    'exposici[oó]n\\s+al\\s+fr[ií]o',
    'crioterapia',
    'wim\\s+hof',
    'suplement[a-záéíóúñ]*',
  ]
    .map((term) => `\\b${term}${NOT_LETTER}`)
    .join('|'),
  'i',
);

const FASTING = /\bayun/i;

const FASTING_AS_PRACTICE = new RegExp(
  [
    `\\bayun(?:ar|a|as|e|es|en|emos|ando|ad[oa]s?|ás|á|é)${NOT_LETTER}`,
    `\\b(?:hac(?:er|é|e|es)|haz|practic[a-záéíóúñ]*|prob(?:ar|á|ás)|prueba|pruebes|intent[a-záéíóúñ]*|empez[a-záéíóúñ]*|empieza|comenz[a-záéíóúñ]*|comienza|sum(?:ar|á|a)|incorpor[a-záéíóúñ]*|ensay[a-záéíóúñ]*)\\s+(?:(?:un|el|tu|algún|algun|los|unos|este)\\s+)?(?:peque[nñ]o\\s+)?ayunos?${NOT_LETTER}`,
  ].join('|'),
  'i',
);

const MEDICAL_REFERRAL = new RegExp(`\\bm[eé]dic[oa]s?${NOT_LETTER}`, 'i');

const FOOD_OR_WEIGHT = new RegExp(
  [
    'comidas?',
    'comer',
    'peso',
    'adelgaz[a-záéíóúñ]*',
    'engord[a-záéíóúñ]*',
    'dietas?',
    'kilos?',
    'calor[ií]as',
    'atrac[oó]n(?:es)?',
    'v[oó]mit[a-záéíóúñ]*',
    'purg[a-záéíóúñ]*',
    'anorexi[a-záéíóúñ]*',
    'bulimi[a-záéíóúñ]*',
    'alimentari[oa]s?',
    'alimentaci[oó]n',
    'hambre',
    'apetito',
  ]
    .map((term) => `\\b${term}${NOT_LETTER}`)
    .join('|'),
  'i',
);

export const FOOD_TOPIC = 'alimentacion';

export function hasFoodOrWeightSignal(input: {
  texts: readonly (string | null | undefined)[];
  topics?: readonly string[];
}): boolean {
  if (input.topics?.includes(FOOD_TOPIC)) return true;
  return input.texts.some((text) => typeof text === 'string' && FOOD_OR_WEIGHT.test(text));
}

export type PhysicalRiskOptions = {
  fastingBarred?: boolean;
};

function lintGroup(text: string, options: PhysicalRiskOptions): CopyViolation[] {
  const violations: CopyViolation[] = [];

  if (options.fastingBarred) {
    const match = FASTING.exec(text);
    if (match) {
      violations.push({
        rule: 'fasting-barred',
        match: match[0],
        why: 'Fasting with clinical vulnerability or a food or weight signal. It must not appear at all — S-03.',
      });
    }
  }

  const practice = FASTING_AS_PRACTICE.exec(text);
  if (practice) {
    violations.push({
      rule: 'fasting-practice',
      match: practice[0],
      why: 'Fasting suggested as something to do. At most, an invitation to read about it — S-03.',
    });
  }

  const conditioned = CONDITIONED.exec(text);
  if (conditioned && !MEDICAL_REFERRAL.test(text)) {
    violations.push({
      rule: 'contraindication',
      match: conditioned[0],
      why: 'A practice with physical risk named without its contraindication and a referral to a doctor — S-03.',
    });
  }

  return violations;
}

export function lintPhysicalRisk(
  value: unknown,
  options: PhysicalRiskOptions = {},
  path = '$',
): (CopyViolation & { path: string })[] {
  if (typeof value === 'string') {
    return lintGroup(value, options).map((v) => ({ ...v, path }));
  }
  if (Array.isArray(value)) {
    return value.flatMap((item, i) => lintPhysicalRisk(item, options, `${path}[${i}]`));
  }
  if (value && typeof value === 'object') {
    const entries = Object.entries(value);
    const own = entries
      .map(([, item]) => item)
      .filter((item): item is string => typeof item === 'string');
    const here = own.length > 0 ? lintGroup(own.join('\n'), options).map((v) => ({ ...v, path })) : [];
    const nested = entries
      .filter(([, item]) => typeof item !== 'string')
      .flatMap(([key, item]) => lintPhysicalRisk(item, options, `${path}.${key}`));
    return [...here, ...nested];
  }
  return [];
}
