import type { GrammaticalGender } from './gender';

export const es = {
  common: {
    continue: 'Continuar',
    back: 'Volver',
  },
  onboarding: {
    kicker: 'Empezar',
    stepOf: 'de',
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
      birthCityLabel: 'Ciudad de nacimiento (opcional)',
      birthCityPlaceholder: 'Valparaíso',
      birthCountryLabel: 'País de nacimiento',
      birthCountryPlaceholder: 'Elige un país',
      birthCountryHelper: 'Con la ciudad y el país calculamos tu carta natal.',
      countryLabel: 'País donde vives',
      countryHelper: 'Define qué líneas de ayuda ves',
      countries: [
        ['CL', 'Chile'],
        ['MX', 'México'],
        ['CO', 'Colombia'],
        ['AR', 'Argentina'],
        ['PE', 'Perú'],
        ['XX', 'Otro país'],
      ] as [string, string][],
      notice: 'Sin hora exacta no hablamos de Ascendente ni de casas.',
    },
    presentingNeed: {
      placeholder: 'Escribe lo que se te ocurra…',
    },
    openness: {
      otherLabel: 'Otro tipo de trabajo',
      otherPlaceholder: 'Otro: cuéntanos cuál',
    },
    generating: {
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
      titleLead: 'Tres preguntas',
      titleTail: 'más delicadas.',
      intro:
        'Preguntamos esto para no recomendarte algo que en tu momento actual podría hacer más daño que bien. No es un diagnóstico y no hay respuestas mejores que otras.',
      privacy:
        'Lo que respondas queda guardado con tu cuenta. Si aparece una señal de riesgo, una persona responsable de Natus recibe un aviso.',
      ideationLabel: 'En los últimos 6 meses, ¿pensaste en hacerte daño o en no querer seguir?',
      ideationOptions: {
        no: 'No',
        fugaces_sin_plan: 'Alguna vez, de forma pasajera',
        frecuentes: 'Sí, seguido',
        plan_o_intencion: 'Sí, con un plan o la intención de hacerlo',
      },
      treatmentLabel: '¿Estás en tratamiento psicológico o psiquiátrico ahora?',
      medicationLabel: '¿Tomas medicación psiquiátrica?',
      yes: 'Sí',
      no: 'No',
      preferNotToSay: 'Prefiero no decir',
      saving: 'Guardando…',
    },
  },
  chrome: {
    aiError: {
      message: 'Esto está tardando más de lo normal. ¿Reintentamos?',
      retry: 'Reintentar',
    },
  },
};
