// components/gs/RoundButton.tsx — circular icon button (map controls, headers).
import React, { type ReactElement, type ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import { gs } from '@/theme/colors';
import { cx, floatShadow, softShadow } from './styles';

export type RoundButtonProps = Readonly<{
  icon: ReactNode;
  onPress?: () => void;
  accessibilityLabel: string;
  variant?: 'white' | 'primary' | 'soft' | 'glass';
  size?: number;
  /** Small pink badge count (notifications). */
  badge?: number;
  floating?: boolean;
  className?: string;
}>;

export default function RoundButton({
  icon,
  onPress,
  accessibilityLabel,
  variant = 'white',
  size = 48,
  badge,
  floating = false,
  className,
}: RoundButtonProps): ReactElement {
  const bg =
    variant === 'primary'
      ? gs.violet
      : variant === 'soft'
        ? gs.violetSoft
        : variant === 'glass'
          ? 'rgba(255,255,255,0.92)'
          : gs.white;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      className={cx('items-center justify-center rounded-full', className)}
      style={[
        { width: size, height: size, backgroundColor: bg },
        floating ? floatShadow : variant === 'white' ? softShadow : null,
      ]}
    >
      {icon}
      {badge ? (
        <View
          className="absolute -right-0.5 -top-0.5 min-w-[20px] h-5 px-1 rounded-full items-center justify-center border-2 border-white"
          style={{ backgroundColor: gs.pink }}
        >
          <Text className="text-[11px] font-bold text-white">{badge > 99 ? '99+' : badge}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}
