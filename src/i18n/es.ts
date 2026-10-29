import type { GrammaticalGender } from './gender';

export const es = {
  common: {
    continue: 'Continuar',
    back: 'Volver',
  },
  onboarding: {
    kicker: 'Empezar',
    stepOf: 'de',
    // Package 01 (16 Oct 2026): the names under the progress line.
    steps: ['Quién eres', 'Lo que te preguntas', 'Cómo trabajar'],
    basicData: {
      titleLead: '¿Quién ',
      titleEmphasis: 'eres',
      titleTail: '?',
      helper: 'Con tu nombre y tu nacimiento calculamos tus números y tu carta.',
      nameLabel: 'Nombre completo',
      namePlaceholder: 'Nombre y apellidos',
      nameHelper: 'Como figura en tu partida',
      genderLabel: 'Cómo quieres que te hablemos',
      genderOptions: [
        ['femenino', 'Femenino'],
        ['masculino', 'Masculino'],
        ['neutro', 'Neutro'],
      ] as [GrammaticalGender, string][],
      birthDateLabel: 'Fecha de nacimiento',
      birthTimeLabel: 'Hora (opcional)',
      // Package 01 (16 Oct 2026): the date and the hour share one row.
      birthDateTimeLabel: 'Fecha de nacimiento · Hora (opcional)',
      // 17 Oct 2026: the date as day, month and year, so every phone can pick it.
      dateParts: {
        day: 'Día de nacimiento',
        month: 'Mes de nacimiento',
        year: 'Año de nacimiento',
        hour: 'Hora de nacimiento (opcional)',
        minute: 'Minutos',
        dd: 'dd',
        mm: 'mm',
        yyyy: 'aaaa',
        hh: 'hh',
        min: 'mm',
        // The twelve-hour clock (owner, 22 Oct 2026).
        ampm: 'a. m. o p. m.',
        ampmPlaceholder: 'a. m./p. m.',
        am: 'a. m.',
        pm: 'p. m.',
        months: ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sept', 'oct', 'nov', 'dic'],
      },
      // Package 01, proposed: the example under the gender (from Perfil).
      genderExample: 'Por ejemplo: «Hoy podrías sentir más calma».',
      // Under the button, what is still missing. `date` is the package's; the
      // others are proposed (16 Oct 2026).
      missing: {
        name: 'Falta tu nombre',
        // Approved by the owner (22 Oct 2026): initials alone cannot be read.
        nameFull: 'Escribe tu nombre completo, como figura en tu partida.',
        date: 'Falta tu fecha de nacimiento',
        place: 'Falta elegir tu ciudad de la lista',
        withoutTime: 'Falta decidir si calculamos tu carta sin la hora',
        // Proposed (22 Oct 2026): not knowing the hour is said, not guessed.
        time: 'Falta tu hora, o elige «No sé mi hora»',
        dayNight: 'Falta decir si naciste de día o de noche',
        // Proposed (22 Oct 2026).
        ampm: 'Falta elegir a. m. o p. m.',
      },
      // Proposed (22 Oct 2026, the owner asked for it explicit).
      noHour: 'No sé mi hora',
      birthCityLabel: 'Ciudad de nacimiento (opcional)',
      birthCityPlaceholder: 'Escribe y elige tu ciudad',
      // The birth place picked from suggestions (16 Oct 2026); proposed texts.
      birthCityNeedsCountry: 'Primero elige el país',
      birthCitySearching: 'Buscando…',
      birthCityPick: 'Elige tu ciudad de la lista.',
      birthCityNone:
        'No encontramos esa ciudad. Prueba con su nombre completo o con la ciudad grande más cercana.',
      birthCityOptions: 'Ciudades',
      // Approved by the owner (22 Oct 2026): a blank city means no chart.
      birthCityNeeded: 'Sin tu ciudad no podemos calcular tu carta astral.',
      birthCountryLabel: 'País de nacimiento',
      birthCountryPlaceholder: 'Elige un país',
      birthCountryHelper: 'Con la ciudad y el país calculamos tu carta natal.',
      // Owner, 16 Oct 2026: only adults; proposed text.
      underage: 'Natus es para personas mayores de 18 años.',
      elsewhere: 'Otro país',
      otherCountries: 'Otros países',
      countries: [
        ['CL', 'Chile'],
        ['MX', 'México'],
        ['CO', 'Colombia'],
        ['AR', 'Argentina'],
        ['PE', 'Perú'],
        ['XX', 'Otro país'],
      ] as [string, string][],
      notice: 'Sin hora exacta no hablamos de Ascendente ni de casas.',
      // Owner, 22 Oct 2026: day or night, when the hour is not known.
      dayNightLabel: '¿Sabes si naciste de día o de noche?',
      dayNightOptions: [
        ['dia', 'De día'],
        ['noche', 'De noche'],
        ['no_se', 'No sé'],
      ] as ['dia' | 'noche' | 'no_se', string][],
      withoutTimeLabel: 'Sin la hora, ¿calculamos tu carta?',
      withoutTimeOptions: [
        ['yes', 'Sí, sin Ascendente ni casas'],
        ['no', 'No, solo mis números'],
      ] as ['yes' | 'no', string][],
    },
    presentingNeed: {
      placeholder: 'Escribe lo que se te ocurra…',
    },
    openness: {
      // Proposed (21 Oct 2026): «Cómo trabajar» now opens «Para cuidarte».
      beforePaths: 'Antes de tus caminos',
      otherLabel: 'Otro tipo de trabajo',
      otherPlaceholder: 'Otro: cuéntanos cuál',
    },
    generating: {
      // Package 01 (16 Oct 2026), proposed: the kicker, the title, «Cargando».
      kicker: 'Tu mapa',
      titleLead: 'Leyendo lo que ',
      titleEmphasis: 'contaste',
      loading: 'Cargando',
      stages: [
        'Calculando tus números',
        'Calculando tu carta natal',
        'Leyendo lo que contaste',
        'Buscando el hilo',
        'Escribiendo tu mapa',
      ],
      wait: 'Esto puede tardar un momento',
      slow: 'Esto está tardando más de lo normal. ¿Reintentamos?',
      kept: 'Nada de lo que escribiste se perdió.',
      spendLimit: 'Por hoy llegamos al límite de generaciones. Nada se perdió: inténtalo de nuevo más tarde.',
      retry: 'Reintentar',
    },
    crisis: {
      fromText:
        'Por lo que escribiste, esto merece más que un mapa simbólico y no es algo para atravesar sin compañía. Hay personas disponibles ahora mismo para hablar contigo.',
      fromAnswer:
        'Por lo que respondiste, esto merece más que un mapa simbólico y no es algo para atravesar sin compañía. Hay personas disponibles ahora mismo para hablar contigo.',
      general:
        'Lo que estás atravesando merece más que un mapa simbólico y no es algo para atravesar sin compañía. Hay personas disponibles ahora mismo para hablar contigo.',
    },
    care: {
      kicker: 'Para cuidarte',
      titleLead: 'Cuatro preguntas ',
      titleEmphasis: 'más delicadas',
      titleTail: '.',
      // Package 01: the button when Caminos comes next.
      toPaths: 'Ver mis caminos',
      intro:
        'Preguntamos esto para no recomendarte algo que en tu momento actual podría hacer más daño que bien. No es un diagnóstico y no hay respuestas mejores que otras.',
      privacy: 'Lo que respondas aquí solo lo ve tu terapeuta.',
      ideationLabel: 'En los últimos 6 meses, ¿pensaste en hacerte daño o en no querer seguir?',
      ideationOptions: {
        no: 'No',
        fugaces_sin_plan: 'Alguna vez, de forma pasajera',
        frecuentes: 'Sí, seguido',
        plan_o_intencion: 'Sí, con un plan o la intención de hacerlo',
      },
      treatmentLabel: '¿Estás en tratamiento psicológico o psiquiátrico ahora?',
      medicationLabel: '¿Tomas medicación psiquiátrica?',
      notesLabel: '¿Hay algo más que quieras que tengamos en cuenta?',
      notesHint: 'Opcional. Puedes dejarlo en blanco.',
      yes: 'Sí',
      no: 'No',
      preferNotToSay: 'Prefiero no decir',
      saving: 'Guardando…',
    },
  },
  chrome: {
    brand: 'Natus',
    back: 'Volver',
    aiError: {
      message: 'Esto está tardando más de lo normal. ¿Reintentamos?',
      retry: 'Reintentar',
    },
    opening: 'Abriendo tu espacio…',
    helpNow: {
      button: 'Necesito ayuda',
      label: 'Necesito ayuda ahora',
      // Package 12 (16 Oct 2026): the sheet's title, «Hablar con *alguien* ahora».
      titleLead: 'Hablar con ',
      titleEmphasis: 'alguien',
      titleTail: ' ahora',
      body: 'Personas preparadas para escucharte, a cualquier hora.',
      close: 'Cerrar',
      countryLines: (name: string) => `Líneas de ${name}.`,
      // Proposal (owner, 16 Oct 2026): the lines follow where the phone is.
      awayLines: (name: string) => `Tu teléfono está en ${name}: te mostramos sus líneas.`,
      changeCountry: 'Puedes cambiar tu país en Perfil.',
    },
    /** The browser tab's title, by section. */
    titles: {
      onboarding: 'Empezar',
      care: 'Para cuidarte',
      signup: 'Guardar mi mapa',
      meditations: 'Meditaciones',
      library: 'Biblioteca',
      comparison: 'Cruce de mapas',
      notFound: 'Página no encontrada',
    },
  },
  nav: {
    label: 'Secciones',
    today: 'Hoy',
    chart: 'Carta',
    paths: 'Caminos',
    journey: 'Tu rutina',
    journal: 'Bitácora',
    chat: 'Chat',
    profile: 'Perfil',
  },
  today: {
    kicker: 'Hoy',
    // Package 03 (16 Oct 2026): the date as the kicker, «jueves 15 de octubre».
    date: (d: Date) => {
      const weekday = d.toLocaleDateString('es', { weekday: 'long' });
      const month = d.toLocaleDateString('es', { month: 'long' });
      return `${weekday} ${d.getDate()} de ${month}`;
    },
    nextKicker: 'Lo siguiente',
    nextAllDone: (n: number) => `Hoy ya marcaste tus ${n} prácticas.`,
    nextNone: 'Hoy no hay prácticas pendientes.',
    nextNoRoutine: 'Elige un camino para armar tu rutina.',
    needMapKicker: 'Qué necesitas ahora · de tu mapa',
    greeting: 'Hola, ',
    greetingWithoutName: 'Hola',
    empty: 'Tu espacio se arma con tu mapa. Empecemos por ahí.',
    emptyCta: 'Empezar',
    saveTitle: 'Guarda tu mapa',
    saveBody: 'Sin cuenta, esto vive siete días en este navegador y después se va.',
    journeyKicker: 'Tu rutina',
    marked: (done: number, total: number) => `${done} de ${total} marcadas hoy`,
    markedNote: 'Se reinicia cada día. No se pierde nada.',
    journeyEmpty: 'Tu rutina sale de tus caminos.',
    needKicker: 'Qué necesitas ahora',
    meditations: 'Meditaciones',
    meditationsBody: 'Una práctica guiada, armada para hoy',
    comparison: 'Comparar cartas',
    comparisonBody: 'Mirar un vínculo desde los dos lados',
  },
  // v1.2 D-01, «Tus astros de hoy» (package 03). The catalog approved by the
  // owner on 18 Oct 2026: the day's energies, a small gesture and what it is for,
  // never how the person is. The word between asterisks goes in Cormorant italic.
  sky: {
    kicker: 'Tus astros y tu número de hoy',
    personalDay: 'Tu día personal',
    noTime: 'Sin hora exacta no hablamos de Ascendente ni de casas.',
    slow: 'Esto está tardando más de lo normal. ¿Reintentamos?',
    retry: 'Reintentar',
    tipLabel: 'Davraz',
    tipBadge: 'IA',
    tipKicker: 'Tu tip de hoy',
    freeTip: 'Con Premium, Davraz te deja un tip para el día',
    // The phrase of the day, by the planet in the sky and how it meets the chart.
    energy: {
      Moon: {
        flow: 'Hoy las energías pueden estar más *suaves* para lo que sientes. Decir lo que te pasa, sin apuro, puede acercarte a quienes quieres.',
        meet: 'Hoy las emociones pueden sentirse más *intensas*. Ponerle nombre a lo que sientes ayuda a mirarlo con más calma.',
        tension: 'Hoy el ánimo puede estar más *cambiante*. Hacer una pausa antes de responder te da espacio para elegir cómo hacerlo.',
      },
      Sun: {
        flow: 'Hoy las energías pueden acompañar lo que te *importa*. Dar un paso, aunque sea pequeño, en algo tuyo puede darte impulso para el resto del día.',
        meet: 'Hoy las energías pueden poner la atención en *ti*. Mostrarte tal como eres también es una forma de cuidarte.',
        tension: 'Hoy las energías pueden tirar hacia varios *lados* a la vez. Elegir una sola prioridad te ayuda a avanzar con más calma.',
      },
      Mercury: {
        flow: 'Hoy las palabras pueden fluir con más *facilidad*. Una conversación pendiente podría encontrar su momento.',
        meet: 'Hoy la mente puede estar más *activa*. Escribir lo que piensas ayuda a ordenarlo y a soltarlo.',
        tension: 'Hoy las energías pueden hacer que algo se entienda *distinto*. Preguntar una vez más antes de responder ayuda a que la conversación llegue mejor.',
      },
      Venus: {
        flow: 'Hoy las energías pueden invitar al *disfrute*. Un rato con alguien que quieres, o con algo que te gusta, también es cuidarte.',
        meet: 'Hoy tus vínculos y lo que te gusta pueden pedir más *espacio*. Darte un gusto pequeño, sin culpa, puede llenarte más de lo que parece.',
        tension: 'Hoy lo que quieres y lo que esperan de ti pueden ir por caminos *distintos*. Decir lo que te gusta, con calma, ayuda a cuidar tus vínculos de verdad.',
      },
      Mars: {
        flow: 'Hoy las energías pueden traer más ganas de *actuar*. Mover el cuerpo o empezar algo puede darle cauce a ese impulso.',
        meet: 'Hoy las energías pueden venir con más *impulso*. Moverte un rato ayuda a que esa fuerza se vuelva acción y no tensión.',
        tension: 'Hoy las energías pueden estar más *densas*. Respirar antes de responder ayuda: a veces tomarse un tiempo nos permite comunicarnos mejor.',
      },
      Jupiter: {
        flow: 'Hoy las energías pueden abrir puertas a lo *nuevo*. Decirle que sí a algo pequeño puede mostrarte un camino que no veías.',
        meet: 'Hoy las ganas de crecer pueden sentirse más *grandes*. Anotar una idea que te entusiasma ayuda a no perderla.',
        tension: 'Hoy las energías pueden invitar a abarcar *mucho*. Elegir lo esencial te deja energía para lo que de verdad importa.',
      },
      Saturn: {
        flow: 'Hoy las energías pueden acompañar la *constancia*. Avanzar de a poco en algo que te importa también es avanzar.',
        meet: 'Hoy la responsabilidad puede sentirse más *presente*. Ir paso a paso hace más liviano lo que pesa.',
        tension: 'Hoy las energías pueden sentirse más lentas o *pesadas*. Bajar la exigencia contigo también es parte del camino.',
      },
    },
    planet: {
      Moon: 'la Luna',
      Sun: 'el Sol',
      Mercury: 'Mercurio',
      Venus: 'Venus',
      Mars: 'Marte',
      Jupiter: 'Júpiter',
      Saturn: 'Saturno',
    },
    natal: {
      Sun: 'tu Sol',
      Moon: 'tu Luna',
      Mercury: 'tu Mercurio',
      Venus: 'tu Venus',
      Mars: 'tu Marte',
      Jupiter: 'tu Júpiter',
      Saturn: 'tu Saturno',
      Ascendant: 'tu Ascendente',
    },
    natalIs: {
      Sun: 'tu energía vital y lo que te da dirección',
      Moon: 'lo que necesitas para sentirte en casa',
      Mercury: 'cómo piensas y conversas',
      Venus: 'lo que disfrutas y cómo te vinculas',
      Mars: 'tu impulso para actuar',
      Jupiter: 'tus ganas de crecer',
      Saturn: 'tus límites y tu constancia',
      Ascendant: 'cómo te muestras y cómo empiezas las cosas',
    },
    aspectVerb: {
      conjunction: 'se junta con',
      sextile: 'le abre una puerta a',
      trine: 'fluye con',
      square: 'se roza con',
      opposition: 'queda frente a',
    },
    day: {
      1: 'Un día que invita a empezar. ¿Hay algo que vienes posponiendo y que podría dar un primer paso hoy?',
      2: 'Un día para acompañar y escuchar. Lo que se construye con otra persona pide hoy más paciencia que prisa.',
      3: 'Un día para expresarte. Contar lo que sientes, escribir o crear algo pequeño puede ordenar lo que traes adentro.',
      4: 'Un día para ordenar y sostener. Una tarea concreta, hecha con calma, también es una forma de cuidarte.',
      5: 'Un día de movimiento y cambio. Si algo se sale del plan, ¿qué pasa si lo miras con curiosidad?',
      6: 'Un día para cuidar y dejarte cuidar. Observa a quién le das tu tiempo y si también te lo das a ti.',
      7: 'Un día para ir hacia adentro. Un rato de silencio puede decirte más que muchas respuestas.',
      8: 'Un día para tomar decisiones y poner límites claros. ¿Qué necesitas sostener con más firmeza?',
      9: 'Un día para cerrar y soltar. ¿Hay algo que ya cumplió su ciclo y puedes dejar ir?',
      11: 'Un día de intuición. Lo que sientes antes de pensarlo merece que lo escuches un momento.',
      22: 'Un día para construir algo que dure. Un paso concreto hacia lo que te importa cuenta más que un plan perfecto.',
      33: 'Un día para acompañar a otros desde lo que sabes. Cuidar sin olvidarte de ti también es parte.',
    } as Record<number, string>,
  },
  profile: {
    kicker: 'Tú',
    titleLead: 'Tus datos ',
    titleEmphasis: 'son tuyos',
    accountKicker: 'Cuenta',
    accountRemote: 'Tu cuenta vive atada a tu acceso de Google o a tu correo.',
    accountSimulated: 'Cuenta simulada. No se envió ningún correo y no hay ningún servidor donde exista.',
    noAccount: 'Sin cuenta',
    noAccountBody: 'Todo lo tuyo vive en este navegador y caduca a los siete días.',
    saveMap: 'Guardar mi mapa',
    genderKicker: 'Cómo quieres que te hablemos',
    // v1.2 M-02, approved by the owner (16 Oct 2026).
    birth: {
      kicker: 'Tus datos de nacimiento',
      change: 'Cambiar',
      confirm:
        'Al cambiar tus datos recalculamos tu carta y tus números, y escribimos de nuevo tu Mapa del Alma. El anterior queda guardado.',
      save: 'Guardar',
      // The form's button (owner, 22 Oct 2026).
      saveChanges: 'Guardar cambios',
      noTime: 'Sin hora',
    },
    exportKicker: 'Descargar mis datos',
    exportBody:
      'Un archivo JSON con todo: tus respuestas, tu mapa, tus caminos y tus marcas de rutina. Descargarlo no borra nada.',
    exportCta: 'Descargar mis datos',
    exported: (name: string) => `Descargado como ${name}.`,
    deleteKicker: 'Borrar todo',
    deleteBody:
      'Se borran tu cuenta, tu mapa, tus caminos, tu rutina y cualquier archivo guardado. No queda copia, así que no se puede deshacer.',
    deleteCta: 'Borrar todo',
    deleteConfirm: '¿Borramos todo? Después de esto no queda nada tuyo en este navegador.',
    deleteConfirmCta: 'Sí, borrar todo',
    deleting: 'Borrando',
    deleteCancel: 'Mejor no',
    deleteFailed:
      'No pudimos borrar lo que está guardado en tu cuenta, así que tampoco borramos nada de este navegador. Todo sigue como estaba. Intenta de nuevo.',
    // Proposed text (owner chose the behaviour, 22 Oct 2026): only the panel's last admin sees it.
    deleteLastAdmin:
      'Eres la única persona que administra el panel de Natus, así que no borramos tu cuenta. Antes, agrega a otra persona como administradora. Todo sigue como estaba.',
    signOut: 'Cerrar sesión',
    signOutNote: 'Tus datos quedan en tu cuenta. Al volver a entrar con el mismo acceso, está todo.',
    // Package 11 (16 Oct 2026): the profile as two glass lists, each row its
    // own screen. Texts from the package; the ones marked so are proposals.
    savedInAccount: 'Mapa guardado en tu cuenta',
    deskSub: 'Tu cuenta vive atada a tu acceso de Google o a tu correo. Desde aquí puedes llevarte todo o borrarlo.',
    groupAccount: 'Tu cuenta',
    groupPlan: 'Tu plan y tus datos',
    tierFree: 'Free',
    tierPremium: 'Premium',
    rows: {
      account: 'Cuenta',
      accountGoogle: 'Conectada con Google',
      voice: 'Cómo te hablamos',
      country: 'País donde vives',
      countryLine: (name: string) => `${name} · define tus líneas de ayuda`,
      friends: 'Amigos',
      friendsCount: (n: number) =>
        n === 0 ? 'Para comparar cartas' : `${n === 1 ? '1 amigo' : `${n} amigos`} · para comparar cartas`,
      plan: 'Suscripción',
      planFree: 'Free · Premium por US$ 10 al mes',
      memory: 'Lo que Natus sabe de ti',
      memoryFree: 'Incluido en Premium',
      // Proposals: the package draws only the free row.
      memoryOn: 'Activa',
      memoryPaused: 'En pausa',
      data: 'Tus datos',
      dataLine: 'Llevártelos o borrarlos',
    },
    account: {
      kicker: 'Cuenta',
      titleLead: 'Tu ',
      titleEmphasis: 'cuenta',
      access: 'Acceso',
      accessGoogle: (email: string) => `Google · ${email}`,
      fullName: 'Nombre completo',
      birth: 'Nacimiento',
      note: 'Si cambias tu nombre o tus datos de nacimiento, volvemos a calcular tu carta y tu Mapa del Alma. La versión anterior queda guardada.',
      edit: 'Editar mis datos',
    },
    country: {
      kicker: 'País donde vives',
      titleLead: 'Dónde ',
      titleEmphasis: 'vives',
      sub: 'Define qué líneas de ayuda ves.',
      other: 'Te mostramos ayuda internacional',
      // Proposal (owner, 16 Oct 2026: any country of the world).
      otherLabel: 'Otro país',
    },
    voice: {
      kicker: 'Cómo te hablamos',
      titleLead: 'Cómo te ',
      titleEmphasis: 'hablamos',
      sub: 'Lo usamos solo en las frases que no se pueden escribir sin género.',
      examples: {
        femenino: '«Hoy podrías sentirte más tranquila.»',
        masculino: '«Hoy podrías sentirte más tranquilo.»',
        neutro: '«Hoy podrías sentir más calma.»',
      },
    },
    plan: {
      kicker: 'Suscripción',
      titleLead: 'Tu ',
      titleEmphasis: 'plan',
      yours: 'Tu plan',
      freeIncludes: [
        'Tu Mapa del Alma, tus caminos y tu rutina',
        'Bitácora escrita',
        '3 preguntas a Davraz de regalo y 1 nueva cada mes',
        '2 comparaciones de cartas al mes',
      ],
      premiumLead: 'Más ',
      premiumEmphasis: 'espacio',
      premiumTail: ' para ti',
      price: 'US$ 10 al mes · el primer mes es gratis',
      premiumIncludes: [
        'Conversar con Davraz sin límite, y que recuerde lo que ya hablaron',
        'Tu rutina se revisa cada semana',
        'Bitácora por voz',
        'Comparaciones ilimitadas y 10 meditaciones al mes',
      ],
      tryFree: 'Probar un mes gratis',
      cancelAnytime: 'Cancelas cuando quieras, desde aquí.',
      // Proposal: there is no renewal date in the browser yet.
      renews: 'Se renueva cada mes por US$ 10.',
      // Premium given from the panel (proposal, 18 Oct 2026).
      giftUntil: (date: string) => `Te lo regalamos hasta el ${date}. No se cobra nada.`,
      giftNoEnd: 'Te lo regalamos. No se cobra nada.',
      cancel: 'Cancelar suscripción',
      cancelTitleLead: '¿Cancelar ',
      cancelTitleEmphasis: 'Premium',
      cancelTitleTail: '?',
      // Proposal: the package names the date, which the browser does not have.
      cancelBody:
        'Premium sigue activo hasta el final del mes que pagaste. Después vuelves a Free: no se borra nada, tus conversaciones quedan para leer y Davraz deja de usar lo que sabe de ti hasta que vuelvas.',
      // Proposal: the subscription lives in PayPal, so it is cancelled there.
      cancelYes: 'Cancelar en PayPal',
      cancelNo: 'Mantener Premium',
    },
    data: {
      kicker: 'Tus datos',
      titleLead: 'Lo que es ',
      titleEmphasis: 'tuyo',
      sub: 'Puedes llevarte una copia de todo lo que Natus guarda de ti cuando quieras.',
      take: 'Llevarte tus datos',
      // Proposal: the package sends it by email, which is not built.
      takeLine: 'Mapa, caminos, rutina, bitácora y conversaciones · en un archivo',
      leaveNote: 'Si quieres irte del todo, puedes borrar tu cuenta y todo lo que guardamos.',
      deleteLink: 'Borrar mi cuenta y todos mis datos',
    },
    erase: {
      step1: 'Paso 1 de 2',
      step2: 'Paso 2 de 2',
      titleLead: 'Antes de ',
      titleEmphasis: 'borrar',
      forever: 'Se borra para siempre:',
      what: [
        'Tu cuenta y tus datos de nacimiento',
        'Tu Mapa del Alma, tu carta y tus caminos',
        'Tu rutina y tu bitácora',
        'Tus conversaciones con Davraz y lo que Natus sabe de ti',
        'Tus amigos y comparaciones',
      ],
      when: 'Se borra todo en un máximo de 30 días y no se puede recuperar.',
      takeFirst: 'Llevarte tus datos antes',
      next: 'Continuar',
      confirmLead: '¿Borrar ',
      confirmEmphasis: 'todo',
      confirmTail: '?',
      typeLabel: 'Para confirmar, escribe BORRAR.',
      word: 'BORRAR',
      confirm: 'Borrar todo para siempre',
      back: 'No, volver',
    },
  },
  memory: {
    kicker: 'Lo que Natus sabe de ti',
    explain:
      'Natus guarda aquí lo que le cuentas en tu bitácora, en el chat y al decir cómo te resultan tus prácticas. Davraz lo lee para conocerte mejor y no hacerte repetir lo que ya contaste. Puedes corregir o borrar cualquier cosa.',
    freeBody:
      'Con Premium, Natus recuerda lo que le cuentas en tu bitácora, en el chat y en tu rutina, para conocerte mejor. Tú decides si lo activas.',
    consentBody:
      'Para recordar, Natus necesita tu permiso para aprender de lo que escribes. Lo que escribas en un momento de crisis nunca entra a tu memoria. Puedes ver, corregir y borrar todo, y quitar el permiso cuando quieras.',
    consentCta: 'Sí, que Natus aprenda de lo que escribo',
    withdraw: 'Quitar el permiso',
    withdrawNote:
      'Natus deja de aprender y Davraz deja de leer tu memoria. Lo guardado queda en pausa hasta que lo borres.',
    paused: 'Tu memoria está en pausa: Natus no aprende y Davraz no la lee.',
    empty: 'Todavía no hay nada. Se va llenando a medida que escribes.',
    unavailable: 'No pudimos cargar tu memoria. Intenta de nuevo más tarde.',
    byYou: 'Escrito por ti',
    correct: 'Corregir',
    save: 'Guardar',
    cancel: 'Cancelar',
    delete: 'Borrar',
    deleteConfirm: '¿Borramos esto de tu memoria? No se puede deshacer.',
    deleteYes: 'Sí, borrar',
    deleteNo: 'No',
    add: 'Agregar algo',
    addLabel: 'Algo que quieras que Natus sepa de ti',
    addCategory: '¿De qué tipo es?',
    categories: {
      lo_que_vive: 'Lo que estás viviendo',
      le_funciona: 'Lo que te funciona',
      no_le_funciona: 'Lo que no te funciona',
      tema_recurrente: 'Lo que vuelve',
      contexto: 'Tu contexto',
    },
    // Package 11 (16 Oct 2026).
    titleLead: 'Lo que ',
    titleEmphasis: 'sabemos',
    sub: 'Davraz guarda lo que aprende de tu bitácora y tus conversaciones para acompañarte mejor. Puedes corregirlo o borrarlo cuando quieras.',
    neverCrisis: 'Lo que tiene que ver con una crisis nunca se guarda aquí.',
  },
  friends: {
    kicker: 'Amigos',
    body: 'Comparte tu link con quien quieras comparar tu carta. Si acepta, los dos pueden comparar sus cartas: solo astrología y numerología. Nadie ve lo que escribe el otro.',
    // Approved by the owner (23 Oct 2026, «Las dos cartas»): friends see each other's whole chart.
    chartsShared: 'Si acepta, cada uno ve la carta completa del otro, con sus casas y su Ascendente, que dejan ver a qué hora nació.',
    privacy: 'Privacidad',
    copy: 'Copiar mi link',
    copied: 'Link copiado',
    share: 'Compartir',
    shareText: 'Compara tu carta conmigo en Natus',
    renew: 'Crear un link nuevo',
    renewNote: 'El link anterior deja de funcionar.',
    empty: 'Todavía no tienes amigos en Natus.',
    remove: 'Quitar',
    removeConfirm: (name: string) =>
      `¿Quitas a ${name}? Las comparaciones entre ustedes dejan de poder leerse para los dos.`,
    removeYes: 'Sí, quitar',
    removeNo: 'Mejor no',
    needAccount: 'Para invitar amigos necesitas tu cuenta.',
    // Package 11 (16 Oct 2026).
    titleLead: 'Tus ',
    titleEmphasis: 'amigos',
    groupInvite: 'Una invitación',
    groupFriends: 'Con quienes comparas cartas',
    since: (month: string) => `Desde ${month}`,
    removeNote: 'Quitar a alguien le quita el acceso a las comparaciones que tienen en común.',
    inviteCta: 'Invitar a alguien',
    unavailable: 'No pudimos cargar tus amigos. Intenta de nuevo en un momento.',
    pending: 'Tienes una invitación de amistad esperando.',
    pendingCta: 'Verla',
    invite: {
      kicker: 'Invitación',
      titleLead: (name: string) => (name ? `${name} te invitó a ` : 'Te invitaron a '),
      titleEmphasis: 'Natus',
      body: 'Si aceptas, van a poder comparar sus cartas: solo astrología y numerología. Ninguno ve lo que el otro escribe.',
      chartsShared: 'Si aceptas, cada uno ve la carta completa del otro, con sus casas y su Ascendente, que dejan ver a qué hora nació.',
      accept: 'Aceptar',
      later: 'Ahora no',
      accepted: (name: string) => (name ? `Listo: ${name} y tú ya son amigos en Natus.` : 'Listo: ya son amigos en Natus.'),
      // Proposed (22 Oct 2026): the account they already have is offered too.
      needMap: 'Para aceptar, entra a tu cuenta. Si es tu primera vez, haz tu Mapa del Alma y crea tu cuenta: tu invitación te espera.',
      startMap: 'Hacer mi Mapa',
      needAccount: 'Para aceptar, guarda tu mapa creando tu cuenta, o entra a la que ya tienes. Tu invitación te espera.',
      createAccount: 'Crear mi cuenta',
      haveAccount: 'Ya tengo cuenta',
      invalid: 'Esta invitación ya no funciona. Pídele un link nuevo a quien te invitó.',
      own: 'Este es tu propio link. Compártelo con quien quieras comparar tu carta.',
      already: (name: string) => (name ? `${name} y tú ya son amigos en Natus.` : 'Ya son amigos en Natus.'),
      failed: 'No pudimos aceptar la invitación. Intenta de nuevo en un momento.',
      toFriends: 'Ver mis amigos',
      toToday: 'Ir a Hoy',
    },
  },
  practice: {
    cadence: {
      daily: 'Cada día',
      weekly: 'Cada semana',
      process: 'Durante el proceso',
      one_off: 'Una vez',
    },
    totalDays: (total: number) => (total === 1 ? '1 día en total' : `${total} días en total`),
    numberLabels: {
      life_path: 'Camino de vida',
      expression: 'Expresión',
      soul_urge: 'Alma',
      personality: 'Personalidad',
      birthday: 'Cumpleaños',
    },
  },
  demo: {
    fixture: 'Modo demo · guion curado',
    generated: 'Generado con Claude',
    pool: 'pool',
  },
  /** Package 02, option B (16 Oct 2026): the map seen once, after «Generando». */
  revelation: {
    // The package's short labels under the five numbers.
    numbers: {
      life_path: 'Camino',
      expression: 'Expresión',
      soul_urge: 'Alma',
      personality: 'Person.',
      birthday: 'Cumple',
    },
    // Proposed (21 Oct 2026): the preview before the account.
    // The owner's text (21 Oct 2026).
    save: 'Ver mi carta completa',
    // The owner's text (21 Oct 2026).
    saveLine: 'Guarda tu mapa gratis para leerlo completo y ver tus caminos.',
  },
  soulMap: {
    kicker: 'Tu mapa del alma',
    titleWithName: (name: string) => `${name}, esto es `,
    titleWithoutName: 'Esto es ',
    titleEmphasis: 'lo que vemos',
    sections: {
      tu_camino: 'Tu camino',
      lo_que_estas_trabajando: 'Lo que estás trabajando',
      que_necesitas_ahora: 'Qué necesitas ahora',
    },
    // Package 04 (16 Oct 2026): carta.para_probar, carta.numeros, carta.lecturas.
    toTry: 'Para probar · de tu rutina',
    // Package 04, proposed: no routine yet.
    toTryEmpty: 'Elige un camino para armar tu rutina.',
    numbers: 'Tus 5 números',
    master: 'Número maestro',
    readings: 'Tus lecturas',
    readingsBy: 'Davraz',
    readingsAi: 'IA',
    trio: { sun: 'Sol', moon: 'Luna', ascendant: 'Ascendente' },
    wheelAxes: { ac: 'AC', dc: 'DC', mc: 'MC', fc: 'FC' },
    wheelLabel: (sun: string | null, moon: string | null, ascendant: string | null) =>
      [
        'Tu carta natal',
        sun && `Sol en ${sun}`,
        moon && `Luna en ${moon}`,
        ascendant && `Ascendente en ${ascendant}`,
      ]
        .filter(Boolean)
        .join('. '),
    masterNumbersLead: 'Aparecen números maestros en tu mapa: ',
    masterNumbersTail:
      '. En la tradición pitagórica no se reducen, y se leen como una intensidad que pide más de ti.',
    numbersNote:
      'Los calculamos en tu navegador a partir de tu nombre de nacimiento y tu fecha. Son un lenguaje simbólico para pensarte, no una medición.',
    numbersFailed: 'No pudimos calcular los números con el nombre que ingresaste.',
    empty: 'Todavía no tenemos tu mapa. Empieza por el principio y lo calculamos.',
    start: 'Empezar',
    toPaths: 'Ver mis caminos',
    // Proposed (21 Oct 2026): right after saving, on to «Cómo trabajar» and «Para cuidarte».
    onToCare: 'Seguir a tus caminos',
    save: 'Guardar mi mapa',
    // v1.2 M-02, proposed (not in the guide): when the map was last written
    // and the version before it.
    // Package 04 (proposed): «Tu Mapa se actualizó el …», and the first map's date.
    updatedOn: (date: string) => `Tu Mapa se actualizó el ${date}`,
    generatedOn: (date: string) => `Tu Mapa se generó el ${date}`,
    previousShow: 'Ver la versión anterior',
    previousHide: 'Ocultar la versión anterior',
    previousFrom: (date: string) => `Versión del ${date}`,
    // Proposed (16 Oct 2026): the chart could not be calculated.
    chartMissing:
      'No pudimos calcular tu carta natal esta vez, así que este mapa se escribió con tus números y lo que contaste.',
    chartMissingCta: 'Revisar mi lugar de nacimiento',
    // Approved by the owner (22 Oct 2026): no chart because no city was given.
    cityMissing: 'Para calcular tu carta astral falta tu ciudad de nacimiento.',
    cityMissingCta: 'Agregar mi ciudad',
    // Package 04: the one primary pill, which opens level 2.
    fullChart: 'Ver mi carta completa',
  },
  /** Carta, level 2 (package 05, 15–16 Oct 2026). */
  fullChart: {
    // Package: «Volver» reads «‹ Tu mapa» here (propuesta).
    back: 'Tu mapa',
    kicker: 'Tu carta completa',
    // Package (propuesta): «Felipe, tu carta *completa*».
    titleWithName: (name: string) => `${name}, tu carta `,
    titleWithoutName: 'Tu carta ',
    titleEmphasis: 'completa',
    wheelLabel: 'Tu carta completa. Toca un punto o una línea para leerlo.',
    sect: 'De día o de noche',
    sectKind: { diurna: 'Naciste de día', nocturna: 'Naciste de noche' },
    // «bajo el horizonte» is the package's line for a day chart, turned for a night one.
    sectWhy: { diurna: 'El Sol estaba sobre el horizonte', nocturna: 'El Sol estaba bajo el horizonte' },
    ruler: 'Regente del Ascendente',
    rulerDignity: { domicilio: 'su domicilio', exaltacion: 'su exaltación', exilio: 'su exilio', caida: 'su caída' },
    rulerWhere: (sign: string, dignity: string | null, house: number | null) =>
      [`En ${sign}`, dignity, house !== null ? `casa ${house}` : null].filter(Boolean).join(', '),
    noTime:
      'Sin hora exacta no hablamos de Ascendente ni de casas. Tampoco de si naciste de día o de noche, ni del regente del Ascendente.',
    noTimeHouses: 'Sin hora exacta no hablamos de Ascendente ni de casas.',
    modesLabel: 'Vista de la rueda',
    modes: { simple: 'Simple', completa: 'Completa' },
    filterLabel: 'Aspectos por tipo',
    all: 'Todos',
    // No quintile: aspects are by sign (A-02), and the package's own rule leaves it out.
    aspects: {
      conjunction: 'Conjunción',
      opposition: 'Oposición',
      trine: 'Trígono',
      square: 'Cuadratura',
      sextile: 'Sextil',
    },
    aspectReading: {
      conjunction: 'se mezclan: tu carta sugiere que se expresan juntos, casi como una sola voz.',
      opposition: 'se miran de frente: tu carta sugiere buscar un punto medio entre los dos.',
      trine: 'fluyen con facilidad: tu carta sugiere que uno apoya al otro sin mucho esfuerzo.',
      square: 'piden ajuste: tu carta sugiere una tensión que puede volverse motor.',
      sextile: 'se abren oportunidades entre ellos cuando les das espacio.',
    },
    aspectSentence: (a: string, b: string, reading: string) =>
      `${a.charAt(0).toUpperCase()}${a.slice(1)} y ${b} ${reading}`,
    // The package's line for the Sun–Moon thread when the two pull apart.
    sunMoonApart:
      'Lo que quieres (el Sol) y lo que necesitas (la Luna) pueden tirar hacia lados distintos; tu carta sugiere escuchar a los dos antes de elegir.',
    aspectPair: (a: string, signA: string, b: string, signB: string) => `${a} en ${signA} y ${b} en ${signB}`,
    aspectWhere: (signA: string, signB: string | null) => (signB === null ? `en ${signA}` : `${signA} y ${signB}`),
    aspectLabel: (type: string, a: string, b: string) => `${type} entre ${a} y ${b}`,
    pointLabel: (name: string, sign: string, degree: number) => `${name} en ${sign}, ${degree}°`,
    hint: 'Toca un punto o una línea de la rueda para leerlo.',
    close: 'Cerrar',
    house: (n: number) => `Casa ${n}`,
    houseInList: (n: number) => `casa ${n}`,
    retrograde: 'Retrógrado',
    retrogradeShort: 'retrógrado',
    elements: { fire: 'Fuego', earth: 'Tierra', air: 'Aire', water: 'Agua' },
    modalities: { cardinal: 'Cardinal', fixed: 'Fija', mutable: 'Mutable' },
    dignities: {
      domicilio: ['Domicilio', 'un recurso más disponible, que suele fluir con menos esfuerzo.'],
      exaltacion: ['Exaltación', 'un recurso más disponible, que suele fluir con menos esfuerzo.'],
      exilio: ['Exilio', 'un área que pide más trabajo consciente.'],
      caida: ['Caída', 'un área que pide más trabajo consciente.'],
      ninguna: ['Sin dignidad esencial', 'se expresa según el signo y la casa donde está.'],
      moderno: ['No rige signos', 'en la base helenística se lee como complemento.'],
      eje: ['Eje de la carta', 'ordena las casas y los ángulos.'],
    } as Record<string, readonly [string, string]>,
    readingBy: 'Davraz',
    readingAi: 'IA',
    readingLoading: 'Cargando',
    parts: { puntos: 'Puntos', aspectos: 'Aspectos', casas: 'Casas', numeros: 'Números' },
    partsLabel: 'Partes de tu carta',
    elementsHead: 'Elementos y modalidades · de tu carta',
    elementsTable: 'Elementos por modalidad',
    /** The totals of the table count the planets only, never the axes, the Node or Chiron. */
    elementsPlanets: 'Planetas',
    groups: { pl: 'Planetas', pu: 'Puntos', ej: 'Ejes' },
    noAspects: 'No hay aspectos de este tipo en tu carta.',
    housesHead: 'Casas por signo entero · cada una mide 30°',
    houses: [
      'Identidad y cuerpo',
      'Recursos y lo que valoras',
      'Entorno cercano y aprendizaje',
      'Hogar y origen',
      'Creatividad y placer',
      'Rutina y cuidado',
      'Vínculos',
      'Lo compartido y lo profundo',
      'Sentido y viajes',
      'Vocación y lugar en el mundo',
      'Amistades y proyectos',
      'Lo invisible y el retiro',
    ],
    master: 'Número maestro',
    // What each number speaks of. 2, 8, 9 and 11 are the package's lines; the
    // others are proposed in the same voice (16 Oct 2026), for the owner.
    numberMeanings: {
      1: 'Iniciativa y una forma propia de abrir camino.',
      2: 'Un don para la cooperación y el detalle.',
      3: 'Una expresión creativa que busca ser compartida.',
      4: 'Constancia para construir, paso a paso, algo que dure.',
      5: 'Curiosidad y gusto por el cambio y la experiencia.',
      6: 'Cuidado y responsabilidad hacia quienes te rodean.',
      7: 'Una búsqueda interior de comprensión y sentido.',
      8: 'Capacidad de organizar y sostener lo que empiezas.',
      9: 'Un deseo profundo de aportar a algo más grande que tú.',
      11: 'Intuición y sensibilidad que buscan un cauce concreto.',
      22: 'Una visión amplia que pide volverse algo concreto.',
      33: 'Una vocación de cuidado y enseñanza hacia los demás.',
    } as Record<number, string>,
    /** Each point's name, and with its article for a sentence. */
    points: {
      Sun: ['Sol', 'el Sol'],
      Moon: ['Luna', 'la Luna'],
      Mercury: ['Mercurio', 'Mercurio'],
      Venus: ['Venus', 'Venus'],
      Mars: ['Marte', 'Marte'],
      Jupiter: ['Júpiter', 'Júpiter'],
      Saturn: ['Saturno', 'Saturno'],
      Uranus: ['Urano', 'Urano'],
      Neptune: ['Neptuno', 'Neptuno'],
      Pluto: ['Plutón', 'Plutón'],
      Chiron: ['Quirón', 'Quirón'],
      Lilith: ['Lilith', 'Lilith'],
      North_Node: ['Nodo Norte', 'el Nodo Norte'],
      South_Node: ['Nodo Sur', 'el Nodo Sur'],
      Ascendant: ['Ascendente', 'el Ascendente'],
      Descendant: ['Descendente', 'el Descendente'],
      Medium_Coeli: ['Medio Cielo', 'el Medio Cielo'],
      Imum_Coeli: ['Fondo del Cielo', 'el Fondo del Cielo'],
    } as Record<string, readonly [string, string]>,
    axes: { Ascendant: 'AC', Descendant: 'DC', Medium_Coeli: 'MC', Imum_Coeli: 'FC' } as Record<string, string>,
  },
  recommendations: {
    kicker: 'Caminos posibles',
    titleCount: (n: number) =>
      ['Una forma', 'Dos formas', 'Tres formas', 'Cuatro formas', 'Cinco formas'][Math.min(Math.max(n, 1), 5) - 1],
    titleMiddle: ' de ',
    titleEmphasis: 'trabajar',
    titleTail: ' lo que contaste',
    subtitle: 'Ordenadas, no puntuadas. Ninguna es la respuesta correcta.',
    framing: {
      'contemplative-fallback':
        'Con lo que nos contaste todavía no podemos afinar mucho. Estas son prácticas que suelen servir como punto de partida.',
      relaxed: 'Ampliamos la búsqueda más allá de los temas que reconocimos, para no dejarte sin opciones.',
      few: 'Son pocas, y las dejamos así. Preferimos mostrarte dos que tengan sentido antes que cinco para llenar la pantalla.',
      ordered: '',
    },
    truncated: (before: number, kept: number) =>
      `Había ${before} caminos posibles y dejamos ${kept}, empezando por los menos intensos.`,
    usedFallback:
      'No pudimos generar las explicaciones personalizadas, así que estas descripciones vienen del catálogo. El orden sigue basándose en lo que contaste.',
    spendLimit: 'Por hoy llegamos al límite de búsquedas. Nada se perdió: inténtalo de nuevo más tarde.',
    crisis:
      'Por lo que contaste, preferimos no sugerir caminos de forma automática. Si necesitas hablar con alguien, «Necesito ayuda» está siempre arriba.',
    empty: 'Los caminos salen de tu mapa, y todavía no lo tenemos.',
    start: 'Empezar',
    loading: 'Buscando caminos',
    toRoutine: 'Ver mi rutina',
    searchAgain: 'Volver a buscar',
  },
  // Package 06 (16 Oct 2026): the card's texts, keys caminos.* there.
  modalityCard: {
    counter: (n: number, total: number) => `${n} DE ${total}`,
    element: {
      fuego: 'Fuego',
      tierra: 'Tierra',
      aire: 'Aire',
      agua: 'Agua',
      eter: 'Éter',
    },
    family: {
      psicologica: 'psicológica',
      corporal: 'corporal',
      energetica: 'energética',
      simbolica: 'simbólica',
      contemplativa: 'contemplativa',
    },
    evidence: {
      clinica: 'con evidencia clínica',
      emergente: 'evidencia emergente',
      tradicional: 'tradición',
    },
    format: {
      '1:1 semanal': '1:1 semanal',
      grupal: 'Grupal',
      'taller intensivo': 'Taller intensivo',
      'práctica autónoma': 'Práctica autónoma',
    },
    horizon: {
      short: 'proceso corto',
      medium: 'proceso medio',
      long: 'proceso largo',
      flexible: 'sin plazo fijo',
    },
    caution:
      'Puede remover emociones intensas. Si estás en un momento frágil, conviene hacerla con el apoyo de un profesional de salud mental.',
    aiName: 'Davraz',
    aiLabel: 'IA',
    whatHappens: 'Qué pasa en una sesión',
    save: 'Guardar',
    saved: 'Guardada',
    dismiss: 'No me hace sentido',
    removedLead: 'Quitamos ',
    removedTail: ' de tus caminos.',
    undo: 'Deshacer',
  },
  routine: {
    kicker: 'Tu rutina',
    titleLead: 'Cosas concretas, ',
    titleEmphasis: 'no consejos',
    // Package 07 (16 Oct 2026): the stem with the phase, and the line that
    // says the phase is not earned — the short one on the phone, the long
    // one on desktop.
    phase: {
      integracion: 'Flor · Integración',
      exploracion: 'Brote · Exploración',
      pregunta: 'Semilla · Pregunta',
    },
    phaseShort: {
      integracion: 'Asentar algo propio',
      exploracion: 'Ya sabes qué; buscas cómo',
      pregunta: 'Ponerle nombre a lo que pasa',
    },
    phaseLong: {
      integracion: 'Vienes de un proceso y estás asentando algo propio.',
      exploracion: 'Ya sabes qué te pasa y estás buscando cómo trabajarlo.',
      pregunta: 'Todavía estás poniéndole nombre a lo que te pasa.',
    },
    notEarned: 'Tu fase la lee tu mapa. No se gana: cambia cuando cambia tu momento.',
    notEarnedLong: 'Tu fase la lee tu mapa desde lo que contaste. No se gana: cambia cuando cambia tu momento.',
    fromPaths: 'Sale de tus caminos',
    helper: 'Marca lo que hiciste si te sirve tenerlo a la vista. Nadie te va a decir nada si dejas de marcar.',
    markToday: 'Marcar hoy',
    doneToday: 'Hecho hoy',
    // «Una vez» (one_off): done once, and it stays done (owner, 21 Oct 2026).
    markOnce: 'Lo hice',
    doneOnce: 'Hecho',
    empty: 'Tu rutina sale de tus caminos. Empieza por verlos.',
    toPaths: 'Ver mis caminos',
    backToPaths: 'Volver a los caminos',
    generating: 'Armando tu rutina',
    connectsMap: 'Conversa con tu mapa',
    connectsTherapy: (therapy: string) => `Conversa con ${therapy}`,
    connectsBoth: (therapy: string) => `Conversa con tu mapa y con ${therapy}`,
    // v1.2 R-04. The two buttons are the guide's (9.7); the rest is proposed.
    review: {
      kicker: 'Una propuesta para tu rutina',
      by: 'Davraz',
      aiLabel: 'IA',
      titleLead: 'Un ',
      titleEmphasis: 'ajuste',
      titleTail: ' posible',
      leaves: 'Sale',
      enters: 'Entra',
      returns: 'Vuelve a tus caminos',
      why: 'Por qué',
      accept: 'Aceptar el cambio',
      keep: 'Mantener mi rutina',
      accepted: 'Listo: tu rutina ya tiene el cambio.',
      kept: 'Tu rutina sigue igual.',
      failed: 'No pudimos guardar tu respuesta. Intenta de nuevo.',
    },
    rating: {
      question: '¿Qué tan útil te resultó?',
      questionLead: '¿Qué tan útil te ',
      questionEmphasis: 'resultó',
      questionTail: '?',
      low: 'Nada',
      high: 'Mucho',
      option: (n: number) => `${n} de 5`,
      commentLabel: 'Si quieres, cuéntanos algo más',
      commentPlaceholder: 'Opcional',
      save: 'Guardar',
      skip: 'Ahora no',
    },
  },
  journal: {
    titleLead: 'Lo que vas ',
    titleEmphasis: 'viviendo',
    write: 'Escribir hoy',
    empty: 'Aquí va quedando lo que vas viviendo, con tus palabras y a tu ritmo.',
    // Guide 9.8, one notice per plan. The premium one is true only while the
    // memory is alive (M-01: premium and consent); premium without consent
    // gets the one that is.
    notice: 'Tu bitácora es tuya. Puedes borrar cualquier entrada.',
    noticePremium:
      'Davraz lee lo que escribes para conocerte mejor y ajustar tus recomendaciones. Puedes borrar cualquier entrada.',
    noticeFree: 'Tu bitácora es tuya. Con Premium, Davraz la lee para conocerte mejor y ajustar tus recomendaciones.',
    voicePremium: 'La entrada por voz está incluida en Premium',
    voiceLabel: 'Hablarlo',
    voiceStop: 'Detener',
    voiceListening: 'Te escuchamos. Lo que digas se escribe arriba.',
    // Package 08 (16 Oct 2026): the mood as five moons, «bajo» and «alto»
    // at the ends (proposed there).
    mood: 'ánimo',
    moodLabel: (n: number) => `Ánimo ${n} de 5`,
    moodQuestion: '¿Cómo te sientes?',
    moodLow: 'bajo',
    moodHigh: 'alto',
    dateLabel: 'Fecha',
    changeDate: 'cambiar fecha',
    bodyLabel: 'Lo que quieras contar',
    placeholder: 'Escribe lo que se te venga…',
    linkLabel: '¿Tiene que ver con alguna práctica?',
    linkNone: 'Ninguna',
    save: 'Listo',
    cancel: 'Volver',
    // The book (package 08 and 09): closed, its first page, the days.
    open: 'Abrir tu bitácora',
    close: 'Cerrar',
    allDays: 'todos tus días',
    previousDay: 'día anterior',
    nextDay: 'día siguiente',
    bookOf: 'Bitácora de',
    turnPage: 'pasar la página',
    folios: ['i', 'ii', 'iii'],
    weekdays: ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'],
    delete: 'borrar esta entrada',
    deleteTitleLead: '¿Borrar esta ',
    deleteTitleEmphasis: 'entrada',
    deleteTitleTail: '?',
    deleteConfirm: 'Se borra esta entrada y lo que Natus aprendió de ella. No se puede deshacer.',
    deleteYes: 'Borrar',
    deleteNo: 'Cancelar',
    /** A number in words, the way the first page writes: «mil novecientos noventa y cuatro». */
    words: (n: number): string => {
      const units = [
        'cero', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve',
        'diez', 'once', 'doce', 'trece', 'catorce', 'quince', 'dieciséis', 'diecisiete', 'dieciocho', 'diecinueve',
        'veinte', 'veintiuno', 'veintidós', 'veintitrés', 'veinticuatro', 'veinticinco', 'veintiséis', 'veintisiete',
        'veintiocho', 'veintinueve',
      ];
      const tens = ['', '', '', 'treinta', 'cuarenta', 'cincuenta', 'sesenta', 'setenta', 'ochenta', 'noventa'];
      const hundreds = ['', 'ciento', 'doscientos', 'trescientos', 'cuatrocientos', 'quinientos', 'seiscientos',
        'setecientos', 'ochocientos', 'novecientos'];
      const below100 = (k: number) =>
        k < 30 ? units[k]! : `${tens[Math.floor(k / 10)]}${k % 10 ? ` y ${units[k % 10]}` : ''}`;
      const below1000 = (k: number) =>
        k === 100 ? 'cien' : k < 100 ? below100(k) : `${hundreds[Math.floor(k / 100)]}${k % 100 ? ` ${below100(k % 100)}` : ''}`;
      if (n < 1000) return below1000(n);
      const thousands = Math.floor(n / 1000);
      const rest = n % 1000;
      return `${thousands === 1 ? 'mil' : `${below1000(thousands)} mil`}${rest ? ` ${below1000(rest)}` : ''}`;
    },
    /** A day as the page heads it: «Trece de octubre», with the year when it is another. */
    dayTitle: (iso: string, thisYear: number): string => {
      const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
      if (!m) return iso;
      const day = Number(m[3]) === 1 ? 'primero' : es.journal.words(Number(m[3]));
      const title = `${day.charAt(0).toUpperCase()}${day.slice(1)} de ${es.quota.months[Number(m[2]) - 1]}`;
      return Number(m[1]) === thisYear ? title : `${title} de ${m[1]}`;
    },
    /**
     * The first page's record of the birth (package 09): «Llegó el doce de
     * junio de mil novecientos noventa y cuatro, a las ocho y cuarenta de la
     * mañana, en Valparaíso.» The hour only when it is known.
     */
    arrival: (iso: string, time: string, city: string): { lead: string; date: string; tail: string } | null => {
      const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
      if (!m) return null;
      const w = es.journal.words;
      const day = Number(m[3]);
      const date = `${day === 1 ? 'primero' : w(day)} de ${es.quota.months[Number(m[2]) - 1]}`;
      let tail = ` de ${w(Number(m[1]))}`;
      const t = /^(\d{2}):(\d{2})$/.exec(time.trim());
      if (t) {
        const h = Number(t[1]);
        const min = Number(t[2]);
        const h12 = h % 12 === 0 ? 12 : h % 12;
        const hour = h12 === 1 ? 'a la una' : `a las ${w(h12)}`;
        const minutes = min === 0 ? '' : min === 15 ? ' y cuarto' : min === 30 ? ' y media' : ` y ${w(min)}`;
        const part =
          h < 6 ? 'de la madrugada' : h < 12 ? 'de la mañana' : h === 12 ? 'del día' : h < 20 ? 'de la tarde' : 'de la noche';
        tail += `, ${hour}${minutes} ${part}`;
      }
      if (city.trim()) tail += `, en ${city.trim()}`;
      return { lead: 'Llegó el ', date, tail: `${tail}.` };
    },
    /** What is written on the wheel of moons (package 09). */
    wheel: {
      signs: ['Aries', 'Tauro', 'Géminis', 'Cáncer', 'Leo', 'Virgo', 'Libra', 'Escorpio', 'Sagitario', 'Capricornio',
        'Acuario', 'Piscis'],
      houses: ['cuerpo', 'lo propio', 'palabras', 'raíz', 'juego', 'días', 'los otros', 'lo hondo', 'viaje', 'camino',
        'amigos', 'lo oculto'],
      planets: {
        Sun: 'Sol',
        Moon: 'Luna',
        Mercury: 'Mercurio',
        Venus: 'Venus',
        Mars: 'Marte',
        Jupiter: 'Júpiter',
        Saturn: 'Saturno',
        Uranus: 'Urano',
        Neptune: 'Neptuno',
        Pluto: 'Plutón',
      } as Record<string, string>,
      sun: 'su Sol',
      moon: 'su Luna',
      ascendant: 'su Ascendente',
      number: (n: number): string => `su número, el ${es.journal.words(n)}`,
      and: ' y ',
    },
    /** "16 de octubre", or "16 de octubre de 2025" for another year. */
    date: (iso: string, thisYear: number) => {
      const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
      if (!m) return iso;
      const day = `${Number(m[3])} de ${es.quota.months[Number(m[2]) - 1]}`;
      return Number(m[1]) === thisYear ? day : `${day} de ${m[1]}`;
    },
  },
  /**
   * «Pregúntale a tu carta», the bubble on Carta (owner, 22 Oct 2026; texts
   * approved by him from the mockup, the questions chosen on the same day).
   */
  chartChat: {
    bubble: 'Pregúntale a tu carta',
    greetingLead: 'Pregúntame lo que quieras de ',
    greetingEmphasis: 'tu carta',
    sub: 'Tus planetas, tus casas y tus números, explicados con calma.',
    startLabel: 'Para empezar',
    /**
     * The Moon and Mars from the person's own chart (owner, 22 Oct 2026). A
     * sign is named only when it is known: never the Moon without the hour.
     */
    questions: (moon: string | null, mars: string | null) => [
      moon ? `¿Cómo afecta mi Luna en ${moon} a mis relaciones?` : '¿Cómo afecta mi Luna a mis relaciones?',
      '¿Qué patrón se repite en mi vida?',
      mars ? `¿Cómo afecta mi Marte en ${mars} a mi forma de trabajar?` : '¿Cómo afecta mi Marte a mi forma de trabajar?',
    ],
    placeholder: 'Escribe tu pregunta…',
    toChat: 'Conversar en el Chat',
    close: 'Cerrar',
  },
  chat: {
    kicker: 'Chat',
    name: 'Davraz de Fala',
    aiLabel: 'IA',
    remaining: (n: number) => (n === 1 ? 'Te queda 1 pregunta' : `Te quedan ${n} preguntas`),
    aboutComparison: (name: string) => `Conversando sobre tu comparación con ${name}`,
    aboutComparisonRemove: 'Quitar',
    newThisMonth: (n: number) =>
      n === 1 ? 'Este mes tienes 1 pregunta nueva' : `Este mes tienes ${n} preguntas nuevas`,
    // Package 10 (16 Oct 2026): chat.titulo, chat.salir, the examples.
    titleLead: 'Pregúntale ',
    titleEmphasis: 'a tu mapa',
    exit: 'Salir',
    examplesLabel: 'Puedes preguntar, por ejemplo',
    /** Three to tap, the middle one from the person's Moon when the chart has it. */
    examples: (moon: string | null) => [
      '¿Por qué me cuesta tanto descansar?',
      moon
        ? `¿Qué dice mi Luna en ${moon} de cómo siento las cosas?`
        : '¿Qué dice mi mapa de cómo siento las cosas?',
      '¿Qué puedo hacer cuando se me acelera la cabeza en la noche?',
    ],
    signs: {
      Aries: 'Aries',
      Taurus: 'Tauro',
      Gemini: 'Géminis',
      Cancer: 'Cáncer',
      Leo: 'Leo',
      Virgo: 'Virgo',
      Libra: 'Libra',
      Scorpio: 'Escorpio',
      Sagittarius: 'Sagitario',
      Capricorn: 'Capricornio',
      Aquarius: 'Acuario',
      Pisces: 'Piscis',
    } as Record<string, string>,
    typeLabel: {
      reflection: 'Una reflexión',
      recommendation: 'Un camino',
      clarifying_question: 'Una pregunta',
      crisis: 'Antes de seguir',
      off_chart: 'Fuera de tu carta',
    },
    /** Package 10, chat.crisis.*: the answer to a low signal, and the lines under it. */
    crisisReply:
      'Gracias por escribirlo. Lo que sientes importa, y no tienes que cargarlo en soledad. Si en algún momento piensas en hacerte daño, habla ahora con alguien: hay personas preparadas para escucharte a cualquier hora.',
    crisisLines: 'Si necesitas hablar con alguien ahora',
    call: (name: string, contact: string) => `Llamar a ${name}, ${contact}`,
    /** Package 10, chat.paywall.*. US$ 10, not the package's 7 (owner, 16 Oct 2026). */
    paywall: {
      titleLead: 'Seguir ',
      titleEmphasis: 'conversando',
      body: 'Usaste tus preguntas de regalo. Con Premium conversas con Davraz sin límite, y recuerda lo que ya hablaron. Lo que escribiste queda guardado.',
      price: 'US$ 10',
      period: 'al mes · el primer mes es gratis',
      cancel: 'Cancelas cuando quieras',
      trial: 'Probar un mes gratis',
      notNow: 'Ahora no',
      next: (date: string) => `Tu próxima pregunta de regalo llega el ${date}.`,
    },
    containmentMessage:
      'Paramos aquí. Por lo que escribiste, esto no es algo para atravesar sin compañía y no es algo que esta conversación pueda acompañar. Hay personas disponibles ahora mismo para hablar contigo.',
    containmentNote:
      'Dejamos la conversación aquí por ahora. No es un castigo y no se borró nada: esto merece hablarse con una persona.',
    notMyCase: 'Esto no aplica a mi caso',
    thinking: 'Pensando…',
    spendLimit: 'Por hoy no podemos responder más. Lo que escribiste sigue aquí: inténtalo más tarde.',
    placeholder: 'Escribe lo que se te venga…',
    messageLabel: 'Tu mensaje',
    send: 'Enviar',
    empty_noMap: 'La conversación se apoya en tu mapa, y todavía no lo tenemos.',
    start: 'Empezar',
  },
  paywall: {
    label: 'Se terminó lo incluido',
    kicker: 'Hasta aquí llega lo incluido',
    /** The chat's sheet when the offer is held back after a crisis alert. */
    title: {
      chat: 'Usaste las preguntas incluidas.',
    },
    body: {
      chat: 'Lo que escribiste sigue guardado en el cuadro de abajo. Tu mapa, tus caminos y tu rutina siguen disponibles sin pagar nada.',
    },
    /** Package 13 (16 Oct 2026): the sheet over meditations and comparisons. US$ 10, not the package's 7. */
    titleLead: {
      meditation: 'Ya usaste tu meditación ',
      comparison: 'Usaste las comparaciones ',
      // Proposal (owner, 16 Oct 2026): Premium right after the map, the free month first.
      welcome: 'Tu primer mes de Premium es ',
    },
    titleEmphasis: {
      meditation: 'de regalo',
      comparison: 'de este mes',
      welcome: 'gratis',
    },
    welcomeKicker: 'Tu mapa ya es tuyo',
    kept: 'Tu mapa, tus caminos y tu rutina siguen disponibles sin pagar nada.',
    includes: [
      'Conversar con Davraz sin límite',
      '10 meditaciones al mes',
      'Comparaciones sin límite',
      'Bitácora por voz y una memoria que te conoce',
      'Tu rutina revisada cada semana',
    ],
    price: 'US$ 10',
    period: 'al mes · el primer mes es gratis',
    cancel: 'Cancelas cuando quieras',
    trial: 'Probar un mes gratis',
    notNow: 'Ahora no',
    renew: (date: string) => `Tus comparaciones se renuevan el ${date}.`,
    /** Proposal, not in package 13: the free month day by day, shown once «Probar un mes gratis» is touched. */
    calendar: {
      label: 'Tu mes gratis, día a día',
      today: 'Hoy',
      start: 'Empieza tu mes gratis, con todo Premium.',
      until: (date: string) => `Hasta el ${date}`,
      cancel: 'Cancelas desde PayPal cuando quieras, sin pagar nada.',
      charge: 'Primer cobro: US$ 10, IVA incluido. Después, cada mes ese mismo día.',
    },
    approved: 'Listo. Tu suscripción quedó registrada en PayPal y tu Premium se activa en unos segundos.',
    unavailable: 'Ahora no pudimos cargar el pago. Prueba de nuevo en un rato.',
    back: 'Volver',
  },
  /** v1.2 F-01: what a plan has left, said before it is used. */
  quota: {
    meditations: (n: number) => (n === 1 ? 'Te queda 1 meditación' : `Te quedan ${n} meditaciones`),
    comparisons: (n: number) =>
      n === 1 ? 'Te queda 1 comparación este mes' : `Te quedan ${n} comparaciones este mes`,
    usedThisMonth: (date: string) => `Usaste las de este mes. Se renuevan el ${date}.`,
    cap: (date: string) => `Llegaste al tope de este mes. Se renueva el ${date}.`,
    months: [
      'enero',
      'febrero',
      'marzo',
      'abril',
      'mayo',
      'junio',
      'julio',
      'agosto',
      'septiembre',
      'octubre',
      'noviembre',
      'diciembre',
    ],
  },
  meditation: {
    kicker: 'Meditaciones',
    titleLead: 'Una práctica, ',
    titleEmphasis: 'armada para hoy',
    helper:
      'Cuéntanos con qué llegas. No hace falta que sea una intención elevada: «hoy todo me pesa» es una intención.',
    intentLabel: '¿Con qué llegas?',
    placeholder: 'Escribe lo que se te venga…',
    lengthLabel: 'Cuánto tiempo',
    minutes: (n: number) => `${n} min`,
    // The meditation's voice (29 Oct 2026); approved by the owner the same day.
    voiceLabel: 'Quién te guía',
    voiceOptions: [
      ['mujer', 'Voz de mujer'],
      ['hombre', 'Voz de hombre'],
    ] as const,
    preparingVoice: 'Preparando la voz…',
    noSpeech: 'Este navegador no tiene síntesis de voz, así que podrás leer el guion, pero no escucharlo.',
    spendLimit: 'Por hoy llegamos al límite de prácticas. Lo que escribiste sigue aquí: inténtalo más tarde.',
    crisis:
      'Por lo que escribiste, preferimos no armar una práctica automática. Si necesitas hablar con alguien, «Necesito ayuda» está siempre arriba.',
    generating: 'Armando la práctica',
    // Package 14 (16 Oct 2026): the «Armando» state. The title is a proposal.
    generatingTitleLead: 'Armando tu ',
    generatingTitleEmphasis: 'práctica',
    wait: 'Esto puede tardar un momento',
    loading: 'Cargando',
    generate: 'Armar mi práctica',
    saved: 'Mis prácticas guardadas',
    voiceOnly: 'Solo voz',
    duration: (estimated: number, requested: number) => `${estimated} min aproximados · pediste ${requested}`,
    progress: 'Avance de la práctica',
    stop: 'Parar',
    again: 'Escuchar de nuevo',
    play: 'Empezar',
    voice: 'Voz',
    bed: 'Fondo',
    script: 'El guion',
    another: 'Armar otra',
  },
  library: {
    kicker: 'Mis prácticas',
    titleLead: 'Lo que fuiste ',
    titleEmphasis: 'armando',
    empty:
      'Todavía no armaste ninguna. Cada práctica sale de una intención concreta, así que no hay un catálogo para elegir: se arma cuando la pides.',
    create: 'Armar una práctica',
    delete: 'Borrar',
    keep: 'Mejor no',
    // Package 14 proposes «¿Borramos esta práctica? Se borra también el
    // audio.» No audio is stored (it is spoken at play time), so the second
    // sentence is held back until the owner answers.
    deleteConfirm: '¿Borramos esta práctica?',
    listen: 'Escuchar',
    voiceOnly: 'Solo voz',
    locale: 'es',
  },
  signup: {
    alreadySignedIn: 'Tu cuenta ya está creada.',
    toHome: 'Ir a mi espacio',
    noMap: 'Primero generamos tu mapa. La cuenta viene después, cuando ya tengas algo que guardar.',
    start: 'Empezar',
    invalidEmail: 'Revisa la dirección: parece que le falta algo.',
    localFailed: 'No pudimos guardar la cuenta en este navegador.',
    mailFailed: 'Guardamos todo, pero no pudimos enviarte el correo de confirmación.',
    sentLead: 'Te enviamos un correo a ',
    sentTail: '. Ábrelo para confirmar la dirección.',
    sentNote: 'Tu mapa ya está guardado. Confirmar sirve para que puedas volver desde otro dispositivo.',
    // Package 01, «Revisa tu correo» (proposed there, 16 Oct 2026).
    sentKicker: 'Revisa tu correo',
    sentTitleLead: 'Te escribimos a tu ',
    sentTitleEmphasis: 'correo',
    sentSpam: 'Si no llega en unos minutos, revisa la carpeta de spam.',
    or: 'o',
    kicker: 'Guardar tu mapa',
    titleLead: 'Para volver ',
    titleEmphasis: 'cuando quieras',
    helper:
      'Tu mapa, tus caminos y tu rutina quedan asociados a esta dirección. Puedes seguir sin cuenta: en ese caso todo se guarda igual, pero solo en este navegador y por siete días.',
    emailLabel: 'Tu correo',
    emailPlaceholder: 'nombre@ejemplo.com',
    noteBackend:
      'Te enviaremos un correo con un enlace para confirmar la dirección. No hay contraseña. Puedes borrar todo en un clic desde tu perfil.',
    noteOffline:
      'En esta versión no se envía ningún correo ni se crea ninguna cuenta en ningún servidor. La dirección queda escrita en este navegador y nada más. Puedes borrar todo en un clic desde tu perfil.',
    saving: 'Guardando…',
    create: 'Crear mi cuenta',
    // Launch with Google only (owner, 16 Oct 2026); proposed texts.
    // Package 01, proposed there («la demo decía Entrar con Google»).
    google: 'Seguir con Google',
    googleNote: 'Usamos tu cuenta de Google solo para que puedas volver a entrar, desde este o desde otro dispositivo.',
    googleTaken:
      'Esa cuenta de Google ya tiene su propio espacio en Natus. Para usarla, entra con ella desde el inicio.',
    googleFailed: 'No pudimos abrir el ingreso con Google. Inténtalo de nuevo en un momento.',
    later: 'Ahora no',
    // Entering with a 6-digit code (owner, 20 Oct 2026, mockup «Entrar con
    // un código», approved with its proposed texts).
    send: 'Enviarme el código',
    otherEmail: 'Usar otro correo',
    // Saving the map with an address that already has a space: option A,
    // proposed and approved by the owner (20 Oct 2026), as with Google.
    emailTaken: 'Ese correo ya tiene su propio espacio en Natus. Puedes entrar con él, o usar otro correo para guardar este mapa.',
    useThatEmail: 'Entrar con ese correo',
    code: {
      titleLead: 'Escribe tu ',
      titleEmphasis: 'código',
      leadHead: 'Te enviamos un código de 6 dígitos a ',
      leadTail: '.',
      resend: 'Reenviar el código',
      wait: 'Puedes pedir otro en un minuto.',
      checking: 'Revisando el código…',
      wrong: 'Ese código no coincide. Revisa los números o pide uno nuevo.',
      expired: 'Este código ya venció. Pide uno nuevo: llega en unos segundos.',
      newCode: 'Pedir un código nuevo',
      resent: 'Te mandamos un código nuevo.',
      // The network or the mail service failed (proposed, owner approved 20 Oct 2026).
      sendFailed: 'No pudimos enviar el código. Inténtalo de nuevo en un momento.',
      checkFailed: 'No pudimos revisar el código. Inténtalo de nuevo en un momento.',
    },
    returning: {
      kicker: 'Volver a tu espacio',
      titleLead: 'Entra a tu ',
      titleEmphasis: 'espacio',
      helper: 'Con la misma cuenta con la que guardaste tu mapa.',
      firstLead: '¿Es tu primera vez? ',
      firstLink: 'Empieza desde el inicio',
      none: 'No encontramos un espacio con ese correo. Revisa la dirección, o entra con Google si guardaste tu mapa así.',
    },
    // Google before the map (owner, 16 Oct 2026); approved texts. Helper and
    // note changed with the code (owner, 20 Oct 2026).
    required: {
      // Proposed (21 Oct 2026): it now comes right after the preview.
      titleLead: 'Para leerlo ',
      titleEmphasis: 'completo',
      helper: 'Guárdalo con Google o con tu correo y sigue a tus caminos. Así vuelves a él cuando quieras, desde cualquier dispositivo.',
      cta: 'Continuar con Google',
      // Back to the preview (owner, 21 Oct 2026).
      backToMap: 'Volver a mi mapa',
      note: 'Usamos tu correo o tu cuenta de Google solo para que puedas volver a entrar. No hay contraseña.',
      // Proposed: that Google account already has its own space.
      taken:
        'Esa cuenta de Google ya tiene su propio espacio en Natus. Puedes entrar con ella, o elegir otra cuenta para guardar este mapa.',
      useThatAccount: 'Entrar con esa cuenta',
    },
  },
  gate: {
    authFailed: 'No pudimos abrir el ingreso con Google. Inténtalo de nuevo en un momento.',
    failed: 'Algo falló al intentar entrar.',
    titleLead: 'Esto todavía ',
    titleEmphasis: 'no está abierto',
    helper:
      'Es una versión temprana, con un grupo pequeño de personas invitadas. Entra con la dirección con la que te invitamos.',
    opening: 'Abriendo…',
    enter: 'Entrar con Google',
    unverified: 'Google te avisará que la aplicación no está verificada. Es esperable en esta etapa: puedes continuar.',
    notListed: 'Si te invitamos y no puedes entrar, escríbenos: hay que agregar tu dirección a la lista.',
  },
  landing: {
    kicker: 'Te damos la bienvenida',
    // Package 01 (16 Oct 2026).
    brand: 'NATUS',
    phraseLead: 'Un espejo para conocerte y personas reales para ',
    phraseEmphasis: 'acompañarte',
    phraseTail: '.',
    // Also the link for somebody with an account on another device, which
    // signs in with Google (package 01: «es para quien ya tiene una»).
    returning: 'Volver a mi espacio',
    start: 'Comenzar',
    restart: 'Empezar de nuevo',
  },
  // Suggestions during the beta (owner, 18 Oct 2026). No package design:
  // built from the package's pieces; every text is a proposal.
  suggestions: {
    button: 'Sugerencias',
    // Beside the icon in the header (owner, 18 Oct 2026: «que se entienda»).
    buttonLabel: 'Sugerir o reportar',
    // The phone's header has room for one word.
    buttonShort: 'Sugerir',
    kicker: 'Natus está en prueba',
    titleLead: '',
    titleEmphasis: 'Sugerencias',
    titleTail: '',
    intro:
      'Sugiérenos cambios, arreglos o lo que se te ocurra para mejorar Natus. Lo leemos todo y te respondemos aquí.',
    placeholder: 'Escribe aquí…',
    send: 'Enviar',
    close: 'Cerrar',
    you: 'Tú',
    team: 'Equipo Natus',
    thanks: 'Gracias. Lo leemos todo.',
    failed: 'No se pudo enviar. Inténtalo de nuevo.',
    unavailable: 'No pudimos abrir la conversación. Inténtalo en un momento.',
    unread: 'Tienes una respuesta del equipo',
  },
  // Privacy policy and terms (owner, 16 Oct 2026): written to launch, to be
  // reviewed by the owner's lawyer. CONTACT is the address people write to.
  legal: {
    updated: 'Actualizada el 18 de octubre de 2026',
    contactLead: 'Escríbenos a ',
    contact: 'hola@natus.world' as string,
    back: 'Volver',
    otherPrivacy: 'Política de privacidad',
    otherTerms: 'Términos y condiciones',
    linkPrivacy: 'Privacidad',
    linkTerms: 'Términos',
    privacy: {
      kicker: 'Natus',
      title: 'Política de privacidad',
      intro:
        'Natus es una aplicación de autoconocimiento. Para acompañarte te pedimos datos personales, algunos de ellos sensibles. Aquí explicamos cuáles, para qué, con quién se comparten y cómo puedes verlos, corregirlos o borrarlos.',
      sections: [
        {
          heading: 'Quién es responsable',
          body: [
            'El responsable de tus datos es Natus, con sede en Chile. Si tienes cualquier pregunta sobre esta política o sobre tus datos, puedes escribirnos al correo de contacto que aparece al final de esta página.',
          ],
        },
        {
          heading: 'Qué datos tratamos',
          body: [
            'Datos de nacimiento: tu nombre, fecha, hora (si la sabes), ciudad y país de nacimiento, y el país donde vives. Con ellos calculamos tu carta natal y tus números.',
            'Lo que nos cuentas: lo que estás buscando, cómo quieres que te hablemos, tus respuestas a las preguntas sobre tu salud emocional, lo que escribes o dictas en tu bitácora, tus conversaciones con Davraz, tus valoraciones y comentarios sobre las prácticas, y lo que pides a las meditaciones.',
            'Lo que Natus sabe de ti: si tienes Premium y das tu consentimiento, Natus guarda una memoria con lo que aprende de tus conversaciones, tu bitácora y tus prácticas. Puedes verla, corregirla y borrarla desde tu perfil.',
            'Amistades: si invitas a alguien o aceptas una invitación, guardamos la amistad y las comparaciones entre sus cartas. Mientras sean amigos, cada uno ve la carta natal completa del otro, con sus casas y su Ascendente, que dejan ver la hora de nacimiento; si la amistad termina, deja de verse.',
            'Tus sugerencias: lo que nos escribes en «Sugerencias», las respuestas del equipo y en qué pantalla estabas cuando escribiste.',
            'Tu cuenta: el correo y el identificador de tu cuenta de Google.',
            'Datos técnicos: registros de uso de la aplicación (qué paso se dio y cuándo, nunca el contenido), registros del costo de cada respuesta generada y, cuando algo que escribes indica una posible crisis, un registro de ese aviso con un extracto del texto.',
          ],
        },
        {
          heading: 'Datos sensibles',
          body: [
            'Tus respuestas sobre salud emocional, tu bitácora y tus conversaciones son datos sensibles. Los usamos para cuidarte dentro de la aplicación: decidir qué terapias no recomendarte, mostrarte líneas de ayuda cuando hace falta y adaptar las respuestas. Tus respuestas clínicas nunca se envían tal cual a un modelo de inteligencia artificial: solo un nivel de cuidado derivado de ellas.',
            'El equipo de Natus puede leer tus datos, incluidos los sensibles, junto a tu nombre y tu correo: para mejorar la aplicación, personalizar lo que te recomienda Davraz y estudiar, en grupos, qué prácticas le sirven a qué personas. Cada vez que alguien del equipo abre los datos de una persona, queda registrado quién lo hizo y cuándo.',
            'Al usar Natus y responder esas preguntas, das tu consentimiento expreso para este tratamiento. Puedes retirarlo en cualquier momento borrando tus datos.',
          ],
        },
        {
          heading: 'Para qué los usamos',
          body: [
            'Para escribir tu Mapa del Alma, recomendarte caminos y una rutina, conversar contigo, crear meditaciones y comparar cartas con tus amistades. Para detectar señales de crisis y mostrarte líneas de ayuda. Para administrar tu plan y tus pagos. Para responder tus sugerencias. Para entender cómo se usa la aplicación y mejorarla: el equipo ve cuántas personas dan cada paso y puede leer lo que cada persona escribió, como se explica en «Datos sensibles».',
            'No vendemos tus datos. No los usamos para publicidad ni los compartimos con plataformas de anuncios, y no hay rastreadores publicitarios en la aplicación.',
          ],
        },
        {
          heading: 'Con quién los compartimos',
          body: [
            'Solo con los servicios que hacen funcionar Natus, y solo lo necesario:',
            'Supabase guarda la base de datos y ejecuta nuestras funciones, en servidores de São Paulo, Brasil.',
            'Anthropic (Claude) genera los textos: tu mapa, tus caminos, tu rutina, las conversaciones con Davraz, las meditaciones y la memoria. Recibe lo necesario para cada respuesta y, según sus condiciones para empresas, no lo usa para entrenar sus modelos.',
            'Astrologer API, a través de RapidAPI, recibe tu fecha, hora y lugar de nacimiento para calcular tu carta natal.',
            'Open-Meteo recibe el nombre de la ciudad que escribes y su país, para sugerirte tu lugar de nacimiento y saber dónde queda.',
            'Google gestiona el inicio de sesión. Si dictas en la bitácora, el dictado lo hace tu navegador: Chrome lo envía a Google y Safari a Apple. Natus no guarda audio.',
            'PayPal procesa los pagos de Premium. Natus nunca ve los datos de tu tarjeta.',
            'GitHub Pages sirve la aplicación.',
            'Algunos de estos servicios están fuera de Chile, por lo que tus datos se transfieren a otros países. Lo hacemos con proveedores que ofrecen garantías de seguridad y confidencialidad.',
          ],
        },
        {
          heading: 'Cuánto tiempo los guardamos',
          body: [
            'Mientras tengas tu cuenta. Si borras una entrada de tu bitácora, se borra de verdad; si borras algo de tu memoria, también. Si borras todo desde tu perfil, se elimina tu cuenta con todo lo que contiene.',
          ],
        },
        {
          heading: 'Tus derechos',
          body: [
            'Puedes acceder a tus datos, corregirlos, borrarlos, oponerte a su tratamiento y llevártelos. Desde tu perfil puedes descargar todo en un archivo («Descargar mis datos»), corregir tus datos de nacimiento y borrar tu cuenta («Borrar todo»). Para cualquier otra solicitud, escríbenos y te respondemos en un plazo máximo de 30 días.',
            'Si crees que no respondimos bien, puedes acudir a la autoridad de protección de datos de tu país.',
          ],
        },
        {
          heading: 'Almacenamiento en tu navegador',
          body: [
            'Natus guarda en tu navegador una copia de tus datos y tu sesión para funcionar más rápido y sin conexión. No usamos cookies de publicidad ni de terceros.',
          ],
        },
        {
          heading: 'Seguridad',
          body: [
            'Cada persona solo puede leer sus propios datos: la base de datos lo impide por regla, no por confianza. Las claves de los servicios viven en el servidor, nunca en la aplicación. Ningún sistema es perfecto; si ocurre un problema que afecte tus datos, te avisaremos.',
          ],
        },
        {
          heading: 'Edad',
          body: ['Natus es para personas mayores de 18 años. No tratamos a sabiendas datos de menores de edad.'],
        },
        {
          heading: 'Cambios',
          body: [
            'Si cambiamos esta política de forma importante, te lo diremos dentro de la aplicación antes de que el cambio rija.',
          ],
        },
      ],
    },
    terms: {
      kicker: 'Natus',
      title: 'Términos y condiciones',
      intro:
        'Estos términos rigen el uso de Natus. Al crear tu cuenta o usar la aplicación, los aceptas.',
      sections: [
        {
          heading: 'Qué es Natus',
          body: [
            'Natus es una aplicación de autoconocimiento que usa la astrología, la numerología y otras tradiciones como un espejo para mirarte. No predice el futuro ni dice qué está bien o mal en ti.',
            'Los textos de Natus, incluido Davraz, los genera una inteligencia artificial. Pueden equivocarse. Tómalos como una invitación a reflexionar, no como una verdad sobre ti.',
          ],
        },
        {
          heading: 'Natus no es un servicio de salud',
          body: [
            'Natus no diagnostica, no da tratamiento y no reemplaza a un profesional de la salud mental ni a un médico. Las terapias que te muestra son modalidades para explorar, no indicaciones.',
            'Natus no es un servicio de emergencia y nadie revisa en tiempo real lo que escribes. Si estás en peligro o piensas en hacerte daño, llama a una línea de ayuda o al número de emergencias de tu país. La aplicación te muestra líneas de ayuda, pero no podemos garantizar que cada número esté disponible en todo momento.',
          ],
        },
        {
          heading: 'Tu cuenta',
          body: [
            'Necesitas tener 18 años o más. Entras con tu cuenta de Google y eres responsable de lo que ocurra con ella. Puedes borrar tu cuenta cuando quieras desde tu perfil.',
          ],
        },
        {
          heading: 'Cómo usarla',
          body: [
            'Úsala para ti. No intentes acceder a datos de otras personas, ni interferir con el servicio, ni usarlo para dañar a alguien. Si invitas a una amistad, la comparación entre sus cartas la leen solo ustedes dos mientras la amistad siga activa.',
          ],
        },
        {
          heading: 'Planes y pagos',
          body: [
            'El plan gratuito incluye un número limitado de preguntas a Davraz, meditaciones y comparaciones, que se muestran en la aplicación.',
            'Premium cuesta US$10 al mes, IVA incluido, y el primer mes es gratis. El cobro se hace a través de PayPal y se renueva cada mes hasta que canceles. Puedes cancelar cuando quieras desde PayPal; conservas Premium hasta el final del período ya pagado y no se te vuelve a cobrar.',
            'Premium tiene un límite de uso razonable al mes para que el servicio sea sostenible; si lo alcanzas, la aplicación te dice cuándo se renueva.',
            'Lo que la ley de tu país te garantiza como consumidor se mantiene siempre, incluido tu derecho a retracto cuando corresponda.',
          ],
        },
        {
          heading: 'Lo que es tuyo y lo que es nuestro',
          body: [
            'Lo que escribes es tuyo. Nos das permiso para guardarlo y procesarlo solo para darte el servicio, como explica la política de privacidad. La aplicación, su diseño, sus textos e imágenes son de Natus o de sus licenciantes.',
          ],
        },
        {
          heading: 'Cambios y disponibilidad',
          body: [
            'Natus está en una etapa temprana y va a cambiar. Podemos agregar, modificar o quitar funciones. Si cambiamos estos términos de forma importante, te avisaremos en la aplicación antes de que rijan. Hacemos lo posible para que el servicio funcione siempre, pero no podemos garantizarlo.',
          ],
        },
        {
          heading: 'Responsabilidad',
          body: [
            'En la medida que la ley lo permita, Natus no responde por las decisiones que tomes a partir de sus textos. Nada en estos términos limita los derechos que la ley te da como consumidor.',
          ],
        },
        {
          heading: 'Ley aplicable',
          body: [
            'Estos términos se rigen por las leyes de Chile, sin perjuicio de los derechos que te dé la ley del país donde vives.',
          ],
        },
      ],
    },
  },
  // The notice that the houses are changing (owner, 27 Oct 2026, «Muy pronto»).
  housesNotice: {
    title: 'Estamos cambiando tus casas',
    body: 'Muchas personas nos pidieron ver sus casas como en otras apps. Muy pronto tu carta usará el sistema Placidus, y podrás seguir viéndolas por signo entero si lo prefieres.',
    unchanged: 'Tus signos, tu Ascendente y tus números no cambian.',
    ok: 'Entendido',
  },
  notFound: {
    title: 'Esta página no existe.',
    body: 'Puede que el enlace esté mal escrito o sea de una versión anterior.',
    home: 'Ir al inicio',
  },
  crisisScreen: {
    // Package 12 (16 Oct 2026).
    kicker: 'Un momento',
    titleLead: 'No tienes que pasar por esto en ',
    titleEmphasis: 'soledad',
    message:
      'Lo que escribiste nos dice que puede ser un momento muy difícil. Hablar ahora con alguien puede ayudar. Estas líneas atienden a cualquier hora.',
    back: 'Volver',
    notMyCase: 'Esto no aplica a mi caso',
    data: 'Descargar o borrar mis datos',
  },
  crisisBanner: {
    label: 'Si en algún momento se pone difícil, hay a quién llamar.',
  },
  crisisResources: {
    unverifiedLead:
      'Estos números están tomados de fuentes públicas y todavía no se verificaron uno por uno. Si alguno no responde, entra a ',
    unverifiedSite: 'findahelpline.com',
    unverifiedTail: ' o llama al número de emergencias de tu país.',
    // Package 12 (16 Oct 2026): the box around the emergency number.
    emergency: 'Si tu vida o la de otra persona está en peligro ahora, llama a emergencias.',
    call: (name: string, contact: string) => `Llamar a ${name}, ${contact}`,
    callEmergency: (contact: string) => `Llamar a emergencias, ${contact}`,
    openDirectory: (name: string) => `Abrir ${name} en otra pestaña`,
  },
  saveFailure: {
    offline: 'No pudimos conectar con tu cuenta. Lo que hagas ahora queda solo en este navegador y no se guarda.',
    failed: 'No pudimos guardar lo último en tu cuenta. Sigue aquí, en este navegador, pero si lo cierras se pierde.',
    ok: 'Entendido',
  },
  errorBoundary: {
    crisisKicker: 'Antes de seguir',
    crisisTitle: 'Se rompió la pantalla, no lo que te está pasando.',
    crisisBody: 'Hay personas disponibles ahora mismo para hablar contigo.',
    kicker: 'Algo salió mal',
    title: 'Se rompió algo de este lado.',
    body: 'Es un problema nuestro, no algo que hayas hecho mal. Lo que ya habías guardado sigue guardado.',
    retry: 'Volver a intentar',
    home: 'Ir al inicio',
  },
  birthCountries: [
    ['', 'Elige un país'],
    ['AR', 'Argentina'],
    ['BO', 'Bolivia'],
    ['BR', 'Brasil'],
    ['CL', 'Chile'],
    ['CO', 'Colombia'],
    ['CR', 'Costa Rica'],
    ['CU', 'Cuba'],
    ['DO', 'República Dominicana'],
    ['EC', 'Ecuador'],
    ['SV', 'El Salvador'],
    ['GT', 'Guatemala'],
    ['HN', 'Honduras'],
    ['MX', 'México'],
    ['NI', 'Nicaragua'],
    ['PA', 'Panamá'],
    ['PY', 'Paraguay'],
    ['PE', 'Perú'],
    ['PR', 'Puerto Rico'],
    ['UY', 'Uruguay'],
    ['US', 'Estados Unidos'],
    ['VE', 'Venezuela'],
  ] as readonly (readonly [string, string])[],
  /** Names the ephemeris returns in English, as they are shown. */
  astro: {
    bodies: {
      Sun: 'Sol',
      Moon: 'Luna',
      Mercury: 'Mercurio',
      Venus: 'Venus',
      Mars: 'Marte',
      Jupiter: 'Júpiter',
      Saturn: 'Saturno',
      Uranus: 'Urano',
      Neptune: 'Neptuno',
      Pluto: 'Plutón',
      Chiron: 'Quirón',
      Mean_Lilith: 'Lilith',
      True_North_Lunar_Node: 'Nodo norte',
      True_South_Lunar_Node: 'Nodo sur',
      Mean_North_Lunar_Node: 'Nodo norte',
      Mean_South_Lunar_Node: 'Nodo sur',
      Ascendant: 'Ascendente',
      Descendant: 'Descendente',
      Medium_Coeli: 'Medio cielo',
      Imum_Coeli: 'Fondo del cielo',
    } as Record<string, string>,
    aspects: {
      conjunction: 'conjunción',
      opposition: 'oposición',
      trine: 'trígono',
      square: 'cuadratura',
      sextile: 'sextil',
      quintile: 'quintil',
      'semi-sextile': 'semisextil',
      'semi-square': 'semicuadratura',
      sesquiquadrate: 'sesquicuadratura',
      quincunx: 'quincuncio',
      'bi-quintile': 'biquintil',
    } as Record<string, string>,
  },
  comparison: {
    gate: {
      noMap: 'Para comparar hace falta tu mapa primero.',
      start: 'Empezar',
      withheld: 'La comparación de cartas no está disponible por ahora. Tu mapa, tu rutina y el chat siguen aquí.',
      back: 'Volver a Hoy',
    },
    home: {
      kicker: 'Comparar cartas',
      titleLead: 'Un vínculo, desde los ',
      titleEmphasis: 'dos lados',
      helper:
        'Elige a un amigo de Natus para comparar sus cartas: solo astrología y numerología. Nunca sale un veredicto sobre la relación: sale material para conversar.',
      needAccount: 'Para comparar cartas con tus amigos necesitas tu cuenta.',
      createAccount: 'Crear mi cuenta',
      empty: 'Todavía no tienes amigos en Natus. Invita a alguien con tu link.',
      unavailable: 'No pudimos cargar tus amigos. Intenta de nuevo en un momento.',
      // Package 15 (16 Oct 2026). «Invitar a alguien» and the desktop table's
      // texts are proposals.
      invite: 'Invitar a alguien',
      dragHint: 'Arrastra a alguien hasta tu círculo',
      dragOr: 'o haz clic en su nombre',
      you: 'Tú',
      compareWith: (name: string) => `Comparar con ${name}`,
    },
    result: {
      kind: {
        life_path: 'Camino de vida',
        expression: 'Expresión',
        soul_urge: 'Alma',
        personality: 'Personalidad',
        birthday: 'Cumpleaños',
      } as Record<string, string>,
      back: 'Volver',
      loading: 'Cruzando los mapas',
      kicker: 'El cruce',
      intro: (name: string) =>
        `Tú y ${name}, lado a lado. Pueden leer esta comparación mientras sigan siendo amigos en Natus.`,
      // Package 15: «Tú y Camila» and «Cruzando los mapas» as titles.
      introTitleLead: 'Tú y ',
      generatingTitleLead: 'Cruzando los ',
      generatingTitleEmphasis: 'mapas',
      generatingLabel: 'Cargando',
      tapCard: 'Toca una carta para leerla',
      cardOf: (n: number, total: number) => `${n} de ${total}`,
      bodyOf: (body: string, name: string) => (name ? `${body} de ${name}` : body),
      chartsLinked: 'Las dos cartas unidas por sus aspectos',
      compare: 'Comparar nuestras cartas',
      notFriends: 'Ya no son amigos en Natus, así que esta comparación no se puede leer.',
      numbers: 'Los números, en diálogo',
      chart: 'La carta',
      balance: 'Entre las dos cartas',
      flow: 'Flujo',
      friction: 'Fricción',
      aspectFlows: 'Fluye naturalmente',
      aspectWork: 'Pide más trabajo',
      loBueno: 'Lo bueno',
      tenerEnCuenta: 'Qué tener en cuenta',
      queTrabajar: 'Qué trabajar',
      disfrutarJuntos: 'Qué disfrutar en conjunto',
      disclaimer: 'Esto es un espejo para conversar, no un veredicto sobre la relación.',
      talkOver: 'Conversar sobre esto con Davraz',
      // «La carta» with both wheels (mockup las-dos-cartas, approved 23 Oct 2026).
      wheelsLabel: (other: string) => `Tu carta y la de ${other}, lado a lado`,
      wheelYou: (name: string) => `${name.toUpperCase()} · TÚ`,
      placeMine: (body: string, sign: string, degree: number, house: number | null) =>
        `Tu ${body} en ${sign} ${degree}°${house !== null ? `, casa ${house}` : ''}`,
      placeTheirs: (body: string, name: string, sign: string, degree: number, house: number | null) =>
        `${body} de ${name} en ${sign} ${degree}°${house !== null ? `, su casa ${house}` : ''}`,
      fallsIn: (body: string, house: number, meaning: string) => `Su ${body} cae en tu casa ${house}: ${meaning}.`,
      // The mockup's words for each house (proposal).
      houses: [
        '',
        'cómo te muestras',
        'lo que valoras',
        'la conversación y lo cercano',
        'el hogar y la familia',
        'el juego y lo que creas',
        'la rutina y el cuerpo',
        'los vínculos de a dos',
        'lo íntimo y lo compartido',
        'los viajes y lo que crees',
        'tu camino y lo público',
        'los amigos y los proyectos',
        'lo que vives hacia adentro',
      ],
      seeByAreas: 'Ver las dos cartas por áreas',
    },
    /** «Las dos cartas», by areas of life (owner, 23 Oct 2026). Texts from the mockup; the area readings are Davraz's. */
    both: {
      kicker: 'Las dos cartas',
      titleJoin: ' y ',
      views: 'Vista',
      byAreas: 'Por áreas',
      allPlanets: 'Todos los planetas',
      areas: {
        quienes_son: 'Quiénes son',
        lo_que_se_dan: 'Lo que se dan',
        lo_que_sienten: 'Lo que sienten',
        como_se_hablan: 'Cómo se hablan',
        lo_que_disfrutan: 'Lo que disfrutan juntos',
        atraccion: 'Atracción y química',
        sexualidad: 'Sexualidad y deseo',
        desacuerdo: 'Cuando no están de acuerdo',
        conviven: 'Cómo conviven',
        trabajan: 'Cómo trabajan juntos',
        sostiene: 'Lo que los sostiene',
        como_se_ven: 'Cómo se ven juntos',
      } as Record<string, string>,
      withHour: 'con hora',
      acShort: 'AC',
      labels: {
        fluye: 'Fluye naturalmente',
        cultiva: 'Fluye si lo cultivan',
        trabajo: 'Pide más trabajo',
        opuestos: 'Opuestos que buscan equilibrio',
        funden: 'Energías que se funden',
        sin: 'Sin cruce directo',
      } as Record<string, string>,
      // Proposals in the mockup.
      meanings: {
        fluye: 'Les sale sin esfuerzo. Ojo: lo que fluye solo a veces se da por sentado.',
        cultiva: 'Está ahí, pero se abre con un gesto: proponer, invitar, dar el primer paso.',
        trabajo: 'Hay roce, y siempre viene con cómo trabajarlo. Es donde más crecen.',
        opuestos: 'Miran lo mismo desde lados opuestos. Cada uno tiene la mitad que al otro le falta; equilibrarse no es gratis.',
        funden: 'Los dos en el mismo signo: la energía se mezcla y se siente fuerte, para lo que fluye y para lo que cuesta.',
        sin: 'Esos signos no se tocan solos: cada uno lo vive a su manera y se conocen preguntándose.',
      } as Record<string, string>,
      legendTitle: 'Qué significa cada etiqueta',
      reads: 'Lo que lee esta área',
      toTalk: 'Para conversar',
      showSource: 'Ver de dónde sale ›',
      hideSource: 'Ocultar de dónde sale',
      backToAreas: 'Áreas',
      mine: (body: string) => `Tu ${body}`,
      theirs: (body: string, name: string) => `${body} de ${name}`,
      house: (house: number) => ` · casa ${house}`,
      sourceLine: (who: string, sign: string, degree: number, house: string, aspect: string, who2: string, sign2: string, degree2: number, house2: string) =>
        `${who} en ${sign} ${degree}°${house} · ${aspect} · ${who2} en ${sign2} ${degree2}°${house2}`,
      sourceHouse: (house: number, name: string) => ` (casa ${house} de ${name})`,
      noAspect: 'sin aspecto: los signos no se ven',
      sourceFoot: 'Casas por signo entero. Sin la hora de nacimiento no hay casas ni Ascendente.',
      // Proposals (23 Oct 2026): a comparison made before the areas, and charts that are missing.
      older: 'Esta comparación es de antes de las áreas. Actualízala para leer sus dos cartas por áreas.',
      update: 'Actualizar',
      noCharts: 'Para ver las dos cartas, las dos personas necesitan su carta calculada con su ciudad de nacimiento.',
      unavailable: 'No pudimos cargar las dos cartas. Intenta de nuevo en un momento.',
    },
  },
};
