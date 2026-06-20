// pages/ProfilePage.tsx
import React, { useState, type ReactElement } from 'react';
import {
  View,
  Text,
  Image,
  Pressable,
  Switch,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useClerk } from '@clerk/clerk-expo';
import { useTranslation } from 'react-i18next';

import { useProfile, useSettings } from '@/hooks/profile';
import { useLanguage } from '@/lib/i18n/useLanguage';

import AccountSettingsPage from '@/pages/AccountSettingsPage';
import PaymentMethodsPage from '@/pages/PaymentMethodsPage';
import NotificationPreferencesPage from '@/pages/NotificationPreferencesPage';
import MyReviewsPage from '@/pages/MyReviewsPage';
import PrivacySecurityPage from '@/pages/Privacysecuritypage';
import HelpSupportPage from '@/pages/Helpsupportpage';
import TermsConditionsPage from '@/pages/Termsconditionspage';
import EditProfilePage from '@/pages/Editprofilepage';
import SocialProfilePage from '@/pages/social/SocialProfilePage';

const ONBOARDING_FLAG = '@gs:onboardPending';

const cx = (...c: ReadonlyArray<string | null | undefined | false>) =>
  c.filter(Boolean).join(' ');

type ProfileRoute =
  | { name: 'root' }
  | { name: 'accountSettings' }
  | { name: 'paymentMethods' }
  | { name: 'notificationPreferences' }
  | { name: 'myReviews' }
  | { name: 'privacySecurity' }
  | { name: 'helpSupport' }
  | { name: 'termsConditions' }
  | { name: 'editProfile' }
  | { name: 'socialProfile' };

type ProfilePageProps = Readonly<{
  onNavigateToReservations?: (tab: 'active' | 'past') => void;
  onNavigateToSaved?: () => void;
}>;

type RowProps = {
  icon: keyof typeof Feather.glyphMap;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  showChevron?: boolean;
};

function SettingsRow({
  icon,
  title,
  subtitle,
  onPress,
  showChevron = true,
}: RowProps): ReactElement {
  return (
    <Pressable
      onPress={onPress}
      className="px-5 py-4 flex-row items-center justify-between active:opacity-95"
    >
      <View className="flex-row items-center gap-x-3">
        <Feather name={icon} size={18} color="#111827" />
        <View>
          <Text className="text-gray900 font-medium">{title}</Text>
          {subtitle ? <Text className="text-xs text-gray500 mt-0.5">{subtitle}</Text> : null}
        </View>
      </View>
      {showChevron ? <Feather name="chevron-right" size={18} color="#9CA3AF" /> : null}
    </Pressable>
  );
}

function Chip({ label }: { label: string }): ReactElement {
  return (
    <View className="px-3 py-1.5 rounded-full bg-gray100 border border-gray200">
      <Text className="text-xs text-gray700">{label}</Text>
    </View>
  );
}

function Divider(): ReactElement {
  return <View className="h-px bg-gray200 mx-5" />;
}

export default function ProfilePage({
  onNavigateToReservations,
  onNavigateToSaved,
}: ProfilePageProps): ReactElement {
  const { t } = useTranslation();
  const { lang, setLanguage } = useLanguage();
  const insets = useSafeAreaInsets();
  const { signOut } = useClerk();

  const [route, setRoute] = useState<ProfileRoute>({ name: 'root' });
  const [signingOut, setSigningOut] = useState(false);

  const { profile, isLoading: profileLoading } = useProfile();
  const { settings, updateSettings, isLoading: settingsLoading } = useSettings();

  const isLoading = profileLoading || settingsLoading;

  const handleSignOut = async (): Promise<void> => {
    if (signingOut) return;
    try {
      setSigningOut(true);
      await AsyncStorage.removeItem(ONBOARDING_FLAG);
      await signOut();
    } catch (err: any) {
      setSigningOut(false);
      Alert.alert(t('profile.signOutFailed'), err?.message ?? t('profile.tryAgain'));
    }
  };

  const handleTogglePush = async (value: boolean): Promise<void> => {
    try {
      await updateSettings({ pushNotificationsEnabled: value });
    } catch (err: any) {
      Alert.alert(t('common.error'), err?.message ?? t('profile.couldNotUpdateSetting'));
    }
  };

  const handleToggleLocation = async (value: boolean): Promise<void> => {
    try {
      await updateSettings({ locationServicesEnabled: value });
    } catch (err: any) {
      Alert.alert(t('common.error'), err?.message ?? t('profile.couldNotUpdateSetting'));
    }
  };

  const handleStatsPress = (type: 'attended' | 'saved' | 'reviews'): void => {
    switch (type) {
      case 'attended':
        onNavigateToReservations?.('past');
        break;
      case 'saved':
        onNavigateToSaved?.();
        break;
      case 'reviews':
        setRoute({ name: 'myReviews' });
        break;
    }
  };

  // Sub-routes
  if (route.name === 'accountSettings') {
    return <AccountSettingsPage onBack={() => setRoute({ name: 'root' })} />;
  }

  if (route.name === 'paymentMethods') {
    return <PaymentMethodsPage onBack={() => setRoute({ name: 'root' })} />;
  }

  if (route.name === 'notificationPreferences') {
    return <NotificationPreferencesPage onBack={() => setRoute({ name: 'root' })} />;
  }

  if (route.name === 'myReviews') {
    return <MyReviewsPage onBack={() => setRoute({ name: 'root' })} />;
  }

  if (route.name === 'privacySecurity') {
    return <PrivacySecurityPage onBack={() => setRoute({ name: 'root' })} />;
  }

  if (route.name === 'helpSupport') {
    return <HelpSupportPage onBack={() => setRoute({ name: 'root' })} />;
  }

  if (route.name === 'termsConditions') {
    return <TermsConditionsPage onBack={() => setRoute({ name: 'root' })} />;
  }

  if (route.name === 'editProfile') {
    return <EditProfilePage onBack={() => setRoute({ name: 'root' })} />;
  }

  if (route.name === 'socialProfile') {
    return <SocialProfilePage onBack={() => setRoute({ name: 'root' })} />;
  }

  // Loading state
  if (isLoading) {
    return (
      <SafeAreaView edges={['left', 'right']} className="flex-1 bg-white items-center justify-center">
        <ActivityIndicator size="large" color="#6B7280" />
        <Text className="text-gray600 mt-3">{t('profile.loadingProfile')}</Text>
      </SafeAreaView>
    );
  }

  const statsItems = [
    { key: 'attended' as const, icon: 'calendar', label: t('profile.eventsAttended'), value: profile?.stats?.attendedCount ?? 0 },
    { key: 'saved' as const, icon: 'heart', label: t('profile.eventsSaved'), value: profile?.stats?.savedCount ?? 0 },
    { key: 'reviews' as const, icon: 'star', label: t('profile.reviews'), value: profile?.stats?.reviewsCount ?? 0 },
  ];

  return (
    <SafeAreaView edges={['left', 'right']} className="flex-1 bg-white">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerClassName="pb-24 pt-4"
        contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 16) + 80 }}
      >
        {/* Profile Header Card */}
        <View className="mx-5 mt-4 rounded-2xl border border-gray200 bg-white p-4">
          <View className="flex-row items-center">
            {profile?.avatarUri ? (
              <Image
                source={{ uri: profile.avatarUri }}
                className="h-16 w-16 rounded-full border border-gray200"
              />
            ) : (
              <View className="h-16 w-16 rounded-full bg-gray100 border border-gray200 items-center justify-center">
                <Text className="text-lg text-gray800 font-semibold">
                  {(profile?.name ?? 'U').slice(0, 1).toUpperCase()}
                </Text>
              </View>
            )}

            <View className="flex-1 ml-4">
              <Text className="text-black text-base font-semibold" numberOfLines={1}>
                {profile?.name ?? t('profile.userNameFallback')}
              </Text>
              <View className="mt-1 flex-row items-center gap-x-2">
                <Feather name="mail" size={14} color="#6B7280" />
                <Text className="text-gray600 text-xs" numberOfLines={1}>
                  {profile?.email ?? t('profile.userEmailFallback')}
                </Text>
              </View>
              <View className="mt-1 flex-row items-center gap-x-2">
                <Feather name="map-pin" size={14} color="#6B7280" />
                <Text className="text-gray600 text-xs">{profile?.city ?? t('common.unknown')}</Text>
              </View>
            </View>

            <Pressable
              className="ml-3 flex-row items-center gap-x-2 px-3 py-2 rounded-xl border border-gray300 bg-white active:opacity-95"
              onPress={() => setRoute({ name: 'editProfile' })}
            >
              <Feather name="edit-2" size={14} color="#111827" />
              <Text className="text-sm text-gray900">{t('common.edit')}</Text>
            </Pressable>
          </View>
        </View>

        {/* View social profile */}
        <Pressable
          onPress={() => setRoute({ name: 'socialProfile' })}
          className="mx-5 mt-4 rounded-2xl bg-brand px-5 py-4 flex-row items-center justify-between active:opacity-90"
        >
          <View className="flex-row items-center gap-x-3">
            <Feather name="user" size={18} color="#FFFFFF" />
            <View>
              <Text className="text-white font-semibold">{t('profile.viewMyProfile')}</Text>
              <Text className="text-white/80 text-xs mt-0.5">{t('profile.viewMyProfileSubtitle')}</Text>
            </View>
          </View>
          <Feather name="chevron-right" size={20} color="#FFFFFF" />
        </Pressable>

        {/* Stats Row - Now Pressable */}
        <View className="mx-5 mt-4 flex-row gap-x-3">
          {statsItems.map((s) => (
            <Pressable
              key={s.key}
              className="flex-1 items-center rounded-2xl border border-gray200 bg-white py-5 active:opacity-80"
              onPress={() => handleStatsPress(s.key)}
            >
              <Feather name={s.icon as any} size={20} color="#0B0B15" />
              <Text className="mt-2 text-black font-semibold">{s.value}</Text>
              <Text className="mt-1 text-xs text-gray600 text-center leading-4 min-h-[32px] w-full px-1">
                {s.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Interests */}
        <View className="mx-5 mt-5 rounded-2xl border border-gray200 bg-white p-4">
          <Text className="text-base font-semibold text-black">{t('profile.interests')}</Text>
          <View className="mt-3 flex-row flex-wrap gap-2">
            {(profile?.interests ?? []).length > 0 ? (
              profile!.interests!.map((i: string) => <Chip key={i} label={i} />)
            ) : (
              <Text className="text-sm text-gray500">{t('profile.noInterestsSelected')}</Text>
            )}
          </View>
        </View>

        {/* Quick Settings */}
        <View className="mx-5 mt-5 rounded-2xl border border-gray200 bg-white">
          <View className="px-5 py-4">
            <Text className="text-base font-semibold text-black">{t('profile.quickSettings')}</Text>
          </View>

          <View className="px-5 py-3 flex-row items-center justify-between border-t border-gray200">
            <View>
              <View className="flex-row items-center gap-x-2">
                <Feather name="bell" size={16} color="#111827" />
                <Text className="text-gray900 font-medium">{t('profile.pushNotifications')}</Text>
              </View>
              <Text className="text-xs text-gray500 mt-1">{t('profile.pushNotificationsSubtitle')}</Text>
            </View>
            <Switch
              value={settings?.pushNotificationsEnabled ?? false}
              onValueChange={handleTogglePush}
              thumbColor={settings?.pushNotificationsEnabled ? '#FFFFFF' : '#808080'}
              trackColor={{ false: '#E5E7EB', true: '#59B259' }}
            />
          </View>

          <View className="px-5 py-3 flex-row items-center justify-between border-t border-gray200">
            <View>
              <View className="flex-row items-center gap-x-2">
                <Feather name="map-pin" size={16} color="#111827" />
                <Text className="text-gray900 font-medium">{t('profile.locationServices')}</Text>
              </View>
              <Text className="text-xs text-gray500 mt-1">{t('profile.locationServicesSubtitle')}</Text>
            </View>
            <Switch
              value={settings?.locationServicesEnabled ?? false}
              onValueChange={handleToggleLocation}
              thumbColor={settings?.locationServicesEnabled ? '#FFFFFF' : '#808080'}
              trackColor={{ false: '#E5E7EB', true: '#59B259' }}
            />
          </View>

          <Divider />
          <SettingsRow
            icon="globe"
            title={t('profile.language')}
            subtitle={lang === 'en' ? t('language.en') : t('language.fr')}
            onPress={() => setLanguage(lang === 'en' ? 'fr' : 'en')}
          />
        </View>

        {/* Settings Links */}
        <View className="mx-5 mt-5 rounded-2xl border border-gray200 bg-white overflow-hidden">
          <SettingsRow
            icon="user"
            title={t('profile.accountSettings')}
            subtitle={t('profile.accountSettingsSubtitle')}
            onPress={() => setRoute({ name: 'accountSettings' })}
          />
          <Divider />
          <SettingsRow
            icon="credit-card"
            title={t('profile.paymentMethods')}
            subtitle={t('profile.paymentMethodsSubtitle')}
            onPress={() => setRoute({ name: 'paymentMethods' })}
          />
          <Divider />
          <SettingsRow
            icon="bell"
            title={t('profile.notificationPreferences')}
            subtitle={t('profile.notificationPreferencesSubtitle')}
            onPress={() => setRoute({ name: 'notificationPreferences' })}
          />
          <Divider />
          <SettingsRow
            icon="shield"
            title={t('profile.privacySecurity')}
            subtitle={t('profile.privacySecuritySubtitle')}
            onPress={() => setRoute({ name: 'privacySecurity' })}
          />
        </View>

        {/* Support Links */}
        <View className="mx-5 mt-5 rounded-2xl border border-gray200 bg-white overflow-hidden">
          <SettingsRow
            icon="help-circle"
            title={t('profile.helpSupport')}
            subtitle={t('profile.helpSupportSubtitle')}
            onPress={() => setRoute({ name: 'helpSupport' })}
          />
          <Divider />
          <SettingsRow
            icon="file-text"
            title={t('profile.termsPrivacy')}
            subtitle={t('profile.termsPrivacySubtitle')}
            onPress={() => setRoute({ name: 'termsConditions' })}
          />
        </View>

        {/* Sign Out */}
        <Pressable
          disabled={signingOut}
          onPress={handleSignOut}
          className={cx(
            'mx-5 mt-5 rounded-2xl border border-gray200 bg-white px-5 py-4 flex-row items-center justify-between',
            signingOut && 'opacity-70'
          )}
        >
          <View className="flex-row items-center gap-x-3">
            <Feather name="log-out" size={18} color="#111827" />
            <Text className="text-gray900 font-medium">
              {signingOut ? t('profile.signingOut') : t('profile.signOut')}
            </Text>
          </View>
          {signingOut ? <ActivityIndicator size="small" color="#9CA3AF" /> : null}
        </Pressable>

        {/* App Version */}
        <View className="mt-6 items-center">
          <Text className="text-xs text-gray500">GoSwing v1.0.0</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
