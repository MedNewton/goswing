// components/gs/Pill.tsx — selectable chip (filters, categories, tabs).
import React, { type ReactElement, type ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import { gs } from '@/theme/colors';
import { cx, softShadow } from './styles';

export type PillProps = Readonly<{
  label: string;
  active?: boolean;
  onPress?: () => void;
  icon?: ReactNode;
  size?: 'sm' | 'md';
  /** Floating pills over the map get a shadow and no border. */
  floating?: boolean;
  disabled?: boolean;
  accessibilityLabel?: string;
}>;

export default function Pill({
  label,
  active = false,
  onPress,
  icon,
  size = 'md',
  floating = false,
  disabled = false,
  accessibilityLabel,
}: PillProps): ReactElement {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || !onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active, disabled }}
      accessibilityLabel={accessibilityLabel ?? label}
      style={[floating && !active ? softShadow : null, { opacity: disabled ? 0.5 : 1 }]}
      className={cx(
        'flex-row items-center rounded-full',
        size === 'sm' ? 'px-3.5 py-2' : 'px-[18px] py-2.5',
        active ? 'bg-violet' : 'bg-white',
        !active && !floating ? 'border border-line-strong' : null,
      )}
    >
      {icon ? <View className="mr-1.5">{icon}</View> : null}
      <Text
        className={cx(size === 'sm' ? 'text-[13px]' : 'text-[15px]', 'font-bold')}
        style={{ color: active ? gs.white : gs.ink }}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Pressable>
  );
}
