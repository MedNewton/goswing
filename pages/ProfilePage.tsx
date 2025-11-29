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

import { getUser } from '@/data/loaders';

const ONBOARDING_FLAG = '@gs:onboardPending';

const cx = (...c: ReadonlyArray<string | null | undefined | false>) =>
  c.filter(Boolean).join(' ');

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

export default function ProfilePage(): ReactElement {
  const insets = useSafeAreaInsets();
  const user = getUser();

  const [pushEnabled, setPushEnabled] = useState(false);
  const [locEnabled, setLocEnabled] = useState(false);

  const { signOut } = useClerk();
  const [signingOut, setSigningOut] = useState(false);

  const handleSignOut = async (): Promise<void> => {
    if (signingOut) return;
    try {
      setSigningOut(true);
      await AsyncStorage.removeItem(ONBOARDING_FLAG);
      await signOut();
    } catch (err: any) {
      setSigningOut(false);
      Alert.alert('Sign out failed', err?.message ?? 'Please try again.');
    }
  };

  return (
    <SafeAreaView edges={['left', 'right']} className="flex-1 bg-white">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerClassName="pb-24 pt-4"
        contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 16) + 80 }}
      >
        <View className="mx-5 mt-4 rounded-2xl border border-gray200 bg-white p-4">
          <View className="flex-row items-center">
            {user.avatarUri ? (
              <Image
                source={{ uri: user.avatarUri }}
                className="h-16 w-16 rounded-full border border-gray200"
              />
            ) : (
              <View className="h-16 w-16 rounded-full bg-gray100 border border-gray200 items-center justify-center">
                <Text className="text-lg text-gray800 font-semibold">
                  {(user.name ?? 'U').slice(0, 1).toUpperCase()}
                </Text>
              </View>
            )}

            <View className="flex-1 ml-4">
              <Text className="text-black text-base font-semibold" numberOfLines={1}>
                {user.name ?? 'User Name'}
              </Text>
              <View className="mt-1 flex-row items-center gap-x-2">
                <Feather name="mail" size={14} color="#6B7280" />
                <Text className="text-gray600 text-xs" numberOfLines={1}>
                  {user.email ?? 'user@example.com'}
                </Text>
              </View>
              <View className="mt-1 flex-row items-center gap-x-2">
                <Feather name="map-pin" size={14} color="#6B7280" />
                <Text className="text-gray600 text-xs">{user.city ?? 'Paris'}</Text>
              </View>
            </View>

            <Pressable
              className="ml-3 flex-row items-center gap-x-2 px-3 py-2 rounded-xl border border-gray300 bg-white active:opacity-95"
              onPress={() => {}}
            >
              <Feather name="edit-2" size={14} color="#111827" />
              <Text className="text-sm text-gray900">Edit</Text>
            </Pressable>
          </View>
        </View>

        <View className="mx-5 mt-4 flex-row gap-x-3">
          {[
            { icon: 'calendar', label: 'Events Attended', value: user.stats?.attendedCount ?? 0 },
            { icon: 'heart', label: 'Events Saved', value: user.stats?.savedCount ?? 0 },
            { icon: 'star', label: 'Reviews', value: user.stats?.reviewsCount ?? 0 },
          ].map((s) => (
            <View
              key={s.label}
              className="flex-1 items-center rounded-2xl border border-gray200 bg-white py-5"
            >
              <Feather name={s.icon as any} size={20} color="#0B0B15" />
              <Text className="mt-2 text-black font-semibold">{s.value}</Text>
              <Text className="mt-1 text-xs text-gray600">{s.label}</Text>
            </View>
          ))}
        </View>

        <View className="mx-5 mt-5 rounded-2xl border border-gray200 bg-white p-4">
          <Text className="text-base font-semibold text-black">Interests</Text>
          <View className="mt-3 flex-row flex-wrap gap-2">
            {(user.interests ?? ['Music', 'Arts', 'Food & Drink', 'Business']).map((i: string) => (
              <Chip key={i} label={i} />
            ))}
          </View>
        </View>

        <View className="mx-5 mt-5 rounded-2xl border border-gray200 bg-white">
          <View className="px-5 py-4">
            <Text className="text-base font-semibold text-black">Quick Settings</Text>
          </View>

          <View className="px-5 py-3 flex-row items-center justify-between border-t border-gray200">
            <View>
              <View className="flex-row items-center gap-x-2">
                <Feather name="bell" size={16} color="#111827" />
                <Text className="text-gray900 font-medium">Push Notifications</Text>
              </View>
              <Text className="text-xs text-gray500 mt-1">Get notified about events</Text>
            </View>
            <Switch
              value={pushEnabled}
              onValueChange={setPushEnabled}
              thumbColor={pushEnabled ? '#FFFFFF' : '#808080'}
              trackColor={{ false: '#E5E7EB', true: '#59B259' }}
            />
          </View>

          <View className="px-5 py-3 flex-row items-center justify-between border-t border-gray200">
            <View>
              <View className="flex-row items-center gap-x-2">
                <Feather name="map-pin" size={16} color="#111827" />
                <Text className="text-gray900 font-medium">Location Services</Text>
              </View>
              <Text className="text-xs text-gray500 mt-1">Find events near you</Text>
            </View>
            <Switch
              value={locEnabled}
              onValueChange={setLocEnabled}
              thumbColor={pushEnabled ? '#FFFFFF' : '#808080'}
              trackColor={{ false: '#E5E7EB', true: '#59B259' }}
            />
          </View>
        </View>

        <View className="mx-5 mt-5 rounded-2xl border border-gray200 bg-white overflow-hidden">
          <SettingsRow icon="user" title="Account Settings" subtitle="Manage your personal information" />
          <View className="h-px bg-gray200 mx-5" />
          <SettingsRow icon="credit-card" title="Payment Methods" subtitle="Manage cards and billing" />
          <View className="h-px bg-gray200 mx-5" />
          <SettingsRow icon="bell" title="Notification Preferences" subtitle="Customize your alerts" />
          <View className="h-px bg-gray200 mx-5" />
          <SettingsRow icon="shield" title="Privacy & Security" subtitle="Control your data and privacy" />
        </View>

        <View className="mx-5 mt-5 rounded-2xl border border-gray200 bg-white overflow-hidden">
          <SettingsRow icon="help-circle" title="Help & Support" subtitle="Get help and contact us" />
          <View className="h-px bg-gray200 mx-5" />
          <SettingsRow icon="file-text" title="Terms & Privacy" subtitle="Legal information" />
        </View>

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
              {signingOut ? 'Signing out…' : 'Sign Out'}
            </Text>
          </View>
          {signingOut ? (
            <ActivityIndicator size="small" color="#9CA3AF" />
          ) : (
            <Feather name="arrow-up-right" size={18} color="#9CA3AF" />
          )}
        </Pressable>

        <View className="mt-6 items-center">
          <Text className="text-xs text-gray500">GoSwing v1.0.0</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
