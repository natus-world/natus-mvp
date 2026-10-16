/**
 * The product's copy rules, made executable.
 *
 * PDR sections 1 and 7.5 state them as prose: never certainty, never an
 * order, never a promise of cure, never a percentage, and the chart suggests
 * rather than states. Prose rules get eroded — by a model on a bad day, by a
 * fixture written in a hurry, by whoever edits the prompt next.
 *
 * So they run as a lint, over model output and over the hand-written fixtures
 * alike. A fixture of mine that breaks a rule fails a test, which is the only
 * version of this that stays true.
 *
 * No React, no storage — copied into `_shared/lib` unchanged.
 */

export type CopyViolation = {
  rule: string;
  match: string;
  why: string;
};

type Rule = {
  id: string;
  pattern: RegExp;
  why: string;
};

const VOSEO_FORMS = [
  'vos',
  'tenes',
  'podes',
  'queres',
  'decis',
  'sentis',
  'venis',
  'vivis',
  'mirás',
  'respirás',
  'comparás',
  'separás',
  'preparás',
  'llorás',
  'curás',
  'lográs',
  'registrás',
  'mostrás',
  'demostrás',
  'encontrás',
  'recordás',
  'entrás',
  'comprás',
  'probá',
  'mirá',
  'notá',
  'dejá',
  'contá',
  'escribí',
  'elegí',
  'decí',
  'vení',
  'hacé',
  'poné',
  'tené',
  'tomá',
  'andá',
  'pensá',
  'respirá',
  'alargá',
  'traé',
  'llevá',
  'sumá',
  'buscá',
  'preguntá',
  'revisá',
  'intentá',
  'usá',
  'empezá',
  'arrancá',
  'seguí',
  'leé',
  'imaginá',
  'nombrá',
  'registrá',
  'anotá',
  'guardá',
  'cerrá',
  'abrí',
  'volvé',
  'soltá',
  'quedá',
  'fijá',
  'acordá',
  'animá',
  'tratá',
  'apoyá',
  'ubicá',
  'consultá',
  'sugerí',
  'juntá',
  'contestá',
  'subí',
  'recorré',
  'observá',
  'escuchá',
  'llevá',
  'fijate',
  'quedate',
  'sentate',
  'acordate',
  'animate',
  'apoyate',
  'dejate',
  'permitite',
  'preguntate',
  'imaginate',
  'regalate',
  'mostrame',
  'contame',
  'contanos',
  'decime',
  'decinos',
  'escribime',
  'escribinos',
  'avisame',
  'avisanos',
  'dejalo',
  'dejala',
  'dejalos',
  'dejalas',
  'probalo',
  'probala',
  'miralo',
  'mirala',
  'tratalo',
  'tratala',
  'ubicalo',
  'ubicala',
  'sumalo',
  'sumala',
  'anotalo',
  'anotala',
  'elegilo',
  'elegila',
  'decilo',
  'hacelo',
  'ponelo',
  'tenelo',
  'llevalo',
  'contalo',
  'escribilo',
  'registralo',
  'guardalo',
];

const VOSEO_LOOKALIKES = [
  'más',
  'además',
  'demás',
  'jamás',
  'atrás',
  'detrás',
  'quizás',
  'compás',
  'estás',
  'estés',
  'después',
  'inglés',
  'francés',
  'japonés',
  'escocés',
  'holandés',
  'irlandés',
  'danés',
  'finlandés',
  'portugués',
  'libanés',
  'marqués',
  'burgués',
  'interés',
  'desinterés',
  'estrés',
  'revés',
  'través',
  'cortés',
  'bebés',
  'cafés',
  'andrés',
  'inés',
  'moisés',
  'ciempiés',
  'país',
  'anís',
  'parís',
  'maís',
];

const RULES: Rule[] = [
  {
    id: 'certainty',
    // PDR 7.5: never "esta es la terapia ideal para vos".
    pattern:
      /\b(?:la\s+)?(?:terapia|modalidad|pr[aá]ctica)\s+(?:ideal|perfecta|indicada|correcta)\b|\bes\s+lo\s+que\s+necesit[aá]s\b|\bsin\s+duda\b|\bdefinitivamente\b|\bte\s+garantiz/i,
    why: 'Absolute certainty. Modalities are possible paths, never the right answer.',
  },
  {
    id: 'cure',
    // PDR 7.5: never "esto va a resolver tu problema" / "esto te va a curar".
    pattern:
      /\b(?:va|van|vas)\s+a\s+(?:curar|sanar|resolver|solucionar|eliminar)\b|\bte\s+cura\b|\bcura\s+(?:la|el|tu)\b/i,
    why: 'A promise of cure. Nothing here treats anything.',
  },
  {
    id: 'command',
    // PDR 7.5 anti-pattern: "Debes meditar 10 minutos al día" is an order,
    // not an invitation. Every tip closes on a question instead.
    // A negation is the opposite of an order: «no tienes que hacerlo
    // perfecto» frees, and it was failing whole answers (16 Oct 2026).
    pattern: /(?<!\b(?:no|nunca|ni)\s+)\b(?:deb[eé]s|debes|ten[eé]s\s+que|tienes\s+que|hac[eé]lo\s+ya|es\s+obligatorio)\b/i,
    why: 'An order. Recommendations are invitations — PDR 1.5.',
  },
  {
    id: 'percentage',
    // The mockup's "98% match". A score implies a computed confidence that
    // does not exist, and PDR 7.3 is explicit that the ranking is ordered by
    // priority rather than arithmetic.
    pattern: /\b\d{1,3}\s*%/,
    why: 'A numeric score implies a precision the ranking does not have.',
  },
  {
    id: 'chart-determinism',
    // PDR 1.3: "tu carta sugiere", never "tu carta dice que".
    pattern:
      /\b(?:tu|la)\s+carta\s+(?:dice|indica|determina|confirma|demuestra|predice)\b|\bvas\s+a\s+conocer\b|\bte\s+va\s+a\s+pasar\b/i,
    why: 'Astrology as prediction. It is a lens for self-knowledge — PDR 1.3.',
  },
  {
    id: 'diagnosis',
    // PDR 1.2: the AI never diagnoses.
    pattern:
      /\b(?:ten[eé]s|tienes|sufr[ií]s|sufres|padec[eé]s)\s+(?:un|una|de)\s+(?:trastorno|depresi[oó]n|ansiedad\s+generalizada|tdah|toc|bipolaridad)\b|\btu\s+diagn[oó]stico\b/i,
    why: 'A diagnosis. The AI is a mirror, never a clinician — PDR 1.2.',
  },
  {
    id: 'missing-accent',
    pattern:
      /(?<![\p{L}])(?:[a-zñ]+(?:ci|si|xi)on|tambien|despues|dificil|facil|medic[oa]s?|dias?|segun|todavia|ademas|ultim[oa]s?|practicas)(?![\p{L}])/iu,
    why: 'A word that always carries an accent arrived without it. Free text is written with full Spanish orthography; only enum values go without accents.',
  },
  {
    id: 'voseo',
    pattern: new RegExp(
      [
        `(?<!\\p{L})(?:${VOSEO_FORMS.join('|')})(?!\\p{L})`,
        `(?<!\\p{L})(?!(?:${VOSEO_LOOKALIKES.join('|')})(?!\\p{L}))(?:\\p{L}+[^\\P{L}r]ás|\\p{L}+és|\\p{L}+ís)(?!\\p{L})`,
      ].join('|'),
      'iu',
    ),
    why: 'Voseo. Every text is neutral Spanish, addressed with tú — G-01.',
  },
  {
    id: 'voseo',
    pattern: /(?<!\p{L})[Ss]os(?!\p{L})/u,
    why: 'Voseo. Every text is neutral Spanish, addressed with tú — G-01.',
  },
  {
    id: 'regional-idiom',
    pattern:
      /(?<!\p{L})(?:che|laburo|laburar|labura|boludo|boluda|pibe|piba|chévere|chamba|güey|estoy\s+podrid[oa]|re\s+(?:bien|lindo|linda|difícil|fácil|cansad[oa]|lind[oa]))(?!\p{L})/iu,
    why: 'A regional idiom. Copy is neutral Spanish with no country idioms — G-01.',
  },
  {
    id: 'first-person-emotion',
    // PDR 1.2: the AI never speaks in the first person with emotions.
    pattern: /\b(?:me\s+(?:emociona|entristece|alegra|conmueve|duele)|siento\s+mucho\s+que)\b/i,
    why: 'The AI speaking as if it felt something — PDR 1.2.',
  },
];

/**
 * Markup is not copy.
 *
 * Meditation scripts arrive as SSML, and `<prosody rate="82%">` is a speech
 * parameter, not a claim made to a person. Linting it as prose failed every
 * meditation on the percentage rule — in the fixture tests *and* in `runAi`,
 * so a real generated meditation would have been rejected too. Stripping tags
 * first costs nothing elsewhere: every rule here is about Spanish sentences,
 * and the words inside the tags are still linted.
 */
function prose(text: string): string {
  return text.replace(/<[^>]*>/g, ' ');
}

export function lintCopy(text: string): CopyViolation[] {
  const subject = prose(text);
  const violations: CopyViolation[] = [];
  for (const rule of RULES) {
    if (rule.id === 'missing-accent' && !/\s/.test(subject.trim())) continue;
    const match = rule.pattern.exec(subject);
    if (match) violations.push({ rule: rule.id, match: match[0], why: rule.why });
  }
  return violations;
}

/** Lint every string in a nested structure. Used over whole model payloads. */
export function lintDeep(value: unknown, path = '$'): (CopyViolation & { path: string })[] {
  if (typeof value === 'string') {
    return lintCopy(value).map((v) => ({ ...v, path }));
  }
  if (Array.isArray(value)) {
    return value.flatMap((item, i) => lintDeep(item, `${path}[${i}]`));
  }
  if (value && typeof value === 'object') {
    return Object.entries(value).flatMap(([key, item]) => lintDeep(item, `${path}.${key}`));
  }
  return [];
}

const CRISIS_DIGITS: Rule = {
  id: 'crisis-digits',
  pattern: /\d(?:[\s().-]{0,2}\d){3,}/,
  why: 'A digit run in crisis text. Help lines come from verified data, never from the model — S-02.',
};

export function lintCrisisResponse(text: string): CopyViolation[] {
  const match = CRISIS_DIGITS.pattern.exec(text);
  return match ? [{ rule: CRISIS_DIGITS.id, match: match[0], why: CRISIS_DIGITS.why }] : [];
}

export function lintCrisisText(value: unknown, path = '$'): (CopyViolation & { path: string })[] {
  if (Array.isArray(value)) {
    return value.flatMap((item, i) => lintCrisisText(item, `${path}[${i}]`));
  }
  if (!value || typeof value !== 'object') return [];
  const record = value as Record<string, unknown>;
  const own: (CopyViolation & { path: string })[] = [];
  if (typeof record['crisis_response'] === 'string') {
    own.push(
      ...lintCrisisResponse(record['crisis_response']).map((v) => ({ ...v, path: `${path}.crisis_response` })),
    );
  }
  if (record['type'] === 'crisis' && typeof record['message_text'] === 'string') {
    own.push(...lintCrisisResponse(record['message_text']).map((v) => ({ ...v, path: `${path}.message_text` })));
  }
  const nested = Object.entries(record).flatMap(([key, item]) =>
    item && typeof item === 'object' ? lintCrisisText(item, `${path}.${key}`) : [],
  );
  return [...own, ...nested];
}

/**
 * PDR 1.5 and 7.5: a tip closes on a micro-invitation phrased as a question.
 * Separate from the violation rules because it is a shape requirement rather
 * than a forbidden phrase.
 */
export function isInvitation(text: string): boolean {
  return text.trim().endsWith('?');
}

/** PDR 7.5: reasoning is two to four sentences. Not more, not less. */
export function countSentences(text: string): number {
  return text.split(/[.!?…]+(?:\s|$)/).filter((s) => s.trim().length > 0).length;
}

/**
 * v1.2 A-02 and the owner's rule of 15 Oct 2026: a reading of a chart never
 * rates anything good, bad or so-so. Run only over the surfaces that read a
 * chart (the Soul Map, the comparison), not over every answer: elsewhere
 * "favorable" can be an ordinary word.
 */
const CHART_JUDGEMENT =
  /\b(?:mal[eé]fic[oa]s?|ben[eé]fic[oa]s?|desfavorables?|favorables?|aspectos? (?:malos?|buenos?|negativos?|positivos?)|(?:mal|buen) aspecto)\b/i;

export function lintChartJudgement(value: unknown, path = '$'): (CopyViolation & { path: string })[] {
  if (typeof value === 'string') {
    const match = CHART_JUDGEMENT.exec(prose(value));
    return match
      ? [
          {
            rule: 'chart-judgement',
            match: match[0],
            why: 'A chart is never rated good or bad: what flows, flows naturally; what is hard asks for more work (A-02).',
            path,
          },
        ]
      : [];
  }
  if (Array.isArray(value)) return value.flatMap((item, i) => lintChartJudgement(item, `${path}[${i}]`));
  if (value && typeof value === 'object') {
    return Object.entries(value).flatMap(([key, item]) => lintChartJudgement(item, `${path}.${key}`));
  }
  return [];
}
