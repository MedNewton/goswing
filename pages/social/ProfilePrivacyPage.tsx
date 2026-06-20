// pages/social/ProfilePrivacyPage.tsx
// Manage profile visibility and friends-list visibility.

import React, { useState, type ReactElement } from 'react';
import { View, Text, Pressable, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

import { useSocialProfile } from '@/hooks/social/useSocialProfile';
import type { FriendsVisibility, ProfileVisibility } from '@/lib/social/types';

type Props = Readonly<{
  onBack: () => void;
  onSaved?: () => void;
}>;

type OptionRow<T extends string> = Readonly<{ value: T; title: string; subtitle: string }>;

const PROFILE_OPTIONS: ReadonlyArray<OptionRow<ProfileVisibility>> = [
  { value: 'public', title: 'Public', subtitle: 'Anyone can view your profile, media and stories.' },
  { value: 'private', title: 'Private', subtitle: 'Only you can see your profile. Others see a locked page.' },
];

const FRIENDS_OPTIONS: ReadonlyArray<OptionRow<FriendsVisibility>> = [
  { value: 'public', title: 'Everyone', subtitle: 'Anyone viewing your profile can see your friends.' },
  { value: 'friends', title: 'Friends only', subtitle: 'Only your friends can see your friends list.' },
  { value: 'private', title: 'Only me', subtitle: 'Your friends list is hidden from everyone else.' },
];

export default function ProfilePrivacyPage({ onBack, onSaved }: Props): ReactElement {
  const { profile, update, isLoading } = useSocialProfile();
  const [savingKey, setSavingKey] = useState<string | null>(null);

  const setProfileVisibility = async (value: ProfileVisibility): Promise<void> => {
    try {
      setSavingKey(`profile:${value}`);
      await update({ profileVisibility: value });
      onSaved?.();
    } catch (err: any) {
      Alert.alert('Could not update', err?.message ?? 'Please try again.');
    } finally {
      setSavingKey(null);
    }
  };

  const setFriendsVisibility = async (value: FriendsVisibility): Promise<void> => {
    try {
      setSavingKey(`friends:${value}`);
      await update({ friendsVisibility: value });
      onSaved?.();
    } catch (err: any) {
      Alert.alert('Could not update', err?.message ?? 'Please try again.');
    } finally {
      setSavingKey(null);
    }
  };

  return (
    <SafeAreaView edges={['left', 'right']} className="flex-1 bg-gray50">
      <View className="flex-row items-center px-5 py-4 bg-white border-b border-gray200">
        <Pressable onPress={onBack} className="mr-3 active:opacity-70">
          <Feather name="arrow-left" size={24} color="#111827" />
        </Pressable>
        <Text className="text-lg font-semibold text-black">Privacy</Text>
      </View>

      {isLoading || !profile ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#6B7280" />
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerClassName="pb-16">
          <Section title="Profile visibility" icon="eye">
            {PROFILE_OPTIONS.map((opt, i) => (
              <Row
                key={opt.value}
                title={opt.title}
                subtitle={opt.subtitle}
                selected={profile.profileVisibility === opt.value}
                busy={savingKey === `profile:${opt.value}`}
                first={i === 0}
                onPress={() => setProfileVisibility(opt.value)}
              />
            ))}
          </Section>

          <Section title="Who can see your friends" icon="users">
            {FRIENDS_OPTIONS.map((opt, i) => (
              <Row
                key={opt.value}
                title={opt.title}
                subtitle={opt.subtitle}
                selected={profile.friendsVisibility === opt.value}
                busy={savingKey === `friends:${opt.value}`}
                first={i === 0}
                onPress={() => setFriendsVisibility(opt.value)}
              />
            ))}
          </Section>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon: keyof typeof Feather.glyphMap;
  children: React.ReactNode;
}): ReactElement {
  return (
    <View className="mx-5 mt-5 rounded-2xl border border-gray200 bg-white overflow-hidden">
      <View className="flex-row items-center gap-x-2 px-5 py-4">
        <Feather name={icon} size={18} color="#111827" />
        <Text className="text-base font-semibold text-black">{title}</Text>
      </View>
      {children}
    </View>
  );
}

function Row({
  title,
  subtitle,
  selected,
  busy,
  first,
  onPress,
}: {
  title: string;
  subtitle: string;
  selected: boolean;
  busy: boolean;
  first: boolean;
  onPress: () => void;
}): ReactElement {
  return (
    <Pressable
      onPress={onPress}
      disabled={busy}
      className={`px-5 py-4 flex-row items-center justify-between border-gray200 active:opacity-90 ${
        first ? 'border-t' : 'border-t'
      }`}
    >
      <View className="flex-1 pr-3">
        <Text className="text-gray900 font-medium">{title}</Text>
        <Text className="text-xs text-gray500 mt-0.5">{subtitle}</Text>
      </View>
      {busy ? (
        <ActivityIndicator size="small" color="#0EA5E9" />
      ) : selected ? (
        <Feather name="check-circle" size={20} color="#0EA5E9" />
      ) : (
        <Feather name="circle" size={20} color="#D1D5DB" />
      )}
    </Pressable>
  );
}
