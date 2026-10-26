import { describe, expect, it } from 'vitest';
import {
  bestPlace,
  findPlaces,
  geocodingUrl,
  parseBirthPlace,
  placeLabel,
  rankPlaces,
  regionMatches,
  searchSteps,
  searchTermFor,
  type GeocoderResult,
} from './places.ts';
import RECORDED from './places.answers.test-data.json';

// Open-Meteo's answers, recorded on 16 Oct 2026 for the names that were going
// wrong (count=10, language=es, filtered by country; the app asks for 100 since 25 Oct 2026).
const ANSWERS = {
  "mx_leon": [
    {
      "name": "León",
      "admin1": "Estado de Baja California",
      "country_code": "MX",
      "latitude": 28.51667,
      "longitude": -113.78333,
      "timezone": "America/Tijuana",
      "population": null,
      "feature_code": "PPL"
    },
    {
      "name": "El León",
      "admin1": "Estado de Chihuahua",
      "country_code": "MX",
      "latitude": 30.71667,
      "longitude": -107.63333,
      "timezone": "America/Chihuahua",
      "population": null,
      "feature_code": "PPL"
    },
    {
      "name": "El León",
      "admin1": "Estado de San Luis Potosí",
      "country_code": "MX",
      "latitude": 22.50641,
      "longitude": -100.66178,
      "timezone": "America/Mexico_City",
      "population": null,
      "feature_code": "PPL"
    },
    {
      "name": "León",
      "admin1": "Estado de Durango",
      "country_code": "MX",
      "latitude": 25.60187,
      "longitude": -103.47698,
      "timezone": "America/Monterrey",
      "population": null,
      "feature_code": "PPL"
    },
    {
      "name": "León",
      "admin1": "Estado de Coahuila de Zaragoza",
      "country_code": "MX",
      "latitude": 27.04315,
      "longitude": -101.55677,
      "timezone": "America/Monterrey",
      "population": null,
      "feature_code": "PPL"
    },
    {
      "name": "León de los Aldama",
      "admin1": "Estado de Guanajuato",
      "country_code": "MX",
      "latitude": 21.12183,
      "longitude": -101.68253,
      "timezone": "America/Mexico_City",
      "population": 1579803,
      "feature_code": "PPLA2"
    },
    {
      "name": "La Leona",
      "admin1": "Estado de Guanajuato",
      "country_code": "MX",
      "latitude": 20.12303,
      "longitude": -100.98231,
      "timezone": "America/Mexico_City",
      "population": 363,
      "feature_code": "PPL"
    },
    {
      "name": "La Leona",
      "admin1": "Estado de Coahuila de Zaragoza",
      "country_code": "MX",
      "latitude": 25.98955,
      "longitude": -101.13242,
      "timezone": "America/Monterrey",
      "population": 223,
      "feature_code": "PPL"
    },
    {
      "name": "La Leona",
      "admin1": "Estado de Tamaulipas",
      "country_code": "MX",
      "latitude": 23.06667,
      "longitude": -99.1,
      "timezone": "America/Monterrey",
      "population": null,
      "feature_code": "PPL"
    },
    {
      "name": "La Leona",
      "admin1": "Estado de Coahuila de Zaragoza",
      "country_code": "MX",
      "latitude": 25.56667,
      "longitude": -101.61667,
      "timezone": "America/Monterrey",
      "population": null,
      "feature_code": "PPL"
    }
  ],
  "ar_tucuman": [
    {
      "name": "Tucumanao",
      "admin1": "Provincia de Catamarca",
      "country_code": "AR",
      "latitude": -28.08217,
      "longitude": -66.56162,
      "timezone": "America/Argentina/Catamarca",
      "population": null,
      "feature_code": "PPL"
    },
    {
      "name": "El Tucumancito",
      "admin1": "Provincia de Formosa",
      "country_code": "AR",
      "latitude": -22.85268,
      "longitude": -62.26805,
      "timezone": "America/Argentina/Cordoba",
      "population": null,
      "feature_code": "PPL"
    }
  ],
  "ar_caba": [
    {
      "name": "Pozo Cavado",
      "admin1": "Provincia de Tucumán",
      "country_code": "AR",
      "latitude": -26.30784,
      "longitude": -64.74697,
      "timezone": "America/Argentina/Tucuman",
      "population": null,
      "feature_code": "PPL"
    },
    {
      "name": "Paraje Cabal",
      "admin1": "Provincia de Santa Fe",
      "country_code": "AR",
      "latitude": -31.09979,
      "longitude": -60.74656,
      "timezone": "America/Argentina/Cordoba",
      "population": null,
      "feature_code": "PPL"
    },
    {
      "name": "Cabana",
      "admin1": "Provincia de Córdoba",
      "country_code": "AR",
      "latitude": -31.20221,
      "longitude": -64.35312,
      "timezone": "America/Argentina/Cordoba",
      "population": null,
      "feature_code": "PPL"
    },
    {
      "name": "Caballa",
      "admin1": "Provincia de Catamarca",
      "country_code": "AR",
      "latitude": -29.00078,
      "longitude": -65.35059,
      "timezone": "America/Argentina/Catamarca",
      "population": null,
      "feature_code": "PPL"
    },
    {
      "name": "Cabañaro",
      "admin1": "Provincia del Chaco",
      "country_code": "AR",
      "latitude": -26.30306,
      "longitude": -60.3024,
      "timezone": "America/Argentina/Cordoba",
      "population": null,
      "feature_code": "PPL"
    },
    {
      "name": "Cabalango",
      "admin1": "Provincia de Córdoba",
      "country_code": "AR",
      "latitude": -31.39197,
      "longitude": -64.56111,
      "timezone": "America/Argentina/Cordoba",
      "population": null,
      "feature_code": "PPL"
    },
    {
      "name": "Caballero",
      "admin1": "Provincia de Misiones",
      "country_code": "AR",
      "latitude": -25.88456,
      "longitude": -53.94158,
      "timezone": "America/Argentina/Cordoba",
      "population": null,
      "feature_code": "PPL"
    },
    {
      "name": "Caballito",
      "admin1": "Ciudad Autónoma de Buenos Aires",
      "country_code": "AR",
      "latitude": -34.62264,
      "longitude": -58.44104,
      "timezone": "America/Argentina/Buenos_Aires",
      "population": null,
      "feature_code": "PPLX"
    },
    {
      "name": "Cañada de Río Pinto",
      "admin1": "Provincia de Córdoba",
      "country_code": "AR",
      "latitude": -30.77592,
      "longitude": -64.21823,
      "timezone": "America/Argentina/Cordoba",
      "population": null,
      "feature_code": "PPL"
    },
    {
      "name": "Cabaña Los Laureles",
      "admin1": "Provincia de Santiago del Estero",
      "country_code": "AR",
      "latitude": -27.49168,
      "longitude": -64.79654,
      "timezone": "America/Argentina/Cordoba",
      "population": null,
      "feature_code": "PPL"
    }
  ],
  "ec_santiago": [
    {
      "name": "Gualaquiza",
      "admin1": "Morona Santiago",
      "country_code": "EC",
      "latitude": -3.40352,
      "longitude": -78.58148,
      "timezone": "America/Guayaquil",
      "population": 4611,
      "feature_code": "PPLA2"
    },
    {
      "name": "Santiago",
      "admin1": "Loja",
      "country_code": "EC",
      "latitude": -3.7938,
      "longitude": -79.28192,
      "timezone": "America/Guayaquil",
      "population": null,
      "feature_code": "PPLA3"
    },
    {
      "name": "Santiago",
      "admin1": "Bolívar",
      "country_code": "EC",
      "latitude": -1.69968,
      "longitude": -78.99985,
      "timezone": "America/Guayaquil",
      "population": null,
      "feature_code": "PPLA3"
    },
    {
      "name": "Santiago",
      "admin1": "Morona Santiago",
      "country_code": "EC",
      "latitude": -3.03833,
      "longitude": -78.04083,
      "timezone": "America/Guayaquil",
      "population": null,
      "feature_code": "PPL"
    },
    {
      "name": "Santiago",
      "admin1": "Azuay",
      "country_code": "EC",
      "latitude": -3.37118,
      "longitude": -79.2274,
      "timezone": "America/Guayaquil",
      "population": null,
      "feature_code": "PPL"
    },
    {
      "name": "Santiago",
      "admin1": "Carchi",
      "country_code": "EC",
      "latitude": 0.62994,
      "longitude": -77.93753,
      "timezone": "America/Guayaquil",
      "population": null,
      "feature_code": "PPL"
    },
    {
      "name": "Santiago",
      "admin1": "Morona Santiago",
      "country_code": "EC",
      "latitude": -3.04948,
      "longitude": -78.01055,
      "timezone": "America/Guayaquil",
      "population": null,
      "feature_code": "AIRF"
    },
    {
      "name": "Santiago de Méndez",
      "admin1": "Morona Santiago",
      "country_code": "EC",
      "latitude": -2.71851,
      "longitude": -78.31936,
      "timezone": "America/Guayaquil",
      "population": null,
      "feature_code": "PPLA2"
    },
    {
      "name": "Santiago Paati",
      "admin1": "Zamora Chinchipe",
      "country_code": "EC",
      "latitude": -3.5554,
      "longitude": -78.5391,
      "timezone": "America/Guayaquil",
      "population": null,
      "feature_code": "PPL"
    },
    {
      "name": "Hacienda Santiago del Rey",
      "admin1": "Imbabura",
      "country_code": "EC",
      "latitude": 0.38119,
      "longitude": -78.17941,
      "timezone": "America/Guayaquil",
      "population": null,
      "feature_code": "PPL"
    }
  ],
  "cl_san": [
    {
      "name": "Santiago de Chile",
      "admin1": "Región Metropolitana de Santiago de Chile",
      "country_code": "CL",
      "latitude": -33.45694,
      "longitude": -70.64827,
      "timezone": "America/Santiago",
      "population": 4837295,
      "feature_code": "PPLC"
    },
    {
      "name": "San Bernardo",
      "admin1": "Región Metropolitana de Santiago de Chile",
      "country_code": "CL",
      "latitude": -33.59217,
      "longitude": -70.6996,
      "timezone": "America/Santiago",
      "population": 249858,
      "feature_code": "PPLA2"
    },
    {
      "name": "San Felipe",
      "admin1": "Región de Valparaíso",
      "country_code": "CL",
      "latitude": -32.74976,
      "longitude": -70.72584,
      "timezone": "America/Santiago",
      "population": 59294,
      "feature_code": "PPLA2"
    },
    {
      "name": "San Pedro de la Paz",
      "admin1": "Región del Biobío",
      "country_code": "CL",
      "latitude": -36.83897,
      "longitude": -73.10028,
      "timezone": "America/Santiago",
      "population": 121631,
      "feature_code": "PPL"
    },
    {
      "name": "San Carlos",
      "admin1": "Ñuble",
      "country_code": "CL",
      "latitude": -36.42477,
      "longitude": -71.958,
      "timezone": "America/Santiago",
      "population": 31517,
      "feature_code": "PPLA2"
    },
    {
      "name": "San Antonio",
      "admin1": "Región de Valparaíso",
      "country_code": "CL",
      "latitude": -33.59473,
      "longitude": -71.60746,
      "timezone": "America/Santiago",
      "population": 87675,
      "feature_code": "PPL"
    },
    {
      "name": "San Javier de Loncomilla",
      "admin1": "Región del Maule",
      "country_code": "CL",
      "latitude": -35.5952,
      "longitude": -71.72924,
      "timezone": "America/Santiago",
      "population": 40189,
      "feature_code": "PPL"
    },
    {
      "name": "Santa Cruz",
      "admin1": "Región del Libertador General Bernardo O'Higgins",
      "country_code": "CL",
      "latitude": -34.63881,
      "longitude": -71.36576,
      "timezone": "America/Santiago",
      "population": 34914,
      "feature_code": "PPL"
    },
    {
      "name": "San Pablo",
      "admin1": "Región de Los Lagos",
      "country_code": "CL",
      "latitude": -40.41348,
      "longitude": -73.01085,
      "timezone": "America/Santiago",
      "population": 5279,
      "feature_code": "PPL"
    },
    {
      "name": "Santa Fé",
      "admin1": "Región de Los Ríos",
      "country_code": "CL",
      "latitude": -39.69639,
      "longitude": -72.87901,
      "timezone": "America/Santiago",
      "population": null,
      "feature_code": "PPL"
    }
  ],
  "ar_cor": [
    {
      "name": "Córdoba",
      "admin1": "Provincia de Córdoba",
      "country_code": "AR",
      "latitude": -31.40648,
      "longitude": -64.18853,
      "timezone": "America/Argentina/Cordoba",
      "population": 2106734,
      "feature_code": "PPLA"
    },
    {
      "name": "Aeropuerto Internacional de Cordoba Ingeniero Aeronáutico Ambrosio L.V. Taravella",
      "admin1": "Provincia de Córdoba",
      "country_code": "AR",
      "latitude": -31.32362,
      "longitude": -64.20795,
      "timezone": "America/Argentina/Cordoba",
      "population": null,
      "feature_code": "AIRP"
    },
    {
      "name": "Ciudad de Corrientes",
      "admin1": "Provincia de Corrientes",
      "country_code": "AR",
      "latitude": -27.46784,
      "longitude": -58.8344,
      "timezone": "America/Argentina/Cordoba",
      "population": 346334,
      "feature_code": "PPLA"
    },
    {
      "name": "Miguel Torres",
      "admin1": "Provincia de Santa Fe",
      "country_code": "AR",
      "latitude": -33.52666,
      "longitude": -61.46506,
      "timezone": "America/Argentina/Cordoba",
      "population": null,
      "feature_code": "PPL"
    },
    {
      "name": "Corti",
      "admin1": "Buenos Aires",
      "country_code": "AR",
      "latitude": -38.62191,
      "longitude": -62.05995,
      "timezone": "America/Argentina/Buenos_Aires",
      "population": null,
      "feature_code": "PPL"
    },
    {
      "name": "Coronda",
      "admin1": "Provincia de Santa Fe",
      "country_code": "AR",
      "latitude": -31.97365,
      "longitude": -60.91935,
      "timezone": "America/Argentina/Cordoba",
      "population": 16975,
      "feature_code": "PPLA2"
    },
    {
      "name": "Corzuela",
      "admin1": "Provincia del Chaco",
      "country_code": "AR",
      "latitude": -26.95135,
      "longitude": -60.97036,
      "timezone": "America/Argentina/Cordoba",
      "population": 10470,
      "feature_code": "PPLA2"
    },
    {
      "name": "Corpus",
      "admin1": "Provincia de Misiones",
      "country_code": "AR",
      "latitude": -27.12947,
      "longitude": -55.51083,
      "timezone": "America/Argentina/Cordoba",
      "population": null,
      "feature_code": "PPL"
    },
    {
      "name": "Correa",
      "admin1": "Provincia de Santa Fe",
      "country_code": "AR",
      "latitude": -32.84895,
      "longitude": -61.25387,
      "timezone": "America/Argentina/Cordoba",
      "population": null,
      "feature_code": "PPL"
    },
    {
      "name": "Corpen",
      "admin1": "Provincia de Santa Cruz",
      "country_code": "AR",
      "latitude": -49.58333,
      "longitude": -69.5,
      "timezone": "America/Argentina/Rio_Gallegos",
      "population": null,
      "feature_code": "PPL"
    }
  ]
} as const;

describe('the place a chart is cast for', () => {
  it('finds León, Guanajuato for «León», not the village in Baja California', () => {
    const place = bestPlace(ANSWERS.mx_leon, 'León', 'MX');
    expect(place?.name).toBe('León de los Aldama');
    expect(place?.timezone).toBe('America/Mexico_City');
  });

  it('gives no place rather than a wrong one', () => {
    // Searched as typed, «Tucumán» only returns Tucumanao and El Tucumancito,
    // and «CABA» hamlets elsewhere in Argentina. Neither is taken.
    expect(bestPlace(ANSWERS.ar_tucuman, 'Tucumán', 'AR')).toBeNull();
    expect(bestPlace(ANSWERS.ar_caba, 'CABA', 'AR')).toBeNull();
  });

  it('does not take a town for the province it sits in', () => {
    const place = bestPlace(ANSWERS.ec_santiago, 'Santiago', 'EC');
    expect(place?.name ?? '').toMatch(/Santiago/);
  });

  it('searches what the geocoder knows for what people write', () => {
    expect(searchTermFor('CDMX', 'MX')).toBe('Ciudad de México');
    expect(searchTermFor('df', 'mx')).toBe('Ciudad de México');
    expect(searchTermFor('CABA', 'AR')).toBe('Buenos Aires');
    expect(searchTermFor('Capital Federal', 'AR')).toBe('Buenos Aires');
    expect(searchTermFor('Tucumán', 'AR')).toBe('San Miguel de Tucumán');
    expect(searchTermFor(' Valparaíso ', 'CL')).toBe('Valparaíso');
  });

  it('suggests populated places, the largest first, without airports', () => {
    const names = rankPlaces(ANSWERS.ar_cor).map((p) => p.name);
    expect(names[0]).toBe('Córdoba');
    expect(names.some((n) => n.startsWith('Aeropuerto'))).toBe(false);
    expect(rankPlaces(ANSWERS.cl_san)[0]?.name).toBe('Santiago de Chile');
  });

  it('labels a place with its region', () => {
    const place = rankPlaces(ANSWERS.mx_leon)[0]!;
    expect(placeLabel(place)).toBe('León de los Aldama, Estado de Guanajuato');
  });

  it('refuses a place it cannot trust', () => {
    const good = { name: 'Lima', region: 'Lima', country: 'PE', latitude: -12.04, longitude: -77.03, timezone: 'America/Lima' };
    expect(parseBirthPlace(good)).toEqual(good);
    expect(parseBirthPlace({ ...good, latitude: 91 })).toBeNull();
    expect(parseBirthPlace({ ...good, timezone: 'Lima; drop' })).toBeNull();
    expect(parseBirthPlace({ ...good, country: 'Perú' })).toBeNull();
    expect(parseBirthPlace('Lima')).toBeNull();
  });
});

describe('geocodingUrl', () => {
  it('asks the free endpoint without a key', () => {
    const url = geocodingUrl('Santiago', 'CL');
    expect(url.origin).toBe('https://geocoding-api.open-meteo.com');
    expect(url.searchParams.get('apikey')).toBeNull();
    expect(url.searchParams.get('countryCode')).toBe('CL');
  });

  it('asks the commercial endpoint with the key', () => {
    const url = geocodingUrl('Santiago', 'CL', 'k123');
    expect(url.origin).toBe('https://customer-geocoding-api.open-meteo.com');
    expect(url.searchParams.get('apikey')).toBe('k123');
    expect(url.searchParams.get('name')).toBe('Santiago');
  });
});

// Open-Meteo's answers recorded on 25 Oct 2026 (count=100, language=es),
// for what people were typing when the field said it found nothing.
const recorded = RECORDED as Record<string, GeocoderResult[]>;
const asked: string[] = [];
const ask = async (country: string, term: string) => {
  asked.push(term);
  return recorded[`${country}|${term}`] ?? [];
};
const find = (query: string, country = 'MX') => findPlaces(query, country, (term) => ask(country, term));
const first = async (query: string, country = 'MX') => {
  const [place] = await find(query, country);
  return place ? `${place.name}, ${place.region}` : null;
};

describe('the city and its state, as people type them (25 Oct 2026)', () => {
  it('finds the city when the state follows it, with or without a comma, whole or halfway', async () => {
    expect(await first('Guadalajara Jalisco')).toBe('Guadalajara, Estado de Jalisco');
    expect(await first('Guadalajara, Ja')).toBe('Guadalajara, Estado de Jalisco');
    expect(await first('Monterrey NL')).toBe('Monterrey, Estado de Nuevo León');
    expect(await first('Mérida, Yuca')).toBe('Mérida, Estado de Yucatán');
  });

  it('puts the region typed first, ahead of a larger place elsewhere', async () => {
    const places = await find('Bogota, Bolivar', 'CO');
    expect(places[0]?.region).toBe('Departamento de Bolívar');
    expect(regionMatches('Estado de Michoacán de Ocampo', 'mich', 'MX')).toBe(true);
    expect(regionMatches('Estado de Baja California', 'mich', 'MX')).toBe(false);
    expect(regionMatches('Estado de México', 'edomex', 'MX')).toBe(true);
  });

  it('drops at most two words, and never below three letters', () => {
    expect(searchSteps('Santa Cruz de la Sierra', 'BO').map((s) => s.terms[0])).toEqual([
      'Santa Cruz de la Sierra',
      'Santa Cruz de la',
      'Santa Cruz de',
    ]);
    expect(searchSteps('Lo Prado', 'CL').map((s) => s.terms[0])).toEqual(['Lo Prado']);
    expect(searchSteps(', Jalisco', 'MX')).toEqual([]);
  });

  it('does not search again when the whole name already finds the place', async () => {
    asked.length = 0;
    await find('Monterrey');
    expect(asked).toEqual(['Monterrey']);
  });
});

describe('the big cities GeoNames names its own way (25 Oct 2026)', () => {
  it('finds them by the name people use, and shows that name', async () => {
    expect(await first('Querétaro')).toBe('Santiago de Querétaro, Estado de Querétaro de Arteaga');
    expect(await first('Tuxtla Gutiérrez')).toBe('Tuxtla Gutiérrez, Estado de Chiapas');
    expect(await first('Coatzacoalcos')).toBe('Coatzacoalcos, Estado de Veracruz-Llave');
    expect(await first('Ciudad Obregón')).toBe('Ciudad Obregón, Estado de Sonora');
    expect(await first('Iztapalapa')).toBe('Iztapalapa, Ciudad de México');
  });

  it('shows both Matamoros, the city in Tamaulipas first', async () => {
    const places = await find('Matamoros');
    expect(places[0]).toMatchObject({ name: 'Heroica Matamoros', region: 'Estado de Tamaulipas' });
    expect(places.some((p) => p.region === 'Estado de Coahuila de Zaragoza')).toBe(true);
  });

  it('writes «Pto» out as Puerto', () => {
    const [place] = rankPlaces([
      { name: 'Pto Vallarta', admin1: 'Estado de Jalisco', country_code: 'MX', latitude: 20.62, longitude: -105.23, timezone: 'America/Mexico_City', population: 203342, feature_code: 'PPL' },
    ]);
    expect(place?.name).toBe('Puerto Vallarta');
  });

  it('renames Puerto Mexico only in Veracruz', () => {
    const places = rankPlaces(recorded['MX|Puerto Mexico']!, 10);
    expect(places.filter((p) => p.name === 'Coatzacoalcos').map((p) => p.region)).toEqual([
      'Estado de Veracruz-Llave',
    ]);
  });

  it('keeps the real Uruapan, in Michoacán, first', async () => {
    expect(await first('Uruapan')).toBe('Uruapan, Estado de Michoacán de Ocampo');
  });

  it('casts an old draft for the renamed place by what was typed', () => {
    const place = bestPlace(recorded['MX|Tuxtla Gtz']!, 'Tuxtla Gutiérrez', 'MX');
    expect(place?.name).toBe('Tuxtla Gutiérrez');
  });

  it('asks the geocoder for a hundred results', () => {
    expect(geocodingUrl('León', 'MX').searchParams.get('count')).toBe('100');
  });
});
