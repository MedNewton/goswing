// components/gs/GsButton.tsx — primary / secondary / soft / danger buttons.
import React, { type ReactElement, type ReactNode } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { gs } from '@/theme/colors';
import { cx } from './styles';

export type GsButtonVariant = 'primary' | 'secondary' | 'soft' | 'danger' | 'ghost';

const STYLES: Readonly<Record<GsButtonVariant, { box: string; text: string; spinner: string }>> = {
  primary: { box: 'bg-violet', text: gs.white, spinner: gs.white },
  secondary: { box: 'bg-white border border-line-strong', text: gs.ink, spinner: gs.ink },
  soft: { box: 'bg-violet-soft', text: gs.violetDark, spinner: gs.violet },
  danger: { box: 'bg-white border border-line-strong', text: gs.danger, spinner: gs.danger },
  ghost: { box: 'bg-transparent', text: gs.violet, spinner: gs.violet },
};

export type GsButtonProps = Readonly<{
  label: string;
  onPress?: () => void;
  variant?: GsButtonVariant;
  size?: 'sm' | 'md' | 'lg';
  icon?: ReactNode;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  className?: string;
}>;

export default function GsButton({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  icon,
  loading = false,
  disabled = false,
  fullWidth = false,
  className,
}: GsButtonProps): ReactElement {
  const s = STYLES[variant];
  const off = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={off}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: off, busy: loading }}
      style={{ opacity: disabled ? 0.45 : 1 }}
      className={cx(
        'flex-row items-center justify-center rounded-full',
        size === 'sm' ? 'h-9 px-4' : size === 'lg' ? 'h-14 px-6' : 'h-12 px-5',
        fullWidth ? 'self-stretch' : null,
        s.box,
        className,
      )}
    >
      {loading ? (
        <ActivityIndicator color={s.spinner} />
      ) : (
        <>
          {icon ? <View className="mr-2">{icon}</View> : null}
          <Text
            className={cx(size === 'sm' ? 'text-[13px]' : size === 'lg' ? 'text-[17px]' : 'text-[15px]', 'font-bold')}
            style={{ color: s.text }}
            numberOfLines={1}
          >
            {label}
          </Text>
        </>
      )}
    </Pressable>
  );
}
