import { read, write } from './db';

/**
 * The journal (v1.2 B-01): the person's own account of their days.
 *
 * Everything written stays in their record — there is no "only for me" — and
 * every entry is scanned for crisis before it gets here. One that raised a
 * signal is kept, because it is their diary, and marked so that the memory
 * (M-01, premium) never reads it.
 *
 * Deleting is real. The row goes; the database keeps only an event with no
 * content (`system_audit_log`).
 */

export type JournalEntry = {
  id: string;
  /** The day the entry is about, YYYY-MM-DD. */
  entry_date: string;
  body: string;
  /** Voice is premium and transcribed by the server; this browser writes text. */
  source: 'escrito' | 'voz';
  /** 1 to 5, if the person marked it. */
  mood: number | null;
  /** A practice of the routine it is about, if any. */
  practice_id: string | null;
  /** A recommended therapy it is about, if any. */
  modality_slug: string | null;
  /** Raised a crisis signal when it was written: the memory never reads it. */
  crisis_flagged: boolean;
  created_at: number;
};

export const MAX_ENTRY_CHARS = 10_000;

function newId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `entry-${Math.trunc(performance.now())}`;
}

/** Most recent day first; within a day, the last written first. */
export function listEntries(): JournalEntry[] {
  return [...read<JournalEntry[]>('journal_entries', [])].sort(
    (a, b) => b.entry_date.localeCompare(a.entry_date) || b.created_at - a.created_at,
  );
}

export function addEntry(
  input: {
    entryDate: string;
    body: string;
    mood?: number | null;
    practiceId?: string | null;
    modalitySlug?: string | null;
    crisisFlagged?: boolean;
  },
  now = Date.now(),
): JournalEntry {
  const body = input.body.trim().slice(0, MAX_ENTRY_CHARS);
  if (!body) throw new Error('An empty entry is not an entry.');
  if (input.mood != null && (!Number.isInteger(input.mood) || input.mood < 1 || input.mood > 5)) {
    throw new Error(`mood out of range: ${input.mood}`);
  }
  const entry: JournalEntry = {
    id: newId(),
    entry_date: input.entryDate,
    body,
    source: 'escrito',
    mood: input.mood ?? null,
    practice_id: input.practiceId ?? null,
    modality_slug: input.modalitySlug ?? null,
    crisis_flagged: input.crisisFlagged ?? false,
    created_at: now,
  };
  write('journal_entries', [...read<JournalEntry[]>('journal_entries', []), entry]);
  return entry;
}

export function deleteEntry(id: string): void {
  write(
    'journal_entries',
    read<JournalEntry[]>('journal_entries', []).filter((e) => e.id !== id),
  );
}
