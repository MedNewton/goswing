// src/components/ui/Chip.tsx
import React, { type ReactElement } from 'react';
import { Pressable, Text, View, type PressableProps } from 'react-native';

type ChipVariant = 'soft' | 'solid' | 'outline';
type ChipTone = 'brand' | 'gray' | 'success' | 'warning' | 'danger' | 'info';
type ChipSize = 'sm' | 'md';

export type ChipProps = Readonly<
  {
    label: string;
    selected?: boolean;
    variant?: ChipVariant;
    tone?: ChipTone;
    size?: ChipSize;
    leading?: ReactElement | null;
    trailing?: ReactElement | null;
    className?: string;      // container classes
    labelClassName?: string; // text classes
  } & Omit<PressableProps, 'children'>
>;

const cx = (...classes: ReadonlyArray<string | null | undefined | false>): string =>
  classes.filter(Boolean).join(' ');

const sizeMap: Record<ChipSize, { container: string; text: string; gap: string; icon: string }> = {
  sm: { container: 'h-9 px-3 rounded-full', text: 'text-sm', gap: 'gap-x-1.5', icon: 'text-sm' },
  md: { container: 'h-10 px-4 rounded-full', text: 'text-base', gap: 'gap-x-2', icon: 'text-base' },
};

type StyleTriplet = { container: string; border: string; text: string };

type VariantDict = Record<
  ChipTone,
  {
    selected: StyleTriplet;
    unselected: StyleTriplet;
  }
>;

const soft: VariantDict = {
  brand: {
    selected:   { container: 'bg-brand-light', border: 'border-brand',     text: 'text-brand-dark' },
    unselected: { container: 'bg-gray100',     border: 'border-gray100',   text: 'text-gray700' },
  },
  gray: {
    selected:   { container: 'bg-gray200',     border: 'border-gray300',   text: 'text-gray800' },
    unselected: { container: 'bg-gray100',     border: 'border-gray100',   text: 'text-gray700' },
  },
  success: {
    selected:   { container: 'bg-success/20',  border: 'border-success/30', text: 'text-success' },
    unselected: { container: 'bg-gray100',     border: 'border-gray100',    text: 'text-gray700' },
  },
  warning: {
    selected:   { container: 'bg-warning/20',  border: 'border-warning/30', text: 'text-warning' },
    unselected: { container: 'bg-gray100',     border: 'border-gray100',    text: 'text-gray700' },
  },
  danger: {
    selected:   { container: 'bg-danger/20',   border: 'border-danger/30',  text: 'text-danger' },
    unselected: { container: 'bg-gray100',     border: 'border-gray100',    text: 'text-gray700' },
  },
  info: {
    selected:   { container: 'bg-info/20',     border: 'border-info/30',    text: 'text-info' },
    unselected: { container: 'bg-gray100',     border: 'border-gray100',    text: 'text-gray700' },
  },
};

const solid: VariantDict = {
  brand: {
    selected:   { container: 'bg-brand',    border: 'border-brand',    text: 'text-white' },
    unselected: { container: 'bg-gray200',  border: 'border-gray200',  text: 'text-gray800' },
  },
  gray: {
    selected:   { container: 'bg-gray700',  border: 'border-gray700',  text: 'text-white' },
    unselected: { container: 'bg-gray200',  border: 'border-gray200',  text: 'text-gray800' },
  },
  success: {
    selected:   { container: 'bg-success',  border: 'border-success',  text: 'text-white' },
    unselected: { container: 'bg-gray200',  border: 'border-gray200',  text: 'text-gray800' },
  },
  warning: {
    selected:   { container: 'bg-warning',  border: 'border-warning',  text: 'text-white' },
    unselected: { container: 'bg-gray200',  border: 'border-gray200',  text: 'text-gray800' },
  },
  danger: {
    selected:   { container: 'bg-danger',   border: 'border-danger',   text: 'text-white' },
    unselected: { container: 'bg-gray200',  border: 'border-gray200',  text: 'text-gray800' },
  },
  info: {
    selected:   { container: 'bg-info',     border: 'border-info',     text: 'text-white' },
    unselected: { container: 'bg-gray200',  border: 'border-gray200',  text: 'text-gray800' },
  },
};

const outline: VariantDict = {
  brand: {
    selected:   { container: 'bg-brand-light', border: 'border-brand',   text: 'text-brand-dark' },
    unselected: { container: 'bg-transparent',  border: 'border-brand',   text: 'text-brand' },
  },
  gray: {
    selected:   { container: 'bg-gray100',     border: 'border-gray400', text: 'text-gray800' },
    unselected: { container: 'bg-transparent',  border: 'border-gray400', text: 'text-gray700' },
  },
  success: {
    selected:   { container: 'bg-success/15',  border: 'border-success', text: 'text-success' },
    unselected: { container: 'bg-transparent',  border: 'border-success', text: 'text-success' },
  },
  warning: {
    selected:   { container: 'bg-warning/15',  border: 'border-warning', text: 'text-warning' },
    unselected: { container: 'bg-transparent',  border: 'border-warning', text: 'text-warning' },
  },
  danger: {
    selected:   { container: 'bg-danger/15',   border: 'border-danger',  text: 'text-danger' },
    unselected: { container: 'bg-transparent',  border: 'border-danger',  text: 'text-danger' },
  },
  info: {
    selected:   { container: 'bg-info/15',     border: 'border-info',    text: 'text-info' },
    unselected: { container: 'bg-transparent',  border: 'border-info',    text: 'text-info' },
  },
};

const byVariant: Record<ChipVariant, VariantDict> = { soft, solid, outline };

export function Chip({
  label,
  selected = false,
  variant = 'soft',
  tone = 'brand',
  size = 'md',
  disabled,
  leading,
  trailing,
  className,
  labelClassName,
  ...rest
}: ChipProps): ReactElement {
  const sizeTokens = sizeMap[size];
  const toneTokens = byVariant[variant][tone][selected ? 'selected' : 'unselected'];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected, disabled: !!disabled }}
      disabled={disabled}
      {...rest}
      className={cx(
        'border flex-row items-center',
        sizeTokens.container,
        sizeTokens.gap,
        toneTokens.container,
        toneTokens.border,
        disabled ? 'opacity-60' : 'active:opacity-90',
        className
      )}
    >
      {leading ? <View className={sizeTokens.icon}>{leading}</View> : null}
      <Text className={cx('font-medium', sizeTokens.text, toneTokens.text, labelClassName)}>
        {label}
      </Text>
      {trailing ? <View className={sizeTokens.icon}>{trailing}</View> : null}
    </Pressable>
  );
}

export default Chip;
