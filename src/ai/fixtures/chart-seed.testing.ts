/**
 * Charts for the tests of the full chart's readings (package 05). Imported by
 * tests only, so it never reaches a bundle.
 *
 * SEED is the demo person of the Carta seeds (Francisca, 9 May 1992, 08:30,
 * Santiago): the ten planets, the Ascendant and the Midheaven. BROAD adds
 * what the provider can return besides — the nodes, Chiron, Lilith, the
 * mirrored axes — and a planet in each dignity.
 */
const point = (name: string, position: number, sign: string, abs: number, motion = 'direct') =>
  `<point name="${name}" position="${position.toFixed(2)}" sign="${sign}" abs_pos="${abs.toFixed(2)}" house="First House" motion="${motion}" />`;

export const SEED_CONTEXT = `<chart_analysis type="Natal"><chart name="Francisca"><planets>
${point('Sun', 18, 'Gemini', 78)}
${point('Moon', 15, 'Pisces', 345)}
${point('Mercury', 2, 'Gemini', 62)}
${point('Venus', 24, 'Taurus', 54)}
${point('Mars', 9, 'Leo', 129)}
${point('Jupiter', 15, 'Sagittarius', 255)}
${point('Saturn', 28, 'Capricorn', 298, 'retrograde')}
${point('Uranus', 10, 'Capricorn', 280)}
${point('Neptune', 16, 'Capricorn', 286)}
${point('Pluto', 18, 'Scorpio', 228)}
</planets><axes>
${point('Ascendant', 12, 'Libra', 192)}
${point('Medium_Coeli', 14, 'Cancer', 104)}
</axes></chart></chart_analysis>`;

export const BROAD_CONTEXT = `<chart_analysis type="Natal"><chart name="Prueba"><planets>
${point('Sun', 10, 'Aries', 10)}
${point('Moon', 5, 'Scorpio', 215)}
${point('Mercury', 20, 'Pisces', 350)}
${point('Venus', 3, 'Virgo', 153)}
${point('Mars', 12, 'Libra', 192)}
${point('Jupiter', 8, 'Capricorn', 278)}
${point('Saturn', 14, 'Cancer', 104, 'retrograde')}
${point('Uranus', 2, 'Aquarius', 302)}
${point('Neptune', 25, 'Capricorn', 295)}
${point('Pluto', 1, 'Sagittarius', 241)}
${point('Chiron', 9, 'Leo', 129, 'retrograde')}
${point('Mean_Lilith', 17, 'Gemini', 77)}
${point('True_North_Lunar_Node', 6, 'Taurus', 36, 'retrograde')}
${point('True_South_Lunar_Node', 6, 'Scorpio', 216, 'retrograde')}
</planets><axes>
${point('Ascendant', 22, 'Leo', 142)}
${point('Descendant', 22, 'Aquarius', 322)}
${point('Medium_Coeli', 15, 'Taurus', 45)}
${point('Imum_Coeli', 15, 'Scorpio', 225)}
</axes></chart></chart_analysis>`;
