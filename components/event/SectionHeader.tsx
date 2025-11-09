import React, { type ReactElement } from 'react';
import { View, Text } from 'react-native';
import { Feather } from '@expo/vector-icons';

export default function SectionHeader({
  title,
  action,
  subtitle,
}: {
  title: string;
  action?: string;
  subtitle?: string | null;
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
        <View className="flex-row items-center">
          <Text className="text-sm text-gray600 mr-1">{action}</Text>
          <Feather name="chevron-right" size={16} color="#6B7280" />
        </View>
      ) : null}
    </View>
  );
}
