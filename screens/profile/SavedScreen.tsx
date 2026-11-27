// screens/profile/SavedScreen.tsx — Saved (events, organizers, songs), opened from Profile.
import React, { type ReactElement } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import SavedPage from '@/components/sections/SavedPage';
import { useAppNav } from '@/navigation/AppNav';
import { PageHeader } from './components/ui';

export default function SavedScreen({ onBack }: Readonly<{ onBack: () => void }>): ReactElement {
  const { t } = useTranslation();
  const nav = useAppNav();
  const insets = useSafeAreaInsets();
  return (
    <View className="flex-1 bg-surface">
      <PageHeader title={t('profile.saved.title')} subtitle={t('profile.saved.subtitle')} onBack={onBack} />
      <SavedPage
        bottomInset={Math.max(insets.bottom, 16) + 24}
        onOpenEvent={(eventId) => nav.openEvent(eventId, 'about')}
        onOpenOrganizer={(p) => nav.push({ name: 'organizerProfile', organizerId: p.organizerId, organizerName: p.organizerName })}
      />
    </View>
  );
}
