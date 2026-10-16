import { describe, expect, it } from 'vitest';
import { MEMORY_SYSTEM_PROMPT, buildMemoryUserMessage } from './memory';
import { PERSON_TEXT_OPEN, PERSON_TEXT_RULE } from './shared';
import { lintCopy } from '@/lib/copy-lint';

describe('the memory prompt (v1.2 M-01)', () => {
  it('keeps nothing clinical and learns only from the person', () => {
    expect(MEMORY_SYSTEM_PROMPT).toContain('Nada clínico');
    expect(MEMORY_SYSTEM_PROMPT).toMatch(/no\s+se guarda lo que dijo Davraz/);
    expect(MEMORY_SYSTEM_PROMPT).toContain('no se corrigen nunca');
    expect(MEMORY_SYSTEM_PROMPT).toContain(PERSON_TEXT_RULE);
  });

  it('is written without voseo', () => {
    expect(lintCopy(MEMORY_SYSTEM_PROMPT).filter((v) => v.rule === 'voseo')).toEqual([]);
  });

  it('delimits what the person wrote, from each source, and never what Davraz said', () => {
    const items = [{ ref: 'm1', category: 'le_funciona' as const, content: 'Caminar te ayuda.', byPerson: true }];
    const journal = buildMemoryUserMessage({
      items,
      gender: 'neutro',
      source: { kind: 'journal', date: '2026-10-16', mood: 4, about: 'Caminata', body: 'Hoy caminé.' },
    });
    expect(journal).toContain('[m1] le_funciona · escrito por la persona: Caminar te ayuda.');
    expect(journal).toContain(`${PERSON_TEXT_OPEN}Hoy caminé.`);
    expect(journal).toContain('TRATO: neutro');

    const checkin = buildMemoryUserMessage({
      items: [],
      gender: 'femenino',
      source: { kind: 'checkin', practice: 'Respiración', date: '2026-10-16', rating: 2, comment: 'Me aburrió.' },
    });
    expect(checkin).toContain('(nada todavía)');
    expect(checkin).toContain(`${PERSON_TEXT_OPEN}Me aburrió.`);

    const conversation = buildMemoryUserMessage({
      items: [],
      gender: 'masculino',
      source: {
        kind: 'conversation',
        turns: [
          { role: 'user', text: 'Duermo mal.' },
          { role: 'assistant', text: 'Cuéntame más.' },
        ],
      },
    });
    expect(conversation).toContain(`Persona: ${PERSON_TEXT_OPEN}Duermo mal.`);
    expect(conversation).toContain('Davraz: Cuéntame más.');
  });
});
