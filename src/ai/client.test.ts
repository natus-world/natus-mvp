import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';


type Invoke = (fn: string, options: unknown) => Promise<{ data: unknown; error: unknown }>;

function mockClient(invoke: Invoke, isDemoMode = false) {
  vi.doMock('@/supabase/report-error', () => ({ reportError: () => {} }));
  vi.doMock('@/supabase/client', () => ({
    isBackendConfigured: true,
    isDemoMode,
    supabase: {
      auth: { getSession: async () => ({ data: { session: { user: { id: 'u1' } } } }) },
      functions: { invoke },
    },
  }));
}

function httpError(status: number, body: unknown) {
  const error = new Error(`Edge Function returned ${status}`);
  error.name = 'FunctionsHttpError';
  return Object.assign(error, {
    context: new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    }),
  });
}

const call = {
  purpose: 'chat' as const,
  promptVersion: 'test',
  system: '',
  user: '',
  schema: z.object({ text: z.string() }),
  fixture: () => ({ text: 'fixture' }),
  edge: { fn: 'chat', body: {} },
};

async function run(invoke: Invoke, isDemoMode = false) {
  mockClient(invoke, isDemoMode);
  const { runAi } = await import('./client');
  return runAi(call);
}

describe('runAi on the server path', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.doUnmock('@/supabase/client');
    vi.doUnmock('@/supabase/report-error');
    vi.resetModules();
  });

  it('returns the parsed result', async () => {
    const result = await run(async () => ({ data: { result: { text: 'hola' } }, error: null }));
    expect(result).toMatchObject({ value: { text: 'hola' }, mode: 'server' });
  });

  it.each([
    [402, 'quota', { error: 'quota_exhausted', remaining: 0 }],
    [429, 'spend_limit', { error: 'spend_limit', scope: 'person' }],
    [403, 'crisis', { error: 'refused_crisis' }],
    [500, 'api_error', { error: 'misconfigured' }],
  ])('reads a %i as %s', async (status, kind, body) => {
    await expect(run(async () => ({ data: null, error: httpError(status, body) }))).rejects.toMatchObject({
      kind,
    });
  });

  it.each([404, 503])('falls back to the fixture on a %i in demo mode', async (status) => {
    const result = await run(
      async () => ({ data: null, error: httpError(status, { error: 'no_model' }) }),
      true,
    );
    expect(result).toMatchObject({ value: { text: 'fixture' }, mode: 'fixture' });
  });

  it.each([404, 503])('never shows a fixture on a %i outside demo mode', async (status) => {
    await expect(
      run(async () => ({ data: null, error: httpError(status, { error: 'no_model' }) })),
    ).rejects.toMatchObject({ kind: 'api_error' });
  });

  it('never shows a fixture when the server declares no model outside demo mode', async () => {
    await expect(run(async () => ({ data: { error: 'no_model' }, error: null }))).rejects.toMatchObject({
      kind: 'api_error',
    });
  });

  it('carries the verdict when the server answers with containment', async () => {
    const answer = { type: 'crisis', severity: 'low', category: 'panico', resources: [] };
    await expect(run(async () => ({ data: answer, error: null }))).rejects.toMatchObject({
      kind: 'crisis',
      crisis: { severity: 'low', category: 'panico' },
    });
  });

  it('S-02: carries the containment text the server sent with its own lines', async () => {
    const answer = {
      type: 'crisis',
      severity: 'high',
      category: 'indirecto',
      crisis_response: 'Lo que cuentas pesa, y hay personas para hablarlo ahora.',
      resources: { country: 'CL', resources: [] },
    };
    await expect(run(async () => ({ data: answer, error: null }))).rejects.toMatchObject({
      kind: 'crisis',
      crisisResponse: answer.crisis_response,
    });
  });

  it('S-02: drops a containment text that writes a number of its own', async () => {
    const answer = { type: 'crisis', severity: 'high', crisis_response: 'Llama al 0800 345 1435.' };
    const error = await run(async () => ({ data: answer, error: null })).catch((e: unknown) => e);
    expect(error).toMatchObject({ kind: 'crisis' });
    expect((error as { crisisResponse?: string }).crisisResponse).toBeUndefined();
  });

  it('refuses a crisis turn whose text carries a phone number', async () => {
    mockClient(async () => ({
      data: { result: { type: 'crisis', message_text: 'Llama al 0800 345 1435.' } },
      error: null,
    }));
    const { runAi } = await import('./client');
    await expect(
      runAi({
        ...call,
        schema: z.object({ type: z.string(), message_text: z.string() }),
        fixture: () => ({ type: 'reflection', message_text: 'fixture' }),
      }),
    ).rejects.toMatchObject({ kind: 'copy_violation' });
  });

  it('refuses a practice with physical risk named without its contraindication', async () => {
    await expect(
      run(async () => ({ data: { result: { text: 'Una ducha fría cada mañana.' } }, error: null })),
    ).rejects.toMatchObject({ kind: 'copy_violation' });
  });

  it('shows a server answer the browser reads a style rule on differently (23 Oct 2026)', async () => {
    // Voseo stands for any style rule: the server approved the answer, so it is shown.
    const value = await run(async () => ({ data: { result: { text: 'Hoy tenés un rato para ti.' } }, error: null }));
    expect(value).toMatchObject({ value: { text: 'Hoy tenés un rato para ti.' }, mode: 'server' });
  });

  it('reads an aborted request as a timeout, and asks for one', async () => {
    let options: unknown;
    const abort = Object.assign(new Error('fetch failed'), {
      name: 'FunctionsFetchError',
      context: Object.assign(new Error('aborted'), { name: 'AbortError' }),
    });
    await expect(
      run(async (_fn, opts) => {
        options = opts;
        return { data: null, error: abort };
      }),
    ).rejects.toMatchObject({ kind: 'timeout' });
    expect(options).toMatchObject({ timeout: expect.any(Number) });
  });
});
