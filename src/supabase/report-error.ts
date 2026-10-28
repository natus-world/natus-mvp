import { supabase } from './client.ts';
import { setSessionLostHandler } from './session-storage.ts';

export type ErrorKind = 'render' | 'error' | 'rejection' | 'atasco';

const MAX_PER_PAGE = 5;
const sent: Record<'fallo' | 'atasco', number> = { fallo: 0, atasco: 0 };

export function reportError(kind: ErrorKind, error: unknown): void {
  // The signs of being stuck have their own allowance, so they never use up
  // the one for real errors.
  const bucket = kind === 'atasco' ? 'atasco' : 'fallo';
  if (!supabase || sent[bucket] >= MAX_PER_PAGE) return;
  sent[bucket] += 1;

  const client = supabase;
  // A sign of being stuck reads as itself, without «Error:» in front.
  const message =
    error instanceof Error ? (kind === 'atasco' ? error.message : `${error.name}: ${error.message}`) : String(error);
  const stack = error instanceof Error ? error.stack : undefined;

  void client.auth
    .getSession()
    .then(({ data }) => {
      if (!data.session) return;
      return client.functions.invoke('report-error', {
        body: {
          kind,
          message,
          stack,
          path: window.location.pathname,
          release: import.meta.env['VITE_RELEASE'],
        },
      });
    })
    .catch(() => {});
}

export function installErrorReporting(): void {
  // Launch night: how often a browser drops the session from storage.
  setSessionLostHandler(() =>
    reportError('error', new Error(`auth: session missing from storage (${navigator.userAgent.slice(0, 120)})`)),
  );
  window.addEventListener('error', (event) => reportError('error', event.error ?? event.message));
  window.addEventListener('unhandledrejection', (event) => reportError('rejection', event.reason));
}
