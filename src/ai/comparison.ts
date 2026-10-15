import { runAi, AiError, type AiResult } from './client';
import { buildComparisonFixture } from './fixtures/comparison';
import { comparisonResultSchema, type ComparisonResult } from '@/lib/schemas';
import { buildComparisonPayload } from '@/lib/comparison-payload';
import { computeNumerology } from '@/lib/numerology';

/**
 * Compare charts with a friend (v1.2 C-01). The browser sends which
 * friendship and nothing else: the function builds the payload from both
 * people's stored data, checks rule 6 and the friendship, and stores the
 * result where both friends can read it.
 */
export async function compareWithFriend(friendshipId: string): Promise<AiResult<ComparisonResult>> {
  const result = await runAi({
    schema: comparisonResultSchema,
    edge: { fn: 'comparison', body: { friendship_id: friendshipId } },
    // Only the demo build reaches this, and it has no friends to compare
    // with: two invented people, so the screen can be walked offline.
    fixture: () => buildComparisonFixture(DEMO_PAYLOAD),
  });

  // Rule 5, from this side: aspects can only come from the server, which is
  // the only place holding an ephemeris. The strong check — every aspect the
  // model returned matches one that was computed — runs in the function.
  const dialogue = result.value.astro_dialogue;
  if (result.mode !== 'server' && (dialogue.available || dialogue.aspects.length > 0)) {
    throw new AiError('The model described chart aspects that were never computed.', 'copy_violation');
  }

  return result;
}

const DEMO_PAYLOAD = buildComparisonPayload({
  scope: { numerology: true, astro: false, soul_map_themes: false },
  a: {
    display_name: 'Ana',
    numerology: computeNumerology({ legalBirthName: 'Ana Prueba', birthDate: '1992-05-14' }),
    soul_map_themes: [],
    chart: null,
    birth: null,
  },
  b: {
    display_name: 'Beto',
    numerology: computeNumerology({ legalBirthName: 'Beto Prueba', birthDate: '1990-11-02' }),
    soul_map_themes: [],
    chart: null,
    birth: null,
  },
});
