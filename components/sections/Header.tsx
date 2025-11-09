// components/sections/Header.tsx
import React, { type ReactElement } from 'react';
import { View, Text, Pressable, type ViewProps } from 'react-native';
import { Feather } from '@expo/vector-icons';

export type HeaderProps = Readonly<
  {
    userName: string;           // e.g., "Demo User"
    greeting?: string;          // e.g., "Good evening"
    locationLabel: string;      // e.g., "New York, NY"
    onPressNotifications?: () => void;
    onPressLocation?: () => void;
    className?: string;
  } & Omit<ViewProps, 'children'>
>;

const cx = (...classes: ReadonlyArray<string | null | undefined | false>): string =>
  classes.filter(Boolean).join(' ');

/**
 * Header layout (per mock):
 * Line 1:  "Good evening, Demo User" (large)      [bell icon on the right]
 * Line 2:  [pin icon] "New York, NY" (muted)
 */
export default function Header({
  userName,
  greeting = 'Good evening',
  locationLabel,
  onPressNotifications,
  onPressLocation,
  className,
  ...rest
}: HeaderProps): ReactElement {
  return (
    <View
      {...rest}
      className={cx('w-full px-6 pt-6 pb-2', className)}
    >
      {/* Top row: title + bell */}
      <View className="flex-row items-center justify-between">
        <Text className="text-3xl font-bold text-black flex-1 pr-4" numberOfLines={2}>
          {greeting}, {userName}
        </Text>

        <Pressable
          accessibilityRole="button"
          onPress={onPressNotifications}
          hitSlop={12}
          className="h-8 w-8 items-center justify-center rounded-full active:opacity-80"
        >
          <Feather name="bell" size={22} color="#111827" />
        </Pressable>
      </View>

      {/* Location row */}
      <Pressable
        accessibilityRole="button"
        onPress={onPressLocation}
        hitSlop={6}
        className="mt-3 flex-row items-center gap-x-2 self-start"
      >
        <Feather name="map-pin" size={18} color="#6B7280" />
        <Text className="text-base text-gray600">{locationLabel}</Text>
      </Pressable>
    </View>
  );
}
