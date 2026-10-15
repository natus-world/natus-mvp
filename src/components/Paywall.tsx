import { copy } from '@/i18n';

const text = copy.paywall;

/**
 * The end of the free questions. PDR section 3.
 *
 * Two rules shape this component. It never appears over a crisis turn — the
 * caller checks safety first, and PDR 1.6 forbids a commercial fallback in
 * that moment. And it does not take the screen: what the person typed is still
 * in the box behind it, still theirs, and comes back untouched if they close
 * this.
 *
 * There is nothing to buy yet. Payments arrive with dLocal Go (v1.2 P-01), and
 * only the server can make anybody premium, so this shows the reference price
 * and says plainly that Premium cannot be taken out yet. The simulated
 * subscription it used to offer is gone: it changed nothing on the server.
 */
export function Paywall({ used, onDismiss }: { used: number; onDismiss: () => void }) {
  return (
    <div
      role="dialog"
      aria-label={text.label}
      className="surface surface-p16"
    >
      <p className="eyebrow mb-2">{text.kicker}</p>
      <h2 className="mb-2 text-[length:var(--fs-heading-17)] leading-snug text-blanco">
        {text.title(used)}
      </h2>
      <p className="mb-3.5 text-[length:var(--fs-body-12)] leading-relaxed text-crema/55">
        {text.body}
      </p>

      <div className="mb-3.5 border-t border-crema/15 pt-3">
        <p className="text-[length:var(--fs-body-13)] text-blanco">{text.soonTitle}</p>
        <p className="mt-1 text-[length:var(--fs-body-12)] leading-relaxed text-crema/55">
          {text.soonBody}
        </p>
      </div>

      <button
        type="button"
        onClick={onDismiss}
        className="chip chip-p10 w-full text-crema/60"
      >
        {text.back}
      </button>
    </div>
  );
}
