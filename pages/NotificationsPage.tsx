// pages/NotificationsPage.tsx — notification inbox (bell). There is no inbox
// API yet, so it shows the empty state and a shortcut to the preferences.
import React, { type ReactElement } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { BellRing, SlidersHorizontal } from 'lucide-react-native';

import { gs } from '@/theme/colors';
import { EmptyState, RoundButton } from '@/components/gs';
import { useAppNav } from '@/navigation/AppNav';
import { PageHeader } from '@/screens/profile/components/ui';

export type NotificationsPageProps = Readonly<{
  onBack?: () => void;
}>;

export default function NotificationsPage({ onBack }: NotificationsPageProps): ReactElement {
  const { t } = useTranslation();
  const nav = useAppNav();
  const openPrefs = (): void => nav.push({ name: 'profileScreen', screen: 'notificationPrefs' });
  return (
    <View className="flex-1 bg-surface">
      <PageHeader
        title={t('notificationsPage.title')}
        onBack={onBack}
        right={
          <RoundButton
            icon={<SlidersHorizontal size={20} color={gs.ink} />}
            onPress={openPrefs}
            accessibilityLabel={t('profile.home.notificationsRow')}
            size={44}
          />
        }
      />
      <View className="flex-1 justify-center pb-24">
        <EmptyState
          icon={<BellRing size={28} color={gs.violet} />}
          title={t('notificationsPage.emptyTitle')}
          message={t('notificationsPage.emptySubtitle')}
          actionLabel={t('profile.notifPage.manage')}
          onAction={openPrefs}
        />
      </View>
    </View>
  );
}
