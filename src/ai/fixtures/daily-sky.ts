import type { SkyPoint } from '@/lib/daily-sky';
import type { DailyTips } from '@/lib/schemas';

/**
 * Today's sky for the demo build (v1.2 D-01). One fixed sky, crossed with the
 * chart in the draft by the same `dailySky` the server runs, so the demo shows
 * real transits for whatever chart was typed in. The tip is what a premium
 * person would read; it passes the same schema and copy lint as the model's
 * answer (`daily-sky.test.ts`).
 */
export const DEMO_SKY: SkyPoint[] = [
  { name: 'Sun', sign: 'Libra', degree: 25, longitude: 205, retrograde: false },
  { name: 'Moon', sign: 'Gemini', degree: 14, longitude: 74, retrograde: false },
  { name: 'Mercury', sign: 'Scorpio', degree: 12, longitude: 222, retrograde: false },
  { name: 'Venus', sign: 'Virgo', degree: 28, longitude: 178, retrograde: false },
  { name: 'Mars', sign: 'Sagittarius', degree: 3, longitude: 243, retrograde: false },
  { name: 'Jupiter', sign: 'Cancer', degree: 24, longitude: 114, retrograde: false },
  { name: 'Saturn', sign: 'Pisces', degree: 25, longitude: 355, retrograde: true },
];

export const DEMO_TIPS: DailyTips = {
  tips: [
    'Hoy las energías pueden estar más intensas. Darte unos minutos para respirar antes de empezar el día puede ayudarte a recibirlo con más calma.',
  ],
};
