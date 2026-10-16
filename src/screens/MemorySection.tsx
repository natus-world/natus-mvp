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

function ItemRow({ item, onChanged, onCrisis }: { item: MemoryItem; onChanged: () => void; onCrisis: OnCrisis }) {
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
    <li className="flex flex-col gap-2 border-t border-crema/10 pt-2.5 first:border-t-0 first:pt-0">
      {mode === 'edit' ? (
        <>
          <textarea
            rows={3}
            maxLength={MAX_MEMORY_ITEM_CHARS}
            value={draft}
            aria-label={t.correct}
            onChange={(e) => setDraft(e.target.value)}
            className="field w-full resize-none px-3 py-2 text-[length:var(--fs-body-13)]"
          />
          <div className="flex gap-2">
            <button type="button" disabled={busy} className="chip chip-p6 flex-1 text-crema/75" onClick={() => void save()}>
              {t.save}
            </button>
            <button type="button" className="chip chip-p6 flex-1 text-crema/60" onClick={() => setMode('view')}>
              {t.cancel}
            </button>
          </div>
        </>
      ) : (
        <p className="text-[length:var(--fs-body-13)] leading-relaxed text-blanco">{item.content}</p>
      )}

      {mode === 'delete' && (
        <div className="flex flex-col gap-2">
          <p className="text-[length:var(--fs-body-11_5)] leading-relaxed text-crema/70">{t.deleteConfirm}</p>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={busy}
              className="chip chip-p6 flex-1 text-crema/75"
              onClick={async () => {
                setBusy(true);
                await deleteMemoryItem(item.id);
                setBusy(false);
                onChanged();
              }}
            >
              {t.deleteYes}
            </button>
            <button type="button" className="chip chip-p6 flex-1 text-crema/60" onClick={() => setMode('view')}>
              {t.deleteNo}
            </button>
          </div>
        </div>
      )}

      {mode === 'view' && (
        <div className="flex items-center gap-4 text-[length:var(--fs-body-11)] text-crema/55">
          {item.edited_by_user && <span>{t.byYou}</span>}
          <button type="button" className="hover:text-crema" onClick={() => setMode('edit')}>
            {t.correct}
          </button>
          <button type="button" className="hover:text-crema" onClick={() => setMode('delete')}>
            {t.delete}
          </button>
        </div>
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
      <button type="button" className="chip chip-p10 w-full text-crema/75" onClick={() => setOpen(true)}>
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
    <div className="flex flex-col gap-2.5">
      <p className="text-[length:var(--fs-body-11)] text-crema/55">{t.addCategory}</p>
      <div className="flex flex-wrap gap-1.5">
        {MEMORY_CATEGORIES.map((c) => (
          <button
            key={c}
            type="button"
            aria-pressed={category === c}
            onClick={() => setCategory(c)}
            className={['chip-p6 px-3', category === c ? 'chip chip-on' : 'chip text-crema/70'].join(' ')}
          >
            {t.categories[c]}
          </button>
        ))}
      </div>
      <label htmlFor="memory-add" className="text-[length:var(--fs-body-11)] text-crema/55">
        {t.addLabel}
      </label>
      <textarea
        id="memory-add"
        rows={3}
        maxLength={MAX_MEMORY_ITEM_CHARS}
        value={text}
        onChange={(e) => setText(e.target.value)}
        className="field w-full resize-none px-3 py-2 text-[length:var(--fs-body-13)]"
      />
      <div className="flex gap-2">
        <button
          type="button"
          disabled={busy || !text.trim()}
          className="chip chip-p6 flex-1 text-crema/75 disabled:opacity-60"
          onClick={() => void save()}
        >
          {t.save}
        </button>
        <button type="button" className="chip chip-p6 flex-1 text-crema/60" onClick={() => setOpen(false)}>
          {t.cancel}
        </button>
      </div>
    </div>
  );
}

export function MemorySection({ country, onCrisis }: { country: string | undefined; onCrisis: (eventId: string) => void }) {
  const [lowSignal, setLowSignal] = useState(false);
  const signal: OnCrisis = (eventId, severity) => (severity === 'high' ? onCrisis(eventId) : setLowSignal(true));
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

  return (
    <section className="surface surface-p14 mb-3">
      <p className="eyebrow mb-1.5">{t.kicker}</p>
      {lowSignal && (
        <div className="-mx-2 mb-3">
          <CrisisBanner country={country} />
        </div>
      )}

      {tier === 'free' && !hasItems && (
        <p className="text-[length:var(--fs-body-11_5)] leading-relaxed text-crema/60">{t.freeBody}</p>
      )}

      {tier === 'premium' && !consent && (
        <>
          <p className="mb-3 text-[length:var(--fs-body-11_5)] leading-relaxed text-crema/60">{t.consentBody}</p>
          <button
            type="button"
            className="chip chip-p10 mb-3 w-full text-crema/75"
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

      {active && <p className="mb-3 text-[length:var(--fs-body-11_5)] leading-relaxed text-crema/60">{t.explain}</p>}
      {!active && hasItems && (
        <p className="mb-3 text-[length:var(--fs-body-11_5)] leading-relaxed text-crema/60">{t.paused}</p>
      )}

      {items === null && (active || hasItems) && (
        <p className="text-[length:var(--fs-body-11_5)] text-crema/60">{t.unavailable}</p>
      )}

      {active && items && items.length === 0 && (
        <p className="mb-3 text-[length:var(--fs-body-11_5)] leading-relaxed text-crema/60">{t.empty}</p>
      )}

      {items && items.length > 0 && (
        <div className="mb-3 flex flex-col gap-4">
          {MEMORY_CATEGORIES.map((category) => {
            const inCategory = items.filter((i) => i.category === category);
            if (inCategory.length === 0) return null;
            return (
              <div key={category}>
                <p className="mb-2 text-[length:var(--fs-label-11)] tracking-wide text-crema/55 uppercase">
                  {t.categories[category]}
                </p>
                <ul className="flex flex-col gap-2.5">
                  {inCategory.map((item) => (
                    <ItemRow key={item.id} item={item} onChanged={reload} onCrisis={signal} />
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      )}

      {active && <AddItem onAdded={reload} onCrisis={signal} />}

      {active && (
        <div className="mt-3 flex flex-col gap-1">
          <button
            type="button"
            className="self-start text-[length:var(--fs-body-11)] text-crema/55 underline-offset-4 hover:text-crema hover:underline"
            onClick={() => {
              setMemoryConsent(false);
              setConsent(false);
            }}
          >
            {t.withdraw}
          </button>
          <p className="text-[length:var(--fs-body-11)] leading-relaxed text-crema/55">{t.withdrawNote}</p>
        </div>
      )}
    </section>
  );
}
