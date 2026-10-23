import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { isDemoMode } from '@/supabase/client';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Screen } from '@/design/Screen';
import { Ouroboros } from '@/design/Ouroboros';
import { copy } from '@/i18n';
import { CrisisScreen } from '@/screens/CrisisScreen';
import { BED_TRACKS } from '@/lib/catalog';
import { detectCrisis, riskLevel } from '@/lib/safety';
import { estimateDurationMs, parseSsml } from '@/lib/ssml';
import { createPlayer, isPlaybackAvailable, type MeditationPlayer } from '@/audio/player';
import { generateMeditation } from '@/ai/meditation';
import { AiError } from '@/ai/client';
import { MEDITATION_PROMPT_VERSION } from '@/ai/prompts/versions';
import { activeProfile } from '@/store/account';
import { currentSynthesis } from '@/store/soulMap';
import { markFalsePositive, recordCrisisEvent } from '@/store/crisis';
import { fetchQuota, renewalDate, type Quota } from '@/store/quota';
import { Paywall } from '@/components/Paywall';
import { getPreferences, setVolumes } from '@/store/preferences';
import { meditationById, saveMeditation, type StoredMeditation } from '@/store/meditations';

/**
 * PDR section 9. Package 14 (16 Oct 2026): armar → armando → escuchar, each
 * on its own photograph.
 *
 * The intention goes through Layer 1 before it reaches the model, on the same
 * reasoning as the chat: someone who types "quiero dormirme y no despertarme"
 * must not be handed a guided meditation about letting go.
 *
 * The duration is a request, not a promise. The screen shows what the script
 * actually came out at, because claiming twenty minutes and running eight is
 * the kind of small lie that costs a demo its credit.
 */

const LENGTHS = [5, 10, 20];
const text = copy.meditation;

/** The package's arrow (`I.fl`), play and pause glyphs. */
function ArrowGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.3} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

function PlayGlyph() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M8 5.5v13l11-6.5z" fill="currentColor" />
    </svg>
  );
}

function PauseGlyph() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="6.5" y="5" width="3.6" height="14" rx="1" fill="currentColor" />
      <rect x="13.9" y="5" width="3.6" height="14" rx="1" fill="currentColor" />
    </svg>
  );
}

export function Meditation() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const existingId = params.get('id');

  const profile = activeProfile();
  const synthesis = currentSynthesis();

  const [intent, setIntent] = useState('');
  const [minutes, setMinutes] = useState(10);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [crisisEventId, setCrisisEventId] = useState<string | null>(null);
  const [meditation, setMeditation] = useState<StoredMeditation | undefined>(() =>
    existingId ? meditationById(existingId) : undefined,
  );
  // v1.2 F-01: what the plan has left, said before it is used.
  const [quota, setQuota] = useState<Quota | null>(null);
  const [paywallDismissed, setPaywallDismissed] = useState(false);
  useEffect(() => {
    void fetchQuota('meditation').then(setQuota);
  }, [meditation]);

  if (crisisEventId) {
    return (
      <CrisisScreen
        country={profile?.draft.country}
        onNotMyCase={() => {
          markFalsePositive(crisisEventId);
          setCrisisEventId(null);
        }}
        onBack={() => {
          setCrisisEventId(null);
          navigate('/hoy');
        }}
      />
    );
  }

  if (meditation) {
    return <Player meditation={meditation} onLeave={() => setMeditation(undefined)} />;
  }

  // While the script is being written. What was typed stays in this
  // component's state, so a failure comes back to the form untouched.
  if (generating) {
    return (
      <Screen photo="nubesAzules" veil={0.25} glassAlpha={0.75}>
        <div className="pz meditaciones armando">
          <div className="sc">
            <p className="k">{text.kicker}</p>
            <h1 className="t mt">
              {text.generatingTitleLead}
              <em>{text.generatingTitleEmphasis}</em>
            </h1>
            <p className="cuerpo">{text.wait}</p>
          </div>
          <div className="gen-m" role="status">
            <span className="serp">
              <Ouroboros size={177} />
            </span>
            <p className="k">{text.loading}</p>
          </div>
        </div>
      </Screen>
    );
  }

  const generate = async () => {
    const text = intent.trim();
    if (text === '' || generating) return;

    const verdict = detectCrisis({ texts: [text] });
    if (verdict.crisis) {
      const event = recordCrisisEvent(verdict, 'meditation_intent');
      if (verdict.severity === 'high') {
        setCrisisEventId(event.id);
        return;
      }
    }

    setGenerating(true);
    setError(null);
    try {
      const result = await generateMeditation({
        intent: text,
        minutes,
        synthesis: synthesis?.synthesis ?? null,
        risk: riskLevel(
          profile ? { clinicalBasics: profile.draft.clinical_basics } : {},
        ),
      });
      setMeditation(
        saveMeditation({
          intent: text,
          requestedMinutes: minutes,
          estimatedMinutes: Math.round(
            estimateDurationMs(parseSsml(result.value.script_ssml)) / 60_000,
          ),
          script: result.value,
          promptVersion: MEDITATION_PROMPT_VERSION,
          mode: result.mode,
        }),
      );
    } catch (err) {
      if (err instanceof AiError && err.kind === 'quota') {
        setPaywallDismissed(false);
        void fetchQuota('meditation').then(setQuota);
        return;
      }
      setError(
        err instanceof AiError && err.kind === 'plan_cap'
          ? copy.quota.cap(renewalDate(err.renewsOn ?? ''))
          : err instanceof AiError && err.kind === 'spend_limit'
          ? copy.meditation.spendLimit
          : err instanceof AiError && err.kind === 'crisis'
            ? copy.meditation.crisis
            : copy.chrome.aiError.message,
      );
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Screen photo="estatua" veil={0.3} glassAlpha={0.3}>
      <div className="pz meditaciones armar">
        <div className="sc">
          <p className="k">{text.kicker}</p>
          <h1 className="t mt">
            {text.titleLead}
            <em>{text.titleEmphasis}</em>
          </h1>
          <p className="cuerpo">{text.helper}</p>

          <label className="lbl" htmlFor="intent">
            {text.intentLabel}
          </label>
          <textarea
            id="intent"
            className="vid area"
            value={intent}
            onChange={(e) => setIntent(e.target.value)}
            placeholder={text.placeholder}
          />

          <p className="lbl" id="length-label">
            {text.lengthLabel}
          </p>
          <div className="chips" role="group" aria-labelledby="length-label">
            {LENGTHS.map((length) => (
              <button
                key={length}
                type="button"
                aria-pressed={minutes === length}
                onClick={() => setMinutes(length)}
                className={minutes === length ? 'dur on' : 'dur'}
              >
                {text.minutes(length)}
              </button>
            ))}
          </div>

          {quota && quota.remaining !== null && quota.remaining > 0 && (
            <p className="cupo">{copy.quota.meditations(quota.remaining)}</p>
          )}
          {quota?.remaining === 0 && quota.tier === 'premium' && (
            <p className="cupo">{copy.quota.usedThisMonth(renewalDate(quota.renewsOn))}</p>
          )}
          {!isPlaybackAvailable() && <p className="cupo">{text.noSpeech}</p>}

          {quota?.remaining === 0 && quota.tier === 'free' && !paywallDismissed && (
            <div className="hoja">
              <Paywall feature="meditation" onDismiss={() => setPaywallDismissed(true)} />
            </div>
          )}

          {error && (
            <div role="alert" className="aviso">
              <p className="err">{error}</p>
              {error === copy.chrome.aiError.message && (
                <button type="button" onClick={() => void generate()} className="p2">
                  {copy.chrome.aiError.retry}
                </button>
              )}
            </div>
          )}

          <div className="pie">
            <button
              type="button"
              className="btn p"
              disabled={intent.trim() === '' || generating || quota?.remaining === 0}
              onClick={() => void generate()}
            >
              {generating ? text.generating : text.generate}
              <ArrowGlyph />
            </button>
            <Link to="/biblioteca" className="link">
              <u>{text.saved}</u>
            </Link>
          </div>
        </div>
      </div>
    </Screen>
  );
}

/** «3:12», from milliseconds. */
function clock(ms: number): string {
  const seconds = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

function Player({ meditation, onLeave }: { meditation: StoredMeditation; onLeave: () => void }) {
  const [state, setState] = useState<'idle' | 'playing' | 'finished'>('idle');
  const [elapsed, setElapsed] = useState(0);
  const [voice, setVoice] = useState(() => getPreferences().voice_volume);
  const [bed, setBed] = useState(() => getPreferences().bed_volume);
  const playerRef = useRef<MeditationPlayer | null>(null);
  // Where the voice was when paused: playing again goes on from there (QA-31).
  const segmentRef = useRef(0);

  const bedTrack = useMemo(
    () => BED_TRACKS.find((track) => track.id === meditation.script.bed_track_id),
    [meditation.script.bed_track_id],
  );

  // Where each segment starts on the estimated clock, so the bar and the
  // time beside it move with the script rather than by segment count.
  const { starts, totalMs } = useMemo(() => {
    const segments = parseSsml(meditation.script.script_ssml);
    return {
      starts: segments.map((_, i) => estimateDurationMs(segments.slice(0, i))),
      totalMs: estimateDurationMs(segments),
    };
  }, [meditation.script.script_ssml]);
  const progress = totalMs > 0 ? Math.min(1, elapsed / totalMs) : 0;

  // Silence when the screen goes away. Speech outlives an unmounted component
  // and would follow the person to the next screen.
  useEffect(() => () => playerRef.current?.stop(), []);

  const start = () => {
    playerRef.current?.stop();
    // After the end it starts over; after a pause, from the sentence it was in.
    const from = state === 'finished' ? 0 : segmentRef.current;
    const player = createPlayer({
      ssml: meditation.script.script_ssml,
      from,
      bed: bedTrack,
      voiceVolume: voice,
      bedVolume: bed,
      events: {
        onSegment: (index) => {
          segmentRef.current = index;
          setElapsed(starts[index] ?? 0);
        },
        onState: (next) => {
          setState(next);
          if (next === 'finished') {
            segmentRef.current = 0;
            setElapsed(totalMs);
          }
        },
      },
    });
    playerRef.current = player;
    player.play();
  };

  const stop = () => {
    playerRef.current?.stop();
    playerRef.current = null;
  };

  const playLabel = state === 'playing' ? text.stop : state === 'finished' ? text.again : text.play;
  const at = (fraction: number) => ({ '--at': `${fraction * 100}%` }) as CSSProperties;

  return (
    <Screen photo="lunaDunas" veil={0.22} glassAlpha={0.84}>
      <div className="pz meditaciones escuchar">
        <div className="sc">
          <div className="cabeza">
            <p className="k">{bedTrack?.name ?? text.voiceOnly}</p>
            <h1 className="t mt">{meditation.script.title}</h1>
            <p className="cuerpo">{text.duration(meditation.estimated_minutes, meditation.requested_minutes)}</p>
          </div>

          {/* The moon stays free: the player goes below it. */}
          <div className="hueco" aria-hidden="true" />

          <div className="vid rep">
            <div
              role="progressbar"
              aria-valuenow={Math.round(progress * 100)}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={text.progress}
              className="barra"
              style={at(progress)}
            >
              <i />
              <b />
            </div>
            <div className="tiempos">
              <span>{clock(elapsed)}</span>
              <span>{clock(totalMs)}</span>
            </div>
            <div className="ctrl">
              <button
                type="button"
                className="play"
                aria-label={playLabel}
                onClick={() => (state === 'playing' ? stop() : start())}
              >
                {state === 'playing' ? <PauseGlyph /> : <PlayGlyph />}
              </button>
            </div>
            <VolumeSlider
              id="voice-volume"
              label={text.voice}
              value={voice}
              onChange={(next) => {
                setVoice(next);
                setVolumes({ voice: next });
                playerRef.current?.setVoiceVolume(next);
              }}
            />
            <VolumeSlider
              id="bed-volume"
              label={text.bed}
              value={bed}
              onChange={(next) => {
                setBed(next);
                setVolumes({ bed: next });
                playerRef.current?.setBedVolume(next);
              }}
            />
          </div>

          <div className="guion-d">
            <div className="vid guion-c">
              <h2 className="k">{text.script}</h2>
              <p className="guion">{meditation.script.script_text}</p>
            </div>
            <button
              type="button"
              onClick={() => {
                stop();
                onLeave();
              }}
              className="btn s"
            >
              {text.another}
            </button>
            {isDemoMode && (
              <p className="demo">
                {meditation.mode === 'fixture' ? copy.demo.fixture : copy.demo.generated} ·{' '}
                {meditation.prompt_version}
              </p>
            )}
          </div>
        </div>
      </div>
    </Screen>
  );
}

function VolumeSlider({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="vol">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        type="range"
        min={0}
        max={1}
        step={0.05}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ '--at': value } as CSSProperties}
      />
    </div>
  );
}
