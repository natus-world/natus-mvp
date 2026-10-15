export const CHAT_PROMPT_VERSION = 'chat-v1.3';
export const MEDITATION_PROMPT_VERSION = 'meditation-v1.2';
export const MATCH_PROMPT_VERSION = 'match-v1.5';
export const ROUTINE_PROMPT_VERSION = 'routine-v1.1';
export const COMPARISON_PROMPT_VERSION = 'comparison-v2.0';
export const SOUL_MAP_PROMPT_VERSION = 'soul-map-v2.5';

export const PROMPT_HISTORY: readonly { version: string; date: string; change: string }[] = [
  {
    version: 'match-v1.5',
    date: '2026-10-15',
    change:
      'v1.2 R-02: a one-or-two-sentence summary for the card, and the reasoning becomes the full why, citing what the person told, a placement of their chart and one of their numbers when available. The symbols now arrive in the user message; citing them does not change the order.',
  },
  {
    version: 'routine-v1.1',
    date: '2026-10-15',
    change:
      'Each therapy arrives with why the match recommended it to this person (owner, 15 Oct 2026), so a practice that converses with a therapy works on what led to it. Context only: never copied into the body.',
  },
  {
    version: 'routine-v1.0',
    date: '2026-10-15',
    change:
      'New (v1.2 R-01): one routine, written after the therapies, seeing the map and those therapies; every practice declares connects_to { soul_map, modality_slug }. Carries the physical-risk rules.',
  },
  {
    version: 'match-v1.4',
    date: '2026-10-15',
    change: 'v1.2 R-01: therapies only. The routine moved to its own call, made after the therapies are chosen.',
  },
  {
    version: 'soul-map-v2.5',
    date: '2026-10-15',
    change: 'v1.2 R-01: the narrative synthesis only. The tips are gone; the routine is written after the therapies.',
  },
  {
    version: 'comparison-v2.0',
    date: '2026-10-15',
    change:
      'Friends inside Natus (v1.2 C-01) and four parts (C-02): lo_bueno, tener_en_cuenta, que_trabajar, disfrutar_juntos. Both friends read it; the questions to talk over and the Soul Map themes are gone.',
  },
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
