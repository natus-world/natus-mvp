import { NavLink } from 'react-router-dom';
import { copy } from '@/i18n';
import { TABS } from './tabs';

/** `lit`: the tab a sub-screen hangs from, shown as the current one. */
export function BottomNav({ lit }: { lit?: string | null }) {
  return (
    <nav aria-label={copy.nav.label} className="nav-bar pointer-events-auto">
      {TABS.map(({ to, label, Icon }) => (
        <NavLink key={to} to={to} className={to === lit ? 'nav-tab is-parent' : 'nav-tab'}>
          <Icon />
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
