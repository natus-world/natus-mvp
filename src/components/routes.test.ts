import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { LEGACY_PATHS, PATHS, legacyTarget } from './routes';
import { showsNav } from './navigation';
import { CARE_DESTINATIONS, careDestination } from '@/store/care';

describe('the old paths keep working', () => {
  it('sends each one to its new name', () => {
    expect(LEGACY_PATHS).toEqual({
      '/inicio': '/hoy',
      '/mapa': '/carta',
      '/recomendaciones': '/caminos',
      '/rutina': '/recorrido',
      '/cuenta': '/perfil',
    });
  });

  it('lands every redirect on a destination that exists', () => {
    const destinations: string[] = Object.values(PATHS);
    for (const target of Object.values(LEGACY_PATHS)) {
      expect(destinations).toContain(target);
      expect(showsNav(target, false)).toBe(true);
    }
  });

  it('never redirects a path that is still in use', () => {
    const destinations: string[] = Object.values(PATHS);
    for (const legacy of Object.keys(LEGACY_PATHS)) expect(destinations).not.toContain(legacy);
  });

  it('translates only exact old paths', () => {
    expect(legacyTarget('/mapa')).toBe('/carta');
    expect(legacyTarget('/mapa/x')).toBeUndefined();
    expect(legacyTarget('/hoy')).toBeUndefined();
    expect(legacyTarget('toString')).toBeUndefined();
    expect(legacyTarget(undefined)).toBeUndefined();
  });

  it('returns a «Para cuidarte» detour that started at an old path to its new one', () => {
    expect(careDestination(legacyTarget('/rutina') ?? '/rutina')).toBe('/recorrido');
    expect(careDestination(legacyTarget('/recomendaciones') ?? '/recomendaciones')).toBe('/caminos');
    for (const destination of CARE_DESTINATIONS) expect(showsNav(destination, false)).toBe(true);
  });
});

describe('no screen links to an old path', () => {
  const SRC = join(__dirname, '..');

  function files(dir: string): string[] {
    return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) return files(path);
      return /\.tsx?$/.test(entry.name) && !entry.name.includes('.test.') ? [path] : [];
    });
  }

  it('writes none of them outside the redirect table', () => {
    const pattern = new RegExp(`['"\`](${Object.keys(LEGACY_PATHS).join('|')})['"\`/?#]`);
    const found = files(SRC)
      .filter((file) => !file.endsWith(join('components', 'routes.ts')))
      .flatMap((file) =>
        readFileSync(file, 'utf8')
          .split('\n')
          .flatMap((line, i) => (pattern.test(line) ? [`${file}:${i + 1}`] : [])),
      );
    expect(found).toEqual([]);
  });
});
