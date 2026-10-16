import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PHOTO, Screen } from '@/design/Screen';
import { MicIcon } from '@/design/icons';
import { useDictation } from '@/components/useDictation';
import { copy } from '@/i18n';
import { modalityBySlug } from '@/lib/catalog';
import { detectCrisis } from '@/lib/safety';
import { PATHS } from '@/components/routes';
import { CrisisScreen } from '@/screens/CrisisScreen';
import { activeProfile } from '@/store/account';
import { hasRecentLowSeverity, markFalsePositive, recordCrisisEvent } from '@/store/crisis';
import { CrisisBanner } from '@/components/CrisisBanner';
import { getPreferences } from '@/store/preferences';
import { learnFromPending } from '@/store/memory';
import { addEntry, deleteEntry, listEntries, MAX_ENTRY_CHARS, type JournalEntry } from '@/store/journal';
import { currentMatch } from '@/store/matches';
import { fetchQuota } from '@/store/quota';
import { listPractices } from '@/store/routine';

/**
 * v1.2 B-01, guide 9.8. The person's diary: what they are living, in their
 * words. Everything written is kept in their record — there is no "only for
 * me" — and every entry goes through the crisis detector before it is saved,
 * the same as a chat turn.
 *
 * Like the routine, it counts nothing: no streak, no "you wrote 5 days in a
 * row", no reminder about a day without an entry.
 */

const text = copy.journal;
const MOODS = [1, 2, 3, 4, 5] as const;

/** The person's own calendar day, not UTC's: an entry at 11 p.m. is today's. */
function localToday(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

type About = { kind: 'practice'; id: string; label: string } | { kind: 'therapy'; slug: string; label: string };

/** What an entry can be about: the practices of the routine and the therapies kept. */
function linkOptions(): About[] {
  const match = currentMatch();
  if (!match) return [];
  const practices: About[] = listPractices()
    .filter((p) => p.match_id === match.id && p.is_active)
    .map((p) => ({ kind: 'practice', id: p.id, label: p.title }));
  const therapies: About[] = match.result.matched_modalities
    .filter((m) => match.reactions[m.modality_slug]?.reaction !== 'dismissed')
    .map((m) => ({ kind: 'therapy', slug: m.modality_slug, label: modalityBySlug(m.modality_slug)?.name_es ?? m.modality_slug }));
  return [...practices, ...therapies];
}

function linkedLabel(entry: JournalEntry): string | null {
  if (entry.practice_id) return listPractices().find((p) => p.id === entry.practice_id)?.title ?? null;
  if (entry.modality_slug) return modalityBySlug(entry.modality_slug)?.name_es ?? null;
  return null;
}

function Title({ lead, emphasis }: { lead: string; emphasis: string }) {
  return (
    <h1 className="mb-2 text-[length:var(--fs-title-28)] leading-[var(--lh-heading-1_15)] text-blanco">
      {lead}
      <span className="font-serif text-crema italic">{emphasis}</span>
    </h1>
  );
}

function EntryCard({ entry, onDeleted }: { entry: JournalEntry; onDeleted: () => void }) {
  const [confirming, setConfirming] = useState(false);
  const linked = linkedLabel(entry);
  const thisYear = new Date().getFullYear();

  return (
    <article className="surface surface-p16">
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <h2 className="text-[length:var(--fs-heading-14)] leading-snug text-blanco">
          {text.date(entry.entry_date, thisYear)}
        </h2>
        {entry.mood !== null && (
          <span className="shrink-0 text-[length:var(--fs-label-10)] tracking-wide text-crema/55 uppercase">
            {text.mood} {entry.mood}/5
          </span>
        )}
      </div>
      {linked && (
        <p className="mb-2 text-[length:var(--fs-label-11)] tracking-wide text-crema/55 uppercase">{linked}</p>
      )}
      <p className="mb-3 line-clamp-3 text-[length:var(--fs-body-12_5)] leading-relaxed whitespace-pre-line text-crema/75">
        {entry.body}
      </p>

      {confirming ? (
        <div className="flex flex-col gap-2.5" role="group" aria-label={text.delete}>
          <p className="text-[length:var(--fs-body-12_5)] leading-relaxed text-crema/75">{text.deleteConfirm}</p>
          <div className="flex gap-2">
            <button
              type="button"
              className="chip chip-p8 flex-1 text-crema/70"
              onClick={() => {
                deleteEntry(entry.id);
                onDeleted();
              }}
            >
              {text.deleteYes}
            </button>
            <button type="button" className="chip chip-p8 flex-1 text-crema/70" onClick={() => setConfirming(false)}>
              {text.deleteNo}
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          className="text-[length:var(--fs-body-11)] text-crema/55 underline-offset-4 hover:text-crema hover:underline"
          onClick={() => setConfirming(true)}
        >
          {text.delete}
        </button>
      )}
    </article>
  );
}

/** Guide 9.8's honest notice, by plan and by whether the memory reads the journal. */
function useNotice(): string {
  const [tier, setTier] = useState<'free' | 'premium' | null>(null);
  useEffect(() => {
    let live = true;
    void fetchQuota('chat').then((q) => {
      if (live) setTier(q?.tier ?? null);
    });
    return () => {
      live = false;
    };
  }, []);
  if (tier === 'premium') return getPreferences().memory_consent_at ? text.noticePremium : text.notice;
  if (tier === 'free') return text.noticeFree;
  return text.notice;
}

export function Journal() {
  const [, force] = useState(0);
  const entries = listEntries();
  const notice = useNotice();

  return (
    <Screen backdrop="plumas" scrim="heavy" opacity={PHOTO.content45}>
      <div className="flex min-h-dvh flex-col overflow-y-auto px-5 pt-[var(--top-inset)] pb-[var(--bottom-inset)] sm:min-h-0">
        <p className="eyebrow mb-3">{text.kicker}</p>
        <Title lead={text.titleLead} emphasis={text.titleEmphasis} />
        <p className="mb-6 text-[length:var(--fs-body-12_5)] leading-relaxed text-crema/55">{notice}</p>

        {hasRecentLowSeverity() && (
          <div className="-mx-2 mb-5">
            <CrisisBanner country={activeProfile()?.draft.country} />
          </div>
        )}

        <Link to={`${PATHS.journal}/nueva`} className="cta mb-6 no-underline">
          {text.write}
        </Link>

        {entries.length === 0 ? (
          <p className="text-center text-[length:var(--fs-body-14)] leading-relaxed text-crema/65">{text.empty}</p>
        ) : (
          <div className="flex flex-col gap-2.5">
            {entries.map((entry) => (
              <EntryCard key={entry.id} entry={entry} onDeleted={() => force((n) => n + 1)} />
            ))}
          </div>
        )}
      </div>
    </Screen>
  );
}

export function NewJournalEntry() {
  const navigate = useNavigate();
  const [date, setDate] = useState(localToday);
  const [body, setBody] = useState('');
  const [mood, setMood] = useState<number | null>(null);
  const [link, setLink] = useState<About | null>(null);
  const [crisisEventId, setCrisisEventId] = useState<string | null>(null);
  const [premium, setPremium] = useState(false);
  const [dictated, setDictated] = useState(false);
  const options = linkOptions();
  const dictation = useDictation(
    useCallback((said: string) => {
      if (!said) return;
      setDictated(true);
      setBody((current) => (current.trim() ? `${current.trimEnd()} ${said}` : said).slice(0, MAX_ENTRY_CHARS));
    }, []),
  );

  // Voice is premium (B-01): free sees the disabled microphone and the
  // guide's line; premium dictates with the browser, where it can.
  useEffect(() => {
    let live = true;
    void fetchQuota('chat').then((q) => {
      if (live) setPremium(q?.tier === 'premium');
    });
    return () => {
      live = false;
    };
  }, []);

  const save = () => {
    const value = body.trim();
    if (!value) return;
    dictation.stop();
    const verdict = detectCrisis({ texts: [value] });
    // Kept either way — it is their diary — and marked, so the memory never
    // reads an entry that raised a signal (M-01).
    addEntry({
      entryDate: date,
      body: value,
      mood,
      practiceId: link?.kind === 'practice' ? link.id : null,
      modalitySlug: link?.kind === 'therapy' ? link.slug : null,
      crisisFlagged: verdict.crisis,
      source: dictated && premium ? 'voz' : 'escrito',
    });
    if (verdict.crisis) {
      const event = recordCrisisEvent(verdict, 'journal');
      if (verdict.severity === 'high') {
        setCrisisEventId(event.id);
        return;
      }
    }
    // Premium with consent: the memory learns from it, in the background.
    void learnFromPending();
    navigate(PATHS.journal);
  };

  if (crisisEventId) {
    return (
      <CrisisScreen
        country={activeProfile()?.draft.country}
        onNotMyCase={() => {
          markFalsePositive(crisisEventId);
          navigate(PATHS.journal);
        }}
        onBack={() => navigate(PATHS.journal)}
      />
    );
  }

  const isLinked = (o: About) =>
    link !== null &&
    o.kind === link.kind &&
    (o.kind === 'practice' ? o.id === (link as typeof o).id : o.slug === (link as typeof o).slug);

  return (
    <Screen backdrop="plumas" scrim="heavy" opacity={PHOTO.content45}>
      <div className="flex min-h-dvh flex-col overflow-y-auto px-5 pt-[var(--top-inset)] pb-[var(--bottom-inset)] sm:min-h-0">
        <p className="eyebrow mb-3">{text.newKicker}</p>
        <Title lead={text.newTitleLead} emphasis={text.newTitleEmphasis} />

        <div className="mt-4 flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <label htmlFor="entry-date" className="text-[length:var(--fs-body-11)] text-crema/55">
              {text.dateLabel}
            </label>
            <input
              id="entry-date"
              type="date"
              value={date}
              max={localToday()}
              onChange={(e) => setDate(e.target.value || localToday())}
              className="field w-full px-3.5 text-[length:var(--fs-body-13)]"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="entry-body" className="text-[length:var(--fs-body-11)] text-crema/55">
              {text.bodyLabel}
            </label>
            <textarea
              id="entry-body"
              rows={7}
              maxLength={MAX_ENTRY_CHARS}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder={text.placeholder}
              className="field w-full resize-none px-3.5 py-3 text-[length:var(--fs-body-13)] placeholder:text-crema/55"
            />
            {premium && dictation.supported && (
              <div className="flex items-center gap-2.5 text-[length:var(--fs-body-11)] text-crema/60">
                <button
                  type="button"
                  aria-pressed={dictation.listening}
                  onClick={dictation.listening ? dictation.stop : dictation.start}
                  className={[
                    'chip-p8 flex shrink-0 items-center gap-2 px-3.5',
                    // No ✓ while listening: it is not a choice made, it is a recording.
                    dictation.listening ? 'chip text-blanco' : 'chip text-crema/75',
                  ].join(' ')}
                >
                  <MicIcon size={16} />
                  {dictation.listening ? text.voiceStop : text.voiceLabel}
                </button>
                {dictation.listening && <span role="status">{text.voiceListening}</span>}
              </div>
            )}
            {!premium && (
              <div className="flex items-center gap-2.5 text-[length:var(--fs-body-11)] text-crema/55">
                <button
                  type="button"
                  disabled
                  aria-label={text.voiceLabel}
                  className="chip chip-p8 shrink-0 text-crema/55 disabled:opacity-60"
                >
                  <MicIcon size={16} />
                </button>
                <span>{text.voicePremium}</span>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <p className="text-[length:var(--fs-body-11)] text-crema/55">{text.moodQuestion}</p>
            <div role="radiogroup" aria-label={text.moodQuestion} className="flex gap-1.5">
              {MOODS.map((n) => (
                <button
                  key={n}
                  type="button"
                  role="radio"
                  aria-checked={mood === n}
                  aria-label={text.moodLabel(n)}
                  onClick={() => setMood(mood === n ? null : n)}
                  className={['chip-p8 flex-1', mood === n ? 'chip chip-on' : 'chip text-crema/70'].join(' ')}
                >
                  {n}
                </button>
              ))}
            </div>
            <div className="flex justify-between text-[length:var(--fs-body-11)] text-crema/55">
              <span>{text.moodLow}</span>
              <span>{text.moodHigh}</span>
            </div>
          </div>

          {options.length > 0 && (
            <div className="flex flex-col gap-2">
              <p className="text-[length:var(--fs-body-11)] text-crema/55">{text.linkLabel}</p>
              <div className="flex flex-wrap gap-1.5">
                {options.map((o) => {
                  const on = isLinked(o);
                  return (
                    <button
                      key={o.kind === 'practice' ? o.id : o.slug}
                      type="button"
                      aria-pressed={on}
                      onClick={() => setLink(on ? null : o)}
                      className={['chip-p8', on ? 'chip chip-on' : 'chip text-crema/70'].join(' ')}
                    >
                      {o.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex flex-col gap-3">
            <button type="button" className="cta" disabled={!body.trim()} onClick={save}>
              {text.save}
            </button>
            <Link
              to={PATHS.journal}
              className="text-center text-[length:var(--fs-body-12_5)] text-crema/55 no-underline hover:text-crema"
            >
              {text.cancel}
            </Link>
          </div>
        </div>
      </div>
    </Screen>
  );
}
