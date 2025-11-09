import React, { type ReactElement } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';

export default function QuickActions({
  subtleBackground = false,
}: {
  subtleBackground?: boolean;
}): ReactElement {
  return (
    <View
      className={[
        'rounded-3xl p-4 border',
        subtleBackground ? 'bg-gray100 border-gray200' : 'bg-white border-gray200',
      ].join(' ')}
    >
      <Text className="text-xl font-semibold text-gray900 mb-3">Quick Actions</Text>
      <View className="flex-row gap-x-3">
        <ActionPill icon="download" label="Download All" />
        <ActionPill icon="calendar" label="Sync Calendar" />
      </View>
    </View>
  );
}

function ActionPill({
  icon,
  label,
}: {
  icon: keyof typeof Feather.glyphMap;
  label: string;
}): ReactElement {
  return (
    <Pressable className="flex-1 h-12 rounded-2xl bg-white border border-gray300 flex-row items-center justify-center gap-x-2 active:opacity-90">
      <Feather name={icon} size={16} color="#111827" />
      <Text className="text-gray900">{label}</Text>
    </Pressable>
  );
}
