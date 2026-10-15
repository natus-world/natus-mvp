import type { ReactNode } from 'react';
import { copy } from '@/i18n';

const twoDigits = (n: number) => String(n).padStart(2, '0');

export function ProgressRow({
  label,
  step,
  total,
  onBack,
}: {
  label: string;
  step: number;
  total: number;
  onBack?: (() => void) | undefined;
}) {
  return (
    <div className="mb-5">
      <div className="mb-3 flex items-center gap-3">
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            aria-label={copy.common.back}
            className="circle-chip flex size-8 shrink-0 items-center justify-center text-[length:var(--fs-body-14)] leading-5 text-crema"
          >
            ←
          </button>
        ) : null}
        <p className="eyebrow min-w-0 flex-1 truncate">{label}</p>
      </div>

      <p
        className="flex items-baseline gap-2.5"
        aria-label={`${step} ${copy.onboarding.stepOf} ${total}`}
      >
        <span
          aria-hidden="true"
          className="font-serif text-[length:var(--fs-display)] leading-[var(--lh-heading-1_12)] font-light text-crema"
        >
          {twoDigits(step)}
        </span>
        <span aria-hidden="true" className="eyebrow">
          {copy.onboarding.stepOf} {twoDigits(total)}
        </span>
      </p>

      <div aria-hidden="true" className="mt-3 flex gap-1.5">
        {Array.from({ length: total }, (_, i) => (
          <span
            key={i}
            className={['h-px flex-1', i < step ? 'bg-crema/70' : 'bg-crema/20'].join(' ')}
          />
        ))}
      </div>
    </div>
  );
}

export function StepBody({
  title,
  helper,
  children,
  action,
}: {
  title: ReactNode;
  helper?: string;
  children: ReactNode;
  action: ReactNode;
}) {
  return (
    <>
      <h2 className="mb-2 text-[length:var(--fs-heading-28)] leading-[var(--lh-heading-1_18)] text-blanco">{title}</h2>
      {helper && <p className="mb-5 text-[length:var(--fs-body-12)] leading-relaxed text-crema/55">{helper}</p>}
      {!helper && <div className="mb-5" />}

      <div className="-mx-1 flex-1 overflow-y-auto px-1 pb-2">{children}</div>

      <div className="shrink-0 pt-4">{action}</div>
    </>
  );
}
