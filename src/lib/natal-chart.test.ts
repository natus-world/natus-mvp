import { describe, expect, it } from 'vitest';
import { aspectsBySign, buildNatalChart, ChartParseError, dignityOf, moonSignCertain, wholeSignHouse } from './natal-chart.ts';
import { withoutBirthTime } from './astrology.ts';

// The provider's shape, with invented positions.
const CHART = `<chart_analysis type="Natal"><chart name="Ana">
<birth_data date="1990-06-04 08:05" />
<config zodiac="Tropical" house_system="Placidus" />
<planets>
<point name="Sun" position="13.50" sign="Gemini" abs_pos="73.50" house="Tenth House" motion="direct" />
<point name="Moon" position="2.10" sign="Libra" abs_pos="182.10" house="Second House" motion="direct" />
<point name="Mercury" position="28.00" sign="Taurus" abs_pos="58.00" house="Ninth House" motion="retrograde" />
<point name="Venus" position="5.00" sign="Virgo" abs_pos="155.00" house="Twelfth House" motion="direct" />
<point name="Mars" position="20.00" sign="Capricorn" abs_pos="290.00" house="Fifth House" motion="direct" />
<point name="Jupiter" position="1.00" sign="Cancer" abs_pos="91.00" house="Eleventh House" motion="direct" />
<point name="Saturn" position="22.00" sign="Aquarius" abs_pos="322.00" house="Sixth House" motion="retrograde" />
<point name="Uranus" position="8.00" sign="Capricorn" abs_pos="278.00" house="Fifth House" motion="retrograde" />
</planets>
<axes>
<point name="Ascendant" position="20.00" sign="Virgo" abs_pos="170.00" house="First House" motion="direct" />
<point name="Medium_Coeli" position="18.00" sign="Gemini" abs_pos="78.00" house="Tenth House" motion="direct" />
</axes>
<houses><house name="First_House" cusp="20.00" sign="Virgo" /></houses>
</chart></chart_analysis>`;

describe('houses by whole sign (v1.2 A-01)', () => {
  it('counts from the whole sign of the Ascendant, ignoring the provider\'s Placidus', () => {
    expect(wholeSignHouse('Virgo', 'Virgo')).toBe(1);
    expect(wholeSignHouse('Libra', 'Virgo')).toBe(2);
    expect(wholeSignHouse('Gemini', 'Virgo')).toBe(10);
    expect(wholeSignHouse('Leo', 'Virgo')).toBe(12);

    const chart = buildNatalChart(CHART, true);
    const house = (name: string) => chart.points.find((p) => p.name === name)?.house;
    expect(house('Sun')).toBe(10);
    expect(house('Moon')).toBe(2);
    // Placidus put Venus in the twelfth; by whole sign Virgo is the first.
    expect(house('Venus')).toBe(1);
    expect(chart.house_system).toBe('whole_sign');
  });
});

describe('essential dignities (v1.2 A-02)', () => {
  it.each([
    ['Sun', 'Leo', 'domicilio'],
    ['Sun', 'Aries', 'exaltacion'],
    ['Sun', 'Aquarius', 'exilio'],
    ['Sun', 'Libra', 'caida'],
    ['Moon', 'Cancer', 'domicilio'],
    ['Moon', 'Scorpio', 'caida'],
    ['Mercury', 'Virgo', 'domicilio'],
    ['Venus', 'Virgo', 'caida'],
    ['Mars', 'Capricorn', 'exaltacion'],
    ['Jupiter', 'Gemini', 'exilio'],
    ['Saturn', 'Aquarius', 'domicilio'],
    ['Saturn', 'Aries', 'caida'],
    ['Venus', 'Gemini', null],
    ['Uranus', 'Aquarius', null],
  ] as const)('%s in %s → %s', (planet, sign, dignity) => {
    expect(dignityOf(planet, sign)).toBe(dignity);
  });

  it('only the seven visible planets carry a dignity', () => {
    const chart = buildNatalChart(CHART, true);
    expect(chart.points.find((p) => p.name === 'Uranus')?.dignity).toBeNull();
    expect(chart.points.find((p) => p.name === 'Ascendant')?.dignity).toBeNull();
  });
});

describe('the ruler of the Ascendant and the sect', () => {
  const chart = buildNatalChart(CHART, true);

  it('names the traditional ruler of the Ascendant and where it sits', () => {
    expect(chart.ascendant).toEqual({ sign: 'Virgo', degree: 20 });
    expect(chart.ascendant_ruler).toEqual({ planet: 'Mercury', sign: 'Taurus', house: 9 });
  });

  it('reads a Sun near the Midheaven as a day chart', () => {
    expect(chart.sect).toEqual({ kind: 'diurna', planets: ['Sun', 'Jupiter', 'Saturn'] });
  });

  it('reads a Sun below the horizon as a night chart', () => {
    const night = buildNatalChart(CHART.replace('abs_pos="73.50"', 'abs_pos="200.00"'), true);
    expect(night.sect?.kind).toBe('nocturna');
  });

  it('keeps sign, degree, retrograde, element and modality', () => {
    const mercury = chart.points.find((p) => p.name === 'Mercury');
    expect(mercury).toMatchObject({ sign: 'Taurus', degree: 28, retrograde: true, element: 'earth', modality: 'fixed' });
  });
});

describe('without the hour of birth (PDR US-1.2 CA2)', () => {
  const chart = buildNatalChart(withoutBirthTime(CHART), false);

  it('has no Ascendant, no house, no ruler of the Ascendant and no sect', () => {
    expect(chart.has_birth_time).toBe(false);
    expect(chart.ascendant).toBeNull();
    expect(chart.ascendant_ruler).toBeNull();
    expect(chart.sect).toBeNull();
    expect(chart.points.every((p) => p.house === null)).toBe(true);
    expect(chart.points.some((p) => p.name === 'Ascendant' || p.name === 'Medium_Coeli')).toBe(false);
  });

  it('keeps the planets, their signs and their dignities', () => {
    expect(chart.points.find((p) => p.name === 'Mars')).toMatchObject({ sign: 'Capricorn', dignity: 'exaltacion' });
  });

  it('ignores an Ascendant left in a context when the hour was not given', () => {
    const lenient = buildNatalChart(CHART, false);
    expect(lenient.ascendant).toBeNull();
    expect(lenient.points.every((p) => p.house === null)).toBe(true);
  });
});

describe('without the hour, only what is known (owner, 22 Oct 2026)', () => {
  const at = (degree: string) => withoutBirthTime(CHART.replace('position="2.10" sign="Libra"', `position="${degree}" sign="Libra"`));

  it('keeps the Moon only when its sign is certain all that day', () => {
    expect(buildNatalChart(at('2.10'), false).points.some((p) => p.name === 'Moon')).toBe(false);
    expect(buildNatalChart(at('15.00'), false).points.find((p) => p.name === 'Moon')?.sign).toBe('Libra');
    expect(buildNatalChart(at('25.00'), false).points.some((p) => p.name === 'Moon')).toBe(false);
  });

  it('knows more of the Moon when the person was born by day', () => {
    expect(moonSignCertain(6.5, null)).toBe(false);
    expect(moonSignCertain(6.5, 'noche')).toBe(false);
    expect(moonSignCertain(6.5, 'dia')).toBe(true);
    expect(moonSignCertain(24.5, 'dia')).toBe(false);
  });

  it('takes day or night from the person, and leaves the Ascendant and the houses unknown', () => {
    const day = buildNatalChart(at('15.00'), false, 'dia');
    expect(day.sect?.kind).toBe('diurna');
    expect(day.ascendant).toBeNull();
    expect(day.points.every((p) => p.house === null)).toBe(true);
    expect(buildNatalChart(at('15.00'), false, 'noche').sect?.kind).toBe('nocturna');
  });

  it('with the hour, the Moon is always there and day or night comes from the chart', () => {
    const chart = buildNatalChart(CHART, true, 'noche');
    expect(chart.points.some((p) => p.name === 'Moon')).toBe(true);
    expect(chart.sect?.kind).toBe('diurna');
  });
});

it('refuses a context with no Sun to read', () => {
  expect(() => buildNatalChart('<chart_analysis></chart_analysis>', true)).toThrow(ChartParseError);
});

describe('aspects by sign (decided 15 Oct 2026)', () => {
  const chart = buildNatalChart(CHART, true);
  const between = (a: string, b: string) =>
    chart.aspects.find((x) => (x.a === a && x.b === b) || (x.a === b && x.b === a));

  it('counts signs, not degrees', () => {
    // Gemini 13.5° and Libra 2.1°: 4 signs apart, a trine by sign, though the
    // degrees are 108.6 apart — a moderate orb would not call it one.
    expect(between('Sun', 'Moon')).toEqual({ a: 'Sun', b: 'Moon', type: 'trine', separation: 108.6 });
    // Taurus and Capricorn, 4 signs apart: trine.
    expect(between('Mercury', 'Mars')?.type).toBe('trine');
    // Gemini and Aquarius: trine. Cancer and Capricorn: opposition.
    expect(between('Sun', 'Saturn')?.type).toBe('trine');
    expect(between('Jupiter', 'Mars')?.type).toBe('opposition');
    // Same sign: conjunction.
    expect(between('Mars', 'Uranus')?.type).toBe('conjunction');
  });

  it('leaves signs in aversion without an aspect', () => {
    // Taurus and Gemini, one sign apart.
    expect(between('Mercury', 'Sun')).toBeUndefined();
  });

  it('skips the mirrored axes and pairs that are always the same', () => {
    const points = [
      ...chart.points,
      { ...chart.points[0]!, name: 'True_North_Lunar_Node', sign: 'Aries' as const, longitude: 10 },
      { ...chart.points[0]!, name: 'True_South_Lunar_Node', sign: 'Libra' as const, longitude: 190 },
      { ...chart.points[0]!, name: 'Descendant', sign: 'Pisces' as const, longitude: 350 },
    ];
    const all = aspectsBySign(points);
    expect(all.some((x) => x.a === 'Descendant' || x.b === 'Descendant')).toBe(false);
    expect(all.some((x) => [x.a, x.b].sort().join('|') === 'True_North_Lunar_Node|True_South_Lunar_Node')).toBe(false);
  });

  it('has aspects without the hour too, between the planets', () => {
    const noHour = buildNatalChart(withoutBirthTime(CHART), false);
    expect(noHour.aspects.length).toBeGreaterThan(0);
    expect(noHour.aspects.some((x) => x.a === 'Ascendant' || x.b === 'Ascendant')).toBe(false);
  });
});
