import type { ComponentType } from 'react';
import { NavLink } from 'react-router-dom';
import {
  ChartIcon,
  ChatIcon,
  ConstellationIcon,
  PersonIcon,
  SproutIcon,
  SunriseIcon,
} from '@/design/icons';

const ITEMS: { to: string; label: string; Icon: ComponentType }[] = [
  { to: '/inicio', label: 'Inicio', Icon: SunriseIcon },
  { to: '/mapa', label: 'Mapa', Icon: ChartIcon },
  { to: '/recomendaciones', label: 'Caminos', Icon: ConstellationIcon },
  { to: '/rutina', label: 'Rutina', Icon: SproutIcon },
  { to: '/chat', label: 'Chat', Icon: ChatIcon },
  { to: '/cuenta', label: 'Cuenta', Icon: PersonIcon },
];

export function BottomNav() {
  return (
    <nav aria-label="Secciones" className="nav-bar pointer-events-auto">
      {ITEMS.map(({ to, label, Icon }) => (
        <NavLink key={to} to={to} className="nav-tab">
          <Icon />
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
