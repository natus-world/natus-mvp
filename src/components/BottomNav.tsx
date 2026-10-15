import { NavLink } from 'react-router-dom';
import { copy } from '@/i18n';
import { TABS } from './tabs';

export function BottomNav() {
  return (
    <nav aria-label={copy.nav.label} className="nav-bar pointer-events-auto">
      {TABS.map(({ to, label, Icon }) => (
        <NavLink key={to} to={to} className="nav-tab">
          <Icon />
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
