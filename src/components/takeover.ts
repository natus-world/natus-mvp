import { useEffect, useSyncExternalStore } from 'react';
import { activeHighSeverityEvent, subscribeCrisis } from '@/store/crisis';

let shown = 0;
/** How many of the takeovers are the crisis screen, where nothing else shows. */
let crisisShown = 0;
const listeners = new Set<() => void>();

function notify(): void {
  for (const listener of [...listeners]) listener();
}

export function subscribeTakeover(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function isTakeoverShown(): boolean {
  return shown > 0;
}

export function isCrisisShown(): boolean {
  return crisisShown > 0;
}

export function enterTakeover(crisis = false): () => void {
  shown += 1;
  if (crisis) crisisShown += 1;
  notify();
  let left = false;
  return () => {
    if (left) return;
    left = true;
    shown -= 1;
    if (crisis) crisisShown -= 1;
    notify();
  };
}

export function useTakeover(crisis = false): void {
  useEffect(() => enterTakeover(crisis), [crisis]);
}

export function useCrisisShown(): boolean {
  return useSyncExternalStore(subscribeTakeover, isCrisisShown, isCrisisShown);
}

export function useTakeoverShown(): boolean {
  return useSyncExternalStore(subscribeTakeover, isTakeoverShown, isTakeoverShown);
}

function activeCrisisId(): string | null {
  return activeHighSeverityEvent()?.id ?? null;
}

export function useActiveCrisisId(): string | null {
  return useSyncExternalStore(subscribeCrisis, activeCrisisId, activeCrisisId);
}
