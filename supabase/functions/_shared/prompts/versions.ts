export const CHAT_PROMPT_VERSION = 'chat-v2.3';
export const MEDITATION_PROMPT_VERSION = 'meditation-v1.2';
export const MATCH_PROMPT_VERSION = 'match-v1.6';
export const ROUTINE_PROMPT_VERSION = 'routine-v1.1';
export const COMPARISON_PROMPT_VERSION = 'comparison-v2.5';
export const SOUL_MAP_PROMPT_VERSION = 'soul-map-v2.9';
export const MEMORY_PROMPT_VERSION = 'memory-v1.0';
export const ROUTINE_REVIEW_PROMPT_VERSION = 'routine-review-v1.1';
export const CHART_POINTS_PROMPT_VERSION = 'chart-points-v1.3';
export const DAILY_TIP_PROMPT_VERSION = 'daily-tip-v1.2';
export const MEDITATION_VOICE_PROMPT_VERSION = 'meditation-voice-v1.0';

export const PROMPT_HISTORY: readonly { version: string; date: string; change: string }[] = [
  {
    version: 'soul-map-v2.9',
    date: '2026-10-30',
    change:
      'Houses in Placidus, whole sign one touch away on the screen (owner, 27–30 Oct 2026; wording approved by him on 28 Oct): the shared chart rules say the houses come in the system indicated (Placidus or whole sign) instead of «por signo entero», and the chart description says which («Casas: Placidus»). The Soul Map names a house by its area of life, never its number (HOUSE_NUMBER_RULE), and receives no Lilith (owner, 28 Oct 2026).',
  },
  {
    version: 'comparison-v2.5',
    date: '2026-10-30',
    change:
      'Houses in Placidus, whole sign one touch away on the screen (owner, 27–30 Oct 2026; wording approved by him on 28 Oct): the shared chart rules say the houses come in the system indicated (Placidus or whole sign) instead of «por signo entero», and the chart description says which («Casas: Placidus»). The comparison names a house only by what it means, never its number (HOUSE_NUMBER_RULE and its own line), and receives no Lilith.',
  },
  {
    version: 'match-v1.6',
    date: '2026-10-30',
    change:
      'Houses in Placidus (owner, 27–30 Oct 2026; wording approved by him on 28 Oct): the why of a therapy names a house by its area of life, never its number (HOUSE_NUMBER_RULE, from chart-reading.ts), and the chart line no longer says «casas por signo entero».',
  },
  {
    version: 'chat-v2.3',
    date: '2026-10-30',
    change:
      'Houses in Placidus, whole sign one touch away on the screen (owner, 27–30 Oct 2026; wording approved by him on 28 Oct): the shared chart rules say the houses come in the system indicated (Placidus or whole sign) instead of «por signo entero», and the chart description says which («Casas: Placidus»). The chat may say the house number. It receives the mean Lilith and names it only when the person asks about it (owner, 28 Oct 2026; the line is a proposal for his approval).',
  },
  {
    version: 'chart-points-v1.3',
    date: '2026-10-30',
    change:
      'Houses in Placidus, whole sign one touch away on the screen (owner, 27–30 Oct 2026; wording approved by him on 28 Oct): the shared chart rules say the houses come in the system indicated (Placidus or whole sign) instead of «por signo entero», and the chart description says which («Casas: Placidus»). The readings per point may say the house number, in Placidus, and include the mean Lilith (owner, 28 Oct 2026).',
  },
  {
    version: 'daily-tip-v1.2',
    date: '2026-10-30',
    change:
      'Houses in Placidus, whole sign one touch away on the screen (owner, 27–30 Oct 2026; wording approved by him on 28 Oct): the shared chart rules say the houses come in the system indicated (Placidus or whole sign) instead of «por signo entero», and the chart description says which («Casas: Placidus»). The Moon of the day comes with its Placidus house.',
  },
  {
    version: 'meditation-voice-v1.0',
    date: '2026-10-29',
    change: 'The style instruction Gemini TTS reads each passage of a meditation with (owner, 29 Oct 2026).',
  },
  {
    version: 'comparison-v2.4',
    date: '2026-10-23',
    change:
      '«Las dos cartas» (owner, 23 Oct 2026, mockup las-dos-cartas; the prompt change approved by him the same day): the comparison also receives the twelve areas of life, crossed by sign in src/lib/comparison-areas.ts (which planets of each, the aspect or none, and with the hour which planet falls in the houses the area looks at), and writes for each area a reading of 2 to 4 sentences and a question to talk over; and labels every trine, sextile and square the areas cross as flows naturally, flows if cultivated or asks for more work, in line with the flow of the same aspect in the list. Sexuality in an adult, non-explicit tone, without assuming what bond the two have. Every rule before stands.',
  },
  {
    version: 'soul-map-v2.8',
    date: '2026-10-22',
    change:
      'Without the hour of birth, only what is known (owner, 22 Oct 2026): the shared chart description (chart-reading.ts) says day or night when the person said it («lo dijo la persona»), leaves out the Moon when its sign is not certain all that day and tells the model not to name it, and gives a kept Moon only its sign, not its degree.',
  },
  {
    version: 'chat-v2.2',
    date: '2026-10-22',
    change:
      'Without the hour of birth, only what is known (owner, 22 Oct 2026): the shared chart description (chart-reading.ts) says day or night when the person said it («lo dijo la persona»), leaves out the Moon when its sign is not certain all that day and tells the model not to name it, and gives a kept Moon only its sign, not its degree.',
  },
  {
    version: 'comparison-v2.3',
    date: '2026-10-22',
    change:
      'Without the hour of birth, only what is known (owner, 22 Oct 2026): the shared chart description (chart-reading.ts) says day or night when the person said it («lo dijo la persona»), leaves out the Moon when its sign is not certain all that day and tells the model not to name it, and gives a kept Moon only its sign, not its degree.',
  },
  {
    version: 'chart-points-v1.2',
    date: '2026-10-22',
    change:
      'Without the hour of birth, only what is known (owner, 22 Oct 2026): the shared chart description (chart-reading.ts) says day or night when the person said it («lo dijo la persona»), leaves out the Moon when its sign is not certain all that day and tells the model not to name it, and gives a kept Moon only its sign, not its degree.',
  },
  {
    version: 'daily-tip-v1.1',
    date: '2026-10-22',
    change:
      'Without the hour of birth, only what is known (owner, 22 Oct 2026): the shared chart description (chart-reading.ts) says day or night when the person said it («lo dijo la persona»), leaves out the Moon when its sign is not certain all that day and tells the model not to name it, and gives a kept Moon only its sign, not its degree.',
  },
  {
    version: 'chat-v2.1',
    date: '2026-10-22',
    change:
      '«Pregúntale a tu carta» (owner, 22 Oct 2026, text approved by him): a bubble on Carta opens a conversation about the chart only. The function adds CHART_CHAT_BLOCK after the chat prompt in that mode: only the chart and the numbers, in simple words, naming the placement; anything else gets one line inviting to the Chat, typed `off_chart` and not charged; never a recommendation; 2 to 5 sentences. The Chat itself is unchanged.',
  },
  {
    version: 'chat-v2.0',
    date: '2026-10-18',
    change:
      'v1.2 D-01, proposed and accepted by the owner (18 Oct 2026): premium\'s chat reads its sky of the day (the transits in order, the Moon, the personal day) and the tip Davraz left, to answer about them as a lens, never as a prediction.',
  },
  {
    version: 'daily-tip-v1.0',
    date: '2026-10-18',
    change:
      'New (v1.2 D-01, guide §9.4): Davraz\'s tip of the day for premium, one or two small practical tips from the day\'s transits over the chart, the Moon and the personal day, calculated by src/lib/daily-sky.ts, with the Hellenistic and propositive rules. The lord of the year only orders the transits and is never handed to the model.',
  },
  {
    version: 'chart-points-v1.1',
    date: '2026-10-18',
    change:
      'Never the word «secta» (owner, 18 Oct 2026): the shared chart reading says «nació de día» or «de noche» and tells the model to say «naciste de día» or «naciste de noche»; `lintChartJudgement` refuses the word.',
  },
  {
    version: 'chat-v1.9',
    date: '2026-10-18',
    change:
      'Never the word «secta» (owner, 18 Oct 2026): the shared chart reading says «nació de día» or «de noche» and tells the model to say «naciste de día» or «naciste de noche»; `lintChartJudgement` refuses the word.',
  },
  {
    version: 'comparison-v2.2',
    date: '2026-10-18',
    change:
      'Never the word «secta» (owner, 18 Oct 2026): the shared chart reading says «nació de día» or «de noche» and tells the model to say «naciste de día» or «naciste de noche»; `lintChartJudgement` refuses the word.',
  },
  {
    version: 'soul-map-v2.7',
    date: '2026-10-18',
    change:
      'Never the word «secta» (owner, 18 Oct 2026): the shared chart reading says «nació de día» or «de noche» and tells the model to say «naciste de día» or «naciste de noche»; `lintChartJudgement` refuses the word.',
  },
  {
    version: 'chart-points-v1.0',
    date: '2026-10-16',
    change:
      'New (package 05 «Carta completa», owner, 16 Oct 2026): Davraz\'s reading of each point of the calculated chart, one or two sentences per point, with the Hellenistic and propositive rules of the Soul Map and the comparison. Reads the chart only, never the person\'s words or numbers.',
  },
  {
    version: 'chat-v1.8',
    date: '2026-10-16',
    change:
      'Numerology speaks of stones and colours too (owner): the life path\'s ruling planet, stones and colours join the correspondences, a master number read from its reduction.',
  },
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
