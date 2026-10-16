import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PHOTO, Screen } from '@/design/Screen';
import { ChevronIcon } from '@/design/icons';
import { PATHS } from '@/components/routes';
import { copy } from '@/i18n';
import { getClient } from '@/store/account';
import { hasRemoteIdentity } from '@/store/hydrate.ts';
import { listFriends, type Friend } from '@/store/friends';
import { ComparisonGate } from './Gate';

const t = copy.comparison.home;

/**
 * Comparar cartas, from Hoy (guide 9.14): the friends to compare with. v1.2
 * C-01 — only friends inside Natus, astrology and numerology only.
 */
export function ComparisonHome() {
  const hasAccount = getClient() !== null && hasRemoteIdentity();
  const [friends, setFriends] = useState<Friend[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!hasAccount) return;
    let live = true;
    listFriends()
      .then((list) => live && setFriends(list))
      .catch(() => live && setFailed(true));
    return () => {
      live = false;
    };
  }, [hasAccount]);

  return (
    <ComparisonGate>
      <Screen backdrop="cruce" scrim="heavy" opacity={PHOTO.content40}>
        <div className="flex flex-col overflow-y-auto px-6 pt-[var(--top-inset)] pb-[var(--bottom-inset)]">
          <p className="eyebrow mb-3">{t.kicker}</p>
          <h1 className="mb-3 text-[length:var(--fs-title-28)] leading-[var(--lh-heading-1_15)] text-blanco">
            {t.titleLead}
            <em className="font-serif text-crema italic">{t.titleEmphasis}</em>
          </h1>
          <p className="mb-6 text-[length:var(--fs-body-13)] leading-relaxed text-crema/70">{t.helper}</p>

          {!hasAccount && (
            <div className="flex flex-col gap-3">
              <p className="text-[length:var(--fs-body-13)] leading-relaxed text-crema/70">{t.needAccount}</p>
              <Link to="/registro" className="cta no-underline">
                {t.createAccount}
              </Link>
            </div>
          )}

          {failed && (
            <p role="alert" className="text-[length:var(--fs-body-13)] leading-relaxed text-crema/80">
              {t.unavailable}
            </p>
          )}

          {friends && friends.length === 0 && (
            <div className="flex flex-col gap-3">
              <p className="text-[length:var(--fs-body-13)] leading-relaxed text-crema/70">{t.empty}</p>
              <Link to={PATHS.profile} className="cta no-underline">
                {t.toProfile}
              </Link>
            </div>
          )}

          {friends && friends.length > 0 && (
            <div className="surface rows px-0">
              {friends.map((friend) => (
                <Link
                  key={friend.friendshipId}
                  to={`${PATHS.comparison}/${friend.friendshipId}`}
                  className="flex items-center gap-3 px-4 py-3.5 no-underline"
                >
                  <p className="min-w-0 flex-1 text-[length:var(--fs-heading-15)] leading-snug text-blanco">
                    {friend.firstName}
                  </p>
                  <ChevronIcon className="shrink-0 text-crema/60" />
                </Link>
              ))}
            </div>
          )}
        </div>
      </Screen>
    </ComparisonGate>
  );
}
