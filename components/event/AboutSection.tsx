import React, { type ReactElement } from 'react';
import { View, Text } from 'react-native';

export default function AboutSection(): ReactElement {
  return (
    <View className="px-2 mt-4">
      <Text className="text-base font-semibold text-black">About This Event</Text>
      <Text className="text-gray700 mt-2">
        Experience the underground techno scene with international DJs in Paris&apos; most iconic club venue.
      </Text>

      <Text className="text-sm font-semibold text-black mt-4">What&apos;s Included</Text>
      <View className="mt-2 gap-y-1">
        {[
          'Live performances by 5+ artists',
          'Food and beverage vendors',
          'Free WiFi throughout venue',
          'Professional sound and lighting',
        ].map((t) => (
          <Text key={t} className="text-gray700">• {t}</Text>
        ))}
      </View>
    </View>
  );
}
