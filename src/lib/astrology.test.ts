import { describe, expect, it } from 'vitest';
import { withoutBirthTime } from './astrology.ts';

// The provider's shape, with invented positions: the real one is a person's
// chart, and the structure is all this test needs.
const CHART = `<chart_analysis type="Natal">
  <chart name="Ana">
    <birth_data date="1990-06-04 12:00" city="Santiago" nation="CL" lat="-33.45" lng="-70.66" lng_dir="W" tz="America/Santiago" />
    <config zodiac="Tropical" house_system="Placidus" perspective="Apparent Geocentric" />
    <planets>
      <point name="Sun" position="13.50" sign="Gemini" abs_pos="73.50" quality="Mutable" element="Air" house="Tenth House" motion="direct" speed="0.9600" declination="22.40" />
      <point name="Moon" position="2.10" sign="Libra" abs_pos="182.10" quality="Cardinal" element="Air" house="Second House" motion="direct" speed="13.1000" declination="-1.20" />
    </planets>
    <axes>
      <point name="Ascendant" position="20.00" sign="Virgo" abs_pos="170.00" quality="Mutable" element="Earth" house="First House" motion="direct" speed="360.0000" />
      <point name="Descendant" position="20.00" sign="Pisces" abs_pos="350.00" quality="Mutable" element="Water" house="Seventh House" motion="direct" speed="360.0000" />
      <point name="Medium_Coeli" position="18.00" sign="Gemini" abs_pos="78.00" quality="Mutable" element="Air" house="Tenth House" motion="direct" speed="330.0000" />
      <point name="Imum_Coeli" position="18.00" sign="Sagittarius" abs_pos="258.00" quality="Mutable" element="Fire" house="Fourth House" motion="direct" speed="330.0000" />
      <point name="True_North_Lunar_Node" position="10.00" sign="Aquarius" abs_pos="310.00" quality="Fixed" element="Air" house="Fifth House" motion="direct" speed="0.0100" declination="-15.00" />
    </axes>
    <houses>
      <house name="First_House" cusp="20.00" sign="Virgo" />
      <house name="Second_House" cusp="18.00" sign="Libra" />
    </houses>
    <lunar_phase name="Waxing Gibbous" phase="10" degrees_between="108.60" emoji="🌔" />
  </chart>
  <element_distribution fire="20%" earth="25%" air="40%" water="15%" />
  <quality_distribution cardinal="20%" fixed="20%" mutable="60%" />
  <aspects count="4">
    <aspect type="trine" p1="Sun" p2="Moon" orb="1.40" angle="120" movement="applying" />
    <aspect type="conjunction" p1="Sun" p2="Medium_Coeli" orb="4.50" angle="0" movement="separating" />
    <aspect type="square" p1="Moon" p2="Ascendant" orb="2.10" angle="90" movement="applying" />
    <aspect type="trine" p1="Moon" p2="True_North_Lunar_Node" orb="7.90" angle="120" movement="separating" />
  </aspects>
  <active_points>Ascendant, Descendant, Imum_Coeli, Medium_Coeli, Moon, Sun, True_North_Lunar_Node</active_points>
  <active_aspects>conjunction (1), square (1), trine (2)</active_aspects>
</chart_analysis>`;

describe('a chart without the hour of birth (v1.2 A-01, PDR US-1.2 CA2)', () => {
  const stripped = withoutBirthTime(CHART);

  it('keeps no Ascendant, no angle and no house anywhere', () => {
    expect(stripped).not.toMatch(/Ascendant|Descendant|Medium_Coeli|Imum_Coeli/);
    expect(stripped).not.toMatch(/house/i);
  });

  it('keeps the planets, their signs and the aspects between them', () => {
    expect(stripped).toContain('<point name="Sun" position="13.50" sign="Gemini"');
    expect(stripped).toContain('<point name="Moon" position="2.10" sign="Libra"');
    expect(stripped).toContain('<point name="True_North_Lunar_Node"');
    expect(stripped).toContain('p1="Sun" p2="Moon"');
    expect(stripped).toContain('p1="Moon" p2="True_North_Lunar_Node"');
    expect(stripped).toContain('<lunar_phase name="Waxing Gibbous"');
    expect(stripped).toContain(
      '<active_points>Moon, Sun, True_North_Lunar_Node</active_points>',
    );
  });

  it('does not state the noon it was calculated at as the hour of birth', () => {
    expect(stripped).toContain('date="1990-06-04"');
    expect(stripped).not.toContain('12:00');
  });

  it('drops the summaries that counted the angles in', () => {
    expect(stripped).not.toContain('element_distribution');
    expect(stripped).not.toContain('quality_distribution');
    expect(stripped).not.toContain('active_aspects');
    expect(stripped).not.toMatch(/<aspects count=/);
  });

  it('leaves a chart that is still well formed', () => {
    const opened = stripped.match(/<[a-z_]+[\s>]/g)?.length ?? 0;
    const selfClosed = stripped.match(/\/>/g)?.length ?? 0;
    const closed = stripped.match(/<\/[a-z_]+>/g)?.length ?? 0;
    expect(opened).toBe(selfClosed + closed);
  });

  it('is a no-op on a chart already stripped', () => {
    expect(withoutBirthTime(stripped)).toBe(stripped);
  });
});
