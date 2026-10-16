import { useCallback, useEffect, useState } from 'react';
import { copy } from '@/i18n';
import { CrisisBanner } from '@/components/CrisisBanner';
import { detectCrisis } from '@/lib/safety';
import { recordCrisisEvent } from '@/store/crisis';
import {
  MAX_MEMORY_ITEM_CHARS,
  MEMORY_CATEGORIES,
  addMemoryItem,
  correctMemoryItem,
  deleteMemoryItem,
  learnFromPending,
  listMemory,
  type MemoryItem,
} from '@/store/memory';
import { getPreferences, setMemoryConsent } from '@/store/preferences';
import { fetchQuota } from '@/store/quota';
import type { MemoryCategory } from '@/lib/schemas';

/**
 * v1.2 M-01 in the profile (guide 9.10): see, correct and delete what Natus
 * knows, with what it is explained. Premium only to learn; whatever was kept
 * stays visible and deletable after premium or consent ends, paused.
 *
 * What the person writes here is theirs and goes through the crisis detector
 * like any other free text: a signal is recorded and the text is not saved,
 * since the memory never holds what raised one.
 */

const t = copy.memory;

type OnCrisis = (eventId: string, severity: 'high' | 'low') => void;

/** Scans what the person typed. True when it raised a signal and must not be saved. */
function raisedSignal(text: string, onCrisis: OnCrisis): boolean {
  const verdict = detectCrisis({ texts: [text] });
  if (!verdict.crisis) return false;
  const event = recordCrisisEvent(verdict, 'memory');
  onCrisis(event.id, verdict.severity);
  return true;
}

function ItemRow({
  item,
  onChanged,
  onCrisis,
}: {
  item: MemoryItem;
  onChanged: () => void;
  onCrisis: OnCrisis;
}) {
  const [mode, setMode] = useState<'view' | 'edit' | 'delete'>('view');
  const [draft, setDraft] = useState(item.content);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    const value = draft.trim();
    if (!value || value === item.content) return setMode('view');
    if (raisedSignal(value, onCrisis)) {
      setDraft(item.content);
      return setMode('view');
    }
    setBusy(true);
    await correctMemoryItem(item.id, value);
    setBusy(false);
    setMode('view');
    onChanged();
  };

  return (
    <li className="mem">
      <div className="tx">
        <p className="c">{t.categories[item.category]}</p>
        {mode === 'edit' ? (
          <textarea
            rows={3}
            maxLength={MAX_MEMORY_ITEM_CHARS}
            value={draft}
            aria-label={t.correct}
            onChange={(e) => setDraft(e.target.value)}
            className="campo-t"
          />
        ) : (
          <p className="v">{item.content}</p>
        )}
        {mode === 'view' && item.edited_by_user && <p className="por-ti">{t.byYou}</p>}

        {mode === 'edit' && (
          <div className="acts">
            <button type="button" disabled={busy} className="mini-b on" onClick={() => void save()}>
              {t.save}
            </button>
            <button type="button" className="mini-b" onClick={() => setMode('view')}>
              {t.cancel}
            </button>
          </div>
        )}

        {mode === 'delete' && (
          <div className="conf">
            <p className="nota">{t.deleteConfirm}</p>
            <div className="acts">
              <button
                type="button"
                disabled={busy}
                className="mini-b on"
                onClick={async () => {
                  setBusy(true);
                  await deleteMemoryItem(item.id);
                  setBusy(false);
                  onChanged();
                }}
              >
                {t.deleteYes}
              </button>
              <button type="button" className="mini-b" onClick={() => setMode('view')}>
                {t.deleteNo}
              </button>
            </div>
          </div>
        )}
      </div>

      {mode === 'view' && (
        <>
          <button type="button" className="acc-m" onClick={() => setMode('edit')}>
            {t.correct}
          </button>
          <button type="button" className="acc-m" onClick={() => setMode('delete')}>
            {t.delete}
          </button>
        </>
      )}
    </li>
  );
}

function AddItem({ onAdded, onCrisis }: { onAdded: () => void; onCrisis: OnCrisis }) {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<MemoryCategory>('contexto');
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);

  if (!open) {
    return (
      <button type="button" className="p2i" onClick={() => setOpen(true)}>
        {t.add}
      </button>
    );
  }

  const save = async () => {
    const value = text.trim();
    if (!value) return;
    if (raisedSignal(value, onCrisis)) {
      setOpen(false);
      setText('');
      return;
    }
    setBusy(true);
    await addMemoryItem(category, value);
    setBusy(false);
    setOpen(false);
    setText('');
    onAdded();
  };

  return (
    <>
      <p className="grupo">{t.addCategory}</p>
      <div className="chips-p">
        {MEMORY_CATEGORIES.map((c) => (
          <button
            key={c}
            type="button"
            aria-pressed={category === c}
            onClick={() => setCategory(c)}
            className={category === c ? 'chip-p on' : 'chip-p'}
          >
            {t.categories[c]}
          </button>
        ))}
      </div>
      <label htmlFor="memory-add" className="lbl-b">
        {t.addLabel}
      </label>
      <textarea
        id="memory-add"
        rows={3}
        maxLength={MAX_MEMORY_ITEM_CHARS}
        value={text}
        onChange={(e) => setText(e.target.value)}
        className="campo-t"
      />
      <button
        type="button"
        disabled={busy || !text.trim()}
        className="p1i"
        onClick={() => void save()}
      >
        {t.save}
      </button>
      <button type="button" className="p2i" onClick={() => setOpen(false)}>
        {t.cancel}
      </button>
    </>
  );
}

/**
 * Rendered inside Perfil's «Lo que *sabemos*» (package 11): one glass list,
 * each item with its category, «Corregir» and «Borrar».
 */
export function MemorySection({
  country,
  onCrisis,
}: {
  country: string | undefined;
  onCrisis: (eventId: string) => void;
}) {
  const [lowSignal, setLowSignal] = useState(false);
  const signal: OnCrisis = (eventId, severity) =>
    severity === 'high' ? onCrisis(eventId) : setLowSignal(true);
  const [tier, setTier] = useState<'free' | 'premium' | null>(null);
  const [consent, setConsent] = useState(() => Boolean(getPreferences().memory_consent_at));
  const [items, setItems] = useState<MemoryItem[] | null | undefined>(undefined);

  const reload = useCallback(() => {
    void listMemory().then(setItems);
  }, []);

  useEffect(() => {
    void fetchQuota('chat').then((q) => setTier(q?.tier ?? 'free'));
    reload();
  }, [reload]);

  if (tier === null) return null;
  const active = tier === 'premium' && consent;
  const hasItems = Boolean(items && items.length > 0);
  // In the order of the categories, as the profile always listed them.
  const ordered = items
    ? MEMORY_CATEGORIES.flatMap((category) => items.filter((i) => i.category === category))
    : [];

  return (
    <>
      {lowSignal && <CrisisBanner country={country} />}

      {tier === 'free' && !hasItems && <p className="sub">{t.freeBody}</p>}

      {tier === 'premium' && !consent && (
        <>
          <p className="sub">{t.consentBody}</p>
          <button
            type="button"
            className="p1i"
            onClick={() => {
              setMemoryConsent(true);
              setConsent(true);
              void learnFromPending();
            }}
          >
            {t.consentCta}
          </button>
        </>
      )}

      {active && <p className="sub">{t.sub}</p>}
      {!active && hasItems && <p className="nota">{t.paused}</p>}

      {items === null && (active || hasItems) && <p className="nota">{t.unavailable}</p>}

      {active && items && items.length === 0 && <p className="nota">{t.empty}</p>}

      {ordered.length > 0 && (
        <ul className="lista">
          {ordered.map((item) => (
            <ItemRow key={item.id} item={item} onChanged={reload} onCrisis={signal} />
          ))}
        </ul>
      )}

      {active && <AddItem onAdded={reload} onCrisis={signal} />}

      <p className="nota">{t.neverCrisis}</p>

      {active && (
        <>
          <button
            type="button"
            className="enl"
            onClick={() => {
              setMemoryConsent(false);
              setConsent(false);
            }}
          >
            {t.withdraw}
          </button>
          <p className="nota">{t.withdrawNote}</p>
        </>
      )}
    </>
  );
}
