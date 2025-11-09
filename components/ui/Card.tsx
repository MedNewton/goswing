// src/components/ui/Card.tsx
import React, { type ReactElement, type PropsWithChildren } from 'react';
import { View, Text, type ViewProps } from 'react-native';

type CardVariant = 'flat' | 'elevated' | 'outlined';
type CardPadding = 'none' | 'sm' | 'md' | 'lg';

export type CardProps = Readonly<
  {
    variant?: CardVariant;
    padding?: CardPadding;   // default padding for body area
    className?: string;      // container classes
  } & ViewProps
>;

export type CardSectionProps = Readonly<
  PropsWithChildren<{
    className?: string;
  }> &
    ViewProps
>;

export type CardTitleProps = Readonly<
  PropsWithChildren<{
    className?: string;
  }> &
    ViewProps
>;

export type CardSubtitleProps = Readonly<
  PropsWithChildren<{
    className?: string;
  }> &
    ViewProps
>;

const cx = (...classes: ReadonlyArray<string | null | undefined | false>): string =>
  classes.filter(Boolean).join(' ');

const variantBase: Record<CardVariant, string> = {
  flat: 'bg-white border border-border',
  outlined: 'bg-white border-2 border-border',
  elevated: 'bg-white border border-border shadow-sm',
};

const padMap: Record<CardPadding, string> = {
  none: 'p-0',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6',
};

export function Card({
  variant = 'flat',
  padding = 'md',
  className,
  children,
  ...rest
}: CardProps): ReactElement {
  return (
    <View
      {...rest}
      className={cx('rounded-2xl', variantBase[variant], className)}
    >
      <View className={padMap[padding]}>{children}</View>
    </View>
  );
}

export function CardHeader({ className, children, ...rest }: CardSectionProps): ReactElement {
  return (
    <View {...rest} className={cx('mb-3', className)}>
      {children}
    </View>
  );
}

export function CardTitle({ className, children, ...rest }: CardTitleProps): ReactElement {
  return (
    <Text {...rest} className={cx('text-lg font-bold text-black', className)}>
      {children}
    </Text>
  );
}

export function CardSubtitle({ className, children, ...rest }: CardSubtitleProps): ReactElement {
  return (
    <Text {...rest} className={cx('text-sm text-gray600', className)}>
      {children}
    </Text>
  );
}

export function CardContent({ className, children, ...rest }: CardSectionProps): ReactElement {
  return (
    <View {...rest} className={cx('gap-y-2', className)}>
      {children}
    </View>
  );
}

export function CardFooter({ className, children, ...rest }: CardSectionProps): ReactElement {
  return (
    <View {...rest} className={cx('mt-4', className)}>
      {children}
    </View>
  );
}

const Exported = Object.assign(Card, {
  Header: CardHeader,
  Title: CardTitle,
  Subtitle: CardSubtitle,
  Content: CardContent,
  Footer: CardFooter,
});

export default Exported;
