import { beforeEach, describe, expect, it } from 'vitest';
import {
  endRevelation,
  markRevelationPending,
  markWelcomeOfferDue,
  revelationPending,
  revelationShowing,
  startRevelation,
  takeWelcomeOfferDue,
} from './revelation';
import { clearAll } from './db';
import { installMemoryStorage } from './memory-storage.testing.ts';

beforeEach(() => {
  installMemoryStorage();
  clearAll();
  endRevelation();
});

describe('the preview of a new map (owner, 20–21 Oct 2026)', () => {
  it('is pending for the map just written, and no other', () => {
    markRevelationPending('map-1');
    expect(revelationPending('map-1')).toBe(true);
    expect(revelationPending('map-2')).toBe(false);
    expect(revelationPending(undefined)).toBe(false);
  });

  it('is cleared as it opens, so closing the app on it does not bring it back', () => {
    markRevelationPending('map-1');
    startRevelation();
    expect(revelationShowing()).toBe(true);
    expect(revelationPending('map-1')).toBe(false);

    endRevelation();
    expect(revelationShowing()).toBe(false);
  });
});

describe('the welcome offer after «Para cuidarte» (owner, 20 Oct 2026)', () => {
  it('is owed once', () => {
    expect(takeWelcomeOfferDue()).toBe(false);
    markWelcomeOfferDue();
    expect(takeWelcomeOfferDue()).toBe(true);
    expect(takeWelcomeOfferDue()).toBe(false);
  });
});
