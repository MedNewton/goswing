// screens/discover/PlacePage.tsx — place (venue) page.
// Foundation placeholder; the Discover area PR builds the real page.
import React, { type ReactElement } from 'react';
import { Text, View } from 'react-native';
import { ScreenHeader } from '@/components/gs';
import type { PlaceSeed } from '@/navigation/routes';

export default function PlacePage({ place, onBack }: Readonly<{ place: PlaceSeed; onBack: () => void }>): ReactElement {
  return (
    <View className="flex-1 bg-surface">
      <ScreenHeader onBack={onBack} title={place.name} large />
      {place.address ? <Text className="px-5 text-muted">{place.address}</Text> : null}
    </View>
  );
}
