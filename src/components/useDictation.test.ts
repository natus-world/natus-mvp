import { describe, expect, it } from 'vitest';
import { transcriptCollector } from './useDictation';

const r = (transcript: string, isFinal: boolean) => ({ isFinal, 0: { transcript } });

describe('dictation hands each result over once (owner, 22 Oct 2026)', () => {
  it('hands over a final result at once', () => {
    const said: string[] = [];
    const c = transcriptCollector((t) => said.push(t));
    c.result(0, [r('hoy me', false)]);
    c.result(0, [r('hoy me sentí bien', true)]);
    c.end();
    expect(said).toEqual(['hoy me sentí bien']);
  });

  it('hands over what was never marked final when it ends, as Safari on the iPhone does', () => {
    const said: string[] = [];
    const c = transcriptCollector((t) => said.push(t));
    c.result(0, [r('hoy', false)]);
    c.result(0, [r('hoy fue un día largo', false)]);
    expect(said).toEqual([]);
    c.end();
    expect(said).toEqual(['hoy fue un día largo']);
  });

  it('never hands over the same result twice, nor an empty one', () => {
    const said: string[] = [];
    const c = transcriptCollector((t) => said.push(t));
    c.result(0, [r('primera', true), r('', false)]);
    c.result(0, [r('primera', true), r('segunda', true)]);
    c.end();
    expect(said).toEqual(['primera', 'segunda']);
  });
});
