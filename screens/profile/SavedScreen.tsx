// screens/profile/SavedScreen.tsx — Saved (events, organizers…), opened from Profile.
// Foundation: the existing saved page under a back header. The Profile area PR
// replaces it.
import React, { type ReactElement } from 'react';
import { View } from 'react-native';
import SavedPage from '@/components/sections/SavedPage';
import { ScreenHeader } from '@/components/gs';
import { useAppNav } from '@/navigation/AppNav';

export default function SavedScreen({ onBack }: Readonly<{ onBack: () => void }>): ReactElement {
  const nav = useAppNav();
  return (
    <View className="flex-1 bg-surface">
      <ScreenHeader onBack={onBack} />
      <SavedPage
        onOpenEvent={(eventId) => nav.openEvent(eventId, 'about')}
        onOpenOrganizer={(p) => nav.push({ name: 'organizerProfile', organizerId: p.organizerId, organizerName: p.organizerName })}
      />
    </View>
  );
}
