import React, { type ReactElement, memo } from 'react';
import {
  ScrollView,
  View,
  Text,
  Pressable,
  type PressableProps,
  type AccessibilityRole,
} from 'react-native';

type TabsVariant = 'underline' | 'pill';
type TabsSize = 'sm' | 'md' | 'lg';

export type TabItem = Readonly<{
  key: string;
  label: string;
  icon?: ReactElement | null;
  disabled?: boolean;
}>;

export type TabsProps = Readonly<{
  items: ReadonlyArray<TabItem>;
  activeKey: string;
  onChange: (key: string) => void;
  variant?: TabsVariant;
  size?: TabsSize;
  scrollable?: boolean;
  className?: string;
  tabClassName?: string;
  labelClassName?: string;
}>;

const cx = (...classes: ReadonlyArray<string | null | undefined | false>): string =>
  classes.filter(Boolean).join(' ');

const sizeTokens: Record<TabsSize, { padX: string; padY: string; text: string; gap: string; radius: string }> = {
  sm: { padX: 'px-3', padY: 'py-1.5', text: 'text-sm', gap: 'gap-x-1.5', radius: 'rounded-lg' },
  md: { padX: 'px-4', padY: 'py-2',   text: 'text-base', gap: 'gap-x-2', radius: 'rounded-xl' },
  lg: { padX: 'px-5', padY: 'py-2.5', text: 'text-lg', gap: 'gap-x-2.5', radius: 'rounded-2xl' },
};

const TabButton = memo(function TabButton({
  item,
  isActive,
  variant,
  size,
  onPress,
  tabClassName,
  labelClassName,
}: {
  item: TabItem;
  isActive: boolean;
  variant: TabsVariant;
  size: TabsSize;
  onPress: () => void;
  tabClassName?: string;
  labelClassName?: string;
}): ReactElement {
  const tokens = sizeTokens[size];
  const role: AccessibilityRole = 'tab';

  const base =
    variant === 'pill'
      ? cx(
          tokens.padX,
          tokens.padY,
          tokens.radius,
          'border',
          isActive ? 'bg-brand border-brand text-white' : 'bg-transparent border-border'
        )
      :
        cx(
          tokens.padX,
          tokens.padY,
          'border-b-2',
          isActive ? 'border-brand' : 'border-transparent'
        );

  const textCls =
    variant === 'pill'
      ? cx('font-medium', tokens.text, isActive ? 'text-white' : 'text-gray700', labelClassName)
      : cx('font-medium', tokens.text, isActive ? 'text-brand' : 'text-gray700', labelClassName);

  return (
    <Pressable
      accessibilityRole={role}
      accessibilityState={{ selected: isActive, disabled: !!item.disabled }}
      disabled={item.disabled}
      onPress={onPress}
      className={cx('flex-row items-center', tokens.gap, base, item.disabled ? 'opacity-50' : '', tabClassName)}
    >
      {item.icon ? <View className={cx(isActive ? '' : 'opacity-90')}>{item.icon}</View> : null}
      <Text className={textCls}>{item.label}</Text>
    </Pressable>
  );
});

export function Tabs({
  items,
  activeKey,
  onChange,
  variant = 'underline',
  size = 'md',
  scrollable = true,
  className,
  tabClassName,
  labelClassName,
}: TabsProps): ReactElement {
  const role: AccessibilityRole = 'tablist';

  const content = (
    <View className={cx('flex-row items-center', variant === 'underline' ? 'gap-x-4' : 'gap-x-2', className)} accessibilityRole={role}>
      {items.map((it) => (
        <TabButton
          key={it.key}
          item={it}
          isActive={it.key === activeKey}
          size={size}
          variant={variant}
          tabClassName={tabClassName}
          labelClassName={labelClassName}
          onPress={() => onChange(it.key)}
        />
      ))}
    </View>
  );

  if (scrollable) {
    return (
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="px-1">
        {content}
      </ScrollView>
    );
  }

  return content;
}

export default Tabs;
