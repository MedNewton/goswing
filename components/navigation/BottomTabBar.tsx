import React, { memo, type ReactElement } from 'react';
import { View, Text, Pressable, type ViewProps } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export type BottomTabKey = 'home' | 'search' | 'saved' | 'reservations' | 'profile';

export type BottomTabItem = Readonly<{
  key: BottomTabKey;
  label: string;
  icon: keyof typeof Feather.glyphMap;
}>;

export type BottomTabBarProps = Readonly<
  {
    activeKey: BottomTabKey;
    onChange: (key: BottomTabKey) => void;
    items?: ReadonlyArray<BottomTabItem>;
    className?: string;
  } & Omit<ViewProps, 'children'>
>;

const cx = (...c: ReadonlyArray<string | null | undefined | false>): string =>
  c.filter(Boolean).join(' ');

const defaultItems: ReadonlyArray<BottomTabItem> = [
  { key: 'home',         label: 'Home',         icon: 'home' },
  { key: 'search',       label: 'Search',       icon: 'search' },
  { key: 'saved',        label: 'Saved',        icon: 'heart' },
  { key: 'reservations', label: 'Reservations', icon: 'calendar' },
  { key: 'profile',      label: 'Profile',      icon: 'user' },
] as const;

function TabButton({
  item,
  selected,
  onPress,
}: {
  item: BottomTabItem;
  selected: boolean;
  onPress: () => void;
}): ReactElement {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      className="flex-1 items-center justify-center gap-y-1 py-2"
      android_ripple={{ color: '#E5E7EB', borderless: true }}
    >
      <Feather name={item.icon} size={22} color={selected ? '#0B1220' : '#6B7280'} />
      <Text className={selected ? 'text-xs text-black font-medium' : 'text-xs text-gray500'}>
        {item.label}
      </Text>
    </Pressable>
  );
}

/**
 * Absolute, safe-area aware bottom bar that overlays content.
 * Place it as the last element inside the screen container.
 */
export default memo(function BottomTabBar({
  activeKey,
  onChange,
  items = defaultItems,
  className,
  ...rest
}: BottomTabBarProps): ReactElement {
  const insets = useSafeAreaInsets();
  const bottomPad = Math.max(insets.bottom, 6);

  return (
    <View
      pointerEvents="box-none"
      className="absolute inset-x-0 bottom-0"
    >
      <View
        {...rest}
        className={cx(
          'border-t border-gray200 bg-white flex-row items-center',
          className
        )}
        style={{ paddingBottom: bottomPad }}
      >
        {items.map((it) => (
          <TabButton
            key={it.key}
            item={it}
            selected={it.key === activeKey}
            onPress={() => onChange(it.key)}
          />
        ))}
      </View>
    </View>
  );
});
