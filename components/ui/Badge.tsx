// src/components/ui/Badge.tsx
import React, { type ReactElement } from 'react';
import { Text, View, type ViewProps } from 'react-native';

type BadgeVariant = 'solid' | 'soft' | 'outline';
type BadgeTone = 'brand' | 'gray' | 'success' | 'warning' | 'danger' | 'info';
type BadgeSize = 'sm' | 'md';

export type BadgeProps = Readonly<
  {
    variant?: BadgeVariant;
    tone?: BadgeTone;
    size?: BadgeSize;
    label: string;
    className?: string;      // NativeWind classes for container
    textClassName?: string;  // optional text override
  } & Omit<ViewProps, 'children'>
>;

const cx = (...classes: ReadonlyArray<string | null | undefined | false>): string =>
  classes.filter(Boolean).join(' ');

// size tokens
const sizeBase: Record<BadgeSize, { container: string; text: string }> = {
  sm: { container: 'px-2 py-0.5 rounded-full', text: 'text-xs' },
  md: { container: 'px-2.5 py-1 rounded-full', text: 'text-sm' },
};

// color recipes per variant/tone
const solid: Record<BadgeTone, { container: string; text: string; border: string }> = {
  brand:   { container: 'bg-brand',       text: 'text-white',  border: 'border-transparent' },
  gray:    { container: 'bg-gray600',     text: 'text-white',  border: 'border-transparent' },
  success: { container: 'bg-success',     text: 'text-white',  border: 'border-transparent' },
  warning: { container: 'bg-warning',     text: 'text-white',  border: 'border-transparent' },
  danger:  { container: 'bg-danger',      text: 'text-white',  border: 'border-transparent' },
  info:    { container: 'bg-info',        text: 'text-white',  border: 'border-transparent' },
};

const soft: Record<BadgeTone, { container: string; text: string; border: string }> = {
  brand:   { container: 'bg-brand-light',  text: 'text-brand-dark',  border: 'border-brand-light' },
  gray:    { container: 'bg-gray100',      text: 'text-gray700',     border: 'border-gray100' },
  success: { container: 'bg-success/15',   text: 'text-success',     border: 'border-success/15' },
  warning: { container: 'bg-warning/15',   text: 'text-warning',     border: 'border-warning/15' },
  danger:  { container: 'bg-danger/15',    text: 'text-danger',      border: 'border-danger/15' },
  info:    { container: 'bg-info/15',      text: 'text-info',        border: 'border-info/15' },
};

const outline: Record<BadgeTone, { container: string; text: string; border: string }> = {
  brand:   { container: 'bg-transparent', text: 'text-brand',   border: 'border-brand' },
  gray:    { container: 'bg-transparent', text: 'text-gray700', border: 'border-gray300' },
  success: { container: 'bg-transparent', text: 'text-success', border: 'border-success' },
  warning: { container: 'bg-transparent', text: 'text-warning', border: 'border-warning' },
  danger:  { container: 'bg-transparent', text: 'text-danger',  border: 'border-danger' },
  info:    { container: 'bg-transparent', text: 'text-info',    border: 'border-info' },
};

const byVariant: Record<
  BadgeVariant,
  Record<BadgeTone, { container: string; text: string; border: string }>
> = {
  solid,
  soft,
  outline,
};

export function Badge({
  variant = 'soft',
  tone = 'brand',
  size = 'sm',
  label,
  className,
  textClassName,
  ...rest
}: BadgeProps): ReactElement {
  const sizeTokens = sizeBase[size];
  const toneTokens = byVariant[variant][tone];

  return (
    <View
      accessibilityRole="text"
      {...rest}
      className={cx(
        'border items-center justify-center self-start',
        sizeTokens.container,
        toneTokens.container,
        toneTokens.border,
        className
      )}
    >
      <Text
        className={cx('font-medium', sizeTokens.text, toneTokens.text, textClassName)}
        numberOfLines={1}
      >
        {label}
      </Text>
    </View>
  );
}

export default Badge;
