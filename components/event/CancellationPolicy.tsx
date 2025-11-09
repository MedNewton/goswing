import React, { type ReactElement } from 'react';
import { View, Text } from 'react-native';
import { Feather } from '@expo/vector-icons';

export default function CancellationPolicy(): ReactElement {
  return (
    <View className="px-2 mt-6">
      <View className="flex-row items-center gap-x-2">
        <Feather name="shield" size={16} color="#6B7280" />
        <Text className="text-base font-semibold text-black">Cancellation & Refund Policy</Text>
      </View>
      <View className="mt-2 gap-y-2">
        {[
          'Free cancellation up to 48 hours before the event',
          '50% refund for cancellations 24–48 hours before',
          'No refund for cancellations within 24 hours',
          'Event cancellation by organizer: Full refund guaranteed',
          'Weather-related cancellations: Reschedule or full refund',
        ].map((line) => (
          <Text key={line} className="text-gray700">• {line}</Text>
        ))}
      </View>
    </View>
  );
}
