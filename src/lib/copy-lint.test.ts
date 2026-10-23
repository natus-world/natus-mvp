import { describe, expect, it } from 'vitest';
import { countSentences, fixAccents, fixAccentsDeep, isInvitation, lintChartJudgement, lintCopy, lintDeep } from './copy-lint.ts';

const rulesFor = (text: string) => lintCopy(text).map((v) => v.rule);

describe("the PDR's own anti-patterns must fail", () => {
  it('rejects the order form of a tip', () => {
    // PDR 7.5 lists this verbatim as an anti-pattern.
    expect(rulesFor('Debes meditar 10 minutos al día')).toContain('command');
  });

  it('rejects declaring a modality the right one', () => {
    expect(rulesFor('Esta es la terapia ideal para vos')).toContain('certainty');
  });

  it('rejects promising a result', () => {
    expect(rulesFor('Esto va a resolver tu problema')).toContain('cure');
    expect(rulesFor('Esto te va a curar')).toContain('cure');
  });

  it('rejects a percentage score', () => {
    // The mockup's "98% match".
    expect(rulesFor('98% match con este facilitador')).toContain('percentage');
  });

  it('rejects the chart as prediction', () => {
    // PDR 1.3: "tu carta sugiere", never "tu carta dice que".
    expect(rulesFor('Tu carta dice que vas a cambiar de trabajo')).toContain(
      'chart-determinism',
    );
  });

  it('rejects a diagnosis', () => {
    expect(rulesFor('Tenés un trastorno de ansiedad generalizada')).toContain('diagnosis');
  });

  it('rejects the AI claiming a feeling', () => {
    expect(rulesFor('Me emociona mucho lo que contás')).toContain('first-person-emotion');
  });
});

describe('the PDR\'s own model examples must pass', () => {
  const good = [
    // Quoted verbatim from PDR 7.5 as the example to imitate.
    'Tu carta y lo que cuentas resuenan con prácticas de regulación nerviosa nocturna. ¿Te hace sentido probar 10 minutos de respiración 4-7-8 antes de dormir esta semana? Observa qué se mueve.',
    'Mencionas que el enojo se te queda en el cuerpo; la terapia somática trabaja exactamente ahí, con atención a la sensación física antes que al relato.',
    'Esta modalidad suele acompañar procesos parecidos al que estás describiendo.',
    'Tu carta sugiere una tensión entre lo que muestras y lo que necesitas.',
  ];

  it.each(good)('passes: %s', (text) => {
    expect(lintCopy(text)).toEqual([]);
  });
});

describe('ordinary copy is not caught by accident', () => {
  const innocuous = [
    'Cuéntame un poco más sobre eso.',
    'Hay algo que se repite y todavía no tiene nombre.',
    'La terapia gestalt trabaja con lo que aparece en la sesión.',
    'Puedes dejar de venir cuando quieras.',
    // "deb" appears inside "debilidad" but is not the imperative.
    'Nombrar una debilidad no es lo mismo que tener un problema.',
  ];

  it.each(innocuous)('passes: %s', (text) => {
    expect(lintCopy(text)).toEqual([]);
  });
});

describe('linting a whole payload', () => {
  it('reports the path of each violation', () => {
    const payload = {
      synthesis: { tu_camino: 'Todo bien acá.' },
      tips: [
        { title: 'Respirar', body: 'Debes hacerlo cada día.' },
        { title: 'Caminar', body: 'Una caminata sin teléfono.' },
      ],
    };
    const found = lintDeep(payload);
    expect(found).toHaveLength(1);
    expect(found[0]?.path).toBe('$.tips[0].body');
    expect(found[0]?.rule).toBe('command');
  });

  it('returns nothing for a clean payload', () => {
    expect(lintDeep({ a: 'Todo bien.', b: ['También bien.'] })).toEqual([]);
  });
});

describe('markup is not copy', () => {
  it('does not read an SSML speech rate as a promised percentage', () => {
    // This is not hypothetical: every meditation carries a prosody rate, and
    // linting the tag failed all of them — in the fixtures and in `runAi`
    // alike, so a live generation would have been rejected as well.
    expect(lintCopy('<prosody rate="82%">Quédate como estés.</prosody>')).toEqual([]);
  });

  it('still lints the words inside the tags', () => {
    expect(lintCopy('<speak>Debes meditar diez minutos.</speak>').map((v) => v.rule)).toEqual([
      'command',
    ]);
  });

  it('still catches a percentage that is actually said to the person', () => {
    expect(lintCopy('<speak>Tenés 98% de compatibilidad.</speak>').map((v) => v.rule)).toContain(
      'percentage',
    );
  });
});

describe('shape requirements', () => {
  it('recognises an invitation by its question mark', () => {
    expect(isInvitation('¿La sumás como experimento esta semana?')).toBe(true);
    expect(isInvitation('Sumala esta semana.')).toBe(false);
  });

  it('counts sentences for the two-to-four rule', () => {
    expect(countSentences('Una. Dos. Tres.')).toBe(3);
    expect(countSentences('¿Una? ¡Dos!')).toBe(2);
    expect(countSentences('Sin puntuación final')).toBe(1);
  });
});

describe('missing accents are put back (owner, 22 Oct 2026)', () => {
  it.each([
    ['Hay mucha tension en tu relacion.', 'Hay mucha tensión en tu relación.'],
    ['Tambien puedes probarlo despues.', 'También puedes probarlo después.'],
    ['Diez minutos cada dia, segun lo que sientas.', 'Diez minutos cada día, según lo que sientas.'],
    ['Es dificil y facil a la vez; ademas, todavia hay dias.', 'Es difícil y fácil a la vez; además, todavía hay días.'],
    ['Relacion y EMOCION.', 'Relación y EMOCIÓN.'],
    ['Las relaciones y las sesiones quedan igual.', 'Las relaciones y las sesiones quedan igual.'],
    ['Si practicas yoga, el ultimo paso es tuyo.', 'Si practicas yoga, el ultimo paso es tuyo.'],
  ])('%s', (text, fixed) => {
    expect(fixAccents(text)).toBe(fixed);
    expect(lintCopy(fixAccents(text)).map((v) => v.rule)).not.toContain('missing-accent');
  });

  it('mends prose in an answer and leaves enum values and slugs alone', () => {
    const answer = { modality_slug: 'mindfulness-meditacion', phase: 'exploracion', summary: 'Una practica de atencion.' };
    expect(fixAccentsDeep(answer)).toEqual({
      modality_slug: 'mindfulness-meditacion',
      phase: 'exploracion',
      summary: 'Una practica de atención.',
    });
  });

  it('no longer refuses a word that is also an unaccented verb', () => {
    expect(lintCopy('Si practicas cada semana, lo último se nota.').map((v) => v.rule)).not.toContain('missing-accent');
    expect(lintCopy('Me medico poco y es lo ultimo que hago.').map((v) => v.rule)).not.toContain('missing-accent');
  });
});

describe('missing accents', () => {
  it.each([
    'Decis que hay mucha tension en el cuerpo y que te cuesta descansar.',
    'Si tenes hipertension, consulta antes con un medico.',
    'Es de lo mas facil de llevarse a casa y suele acompañar momentos de transicion.',
    'Diez minutos cada dia, despues de cenar.',
  ])('flags free text written without accents: %s', (text) => {
    expect(lintCopy(text).map((v) => v.rule)).toContain('missing-accent');
  });

  it.each([
    'Decís que hay mucha tensión en el cuerpo y que te cuesta descansar.',
    'Si tienes hipertensión, consulta antes con un médico.',
    'Diez minutos cada día, después de cenar. Una sesión por semana.',
    'Relacionado con lo que contaste: la atención vuelve al cuerpo.',
  ])('passes correctly accented text: %s', (text) => {
    expect(lintCopy(text).map((v) => v.rule)).not.toContain('missing-accent');
  });

  it('leaves single-token enum values alone', () => {
    expect(lintCopy('exploracion')).toEqual([]);
    expect(lintCopy('integracion')).toEqual([]);
  });
});

describe('voseo', () => {
  it.each([
    'Podés probarlo esta semana.',
    '¿Querés que lo miremos?',
    'Tenés tiempo para esto.',
    'Lo que sentís tiene sentido.',
    'Decís que algo tiene que cambiar.',
    'Lo que contás se repite.',
    'Probá diez minutos antes de dormir.',
    'Elegí una situación chica.',
    'Escribí la pregunta a mano.',
    'Mostrame dónde aparece.',
    'Contanos qué pasó.',
    'Fijate si los hombros están arriba.',
    'Quedate un rato más.',
    'Esto es para vos.',
    'Sos alguien que sostiene mucho.',
    'Si tenes un rato, sigue leyendo.',
    'Lo que mirás cambia.',
    'Respirá despacio.',
  ])('flags: %s', (text) => {
    expect(rulesFor(text)).toContain('voseo');
  });

  it.each([
    'Puedes probarlo esta semana.',
    '¿Quieres que lo miremos?',
    'Tienes tiempo para esto, y sabes cuándo parar.',
    'Si sabes lo que quieres, elige con calma.',
    'Lo que sientes tiene sentido.',
    'Dices que algo tiene que cambiar.',
    'Prueba diez minutos antes de dormir.',
    'Escribe la pregunta a mano y mira qué aparece.',
    'Muéstrame dónde aparece.',
    'Cuéntanos qué pasó.',
    'Fíjate si los hombros están arriba.',
    'Quédate un rato más, que estés donde estés.',
    'Esto es para ti.',
    'Eres alguien que sostiene mucho.',
    'Estás en un buen momento, más que antes, y después podrás verlo.',
    'Tendrás tiempo además de las ganas; quizás lo veas a través de otro país.',
    'El estrés y el interés no son lo mismo en inglés ni en francés.',
    'Aquí, así, ahí: está bien, será distinto, y eso ya es algo.',
    'La línea SOS atiende todo el día.',
    'Solamente mira, nota y deja que pase.',
    'Llorarás o no; respirarás igual.',
  ])('passes neutral Spanish: %s', (text) => {
    expect(rulesFor(text)).not.toContain('voseo');
  });
});

describe('regional idioms', () => {
  it.each(['Che, mirá esto.', 'Estoy podrida del laburo.', 'Eso está re bien.'])('flags: %s', (text) => {
    expect(rulesFor(text)).toContain('regional-idiom');
  });

  it.each(['Revisa la cena.', 'Hay mucho trabajo esta semana.', 'Representa algo distinto.'])(
    'passes: %s',
    (text) => {
      expect(rulesFor(text)).not.toContain('regional-idiom');
    },
  );
});

describe('v1.2 A-02 — a chart is never rated', () => {
  it.each([
    'Saturno es un planeta maléfico en tu carta.',
    'Es un aspecto desfavorable entre los dos.',
    'Tienes aspectos negativos con la Luna.',
    'Júpiter, el benéfico mayor, está en tu casa 2.',
    'Hoy es un momento favorable para hablar.',
    'Tu carta es de secta diurna.',
    'Los planetas de la Secta trabajan con soltura.',
  ])('flags "%s"', (text) => {
    expect(lintChartJudgement({ a: text })).toHaveLength(1);
  });

  it('lets what flows and what asks for work through', () => {
    expect(
      lintChartJudgement({
        a: 'Naciste de noche: tu Venus en Tauro es un recurso que fluye naturalmente; tu Marte en Cáncer pide más trabajo consciente.',
      }),
    ).toEqual([]);
  });
});
