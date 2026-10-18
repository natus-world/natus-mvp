import {
  MIN_QUERY_LENGTH,
  geocodingUrl,
  rankPlaces,
  searchTermFor,
  type BirthPlace,
  type GeocoderResult,
} from '@/lib/places';
import { isBackendConfigured, supabase } from '@/supabase/client';

/**
 * Suggestions for the birth place, inside the country of birth (16 Oct 2026).
 * The name typed and the country, nothing else. Asked of the `geocode`
 * function, which holds Open-Meteo's commercial key (18 Oct 2026); straight
 * of Open-Meteo's free endpoint only when there is no backend or session, or
 * the function fails, so the step never stops. An error is an empty list —
 * the field says it found nothing and the person can try another name.
 */
export async function searchPlaces(query: string, country: string, signal?: AbortSignal): Promise<BirthPlace[]> {
  const term = searchTermFor(query, country);
  if (term.length < MIN_QUERY_LENGTH || !/^[A-Z]{2}$/.test(country)) return [];
  const viaServer = await throughServer(term, country);
  if (viaServer !== null) return rankPlaces(viaServer);
  if (signal?.aborted) return [];
  const url = geocodingUrl(term, country);
  try {
    const response = await fetch(url, signal ? { signal } : {});
    if (!response.ok) return [];
    const payload = (await response.json()) as { results?: GeocoderResult[] };
    return rankPlaces(Array.isArray(payload.results) ? payload.results : []);
  } catch {
    return [];
  }
}

async function throughServer(term: string, country: string): Promise<GeocoderResult[] | null> {
  if (!isBackendConfigured || !supabase) return null;
  try {
    const { data: session } = await supabase.auth.getSession();
    if (!session.session) return null;
    const { data, error } = await supabase.functions.invoke<{ results?: GeocoderResult[] }>('geocode', {
      body: { name: term, country },
    });
    if (error || !data || !Array.isArray(data.results)) return null;
    return data.results;
  } catch {
    return null;
  }
}
