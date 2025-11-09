import React, { type ReactElement } from 'react';
import {
  Pressable,
  Text,
  View,
  ActivityIndicator,
  type PressableProps,
} from 'react-native';

type ButtonVariant = 'solid' | 'outline' | 'ghost';
type ButtonTone = 'brand' | 'gray' | 'success' | 'warning' | 'danger' | 'info';
type ButtonSize = 'sm' | 'md' | 'lg';

export type ButtonProps = Readonly<
  {
    title: string;
    variant?: ButtonVariant;
    tone?: ButtonTone;
    size?: ButtonSize;
    loading?: boolean;
    leading?: ReactElement | null;
    trailing?: ReactElement | null;
    className?: string;
    textClassName?: string;
  } & Omit<PressableProps, 'children'>
>;

const cx = (...classes: ReadonlyArray<string | null | undefined | false>): string =>
  classes.filter(Boolean).join(' ');

const sizeBase: Record<ButtonSize, { container: string; text: string; gap: string; icon: string }> = {
  sm: { container: 'h-9 px-3 rounded-lg', text: 'text-sm', gap: 'gap-x-1.5', icon: 'text-sm' },
  md: { container: 'h-10 px-4 rounded-xl', text: 'text-base', gap: 'gap-x-2', icon: 'text-base' },
  lg: { container: 'h-12 px-5 rounded-2xl', text: 'text-lg', gap: 'gap-x-2.5', icon: 'text-lg' },
};

const solid: Record<ButtonTone, { container: string; text: string; border: string; spinner: string }> = {
  brand:   { container: 'bg-brand',   text: 'text-white',  border: 'border-transparent', spinner: '#FFFFFF' },
  gray:    { container: 'bg-gray700', text: 'text-white',  border: 'border-transparent', spinner: '#FFFFFF' },
  success: { container: 'bg-success', text: 'text-white',  border: 'border-transparent', spinner: '#FFFFFF' },
  warning: { container: 'bg-warning', text: 'text-white',  border: 'border-transparent', spinner: '#FFFFFF' },
  danger:  { container: 'bg-danger',  text: 'text-white',  border: 'border-transparent', spinner: '#FFFFFF' },
  info:    { container: 'bg-info',    text: 'text-white',  border: 'border-transparent', spinner: '#FFFFFF' },
};

const outline: Record<ButtonTone, { container: string; text: string; border: string; spinner: string }> = {
  brand:   { container: 'bg-transparent', text: 'text-brand',   border: 'border-brand',   spinner: '#0EA5E9' },
  gray:    { container: 'bg-transparent', text: 'text-gray700', border: 'border-gray400', spinner: '#374151' },
  success: { container: 'bg-transparent', text: 'text-success', border: 'border-success', spinner: '#10B981' },
  warning: { container: 'bg-transparent', text: 'text-warning', border: 'border-warning', spinner: '#F59E0B' },
  danger:  { container: 'bg-transparent', text: 'text-danger',  border: 'border-danger',  spinner: '#EF4444' },
  info:    { container: 'bg-transparent', text: 'text-info',    border: 'border-info',    spinner: '#22C55E' },
};

const ghost: Record<ButtonTone, { container: string; text: string; border: string; spinner: string }> = {
  brand:   { container: 'bg-transparent', text: 'text-brand',   border: 'border-transparent', spinner: '#0EA5E9' },
  gray:    { container: 'bg-transparent', text: 'text-gray700', border: 'border-transparent', spinner: '#374151' },
  success: { container: 'bg-transparent', text: 'text-success', border: 'border-transparent', spinner: '#10B981' },
  warning: { container: 'bg-transparent', text: 'text-warning', border: 'border-transparent', spinner: '#F59E0B' },
  danger:  { container: 'bg-transparent', text: 'text-danger',  border: 'border-transparent', spinner: '#EF4444' },
  info:    { container: 'bg-transparent', text: 'text-info',    border: 'border-transparent', spinner: '#22C55E' },
};

const byVariant: Record<
  ButtonVariant,
  Record<ButtonTone, { container: string; text: string; border: string; spinner: string }>
> = {
  solid,
  outline,
  ghost,
};

export function Button({
  title,
  variant = 'solid',
  tone = 'brand',
  size = 'md',
  loading = false,
  leading,
  trailing,
  disabled,
  className,
  textClassName,
  ...rest
}: ButtonProps): ReactElement {
  const sizeTokens = sizeBase[size];
  const toneTokens = byVariant[variant][tone];
  const isDisabled = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!isDisabled, busy: !!loading }}
      disabled={isDisabled}
      {...rest}
      className={cx(
        'border flex-row items-center justify-center active:opacity-90',
        sizeTokens.container,
        toneTokens.container,
        toneTokens.border,
        isDisabled ? 'opacity-60' : '',
        className
      )}
    >
      <View className={cx('flex-row items-center', sizeTokens.gap)}>
        {loading ? (
          <ActivityIndicator size="small" color={toneTokens.spinner} />
        ) : leading ? (
          <View className={cx(sizeTokens.icon)}>{leading}</View>
        ) : null}

        <Text className={cx('font-bold', sizeTokens.text, toneTokens.text, textClassName)}>
          {title}
        </Text>

        {!loading && trailing ? <View className={cx(sizeTokens.icon)}>{trailing}</View> : null}
      </View>
    </Pressable>
  );
}

export default Button;
