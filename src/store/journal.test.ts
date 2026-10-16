import { beforeEach, describe, expect, it } from 'vitest';
import { addEntry, deleteEntry, listEntries } from './journal';
import { clearAll } from './db';
import { installMemoryStorage } from './memory-storage.testing.ts';

beforeEach(() => {
  installMemoryStorage();
  clearAll();
});

describe('the journal (v1.2 B-01)', () => {
  it('lists the most recent day first', () => {
    addEntry({ entryDate: '2026-10-14', body: 'Ayer.' }, 1);
    addEntry({ entryDate: '2026-10-16', body: 'Hoy.' }, 2);
    addEntry({ entryDate: '2026-10-15', body: 'Anteayer, escrito después.' }, 3);
    expect(listEntries().map((e) => e.body)).toEqual(['Hoy.', 'Anteayer, escrito después.', 'Ayer.']);
  });

  it('keeps what the person wrote, trimmed, and nothing empty', () => {
    expect(addEntry({ entryDate: '2026-10-16', body: '  Caminé.  ', mood: 4 })).toMatchObject({
      body: 'Caminé.',
      mood: 4,
      source: 'escrito',
      crisis_flagged: false,
    });
    expect(() => addEntry({ entryDate: '2026-10-16', body: '   ' })).toThrow();
    expect(() => addEntry({ entryDate: '2026-10-16', body: 'x', mood: 6 })).toThrow();
  });

  it('deletes for real', () => {
    const entry = addEntry({ entryDate: '2026-10-16', body: 'Borrar esto.' });
    deleteEntry(entry.id);
    expect(listEntries()).toEqual([]);
  });
});
