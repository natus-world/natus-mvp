// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';

const sent: string[] = [];
vi.mock('./report-error.ts', () => ({
  reportError: (_kind: string, error: Error) => sent.push(error.message),
}));

const { installStuckSignals } = await import('./stuck-signals.ts');
installStuckSignals();

function tap(el: Element) {
  el.dispatchEvent(new Event('pointerdown', { bubbles: true }));
}

describe('signs that something does not work (27 Oct 2026)', () => {
  beforeEach(() => {
    sent.length = 0;
    document.body.innerHTML = '';
  });

  it('tells four quick taps on the same button, once', () => {
    document.body.innerHTML = '<button>Ver mi carta completa</button>';
    const b = document.querySelector('button')!;
    for (let i = 0; i < 6; i++) tap(b);
    expect(sent).toEqual(['Atasco: toques repetidos en «Ver mi carta completa»']);
  });

  it('does not tell three taps', () => {
    document.body.innerHTML = '<button>Siguiente</button>';
    const b = document.querySelector('button')!;
    for (let i = 0; i < 3; i++) tap(b);
    expect(sent).toEqual([]);
  });

  it('tells a tap on a button that is off, by its label', () => {
    document.body.innerHTML = '<button class="btn off">Guardar <span>cambios</span></button>';
    tap(document.querySelector('span')!);
    expect(sent).toEqual(['Atasco: tocó «Guardar cambios» apagado']);
  });

  it('names something that is not a button by its tag alone, never its text', () => {
    document.body.innerHTML = '<div class="card"><p>Lo que escribí en mi bitácora</p></div>';
    const p = document.querySelector('p')!;
    for (let i = 0; i < 4; i++) tap(p);
    expect(sent).toEqual(['Atasco: toques repetidos en algo que no es un botón (p)']);
  });

  it('leaves out a long label, which may be content', () => {
    document.body.innerHTML = `<button>${'texto largo '.repeat(6)}</button>`;
    const b = document.querySelector('button')!;
    for (let i = 0; i < 4; i++) tap(b);
    expect(sent).toEqual(['Atasco: toques repetidos en button']);
  });
});
