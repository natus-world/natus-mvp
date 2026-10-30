import { describe, expect, it } from 'vitest';
import { buildNatalChart, ChartParseError } from './natal-chart.ts';
import { withoutBirthTime } from './astrology.ts';
import {
  dailySky,
  isCalendarDate,
  lordOfYear,
  MAX_TRANSITS,
  parseSky,
  personalDay,
  skyFromContext,
  yearsLived,
  type SkyPoint,
} from './daily-sky.ts';

// The provider's shape, with invented positions (the same person as natal-chart.test.ts).
const CHART = `<chart_analysis type="Natal"><chart name="Ana">
<planets>
<point name="Sun" position="13.50" sign="Gemini" abs_pos="73.50" motion="direct" />
<point name="Moon" position="2.10" sign="Libra" abs_pos="182.10" motion="direct" />
<point name="Mercury" position="28.00" sign="Taurus" abs_pos="58.00" motion="retrograde" />
<point name="Venus" position="5.00" sign="Virgo" abs_pos="155.00" motion="direct" />
<point name="Mars" position="20.00" sign="Capricorn" abs_pos="290.00" motion="direct" />
<point name="Jupiter" position="1.00" sign="Cancer" abs_pos="91.00" motion="direct" />
<point name="Saturn" position="22.00" sign="Aquarius" abs_pos="322.00" motion="retrograde" />
<point name="Uranus" position="8.00" sign="Capricorn" abs_pos="278.00" motion="retrograde" />
</planets>
<axes>
<point name="Ascendant" position="20.00" sign="Virgo" abs_pos="170.00" motion="direct" />
<point name="Medium_Coeli" position="18.00" sign="Gemini" abs_pos="78.00" motion="direct" />
</axes>
</chart></chart_analysis>`;

const SKY_CONTEXT = `<chart_analysis><chart name="Cielo">
<point name="Sun" position="25.00" sign="Libra" abs_pos="205.00" motion="direct" />
<point name="Moon" position="14.00" sign="Gemini" abs_pos="74.00" motion="direct" />
<point name="Mercury" position="20.00" sign="Pisces" abs_pos="350.00" motion="retrograde" />
<point name="Venus" position="10.00" sign="Scorpio" abs_pos="220.00" motion="direct" />
<point name="Mars" position="3.00" sign="Sagittarius" abs_pos="243.00" motion="direct" />
<point name="Jupiter" position="18.00" sign="Cancer" abs_pos="108.00" motion="direct" />
<point name="Saturn" position="27.00" sign="Pisces" abs_pos="357.00" motion="retrograde" />
<point name="Uranus" position="1.00" sign="Gemini" abs_pos="61.00" motion="retrograde" />
<point name="Ascendant" position="1.00" sign="Leo" abs_pos="121.00" motion="direct" />
</chart></chart_analysis>`;

const sky = skyFromContext(SKY_CONTEXT);

describe('the day\'s sky from the ephemeris', () => {
  it('keeps the seven visible planets only', () => {
    expect(sky.map((p) => p.name)).toEqual(['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn']);
    expect(sky.find((p) => p.name === 'Mercury')?.retrograde).toBe(true);
  });

  it('refuses a sky without one of them', () => {
    expect(() => skyFromContext(SKY_CONTEXT.replace(/<point name="Saturn"[^>]*\/>/, ''))).toThrow(ChartParseError);
  });

  it('reads back what was stored, and nothing else', () => {
    expect(parseSky(JSON.parse(JSON.stringify(sky)))).toEqual(sky);
    expect(parseSky(sky.slice(1))).toBeNull();
    expect(parseSky([{ ...sky[0], sign: 'Ophiuchus' }, ...sky.slice(1)])).toBeNull();
    expect(parseSky('cielo')).toBeNull();
  });
});

describe('personal day (PDR 6.2 reductions)', () => {
  it('year, month and day, masters kept on the way', () => {
    // Year: 4 + 6 + (2+0+2+6 = 10 → 1) = 11, kept. Month: 11 + 1 = 12 → 3. Day: 3 + (18 → 9) = 12 → 3.
    expect(personalDay('1990-06-04', '2026-10-18')).toBe(3);
    // Year: 1 + 1 + (2+0+2+6 → 1) = 3. Month: 3 + 2 = 5. Day: 5 + 6 = 11, a master.
    expect(personalDay('2000-01-01', '2026-02-06')).toBe(11);
  });

  it('refuses a date that does not exist', () => {
    expect(() => personalDay('1990-02-30', '2026-10-18')).toThrow(RangeError);
    expect(isCalendarDate('2026-02-29')).toBe(false);
    expect(isCalendarDate('2028-02-29')).toBe(true);
  });
});

describe('the lord of the year by annual profection', () => {
  it('one sign a year from the Ascendant', () => {
    expect(yearsLived('1990-06-04', '2026-06-03')).toBe(35);
    expect(yearsLived('1990-06-04', '2026-06-04')).toBe(36);
    // 36 years: back to the Ascendant's own sign. Virgo → Mercury.
    expect(lordOfYear('Virgo', 36)).toBe('Mercury');
    // 35: the sign before, Leo → the Sun.
    expect(lordOfYear('Virgo', 35)).toBe('Sun');
  });
});

describe('today\'s transits over the chart (v1.2 D-01)', () => {
  const chart = buildNatalChart(CHART, true);
  const today = dailySky({ chart, sky, birthDate: '1990-06-04', date: '2026-10-18' });

  it('aspects by whole sign, with the orb kept beside them', () => {
    const moonSun = today.transits.find((t) => t.planet === 'Moon' && t.natal === 'Sun');
    expect(moonSun).toMatchObject({ type: 'conjunction', orb: 0.5 });
    expect(today.transits.length).toBe(MAX_TRANSITS);
  });

  it('the lord of the year weighs more, and is marked', () => {
    expect(today.lord_of_year).toBe('Mercury');
    // Mercury at 20° Pisces opposite the Ascendant at 20° Virgo, exact: first.
    expect(today.transits[0]).toEqual({
      planet: 'Mercury',
      natal: 'Ascendant',
      type: 'opposition',
      orb: 0,
      lord_of_year: true,
    });
  });

  it('the Moon gives the day\'s tone, with its house by whole sign', () => {
    expect(today.moon).toEqual({ sign: 'Gemini', house: 10 });
    expect(today.personal_day).toBe(3);
  });

  it('in a Placidus chart, the Moon falls in its Placidus house (owner, 30 Oct 2026)', () => {
    // Twelve equal houses from the Ascendant at 20° Virgo: the 10th opens at 20° Gemini.
    const cusps = Array.from({ length: 12 }, (_, i) => (170 + i * 30) % 360);
    const placidus = dailySky({ chart: { ...chart, house_system: 'placidus', cusps }, sky, birthDate: '1990-06-04', date: '2026-10-18' });
    expect(placidus.moon).toEqual({ sign: 'Gemini', house: 9 });
    // The lord of the year still counts by whole sign.
    expect(placidus.lord_of_year).toBe('Mercury');
  });

  it('never a sign in aversion', () => {
    // Venus in Scorpio and the Sun in Gemini are seven signs apart: in aversion.
    expect(today.transits.some((t) => t.planet === 'Venus' && t.natal === 'Sun')).toBe(false);
  });

  it('the same day always gives the same list', () => {
    const again = dailySky({ chart, sky: [...sky].reverse() as SkyPoint[], birthDate: '1990-06-04', date: '2026-10-18' });
    expect(again.transits).toEqual(today.transits);
  });

  it('without the hour: no Ascendant, no house, no lord', () => {
    const noTime = buildNatalChart(withoutBirthTime(CHART), false);
    const day = dailySky({ chart: noTime, sky, birthDate: '1990-06-04', date: '2026-10-18' });
    expect(day.has_birth_time).toBe(false);
    expect(day.lord_of_year).toBeNull();
    expect(day.moon.house).toBeNull();
    expect(day.transits.some((t) => t.natal === 'Ascendant')).toBe(false);
    expect(day.transits.some((t) => t.lord_of_year)).toBe(false);
    expect(day.transits[0]).toMatchObject({ planet: 'Moon', natal: 'Sun', type: 'conjunction' });
  });
});
