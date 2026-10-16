import { NavLink } from 'react-router-dom';
import { PersonIcon } from '@/design/icons';
import { activeProfile } from '@/store/account';
import { copy } from '@/i18n';
import { PATHS } from './routes';

/** The first letter of the first name, or nothing when there is no name yet. */
export function initialOf(fullName: string | undefined): string {
  const first = fullName?.trim().split(/\s+/)[0] ?? '';
  return first ? first.charAt(0).toLocaleUpperCase('es') : '';
}

/** Perfil: the person's initial in a circle, top right (16 Oct 2026). */
export function ProfileButton() {
  const initial = initialOf(activeProfile()?.draft.legal_birth_name);
  return (
    <NavLink to={PATHS.profile} aria-label={copy.nav.profile} className="profile-button">
      {initial ? <span aria-hidden="true">{initial}</span> : <PersonIcon size={16} />}
    </NavLink>
  );
}
