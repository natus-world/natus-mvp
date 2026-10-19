import { useEffect, useState, type ReactNode } from 'react';
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
import { Ouroboros } from '@/design/Ouroboros';
import { GlyphMark } from '@/design/chart-marks';
import { PLANET_GLYPHS } from '@/design/planet-glyphs';
import { Paywall } from '@/components/Paywall';
import { fetchQuota } from '@/store/quota';
import { isDemoMode } from '@/supabase/client';
import { loadTodaySky, loadTodayTip, localDate, todaySky, type TodaySky } from '@/store/daily-sky';
import type { Transit } from '@/lib/daily-sky';

const t = copy.today;
const routineText = copy.routine;
const CADENCE = copy.practice.cadence;

function firstNameOf(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] ?? '';
}

const sky = copy.sky;

/** How a transit meets the chart, for the catalog: flowing, meeting, asking for more work. */
const FAMILY = {
  conjunction: 'meet',
  sextile: 'flow',
  trine: 'flow',
  square: 'tension',
  opposition: 'tension',
} as const;

/** The catalog's phrase for a transit, with its one word in italic. */
function phraseOf(t: Transit): string {
  return sky.energy[t.planet][FAMILY[t.type]];
}

/** «*densas*» → Cormorant italic, as the package draws the phrase of the day. */
function Emphasis({ text }: { text: string }): ReactNode {
  return text.split(/(\*[^*]+\*)/).map((part, i) =>
    part.startsWith('*') && part.endsWith('*') ? <em key={i}>{part.slice(1, -1)}</em> : part,
  );
}

function plain(text: string): string {
  return text.replace(/\*/g, '');
}

function capital(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** «Marte se roza con tu Luna», the transit named for the list. */
function transitName(t: Transit): string {
  return `${capital(sky.planet[t.planet])} ${sky.aspectVerb[t.type]} ${sky.natal[t.natal]}`;
}

/**
 * The day as the server calculated it (v1.2 D-01), asked once a day; what is
 * known renders at once. `retry` asks again after a failure.
 */
function useTodaySky(date: string): { state: TodaySky | 'loading'; retry: () => void } {
  const [state, setState] = useState<TodaySky | 'loading'>(() => todaySky(date) ?? 'loading');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let live = true;
    void loadTodaySky(date).then((value) => {
      if (live) setState(value);
    });
    return () => {
      live = false;
    };
  }, [date, attempt]);
  return {
    state,
    retry: () => {
      setState('loading');
      setAttempt((n) => n + 1);
    },
  };
}

type Plan = { premium: boolean; offer: boolean } | null;

/** The tier and whether Premium may be offered now (held back after a crisis alert). */
function usePlan(): Plan {
  const [plan, setPlan] = useState<Plan>(null);
  useEffect(() => {
    let live = true;
    void fetchQuota('chat').then((q) => {
      if (!live) return;
      // The demo has no server: free, unless the demo is told otherwise.
      const demoPremium = isDemoMode && !q && readDemoTier() === 'premium';
      setPlan({ premium: q?.tier === 'premium' || demoPremium, offer: q ? q.offerPremium : true });
    });
    return () => {
      live = false;
    };
  }, []);
  return plan;
}

function readDemoTier(): string | null {
  try {
    return globalThis.localStorage?.getItem('natus:demo_tier') ?? null;
  } catch {
    return null;
  }
}

/** Davraz's tip (premium), asked once the day is there; silent when it fails. */
function useTip(date: string, ask: boolean): string[] | null {
  const [tips, setTips] = useState<string[] | null>(null);
  useEffect(() => {
    if (!ask) return;
    let live = true;
    void loadTodayTip(date).then((value) => {
      if (live) setTips(value);
    });
    return () => {
      live = false;
    };
  }, [date, ask]);
  return tips;
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
  // v1.2 D-01: today's sky, the person's own calendar day.
  const skyDate = localDate();
  const { state: daySky, retry: retrySky } = useTodaySky(skyDate);
  const plan = usePlan();
  const ready = daySky !== 'loading' && daySky.status === 'ready' ? daySky : null;
  const tips = useTip(skyDate, Boolean(plan?.premium && ready && ready.day.transits.length > 0));
  const [paywall, setPaywall] = useState(false);

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

  const main = ready?.day.transits[0];
  const personal =
    ready ? ready.day.personal_day : daySky !== 'loading' && daySky.status === 'no_chart' ? daySky.personalDay : null;
  const shownTips = ready?.tips ?? tips;

  // Package 03 (16 Oct 2026), with «Tus astros de hoy» (v1.2 D-01, catalog
  // approved by the owner, 18 Oct 2026).
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

          {daySky === 'loading' ? (
            <Ouroboros size={28} />
          ) : daySky.status === 'error' ? (
            <div className="vid fila">
              <p className="fd">{sky.slow}</p>
              <button type="button" className="p2" onClick={retrySky}>
                {sky.retry}
              </button>
            </div>
          ) : main ? (
            <p className="fr">
              <Emphasis text={phraseOf(main)} />
            </p>
          ) : null}

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

          {main && plan?.premium && shownTips ? (
            <div className="vid pad">
              <p className="ia">
                {sky.tipLabel} <b>{sky.tipBadge}</b> · {sky.tipKicker}
              </p>
              {shownTips.map((tip) => (
                <p key={tip} className="tip">
                  {tip}
                </p>
              ))}
            </div>
          ) : main && plan && !plan.premium && plan.offer ? (
            <button type="button" className="vid fila" onClick={() => setPaywall(true)}>
              <span className="upsell">{sky.freeTip}</span>
              <span className="chev">
                <ChevronIcon />
              </span>
            </button>
          ) : null}

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
          {personal !== null && (
            <div className="vid pad astros">
              <p className="k">{sky.kicker}</p>
              <div className="num">
                <b>{personal}</b>
                <span className="fk">{sky.personalDay}</span>
              </div>
              <p className="fd">{sky.day[personal]}</p>
              {ready && ready.day.transits.length > 0 && (
                <>
                  <div className="sep" />
                  <ul className="lista-astros">
                    {ready.day.transits.slice(0, 3).map((t, i, list) => {
                      // A phrase already read above (the day's, or an earlier
                      // line's) is not repeated: the transit says where instead.
                      const said = list.slice(0, i).some((u) => phraseOf(u) === phraseOf(t));
                      return (
                        <li key={`${t.planet}-${t.natal}`}>
                          <span>
                            <GlyphMark {...PLANET_GLYPHS[t.planet]} evenOdd={t.planet === 'Sun'} />
                          </span>
                          {i === 0 || said
                            ? `${transitName(t)}, ${sky.natalIs[t.natal]}.`
                            : `${transitName(t)}. ${plain(phraseOf(t))}`}
                        </li>
                      );
                    })}
                  </ul>
                </>
              )}
              {ready && !ready.day.has_birth_time && <p className="fd">{sky.noTime}</p>}
            </div>
          )}

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

        {paywall && <Paywall feature="welcome" place="tip" onDismiss={() => setPaywall(false)} />}

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
