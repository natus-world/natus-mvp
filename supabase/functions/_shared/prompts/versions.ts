export const CHAT_PROMPT_VERSION = 'chat-v1.7';
export const MEDITATION_PROMPT_VERSION = 'meditation-v1.2';
export const MATCH_PROMPT_VERSION = 'match-v1.5';
export const ROUTINE_PROMPT_VERSION = 'routine-v1.1';
export const COMPARISON_PROMPT_VERSION = 'comparison-v2.1';
export const SOUL_MAP_PROMPT_VERSION = 'soul-map-v2.6';
export const MEMORY_PROMPT_VERSION = 'memory-v1.0';
export const ROUTINE_REVIEW_PROMPT_VERSION = 'routine-review-v1.1';

export const PROMPT_HISTORY: readonly { version: string; date: string; change: string }[] = [
  {
    version: 'chat-v1.7',
    date: '2026-10-16',
    change:
      'Davraz reads the whole person (owner, 16 Oct 2026): the calculated chart with the Hellenistic and propositive rules, where and when they were born, what they told at the start and their routine, read by the function; and recommends stones, aromas, colours, plants and other spiritual practices from a fixed table of correspondences by sign and element, as tradition and support for a practice, never as cure, nothing ingested, no psychoactives, nothing to buy.',
  },
  {
    version: 'chat-v1.6',
    date: '2026-10-16',
    change:
      'The chat can talk over a comparison with a friend: its result arrives in the user message, read by the function only while the friendship is accepted, with the propositive rule for it (a mirror, never a verdict; nothing said for the friend; nothing added to their chart).',
  },
  {
    version: 'routine-review-v1.1',
    date: '2026-10-16',
    change: 'R-04\'s third signal: the review can be brought forward because the memory kept something new in «Lo que no te funciona» or «Lo que estás viviendo»; one line tells the model so.',
  },
  {
    version: 'chat-v1.5',
    date: '2026-10-16',
    change:
      'Davraz does not do work for the person (a thesis, a report, homework, code): it turns the conversation back to how they are living it, without scolding (owner decision, recorded in CLAUDE.md).',
  },
  {
    version: 'routine-review-v1.0',
    date: '2026-10-16',
    change:
      'v1.2 R-04, new: reviews the routine with what the person recorded (times done, ratings, comments) and, for premium with consent, the memory; proposes practices that leave and enter, and at most one therapy dismissed over a week ago to come back (R-05), or no change. No blame for what was not done. The physical-risk rules of the routine, unchanged.',
  },
  {
    version: 'chat-v1.4',
    date: '2026-10-16',
    change:
      'v1.2 M-01: when the memory is alive (premium and consent), what Natus remembers of the person arrives in the user message, and one rule on how to use it: to understand and not make the person repeat themselves, never recited, never as if watching; what the person says now prevails.',
  },
  {
    version: 'memory-v1.0',
    date: '2026-10-16',
    change:
      'v1.2 M-01, new: from one journal entry, rated practice or quiet conversation, what to add to the memory, what it confirms and what it corrects, in five categories. Only what the person said, nothing clinical, written to them with tú; items the person wrote are never rewritten.',
  },
  {
    version: 'comparison-v2.1',
    date: '2026-10-15',
    change:
      'v1.2 A-02: each friend\'s chart arrives read the Hellenistic way, and the aspects between the two are by sign, computed from the stored charts (no ephemeris call). The model picks 3 to 8 and decides for each whether it flows naturally or asks for more work, and how (owner, 15 Oct 2026). The propositive rule: nothing is rated good or bad.',
  },
  {
    version: 'soul-map-v2.6',
    date: '2026-10-15',
    change:
      'v1.2 A-02: the chart arrives calculated the Hellenistic way (whole-sign houses, dignities, Ascendant ruler, sect, aspects by sign) instead of the provider text, with the Hellenistic rules; and the owner\'s rule that nothing is rated good or bad, as a mirror.',
  },
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
