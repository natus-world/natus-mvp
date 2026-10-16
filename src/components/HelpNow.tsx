import { useEffect, useRef } from 'react';
import { CrisisResourceList } from '@/components/CrisisResourceList';
import { activeProfile } from '@/store/account';
import { copy } from '@/i18n';

const t = copy.chrome.helpNow;

export function HelpNowButton({ onOpen }: { onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-haspopup="dialog"
      aria-label={t.label}
      className="help-pill shrink-0"
    >
      {t.button}
    </button>
  );
}

export function HelpNowPanel({ onClose }: { onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const country = activeProfile()?.draft.country;

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="help-now-title"
      className="inset-0 z-[60] flex flex-col overflow-y-auto bg-noche px-6 pt-8 pb-9 absolute"
    >
      <div className="mb-6 flex items-center gap-2.5">
        <span aria-hidden="true" className="size-2 rounded-full bg-error shadow-[0_0_8px_var(--natus-error)]" />
        <p className="eyebrow">{t.label}</p>
      </div>

      <h2 id="help-now-title" className="mb-4 text-[length:var(--fs-title-28)] text-blanco">
        {t.title}
      </h2>

      <p className="mb-6 text-[length:var(--fs-body-14)] leading-relaxed text-crema/75">
        {t.body}
      </p>

      <CrisisResourceList country={country} />

      <button ref={closeRef} type="button" className="cta mt-8 shrink-0" onClick={onClose}>
        {t.close}
      </button>
    </div>
  );
}
