import { useState } from 'react';
import { copy } from '@/i18n';
import { CrisisResourceList } from './CrisisResourceList';

/**
 * Low severity. PDR 6.4: nothing is blocked, a persistent banner sits over the
 * normal content, removing modalities are excluded from the pool and the
 * `psicologica` family is prioritised.
 *
 * The PDR left the low-severity response undefined; this is the resolution
 * the plan proposes. Persistent, not dismissible for the session — it can be
 * collapsed, not removed, because the whole point is that it stays available
 * while the person keeps using the product.
 *
 * The package draws no banner; open, it is the chat's box of lines for a low
 * signal (package 10), so the two read as one thing.
 */
export function CrisisBanner({ country }: { country: string | undefined }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="pz ayuda-pz lineas">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="lineas-cab"
      >
        <span aria-hidden="true" className="punto" />
        <span className="lt">{copy.crisisBanner.label}</span>
        <span aria-hidden="true" className="mas">
          {open ? '−' : '+'}
        </span>
      </button>

      {open && <CrisisResourceList country={country} tone="dark" />}
    </div>
  );
}
