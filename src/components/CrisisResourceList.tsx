import { copy } from '@/i18n';
import { resourcesForCountry, telHref } from '@/lib/crisis-resources';

/**
 * The list of places to call. Shared by the full-screen takeover and the
 * banner so the two can never drift apart.
 */
export function CrisisResourceList({
  country,
  compact = false,
}: {
  country: string | undefined;
  compact?: boolean;
}) {
  const set = resourcesForCountry(country);

  return (
    <div className={compact ? 'flex flex-col gap-1.5' : 'flex flex-col gap-2'}>
      {set.resources.map((r) => (
        <a
          key={`${r.country}-${r.name}`}
          href={telHref(r.contact)}
          className="surface surface-p12 flex items-center gap-3 no-underline"
        >
          <div className="min-w-0 flex-1">
            <p className="text-[length:var(--fs-body-14)] leading-5 break-words text-blanco">{r.name}</p>
            {r.note && <p className="text-[length:var(--fs-body-11)] leading-snug break-words text-crema/75">{r.note}</p>}
          </div>
          <span className="shrink-0 font-sans text-[length:var(--fs-numeral-18)] leading-7 font-medium whitespace-nowrap text-blanco tabular-nums">
            {r.contact}
          </span>
        </a>
      ))}

      {/* PDR 6.4: never leave the list empty, and always offer a way out of
          the five MVP countries. */}
      <a
        href={set.fallback.url}
        target="_blank"
        rel="noreferrer noopener"
        className="surface surface-p12 flex items-center gap-3 no-underline"
      >
        <div className="min-w-0 flex-1">
          <p className="text-[length:var(--fs-body-14)] leading-5 break-words text-blanco">{set.fallback.name}</p>
          <p className="text-[length:var(--fs-body-11)] leading-snug break-words text-crema/75">{set.fallback.note}</p>
        </div>
        <span aria-hidden="true" className="shrink-0 text-crema/60">
          ↗
        </span>
      </a>

      {set.unverified && (
        /*
         * Honesty about the state of the data. PDR 6.4 makes telephone
         * verification an absolute launch blocker; until `verified_at` is set
         * in data/crisis-resources.json, saying nothing would let a demo imply
         * these numbers were checked. Deleting this notice is not the fix —
         * verifying the numbers is.
         */
        <p className="px-1 pt-1 text-[length:var(--fs-body-11)] leading-relaxed text-crema/55">
          {copy.crisisResources.unverifiedLead}
          <span className="text-crema/70">{copy.crisisResources.unverifiedSite}</span>
          {copy.crisisResources.unverifiedTail}
        </p>
      )}
    </div>
  );
}
