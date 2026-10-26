import { useEffect, useId, useRef, useState } from 'react';
import { copy } from '@/i18n';
import { MIN_QUERY_LENGTH, normalizePlaceName, placeLabel, type BirthPlace } from '@/lib/places';
import { searchPlaces } from '@/astrology/places';
import { track } from '@/store/funnel';

const text = copy.onboarding.basicData;
const WAIT_MS = 300;
/**
 * How long an empty answer waits before the field says it found nothing
 * (25 Oct 2026): mid-word — «Mérida, Yuca» — 80 of 113 people saw «No
 * encontramos esa ciudad» while still typing. A keystroke meanwhile cancels it.
 */
const NONE_WAIT_MS = 1200;
/** How long a blur waits for a tap on the list to land before it picks by itself. */
const BLUR_WAIT_MS = 250;

/**
 * The birth city, picked from suggestions inside the country of birth
 * (16 Oct 2026): the person types «San» and chooses «Santiago de Chile,
 * Región Metropolitana». What is chosen — coordinates and timezone — is what
 * the chart is cast for. Typing again forgets the choice.
 */
export function BirthPlaceField({
  city,
  country,
  place,
  fieldClass,
  helperClass,
  onChange,
  needed = false,
}: {
  city: string;
  country: string;
  place: BirthPlace | null;
  fieldClass: string;
  helperClass: string;
  onChange: (city: string, place: BirthPlace | null) => void;
  /** A chart is wanted: a blank city says that without it there is none (owner, 22 Oct 2026). */
  needed?: boolean;
}) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const [options, setOptions] = useState<BirthPlace[]>([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [active, setActive] = useState(0);
  const typed = useRef(false);
  // A city kept from before but never picked (owner, 22 Oct 2026): touching it
  // searches it as if typed, so the list is there without retyping it.
  const [reopened, setReopened] = useState(0);

  const ready = /^[A-Z]{2}$/.test(country);
  const query = city.trim();

  useEffect(() => {
    // Only what the person typed searches; a stored or picked city does not.
    if (!typed.current || place || !ready || query.length < MIN_QUERY_LENGTH) {
      setOptions([]);
      setSearching(false);
      setSearched(false);
      return;
    }
    const controller = new AbortController();
    setSearching(true);
    let none: ReturnType<typeof setTimeout> | undefined;
    const timer = setTimeout(() => {
      void searchPlaces(query, country, controller.signal).then((found) => {
        if (controller.signal.aborted) return;
        setOptions(found);
        setActive(0);
        const done = () => {
          setSearching(false);
          setSearched(true);
        };
        if (found.length > 0) done();
        else none = setTimeout(done, NONE_WAIT_MS);
      });
    }, WAIT_MS);
    return () => {
      clearTimeout(timer);
      clearTimeout(none);
      controller.abort();
    };
  }, [query, country, place, ready, reopened]);

  const chosenAt = useRef(0);
  const choose = (chosen: BirthPlace) => {
    typed.current = false;
    chosenAt.current = Date.now();
    setOptions([]);
    setSearched(false);
    onChange(chosen.name, chosen);
  };

  // Leaving the field with the city written as the first suggestion names it
  // picks that one (owner, 26 Oct 2026): «Mexicali» typed, «Mexicali» first
  // on the list, and the person left believing it was set. A tap on another
  // suggestion lands first and wins.
  const latest = useRef({ options, place, query });
  latest.current = { options, place, query };
  const pickOnLeave = () => {
    const leftAt = Date.now();
    window.setTimeout(() => {
      const { options: shown, place: picked, query: written } = latest.current;
      if (picked || chosenAt.current >= leftAt) return;
      const first = shown[0];
      if (first && normalizePlaceName(first.name) === normalizePlaceName(written)) choose(first);
    }, BLUR_WAIT_MS);
  };

  // On the phone the list opened under the fold, behind «Continuar» and the
  // keyboard (owner, 26 Oct 2026): when it opens, the field rises to the top.
  const listOpen = options.length > 0;
  useEffect(() => {
    if (!listOpen || !input.current) return;
    if (!window.matchMedia('(max-width: 1023px)').matches) return;
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    input.current.scrollIntoView({ block: 'start', behavior: still ? 'auto' : 'smooth' });
  }, [listOpen]);

  // A typed city that found nothing, once per field (owner, 22 Oct 2026):
  // that it happened, never what was typed. Not a city just picked: until
  // 26 Oct 2026 the pick itself counted, for a moment, as finding nothing.
  const toldNone = useRef(false);
  const none = searched && !searching && options.length === 0 && !place;
  useEffect(() => {
    if (none && !toldNone.current) {
      toldNone.current = true;
      track('birth_city_not_found');
    }
  }, [none]);

  const helper = place
    ? placeLabel(place)
    : searching
      ? text.birthCitySearching
      : searched && options.length === 0
        ? text.birthCityNone
        : query !== '' && ready
          ? text.birthCityPick
          : query === '' && ready && needed
            ? text.birthCityNeeded
            : null;

  return (
    <div className="ciudad">
      <label className="sr-only" htmlFor={`${id}-city`}>
        {text.birthCityLabel}
      </label>
      <input
        ref={input}
        id={`${id}-city`}
        role="combobox"
        aria-expanded={options.length > 0}
        aria-controls={`${id}-options`}
        aria-autocomplete="list"
        aria-activedescendant={options.length > 0 ? `${id}-option-${active}` : undefined}
        aria-describedby={`${id}-helper`}
        autoComplete="off"
        spellCheck={false}
        className={fieldClass}
        disabled={!ready}
        value={city}
        placeholder={ready ? text.birthCityPlaceholder : text.birthCityNeedsCountry}
        onFocus={() => {
          if (!place && !typed.current && query.length >= MIN_QUERY_LENGTH) {
            typed.current = true;
            setReopened((n) => n + 1);
          }
        }}
        onChange={(e) => {
          typed.current = true;
          onChange(e.target.value, null);
        }}
        onBlur={pickOnLeave}
        onKeyDown={(e) => {
          if (options.length === 0) return;
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActive((i) => Math.min(options.length - 1, i + 1));
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActive((i) => Math.max(0, i - 1));
          } else if (e.key === 'Enter') {
            e.preventDefault();
            const chosen = options[active];
            if (chosen) choose(chosen);
          } else if (e.key === 'Escape') {
            setOptions([]);
          }
        }}
      />
      {/* The label until there is something to say about the search; right under
          what was typed, so it is not hidden below the list (26 Oct 2026). */}
      <p
        id={`${id}-helper`}
        className={helper === text.birthCityPick || helper === text.birthCityNeeded ? `${helperClass} error` : helperClass}
        aria-live="polite"
      >
        {helper ?? text.birthCityLabel}
      </p>
      {options.length > 0 && (
        <ul id={`${id}-options`} role="listbox" aria-label={text.birthCityOptions} className="sug">
          {options.map((option, index) => (
            <li
              key={`${option.name}-${option.region}-${option.latitude}`}
              id={`${id}-option-${index}`}
              role="option"
              aria-selected={index === active}
              onClick={() => choose(option)}
            >
              <span className="v">{option.name}</span>
              {option.region && option.region !== option.name && <span className="l">{option.region}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
