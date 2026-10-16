import { Link } from 'react-router-dom';
import { copy } from '@/i18n';

/** The two small links to the privacy policy and the terms (owner, 16 Oct 2026). */
export function LegalLinks({ className = '' }: { className?: string }) {
  return (
    <p className={`flex justify-center gap-2 text-[length:var(--fs-body-11)] text-crema/55 ${className}`}>
      <Link to="/privacidad" className="text-crema/55 underline hover:text-crema">
        {copy.legal.linkPrivacy}
      </Link>
      <span aria-hidden="true">·</span>
      <Link to="/terminos" className="text-crema/55 underline hover:text-crema">
        {copy.legal.linkTerms}
      </Link>
    </p>
  );
}
