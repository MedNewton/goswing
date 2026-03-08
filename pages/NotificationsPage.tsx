// pages/NotificationsPage.tsx
import React, { type ReactElement } from 'react';
import { View, Text, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

export type NotificationsPageProps = Readonly<{
  onBack?: () => void;
}>;

export default function NotificationsPage({ onBack }: NotificationsPageProps): ReactElement {
  return (
    <SafeAreaView edges={['left', 'right']} className="flex-1 bg-white">
      <View className="px-5 py-3 flex-row items-center border-b border-gray200">
        <Pressable accessibilityRole="button" onPress={onBack} hitSlop={10} className="h-10 w-10 items-center justify-center">
          <Feather name="arrow-left" size={20} color="#111827" />
        </Pressable>
        <Text className="ml-2 text-lg font-semibold text-black">Notifications</Text>
      </View>

      <View className="flex-1 items-center justify-center px-6">
        <Feather name="bell" size={48} color="#D1D5DB" />
        <Text className="mt-4 text-lg font-semibold text-gray700">No notifications yet</Text>
        <Text className="mt-2 text-sm text-gray500 text-center">
          When you get notifications, they'll show up here.
        </Text>
      </View>
    </SafeAreaView>
  );
}
