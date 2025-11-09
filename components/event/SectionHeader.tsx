import React, { type ReactElement } from 'react';
import { View, Text, Pressable } from 'react-native';
import { Feather } from '@expo/vector-icons';

export default function SectionHeader({
  title,
  action,
  subtitle,
  onPressAction,
}: {
  title: string;
  action?: string;
  subtitle?: string | null;
  onPressAction?: () => void;
}): ReactElement {
  return (
    <View className="px-5 mt-6 flex-row items-start justify-between">
      <View className="flex-1 pr-3">
        <Text className="text-base font-semibold text-black">{title}</Text>
        {subtitle ? (
          <Text className="text-base font-semibold text-black mt-1">{subtitle}</Text>
        ) : null}
      </View>
      {action ? (
        <Pressable className="flex-row items-center" onPress={onPressAction}>
          <Text className="text-sm text-gray600 mr-1">{action}</Text>
          <Feather name="chevron-right" size={16} color="#6B7280" />
        </Pressable>
      ) : null}
    </View>
  );
}
