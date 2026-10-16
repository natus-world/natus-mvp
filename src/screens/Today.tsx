import { useState } from 'react';
import { Link } from 'react-router-dom';
import { PHOTO, Screen } from '@/design/Screen';
import { CheckIcon, ChevronIcon } from '@/design/icons';
import { CompareIcon, MeditationsIcon } from '@/design/brand-icons';
import { CrisisBanner } from '@/components/CrisisBanner';
import { PATHS } from '@/components/routes';
import { CrisisScreen } from '@/screens/CrisisScreen';
import { FeedbackSheet } from '@/screens/Routine';
import { activeProfile, isSignedIn } from '@/store/account';
import { currentSynthesis } from '@/store/soulMap';
import { currentMatchFor, isCheckedToday, toggleCheckIn } from '@/store/matches';
import { hasRecentLowSeverity, markFalsePositive } from '@/store/crisis';
import { useActiveCrisisId } from '@/components/takeover';
import { copy } from '@/i18n';
import { comparisonWithheld } from '@/screens/comparison/Gate';
import { pendingInvite } from '@/store/friends';
import { routineFor } from '@/store/routine';

const t = copy.today;
const routineText = copy.routine;
const CADENCE = copy.practice.cadence;

function firstNameOf(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] ?? '';
}

export function Today() {
  const [, force] = useState(0);
  // R-03: marking from Hoy asks how useful it was, as in Tu rutina.
  const [sheet, setSheet] = useState<string | null>(null);
  const [localCrisis, setLocalCrisis] = useState<string | null>(null);
  const crisisId = useActiveCrisisId();
  const profile = activeProfile();
  const synthesis = currentSynthesis();
  const match = synthesis ? currentMatchFor(synthesis.id) : undefined;

  if (localCrisis) {
    return (
      <CrisisScreen
        country={profile?.draft.country}
        onNotMyCase={() => {
          markFalsePositive(localCrisis);
          setLocalCrisis(null);
        }}
        onBack={() => setLocalCrisis(null)}
      />
    );
  }

  if (crisisId) {
    return <CrisisScreen country={profile?.draft.country} onNotMyCase={() => markFalsePositive(crisisId)} />;
  }

  if (!profile || !synthesis) {
    return (
      <Screen backdrop="luz" scrim="heavy" opacity={PHOTO.content45}>
        <div className="flex flex-col justify-center gap-6 px-6 text-center flex-1">
          <p className="text-[length:var(--fs-body-14)] leading-relaxed text-crema/65">{t.empty}</p>
          <Link to="/onboarding" className="cta no-underline">
            {t.emptyCta}
          </Link>
        </div>
      </Screen>
    );
  }

  const practices = routineFor(match);
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const doneToday = practices.filter((p) => isCheckedToday(p.title, today)).length;
  const next = practices.find((p) => !isCheckedToday(p.title, today));
  const name = firstNameOf(profile.draft.legal_birth_name);
  const mark = (title: string) => {
    const wasDone = isCheckedToday(title, today);
    toggleCheckIn(title, today);
    if (!wasDone) setSheet(title);
    force((n) => n + 1);
  };
  const marked = t.marked(doneToday, practices.length);

  // Package 03 (16 Oct 2026). The day's phrase, today's sky and Davraz's tip
  // stay out until «Tus astros de hoy» is built (owner, 16 Oct 2026).
  return (
    <Screen photo="muroSombra" veil={0.42} glassAlpha={0.77}>
      <div className="pz hoy scroll">
        <div className="col1">
          <p className="k">{t.date(now)}</p>
          <p className="t">
            {name ? (
              <>
                {t.greeting}
                <em>{name}</em>
              </>
            ) : (
              t.greetingWithoutName
            )}
          </p>

          {hasRecentLowSeverity() && <CrisisBanner country={profile.draft.country} />}

          {practices.length === 0 ? (
            <Link to={PATHS.paths} className="vid fila">
              <div>
                <p className="fk">{t.nextKicker}</p>
                <p className="ft">{t.nextNoRoutine}</p>
              </div>
              <span className="chev">
                <ChevronIcon />
              </span>
            </Link>
          ) : next ? (
            <div className="vid">
              <div className="fila">
                <div>
                  <p className="fk">{t.nextKicker}</p>
                  <p className="ft">{next.title}</p>
                  <p className="fd">
                    {CADENCE[next.cadence]} · {marked}
                  </p>
                </div>
                <button type="button" className="p2" aria-pressed={false} onClick={() => mark(next.title)}>
                  {routineText.markToday}
                </button>
              </div>
            </div>
          ) : (
            <div className="vid">
              <div className="fila">
                <div>
                  <p className="fk">{t.nextKicker}</p>
                  <p className="ft">{t.nextAllDone(practices.length)}</p>
                </div>
              </div>
            </div>
          )}

          {!isSignedIn() && (
            <Link to="/registro" className="vid fila">
              <div>
                <p className="ft">{t.saveTitle}</p>
                <p className="fd">{t.saveBody}</p>
              </div>
              <span className="chev">
                <ChevronIcon />
              </span>
            </Link>
          )}

          {isSignedIn() && pendingInvite() && (
            <Link to={`/amigos/${pendingInvite()}`} className="vid fila">
              <p className="ft">{copy.friends.pending}</p>
              <span className="p2">{copy.friends.pendingCta}</span>
            </Link>
          )}

          <div className="dos">
            <Link to={PATHS.meditations} className="vid tile">
              <MeditationsIcon />
              <b>{t.meditations}</b>
              <small>{t.meditationsBody}</small>
            </Link>
            {/* PDR 8.5 rule 6: not offered while the person is vulnerable. */}
            {!comparisonWithheld(profile) && (
              <Link to={PATHS.comparison} className="vid tile">
                <CompareIcon />
                <b>{t.comparison}</b>
                <small>{t.comparisonBody}</small>
              </Link>
            )}
          </div>
        </div>

        <div className="col2">
          {practices.length > 0 && (
            <div className="vid">
              <div className="fila">
                <div>
                  <p className="fk">{t.practicesKicker}</p>
                  <p className="ft">{marked}</p>
                </div>
              </div>
              {practices.map((practice) => {
                const done = isCheckedToday(practice.title, today);
                return (
                  <div key={practice.title} className="fila">
                    <div>
                      <p className="fk">{CADENCE[practice.cadence]}</p>
                      <p className="ft">{practice.title}</p>
                    </div>
                    <button
                      type="button"
                      className={done ? 'p2 on' : 'p2'}
                      aria-pressed={done}
                      onClick={() => mark(practice.title)}
                    >
                      {done && <CheckIcon />}
                      {done ? routineText.doneToday : routineText.markToday}
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          <Link to={PATHS.chart} className="vid pad pila">
            <p className="k">{t.needMapKicker}</p>
            <p className="cuerpo" style={{ color: 'var(--t1)' }}>
              {synthesis.synthesis.soul_map_synthesis.que_necesitas_ahora}
            </p>
          </Link>
        </div>

        {sheet && (
          <div className="rutina">
            <FeedbackSheet
              key={sheet}
              title={sheet}
              date={today}
              onCrisis={(id) => {
                setSheet(null);
                setLocalCrisis(id);
              }}
              onClose={() => {
                setSheet(null);
                force((n) => n + 1);
              }}
            />
          </div>
        )}
      </div>
    </Screen>
  );
}
