import { useEffect, useId, useRef, useState } from 'react';
import { copy } from '@/i18n';
import { MIN_QUERY_LENGTH, placeLabel, type BirthPlace } from '@/lib/places';
import { searchPlaces } from '@/astrology/places';

const text = copy.onboarding.basicData;
const WAIT_MS = 300;

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
  labelClass,
  helperClass,
  onChange,
}: {
  city: string;
  country: string;
  place: BirthPlace | null;
  fieldClass: string;
  labelClass: string;
  helperClass: string;
  onChange: (city: string, place: BirthPlace | null) => void;
}) {
  const id = useId();
  const [options, setOptions] = useState<BirthPlace[]>([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [active, setActive] = useState(0);
  const typed = useRef(false);

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
    const timer = setTimeout(() => {
      void searchPlaces(query, country, controller.signal).then((found) => {
        if (controller.signal.aborted) return;
        setOptions(found);
        setActive(0);
        setSearching(false);
        setSearched(true);
      });
    }, WAIT_MS);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, country, place, ready]);

  const choose = (chosen: BirthPlace) => {
    typed.current = false;
    setOptions([]);
    onChange(chosen.name, chosen);
  };

  const helper = place
    ? placeLabel(place)
    : searching
      ? text.birthCitySearching
      : searched && options.length === 0
        ? text.birthCityNone
        : query !== '' && ready
          ? text.birthCityPick
          : null;

  return (
    <div>
      <label className={labelClass} htmlFor={`${id}-city`}>
        {text.birthCityLabel}
      </label>
      <input
        id={`${id}-city`}
        role="combobox"
        aria-expanded={options.length > 0}
        aria-controls={`${id}-options`}
        aria-autocomplete="list"
        aria-activedescendant={options.length > 0 ? `${id}-option-${active}` : undefined}
        aria-describedby={`${id}-helper`}
        autoComplete="off"
        className={fieldClass}
        disabled={!ready}
        value={city}
        placeholder={ready ? text.birthCityPlaceholder : text.birthCityNeedsCountry}
        onChange={(e) => {
          typed.current = true;
          onChange(e.target.value, null);
        }}
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
      {options.length > 0 && (
        <ul id={`${id}-options`} role="listbox" aria-label={text.birthCityOptions} className="surface rows mt-1.5 list-none p-0">
          {options.map((option, index) => (
            <li
              key={`${option.name}-${option.region}-${option.latitude}`}
              id={`${id}-option-${index}`}
              role="option"
              aria-selected={index === active}
              className={['cursor-pointer px-1 py-2.5', index === active ? 'text-crema' : 'text-blanco/85'].join(' ')}
              onClick={() => choose(option)}
            >
              <span className="block text-[length:var(--fs-body-14)] leading-5">{option.name}</span>
              {option.region && option.region !== option.name && (
                <span className="block text-[length:var(--fs-body-11)] leading-snug text-crema/55">{option.region}</span>
              )}
            </li>
          ))}
        </ul>
      )}
      {helper && (
        <p id={`${id}-helper`} className={helperClass} aria-live="polite">
          {helper}
        </p>
      )}
    </div>
  );
}
