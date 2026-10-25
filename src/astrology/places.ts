import { findPlaces, geocodingUrl, type BirthPlace, type GeocoderResult } from '@/lib/places';
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
  // Step by step (25 Oct 2026): «Guadalajara, Jal» asks for Guadalajara and
  // puts Jalisco first; see `searchSteps`.
  return findPlaces(query, country, async (term) => {
    if (signal?.aborted) return null;
    const viaServer = await throughServer(term, country);
    if (viaServer !== null) return viaServer;
    if (signal?.aborted) return null;
    try {
      const response = await fetch(geocodingUrl(term, country), signal ? { signal } : {});
      if (!response.ok) return null;
      const payload = (await response.json()) as { results?: GeocoderResult[] };
      return Array.isArray(payload.results) ? payload.results : [];
    } catch {
      return null;
    }
  });
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
