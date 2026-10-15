import { describe, expect, it } from 'vitest';
import { buildNatalChart, ChartParseError, dignityOf, wholeSignHouse } from './natal-chart.ts';
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

it('refuses a context with no Sun to read', () => {
  expect(() => buildNatalChart('<chart_analysis></chart_analysis>', true)).toThrow(ChartParseError);
});
