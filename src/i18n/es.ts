import type { GrammaticalGender } from './gender';

export const es = {
  common: {
    continue: 'Continuar',
  },
  onboarding: {
    basicData: {
      titleLead: 'Empecemos por',
      titleTail: 'lo básico.',
      helper: 'Tu nombre completo de nacimiento y tu fecha. Con eso ya podemos calcular tus números.',
      nameLabel: 'Nombre completo de nacimiento',
      namePlaceholder: 'Como figura en tu documento',
      nameHelper:
        'Los números se calculan sobre el nombre de nacimiento, no sobre el que usas todos los días.',
      genderLabel: '¿Cómo quieres que te hablemos?',
      genderOptions: [
        ['femenino', 'En femenino'],
        ['masculino', 'En masculino'],
        ['neutro', 'Sin marcar género'],
      ] as [GrammaticalGender, string][],
      genderHelper: 'Lo usamos en los textos de la app y en las respuestas que recibes.',
      birthDateLabel: 'Fecha de nacimiento',
      birthTimeLabel: 'Hora',
      birthCityLabel: 'Ciudad',
      birthCityPlaceholder: 'Santiago',
      optionalHelper:
        'Si no las sabes, sigue sin ellas. Sin hora exacta no hablamos de Ascendente ni de casas, y el resto funciona igual.',
      birthCountryLabel: 'País de nacimiento',
      birthCountryHelper: 'Solo hace falta si quieres que calculemos tu carta natal.',
      countryLabel: '¿Dónde vives?',
      countryHelper: 'Define qué líneas de ayuda te mostramos si alguna vez hacen falta.',
      countries: [
        ['CL', 'Chile'],
        ['MX', 'México'],
        ['CO', 'Colombia'],
        ['AR', 'Argentina'],
        ['PE', 'Perú'],
        ['XX', 'Otro país'],
      ] as [string, string][],
    },
  },
};
