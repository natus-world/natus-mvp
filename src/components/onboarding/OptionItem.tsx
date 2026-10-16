import { TickIcon } from './icons';

/**
 * A row of package 01 (16 Oct 2026): the option, its hint under it, and a
 * circle on the right that fills with a tick when chosen. The rows sit
 * together in one glass card, divided by a hairline.
 */
export function OptionItem({
  label,
  hint,
  selected,
  onToggle,
  multi = true,
}: {
  label: string;
  hint?: string;
  selected: boolean;
  onToggle: () => void;
  multi?: boolean;
}) {
  return (
    <button
      type="button"
      role={multi ? 'checkbox' : 'radio'}
      aria-checked={selected}
      onClick={onToggle}
      className={selected ? 'opc on' : 'opc'}
    >
      <span>
        <span className="v">{label}</span>
        {hint && <span className="l">{hint}</span>}
      </span>
      <span className="ck" aria-hidden="true">
        {selected && <TickIcon />}
      </span>
    </button>
  );
}
