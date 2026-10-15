import { beforeEach, describe, expect, it } from 'vitest';
import { rememberFirstTouch, tag } from './funnel';
import { clearAll, read } from './db';
import { installMemoryStorage } from './memory-storage.testing.ts';

beforeEach(() => {
  installMemoryStorage();
  clearAll();
});

describe('the closed vocabulary of the funnel', () => {
  it('turns whatever a link carries into the words the database accepts', () => {
    expect(tag('Instagram Ads!')).toBe('instagram-ads');
    expect(tag('Lanzamiento Octubre')).toBe('lanzamiento-octubre');
    expect(tag('Señal')).toBe('senal');
    expect(tag('   ')).toBeNull();
    expect(tag(null)).toBeNull();
    expect(tag('x'.repeat(100))?.length).toBe(64);
  });
});

describe('where this browser first came from', () => {
  it('keeps the first origin and never overwrites it', () => {
    rememberFirstTouch('?utm_source=Instagram&utm_campaign=Lanzamiento');
    rememberFirstTouch('?utm_source=tiktok&utm_campaign=otra');
    expect(read('first_touch', null)).toEqual({ source: 'instagram', campaign: 'lanzamiento' });
  });

  it('stores nothing when the link carries no origin', () => {
    rememberFirstTouch('?ref=abc');
    expect(read('first_touch', null)).toBeNull();
  });
});
