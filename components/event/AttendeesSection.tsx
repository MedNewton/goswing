import React, { type ReactElement } from 'react';
import { View, Text } from 'react-native';
import Badge from '@/components/ui/Badge';

export default function AttendeesSection(): ReactElement {
  return (
    <View className="px-2 mt-6">
      <Text className="text-base font-semibold text-black">Attendees (420)</Text>
      <View className="mt-2 flex-row items-center flex-wrap gap-2">
        {['U1', 'U2', 'U3', 'U4', 'U5'].map((u) => (
          <Badge key={u} label={u} variant="soft" tone="gray" size="sm" />
        ))}
        <Text className="text-gray600 ml-1">and 415 others</Text>
      </View>
    </View>
  );
}
