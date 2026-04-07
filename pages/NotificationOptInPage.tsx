// pages/NotificationOptInPage.tsx
import React, { useState, type ReactElement } from 'react';
import { View, Text, Pressable, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import { useTranslation } from 'react-i18next';

type Props = Readonly<{
  onAllow: () => Promise<void>;
  onSkip: () => Promise<void>;
}>;

export default function NotificationOptInPage({ onAllow, onSkip }: Props): ReactElement {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [requesting, setRequesting] = useState(false);

  const handleAllowPress = async (): Promise<void> => {
    if (requesting) return;
    setRequesting(true);

    try {
      // Check existing permissions first
      let settings = await Notifications.getPermissionsAsync();

      if (!settings.granted) {
        // Ask user
        settings = await Notifications.requestPermissionsAsync();
      }

      if (settings.granted) {
        await onAllow();
      } else {
        Alert.alert(
          t('onboarding.notifications.notEnabledTitle'),
          t('onboarding.notifications.notEnabledMessage')
        );
        await onSkip();
      }
    } catch (err) {
      console.warn('Notification permission error:', err);
      Alert.alert(
        t('onboarding.notifications.requestFailedTitle'),
        t('onboarding.notifications.requestFailedMessage')
      );
      await onSkip();
    } finally {
      setRequesting(false);
    }
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right']} className="flex-1 bg-white">
      {/* TOP BAR */}
      <View className="px-5 pt-3 items-end">
        <Pressable
          onPress={onSkip}
          className="px-2 py-1 active:opacity-80"
          disabled={requesting}
          style={{ opacity: requesting ? 0.6 : 1 }}
        >
          <Text className="text-[18px] text-[#0B0B15]">{t('common.skip')}</Text>
        </Pressable>
      </View>

      {/* CONTENT */}
      <View className="flex-1 items-center justify-center px-6">
        <Feather name="bell" size={80} color="#050515" />

        <Text className="mt-10 text-[28px] leading-snug text-black text-center">
          {t('onboarding.notifications.permissionTitle')}
        </Text>

        <Text className="mt-4 text-base text-gray600 text-center">
          {t('onboarding.notifications.permissionDescription')}
        </Text>
      </View>

      {/* BOTTOM BUTTON */}
      <View
        className="px-5"
        style={{ paddingBottom: Math.max(insets.bottom, 20) }}
      >
        <Pressable
          onPress={handleAllowPress}
          disabled={requesting}
          className="rounded-2xl bg-[#050515] py-4 items-center active:opacity-90"
          style={{ opacity: requesting ? 0.7 : 1 }}
        >
          {requesting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text className="text-white text-[18px] font-semibold">
              {t('onboarding.notifications.allow')}
            </Text>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
