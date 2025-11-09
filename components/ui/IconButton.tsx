// src/components/ui/IconButton.tsx
import React, { type ReactElement } from 'react';
import {
  Pressable,
  View,
  ActivityIndicator,
  type PressableProps,
  type AccessibilityRole,
} from 'react-native';

type IconButtonVariant = 'solid' | 'outline' | 'ghost';
type IconButtonTone = 'brand' | 'gray' | 'success' | 'warning' | 'danger' | 'info';
type IconButtonSize = 'sm' | 'md' | 'lg';

export type IconButtonProps = Readonly<
  {
    icon: ReactElement;               // pass an icon React element (e.g., from @expo/vector-icons)
    variant?: IconButtonVariant;
    tone?: IconButtonTone;
    size?: IconButtonSize;
    loading?: boolean;
    round?: boolean;                  // if false, uses rounded-xl instead of full circle
    className?: string;
    accessibilityLabel: string;       // required for a11y
  } & Omit<PressableProps, 'children' | 'accessibilityRole'>
>;

const cx = (...classes: ReadonlyArray<string | null | undefined | false>): string =>
  classes.filter(Boolean).join(' ');

// size tokens
const sizeBase: Record<
  IconButtonSize,
  { box: string; icon: string; spinner: 'small' | 'large' }
> = {
  sm: { box: 'h-9 w-9', icon: 'text-base', spinner: 'small' },
  md: { box: 'h-10 w-10', icon: 'text-lg', spinner: 'small' },
  lg: { box: 'h-12 w-12', icon: 'text-xl', spinner: 'large' },
};

// color recipes
const solid: Record<IconButtonTone, { container: string; border: string; icon: string; spinner: string }> = {
  brand:   { container: 'bg-brand',   border: 'border-transparent', icon: 'text-white',  spinner: '#FFFFFF' },
  gray:    { container: 'bg-gray700', border: 'border-transparent', icon: 'text-white',  spinner: '#FFFFFF' },
  success: { container: 'bg-success', border: 'border-transparent', icon: 'text-white',  spinner: '#FFFFFF' },
  warning: { container: 'bg-warning', border: 'border-transparent', icon: 'text-white',  spinner: '#FFFFFF' },
  danger:  { container: 'bg-danger',  border: 'border-transparent', icon: 'text-white',  spinner: '#FFFFFF' },
  info:    { container: 'bg-info',    border: 'border-transparent', icon: 'text-white',  spinner: '#FFFFFF' },
};

const outline: Record<IconButtonTone, { container: string; border: string; icon: string; spinner: string }> = {
  brand:   { container: 'bg-transparent', border: 'border-brand',   icon: 'text-brand',   spinner: '#0EA5E9' },
  gray:    { container: 'bg-transparent', border: 'border-gray400', icon: 'text-gray700', spinner: '#374151' },
  success: { container: 'bg-transparent', border: 'border-success', icon: 'text-success', spinner: '#10B981' },
  warning: { container: 'bg-transparent', border: 'border-warning', icon: 'text-warning', spinner: '#F59E0B' },
  danger:  { container: 'bg-transparent', border: 'border-danger',  icon: 'text-danger',  spinner: '#EF4444' },
  info:    { container: 'bg-transparent', border: 'border-info',    icon: 'text-info',    spinner: '#22C55E' },
};

const ghost: Record<IconButtonTone, { container: string; border: string; icon: string; spinner: string }> = {
  brand:   { container: 'bg-transparent', border: 'border-transparent', icon: 'text-brand',   spinner: '#0EA5E9' },
  gray:    { container: 'bg-transparent', border: 'border-transparent', icon: 'text-gray700', spinner: '#374151' },
  success: { container: 'bg-transparent', border: 'border-transparent', icon: 'text-success', spinner: '#10B981' },
  warning: { container: 'bg-transparent', border: 'border-transparent', icon: 'text-warning', spinner: '#F59E0B' },
  danger:  { container: 'bg-transparent', border: 'border-transparent', icon: 'text-danger',  spinner: '#EF4444' },
  info:    { container: 'bg-transparent', border: 'border-transparent', icon: 'text-info',    spinner: '#22C55E' },
};

const byVariant: Record<
  IconButtonVariant,
  Record<IconButtonTone, { container: string; border: string; icon: string; spinner: string }>
> = { solid, outline, ghost };

export function IconButton({
  icon,
  variant = 'ghost',
  tone = 'brand',
  size = 'md',
  loading = false,
  disabled,
  round = true,
  className,
  accessibilityLabel,
  ...rest
}: IconButtonProps): ReactElement {
  const sizeTokens = sizeBase[size];
  const toneTokens = byVariant[variant][tone];
  const isDisabled = disabled || loading;
  const role: AccessibilityRole = 'button';

  return (
    <Pressable
      accessibilityRole={role}
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: !!isDisabled, busy: !!loading }}
      disabled={isDisabled}
      {...rest}
      className={cx(
        'border items-center justify-center active:opacity-90',
        sizeTokens.box,
        toneTokens.container,
        toneTokens.border,
        round ? 'rounded-full' : 'rounded-xl',
        isDisabled ? 'opacity-60' : '',
        className
      )}
    >
      {loading ? (
        <ActivityIndicator size={sizeTokens.spinner} color={toneTokens.spinner} />
      ) : (
        <View className={toneTokens.icon}>{icon}</View>
      )}
    </Pressable>
  );
}

export default IconButton;
