export const PATHS = {
  today: '/hoy',
  chart: '/carta',
  paths: '/caminos',
  journey: '/recorrido',
  chat: '/chat',
  profile: '/perfil',
  meditations: '/meditaciones',
  comparison: '/comparacion',
  library: '/biblioteca',
} as const;

export const LEGACY_PATHS: Readonly<Record<string, string>> = {
  '/inicio': PATHS.today,
  '/mapa': PATHS.chart,
  '/recomendaciones': PATHS.paths,
  '/rutina': PATHS.journey,
  '/cuenta': PATHS.profile,
};

export function legacyTarget(path: unknown): string | undefined {
  if (typeof path !== 'string') return undefined;
  return Object.hasOwn(LEGACY_PATHS, path) ? LEGACY_PATHS[path] : undefined;
}
