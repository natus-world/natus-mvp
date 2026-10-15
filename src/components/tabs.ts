import type { ComponentType } from 'react';
import { ChartIcon, ChatIcon, ConstellationIcon, SproutIcon, SunriseIcon } from '@/design/icons';
import { copy } from '@/i18n';
import { PATHS } from './routes';

export type Tab = { to: string; label: string; Icon: ComponentType };

export const TABS: readonly Tab[] = [
  { to: PATHS.today, label: copy.nav.today, Icon: SunriseIcon },
  { to: PATHS.chart, label: copy.nav.chart, Icon: ChartIcon },
  { to: PATHS.paths, label: copy.nav.paths, Icon: ConstellationIcon },
  { to: PATHS.journey, label: copy.nav.journey, Icon: SproutIcon },
  { to: PATHS.chat, label: copy.nav.chat, Icon: ChatIcon },
];
