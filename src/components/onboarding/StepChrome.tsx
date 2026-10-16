import { createContext, useContext, type ReactNode } from 'react';
import { copy } from '@/i18n';
import { ForwardIcon } from './icons';

const twoDigits = (n: number) => String(n).padStart(2, '0');

/**
 * Where the person is in the three steps (package 01, 16 Oct 2026). The
 * onboarding provides it; a step rendered elsewhere — the birth data in
 * Perfil, «Para cuidarte» — has none, and shows no number and no line.
 */
export type StepPlace = {
  step: number;
  total: number;
  /** Going back to a step already done: today's back button, on its name. */
  onGoTo: (index: number) => void;
};

export const StepContext = createContext<StepPlace | null>(null);

/**
 * A question's title with its last word in italics, as the package sets
 * every title: «¿Qué te estás preguntando *últimamente*?».
 */
export function emphasizeLast(sentence: string): ReactNode {
  const match = /^(.*\s)(\S+?)([?.!»]*)$/u.exec(sentence);
  if (!match) return sentence;
  const [, lead, last, tail] = match;
  return (
    <>
      {lead}
      <em>{last}</em>
      {tail}
    </>
  );
}

/** The line under the title: three dots, the one on view lit, the way done filled. */
function Progress({ step, total, onGoTo }: StepPlace) {
  const names = copy.onboarding.steps;
  const at = (i: number) => (i === 0 ? 'calc(var(--u) * 8)' : i === total - 1 ? 'calc(100% - var(--u) * 4)' : '50%');
  const filled = step === 1 ? 'calc(var(--u) * 80)' : step === total ? 'calc(100% - var(--u) * 12)' : 'calc(50% - var(--u) * 8)';
  return (
    <div className="hz">
      <div className="ln" aria-hidden="true">
        <em style={{ width: filled }} />
        {Array.from({ length: total }, (_, i) => (
          <i key={i} className={i === step - 1 ? 'on' : undefined} style={{ left: at(i) }} />
        ))}
      </div>
      <div className="nm">
        {names.slice(0, total).map((name, i) =>
          i < step - 1 ? (
            <button key={name} type="button" onClick={() => onGoTo(i)} aria-label={`${copy.common.back}: ${name}`}>
              {name}
            </button>
          ) : (
            <span key={name} className={i === step - 1 ? 'on' : undefined} aria-current={i === step - 1 ? 'step' : undefined}>
              {name}
            </span>
          ),
        )}
      </div>
    </div>
  );
}

/**
 * One step of the entrance, as package 01 lays it out. On the phone one
 * column that scrolls, with the button held at the bottom; on desktop the
 * question on the left and the form on the right, in glass.
 */
export function StepBody({
  kicker,
  title,
  helper,
  aside,
  children,
  action,
  missing,
}: {
  kicker?: string;
  title: ReactNode;
  helper?: string;
  /** Under the helper, on the left on desktop (the privacy line of «Para cuidarte»). */
  aside?: ReactNode;
  children: ReactNode;
  action: ReactNode;
  /** What is still missing, said under the button. */
  missing?: string | null;
}) {
  const place = useContext(StepContext);
  const label = kicker ?? (place ? copy.onboarding.kicker : undefined);
  return (
    <div className="sc en-paso">
      <div className="d-izq">
        {label && <p className="k">{label}</p>}
        {place && (
          <p className="paso" aria-label={`${place.step} ${copy.onboarding.stepOf} ${place.total}`}>
            <b aria-hidden="true">{twoDigits(place.step)}</b>
            <span aria-hidden="true">
              {copy.onboarding.stepOf} {twoDigits(place.total)}
            </span>
          </p>
        )}
        <h1 className={label ? 't mt' : 't'}>{title}</h1>
        {helper && <p className="cuerpo">{helper}</p>}
        {aside}
        {place && <Progress {...place} />}
      </div>
      <div className="d-der">
        <div className="d-lista">{children}</div>
        <div className="pie">
          {action}
          {missing && <p className="falta">{missing}</p>}
        </div>
      </div>
    </div>
  );
}

/** The step's one button: cream when it can go on, dark until then. */
export function NextButton({
  disabled,
  onClick,
  children = copy.common.continue,
}: {
  disabled: boolean;
  onClick: () => void;
  children?: ReactNode;
}) {
  return (
    <button type="button" className={disabled ? 'btn off' : 'btn p'} disabled={disabled} onClick={onClick}>
      {children}
      <ForwardIcon />
    </button>
  );
}
