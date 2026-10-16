import type { ComponentType } from 'react';
import {
  ChartTabIcon,
  ChatTabIcon,
  JournalIcon,
  PathsIcon,
  RoutineIcon,
  TodayIcon,
} from '@/design/brand-icons';
import { copy } from '@/i18n';
import { PATHS } from './routes';

export type Tab = { to: string; label: string; Icon: ComponentType };

export const TABS: readonly Tab[] = [
  { to: PATHS.today, label: copy.nav.today, Icon: TodayIcon },
  { to: PATHS.chart, label: copy.nav.chart, Icon: ChartTabIcon },
  { to: PATHS.paths, label: copy.nav.paths, Icon: PathsIcon },
  { to: PATHS.journey, label: copy.nav.journey, Icon: RoutineIcon },
  { to: PATHS.journal, label: copy.nav.journal, Icon: JournalIcon },
  { to: PATHS.chat, label: copy.nav.chat, Icon: ChatTabIcon },
];
