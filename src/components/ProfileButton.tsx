import { NavLink } from 'react-router-dom';
import { PersonIcon } from '@/design/icons';
import { copy } from '@/i18n';
import { PATHS } from './routes';

export function ProfileButton() {
  return (
    <NavLink to={PATHS.profile} aria-label={copy.nav.profile} className="profile-button">
      <PersonIcon size={18} />
    </NavLink>
  );
}
