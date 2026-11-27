// components/gs/StatusChip.tsx — small colored status label (Paid, Venue, LIVE…).
import React, { type ReactElement, type ReactNode } from 'react';
import { Text, View } from 'react-native';
import { gs } from '@/theme/colors';
import { cx } from './styles';

export type ChipTone = 'green' | 'orange' | 'violet' | 'pink' | 'blue' | 'gray' | 'red' | 'dark' | 'white';

const TONE: Readonly<Record<ChipTone, readonly [string, string]>> = {
  green: [gs.greenSoft, gs.green],
  orange: [gs.orangeSoft, gs.orange],
  violet: [gs.violetSoft, gs.violetDark],
  pink: [gs.pinkSoft, gs.pinkDark],
  blue: [gs.blueSoft, gs.blue],
  gray: [gs.surface2, gs.subtle],
  red: [gs.dangerSoft, gs.danger],
  dark: ['rgba(20,18,31,0.55)', gs.white],
  white: [gs.white, gs.ink],
};

export default function StatusChip({
  label,
  tone = 'gray',
  icon,
  size = 'sm',
  className,
}: Readonly<{ label: string; tone?: ChipTone; icon?: ReactNode; size?: 'xs' | 'sm'; className?: string }>): ReactElement {
  const [bg, fg] = TONE[tone];
  return (
    <View
      className={cx('flex-row items-center self-start rounded-full', size === 'xs' ? 'px-2 py-0.5' : 'px-2.5 py-1', className)}
      style={{ backgroundColor: bg }}
    >
      {icon ? <View className="mr-1">{icon}</View> : null}
      <Text className={cx(size === 'xs' ? 'text-[11px]' : 'text-[12px]', 'font-bold')} style={{ color: fg }}>
        {label}
      </Text>
    </View>
  );
}
