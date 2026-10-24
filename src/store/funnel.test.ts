import { beforeEach, describe, expect, it } from 'vitest';
import { browserKind, deviceKind, guessSource, rememberFirstTouch, screenKey, tag } from './funnel';
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

  it('without an origin in the link, guesses it from the browser or the page that sent the person', () => {
    rememberFirstTouch('?ref=abc', 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/22F76 Instagram 400.0.0.38.85 (iPhone15,3; iOS 18_5; es_CL)', '');
    expect(read('first_touch', null)).toEqual({ source: 'instagram', campaign: null });
  });

  it('takes a friend\'s invitation link as the origin, unless the link says another', () => {
    rememberFirstTouch('', 'Mozilla/5.0 (iPhone) Instagram 400.0', '', '/amigos/abc123');
    expect(read('first_touch', null)).toEqual({ source: 'invitacion', campaign: null });
  });

  it('keeps the campaign of an invitation link that carries one', () => {
    rememberFirstTouch('?utm_source=whatsapp', 'Mozilla/5.0 (Macintosh)', '', '/amigos/abc123');
    expect(read('first_touch', null)).toEqual({ source: 'whatsapp', campaign: null });
  });

  it('keeps an empty first touch, so the way back from Google is never an origin', () => {
    rememberFirstTouch('', 'Mozilla/5.0 (Macintosh)', '');
    rememberFirstTouch('', 'Mozilla/5.0 (Macintosh)', 'https://accounts.google.com/');
    expect(read('first_touch', null)).toEqual({ source: null, campaign: null });
  });
});

describe('which screen a path shows', () => {
  it('names the app\'s own screens from a closed list', () => {
    expect(screenKey('/carta')).toBe('carta');
    expect(screenKey('/carta/completa')).toBe('carta-completa');
    expect(screenKey('/comparacion/5f1c2a/cartas')).toBe('comparacion-cartas');
    expect(screenKey('/comparacion/5f1c2a')).toBe('comparacion-resultado');
    expect(screenKey('/comparacion')).toBe('comparacion');
    expect(screenKey('/bitacora/')).toBe('bitacora');
  });

  it('counts nothing else: the welcome, the onboarding, the care questions, the legal pages', () => {
    for (const path of ['/', '/onboarding', '/cuidarte', '/registro', '/privacidad', '/amigos/abc', '/bitacora/nueva']) {
      expect(screenKey(path)).toBeNull();
    }
  });
});

describe('what the first step says about the device', () => {
  it('names the in-app browser of a network, from a closed list', () => {
    expect(browserKind('Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/22F76 Instagram 400.0.0.38.85 (iPhone15,3; iOS 18_5; es_CL)')).toBe('instagram');
    expect(browserKind('Mozilla/5.0 (iPhone) [FBAN/FBIOS;FBAV/450.0]')).toBe('facebook');
    expect(browserKind('Mozilla/5.0 (Linux; Android 14) musical_ly_2024')).toBe('tiktok');
    expect(browserKind('Mozilla/5.0 (Macintosh) Safari/605.1.15')).toBe('navegador');
  });

  it('tells a phone, a tablet and a computer apart', () => {
    expect(deviceKind('Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/22F76 Instagram 400.0.0.38.85 (iPhone15,3; iOS 18_5; es_CL)')).toBe('movil');
    expect(deviceKind('Mozilla/5.0 (Linux; Android 14; SM-S918B) Mobile Safari/537.36')).toBe('movil');
    expect(deviceKind('Mozilla/5.0 (Linux; Android 13; SM-X700) Safari/537.36')).toBe('tablet');
    expect(deviceKind('Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/130.0')).toBe('computador');
  });

  it('names the page that sent somebody by its network, never by its address', () => {
    expect(guessSource('Mozilla/5.0 (Macintosh)', 'https://l.instagram.com/?u=x')).toBe('instagram');
    expect(guessSource('Mozilla/5.0 (Macintosh)', 'https://www.google.cl/')).toBe('google');
    expect(guessSource('Mozilla/5.0 (Macintosh)', 'https://natus.world/usuarios')).toBe('web-natus');
    expect(guessSource('Mozilla/5.0 (Macintosh)', 'https://some-blog.example/post/1')).toBe('otro');
    expect(guessSource('Mozilla/5.0 (Macintosh)', 'https://app.natus.world/carta')).toBeNull();
    expect(guessSource('Mozilla/5.0 (Macintosh)', '')).toBeNull();
  });
});
