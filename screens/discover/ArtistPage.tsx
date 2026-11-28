// screens/discover/ArtistPage.tsx — artist page.
// Foundation placeholder; the Discover area PR builds the real page.
import React, { type ReactElement } from 'react';
import { View } from 'react-native';
import { ScreenHeader } from '@/components/gs';

export default function ArtistPage({
  artistName,
  onBack,
}: Readonly<{ artistId: string; artistName?: string; onBack: () => void }>): ReactElement {
  return (
    <View className="flex-1 bg-surface">
      <ScreenHeader onBack={onBack} title={artistName} large />
    </View>
  );
}
