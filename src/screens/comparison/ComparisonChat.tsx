import { useState } from 'react';
import { createPortal } from 'react-dom';
import { copy } from '@/i18n';
import { activeProfile } from '@/store/account';
import { currentSynthesis } from '@/store/soulMap';
import { markFalsePositive } from '@/store/crisis';
import { ChartChat } from '@/screens/ChartChat';
import { CrisisScreen } from '@/screens/CrisisScreen';
import type { AreaKey } from '@/lib/comparison-areas';

const text = copy.comparisonChat;

/**
 * «Pregúntale a las dos cartas» (owner, 27 Oct 2026, option B): the sheet of
 * «Pregúntale a tu carta» over a comparison and over «Las dos cartas» by
 * areas, so the conversation happens without leaving the comparison. In an
 * area, Davraz is told which one the person is looking at.
 */
export function ComparisonChat({
  friendshipId,
  friend,
  area = null,
}: {
  friendshipId: string;
  friend: string;
  area?: AreaKey | null;
}) {
  const profile = activeProfile();
  const stored = currentSynthesis();
  const [localCrisis, setLocalCrisis] = useState<string | null>(null);
  if (!profile || !stored) return null;
  if (localCrisis) {
    return createPortal(
      <div className="crisis-encima">
        <CrisisScreen
          country={profile.draft.country}
          onNotMyCase={() => {
            markFalsePositive(localCrisis);
            setLocalCrisis(null);
          }}
          onBack={() => setLocalCrisis(null)}
        />
      </div>,
      document.body,
    );
  }
  return (
    <ChartChat
      stored={stored}
      onCrisis={setLocalCrisis}
      topic={{
        bubble: text.bubble,
        greetingLead: text.greetingLead,
        greetingEmphasis: area ? (copy.comparison.both.areas[area] ?? text.greetingEmphasis(friend)) : text.greetingEmphasis(friend),
        sub: text.sub,
        questions: text.questions(friend),
        scrollsIn: '.comparar',
        comparison: { friendshipId, area },
      }}
    />
  );
}
