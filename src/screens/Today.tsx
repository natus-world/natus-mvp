import { Link } from 'react-router-dom';
import { PHOTO, Screen } from '@/design/Screen';
import { DayArc } from '@/design/DayArc';
import { ChevronIcon } from '@/design/icons';
import { CrisisBanner } from '@/components/CrisisBanner';
import { PATHS } from '@/components/routes';
import { CrisisScreen } from '@/screens/CrisisScreen';
import { activeProfile, isSignedIn } from '@/store/account';
import { currentSynthesis } from '@/store/soulMap';
import { currentMatchFor, isCheckedToday } from '@/store/matches';
import { hasRecentLowSeverity, markFalsePositive } from '@/store/crisis';
import { useActiveCrisisId } from '@/components/takeover';
import { copy } from '@/i18n';
import { comparisonWithheld } from '@/screens/comparison/Gate';
import { pendingInvite } from '@/store/friends';
import { routineFor } from '@/store/routine';

const t = copy.today;

function firstNameOf(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] ?? '';
}

export function Today() {
  const crisisId = useActiveCrisisId();
  const profile = activeProfile();
  const synthesis = currentSynthesis();
  const match = synthesis ? currentMatchFor(synthesis.id) : undefined;

  if (crisisId) {
    return <CrisisScreen country={profile?.draft.country} onNotMyCase={() => markFalsePositive(crisisId)} />;
  }

  if (!profile || !synthesis) {
    return (
      <Screen backdrop="luz" scrim="heavy" opacity={PHOTO.content45}>
        <div className="flex min-h-dvh flex-col justify-center gap-6 px-6 text-center sm:min-h-0 sm:flex-1">
          <p className="text-[length:var(--fs-body-14)] leading-relaxed text-crema/65">{t.empty}</p>
          <Link to="/onboarding" className="cta no-underline">
            {t.emptyCta}
          </Link>
        </div>
      </Screen>
    );
  }

  const practices = routineFor(match);
  const today = new Date().toISOString().slice(0, 10);
  const doneToday = practices.filter((p) => isCheckedToday(p.title, today)).length;
  const name = firstNameOf(profile.draft.legal_birth_name);

  return (
    <Screen backdrop="luz" scrim="heavy" opacity={PHOTO.content42}>
      <div className="flex min-h-dvh flex-col overflow-y-auto px-6 pt-[var(--top-inset)] pb-[var(--bottom-inset)] sm:min-h-0">
        <p className="eyebrow mb-3">{t.kicker}</p>
        <h1 className="mb-6 text-[length:var(--fs-title-30)] leading-[var(--lh-heading-1_15)] text-blanco">
          {name ? (
            <>
              {t.greeting}
              <em className="font-serif text-crema italic">{name}</em>
            </>
          ) : (
            t.greetingWithoutName
          )}
        </h1>

        {hasRecentLowSeverity() && (
          <div className="-mx-2 mb-5">
            <CrisisBanner country={profile.draft.country} />
          </div>
        )}

        {!isSignedIn() && (
          <Link to="/registro" className="surface surface-p14 mb-3 block no-underline">
            <p className="text-[length:var(--fs-body-13)] leading-snug text-blanco">{t.saveTitle}</p>
            <p className="mt-1 text-[length:var(--fs-body-11_5)] leading-relaxed text-crema/55">{t.saveBody}</p>
          </Link>
        )}

        {isSignedIn() && pendingInvite() && (
          <Link
            to={`/amigos/${pendingInvite()}`}
            className="surface surface-p14 mb-3 flex items-center gap-3 no-underline"
          >
            <p className="min-w-0 flex-1 text-[length:var(--fs-body-13)] leading-snug text-blanco">
              {copy.friends.pending}
            </p>
            <span className="chip chip-p6 px-3 text-crema/75">{copy.friends.pendingCta}</span>
          </Link>
        )}

        <div className="flex flex-col gap-3">
          {practices.length > 0 ? (
            <Link to={PATHS.journey} className="surface surface-p16 block text-center no-underline">
              <p className="eyebrow mb-3 text-left">{t.journeyKicker}</p>
              <DayArc done={doneToday} total={practices.length} />
              <p className="mt-2 font-serif text-[length:var(--fs-voice-17)] leading-snug text-blanco">
                {t.marked(doneToday, practices.length)}
              </p>
              <p className="mt-1 text-[length:var(--fs-body-11_5)] leading-relaxed text-crema/55">{t.markedNote}</p>
            </Link>
          ) : (
            <Link to={PATHS.paths} className="surface surface-p14 flex items-center gap-3 no-underline">
              <div className="min-w-0 flex-1">
                <p className="eyebrow mb-1.5">{t.journeyKicker}</p>
                <p className="text-[length:var(--fs-body-13)] leading-snug text-blanco">{t.journeyEmpty}</p>
              </div>
              <ChevronIcon className="shrink-0 text-crema/60" />
            </Link>
          )}

          <Link to={PATHS.chart} className="surface surface-p14 flex items-center gap-3 no-underline">
            <div className="min-w-0 flex-1">
              <p className="eyebrow mb-1.5">{t.needKicker}</p>
              <p className="line-clamp-4 text-[length:var(--fs-body-13)] leading-relaxed text-blanco/85">
                {synthesis.synthesis.soul_map_synthesis.que_necesitas_ahora}
              </p>
            </div>
            <ChevronIcon className="shrink-0 text-crema/60" />
          </Link>

          <div className="surface rows px-0">
            {[
              { to: PATHS.meditations, title: t.meditations, body: t.meditationsBody },
              // PDR 8.5 rule 6: not offered while the person is vulnerable.
              ...(comparisonWithheld(profile)
                ? []
                : [{ to: PATHS.comparison, title: t.comparison, body: t.comparisonBody }]),
            ].map((entry) => (
              <Link key={entry.to} to={entry.to} className="flex items-center gap-3 px-4 py-3.5 no-underline">
                <div className="min-w-0 flex-1">
                  <p className="text-[length:var(--fs-heading-15)] leading-snug text-blanco">{entry.title}</p>
                  <p className="mt-0.5 text-[length:var(--fs-body-12)] leading-relaxed text-crema/60">{entry.body}</p>
                </div>
                <ChevronIcon className="shrink-0 text-crema/60" />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </Screen>
  );
}
