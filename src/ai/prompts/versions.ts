export const CHAT_PROMPT_VERSION = 'chat-v1.3';
export const MEDITATION_PROMPT_VERSION = 'meditation-v1.2';
export const MATCH_PROMPT_VERSION = 'match-v1.3';
export const COMPARISON_PROMPT_VERSION = 'comparison-v1.2';
export const SOUL_MAP_PROMPT_VERSION = 'soul-map-v2.4';

export const PROMPT_HISTORY: readonly { version: string; date: string; change: string }[] = [
  {
    version: 'soul-map-v2.4',
    date: '2026-10-15',
    change:
      'A chart without the hour of birth: one line telling the model there is no Ascendant and there are no houses (v1.2 A-01, PDR US-1.2 CA2). The chart itself arrives already stripped of them.',
  },
  {
    version: 'soul-map-v2.3',
    date: '2026-10-14',
    change:
      'Neutral Spanish, Davraz de Fala, address by gender, delimited person text, two crisis examples, detected_mode objetivo | abierto. Official since S-06.',
  },
  {
    version: 'match-v1.3',
    date: '2026-10-14',
    change: 'Neutral Spanish, Davraz de Fala, address by gender, voice separated from content. Official since S-06.',
  },
  {
    version: 'chat-v1.3',
    date: '2026-10-14',
    change: 'Neutral Spanish, Davraz de Fala, address by gender, delimited person text, two crisis examples. Official since S-06.',
  },
  {
    version: 'meditation-v1.2',
    date: '2026-10-14',
    change: 'Neutral Spanish, Davraz de Fala, address by gender, delimited intent. Official since S-06.',
  },
  {
    version: 'comparison-v1.2',
    date: '2026-10-14',
    change: 'Neutral Spanish, Davraz de Fala, one address per person. Official since S-06.',
  },
];
