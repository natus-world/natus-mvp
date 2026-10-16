import { copy } from '@/i18n';
import { resourcesForCountry, telHref } from '@/lib/crisis-resources';

const t = copy.crisisResources;

/** The package's telephone (package 12, 16 Oct 2026). */
export function PhoneIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.4}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a1 1 0 0 1-1 1A16 16 0 0 1 4 5a1 1 0 0 1 1-1z" />
    </svg>
  );
}

function directoryHost(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

/**
 * The list of places to call. Shared by «Necesito ayuda», the crisis screen,
 * the banner and the error screen, so they can never drift apart.
 *
 * `paper` is the package's cream sheet (package 12): the lines of the
 * person's country, each with a dark button that dials on touch, then the
 * emergency number in its own box. `dark` is the same list over a photo or
 * the night background, as the chat draws its lines (package 10).
 *
 * The numbers come from `data/crisis-resources.json`, never from the package
 * and never from a model.
 */
export function CrisisResourceList({
  country,
  tone = 'dark',
}: {
  country: string | undefined;
  tone?: 'paper' | 'dark';
}) {
  const set = resourcesForCountry(country);
  const paper = tone === 'paper';
  const lines = paper ? set.resources.filter((r) => r.type !== 'emergency') : set.resources;
  const emergencies = paper ? set.resources.filter((r) => r.type === 'emergency') : [];

  return (
    <div className={`ayuda-pz recursos ${paper ? 'papel' : 'oscuro'}`}>
      <ul className="lista-a">
        {lines.map((r) => (
          <li key={`${r.country}-${r.name}`} className="la">
            <div className="tx">
              <p className="nm">{r.name}</p>
              {r.note && <p className="ds">{r.note}</p>}
            </div>
            <a href={telHref(r.contact)} className="llamar" aria-label={t.call(r.name, r.contact)}>
              <PhoneIcon />
              {r.contact}
            </a>
          </li>
        ))}

        {/* PDR 6.4: never leave the list empty, and always offer a way out of
            the five MVP countries. */}
        <li className="la">
          <div className="tx">
            <p className="nm">{set.fallback.name}</p>
            <p className="ds">{set.fallback.note}</p>
          </div>
          <a
            href={set.fallback.url}
            target="_blank"
            rel="noreferrer noopener"
            className="llamar ext"
            aria-label={t.openDirectory(set.fallback.name)}
          >
            {directoryHost(set.fallback.url)}
            <span aria-hidden="true">↗</span>
          </a>
        </li>
      </ul>

      {paper &&
        (emergencies.length > 0 ? (
          emergencies.map((r) => (
            <div key={`${r.country}-${r.name}`} className="emerg">
              <p className="tx">{t.emergency}</p>
              <a href={telHref(r.contact)} className="llamar" aria-label={t.callEmergency(r.contact)}>
                <PhoneIcon />
                {r.contact}
              </a>
            </div>
          ))
        ) : (
          // A country without lines in the table (or «Otro país»): the
          // instruction to call the local emergency number, never nothing.
          <div className="emerg">
            <p className="tx">{set.fallback.emergency_instruction}</p>
          </div>
        ))}

      {set.unverified && (
        /*
         * Honesty about the state of the data. PDR 6.4 makes telephone
         * verification an absolute launch blocker; until `verified_at` is set
         * in data/crisis-resources.json, saying nothing would let a demo imply
         * these numbers were checked. Deleting this notice is not the fix —
         * verifying the numbers is.
         */
        <p className="sin-verificar">
          {t.unverifiedLead}
          <span className="sitio">{t.unverifiedSite}</span>
          {t.unverifiedTail}
        </p>
      )}
    </div>
  );
}
