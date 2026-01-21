// pages/NotificationPreferencesPage.tsx
import React, { useState, type ReactElement } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Switch,
  Alert,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

import { useNotificationPreferences } from '@/hooks/profile';
import type { NotificationPreferences } from '@/types/domain';

const cx = (...c: ReadonlyArray<string | null | undefined | false>) =>
  c.filter(Boolean).join(' ');

type NotificationPreferencesPageProps = Readonly<{
  onBack: () => void;
}>;

type ToggleRowProps = {
  icon?: keyof typeof Feather.glyphMap;
  title: string;
  subtitle?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
  indented?: boolean;
};

function ToggleRow({
  icon,
  title,
  subtitle,
  value,
  onValueChange,
  disabled = false,
  indented = false,
}: ToggleRowProps): ReactElement {
  return (
    <View
      className={cx(
        'flex-row items-center justify-between py-3',
        indented && 'pl-6'
      )}
    >
      <View className="flex-1 mr-4">
        <View className="flex-row items-center gap-x-2">
          {icon && <Feather name={icon} size={16} color={disabled ? '#9CA3AF' : '#111827'} />}
          <Text className={cx('font-medium', disabled ? 'text-gray400' : 'text-gray900')}>
            {title}
          </Text>
        </View>
        {subtitle && (
          <Text className={cx('text-xs mt-1', disabled ? 'text-gray400' : 'text-gray500')}>
            {subtitle}
          </Text>
        )}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        thumbColor={value ? '#FFFFFF' : '#808080'}
        trackColor={{ false: '#E5E7EB', true: '#59B259' }}
      />
    </View>
  );
}

export default function NotificationPreferencesPage({
  onBack,
}: NotificationPreferencesPageProps): ReactElement {
  const insets = useSafeAreaInsets();

  const { preferences, updatePreferences, isLoading } = useNotificationPreferences();
  const [isSaving, setIsSaving] = useState(false);

  const handleToggle = async (
    key: keyof NotificationPreferences,
    value: boolean
  ): Promise<void> => {
    try {
      await updatePreferences({ [key]: value });
    } catch (err: any) {
      Alert.alert('Error', err?.message ?? 'Could not update preference.');
    }
  };

  const handleSaveQuietHours = async (): Promise<void> => {
    try {
      setIsSaving(true);
      // Quiet hours are already saved via individual toggles
      Alert.alert('Saved', 'Your notification preferences have been saved.');
    } catch (err: any) {
      Alert.alert('Error', err?.message ?? 'Could not save preferences.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView edges={['top', 'left', 'right']} className="flex-1 bg-white items-center justify-center">
        <ActivityIndicator size="large" color="#6B7280" />
        <Text className="text-gray600 mt-3">Loading preferences…</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['left', 'right']} className="flex-1 bg-white">
      {/* Header */}
      <View className="flex-row items-center px-5 py-4 border-b border-gray200">
        <Pressable onPress={onBack} className="mr-4 active:opacity-70">
          <Feather name="arrow-left" size={24} color="#111827" />
        </Pressable>
        <Text className="text-lg font-semibold text-black">Notification Preferences</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 16) + 80 }}
      >
        {/* Push Notifications */}
        <View className="mx-5 mt-5 rounded-2xl border border-gray200 bg-white p-5">
          <View className="flex-row items-center gap-x-2 mb-2">
            <Feather name="bell" size={18} color="#111827" />
            <Text className="text-base font-semibold text-black">Push Notifications</Text>
          </View>

          <ToggleRow
            title="Enable Push Notifications"
            subtitle="Receive notifications on your device"
            value={preferences?.pushEnabled ?? true}
            onValueChange={(v) => handleToggle('pushEnabled', v)}
          />

          <View className="border-t border-gray200 mt-2 pt-2">
            <ToggleRow
              icon="calendar"
              title="Event Reminders"
              subtitle="Get notified before your events start"
              value={preferences?.pushEventReminders ?? true}
              onValueChange={(v) => handleToggle('pushEventReminders', v)}
              disabled={!preferences?.pushEnabled}
              indented
            />
            <ToggleRow
              icon="zap"
              title="Event Updates"
              subtitle="Changes to events you're attending"
              value={preferences?.pushEventUpdates ?? true}
              onValueChange={(v) => handleToggle('pushEventUpdates', v)}
              disabled={!preferences?.pushEnabled}
              indented
            />
            <ToggleRow
              icon="users"
              title="New Followers"
              subtitle="When someone follows you"
              value={preferences?.pushNewFollowers ?? true}
              onValueChange={(v) => handleToggle('pushNewFollowers', v)}
              disabled={!preferences?.pushEnabled}
              indented
            />
            <ToggleRow
              icon="heart"
              title="Event Recommendations"
              subtitle="Events you might like based on your interests"
              value={preferences?.pushEventRecommendations ?? true}
              onValueChange={(v) => handleToggle('pushEventRecommendations', v)}
              disabled={!preferences?.pushEnabled}
              indented
            />
          </View>
        </View>

        {/* Email Notifications */}
        <View className="mx-5 mt-5 rounded-2xl border border-gray200 bg-white p-5">
          <View className="flex-row items-center gap-x-2 mb-2">
            <Feather name="mail" size={18} color="#111827" />
            <Text className="text-base font-semibold text-black">Email Notifications</Text>
          </View>

          <ToggleRow
            title="Enable Email Notifications"
            subtitle="Receive notifications via email"
            value={preferences?.emailEnabled ?? true}
            onValueChange={(v) => handleToggle('emailEnabled', v)}
          />

          <View className="border-t border-gray200 mt-2 pt-2">
            <ToggleRow
              title="Weekly Digest"
              subtitle="Summary of events happening near you"
              value={preferences?.emailWeeklyDigest ?? true}
              onValueChange={(v) => handleToggle('emailWeeklyDigest', v)}
              disabled={!preferences?.emailEnabled}
              indented
            />
            <ToggleRow
              title="Event Invites"
              subtitle="Invitations from friends and organizers"
              value={preferences?.emailEventInvites ?? true}
              onValueChange={(v) => handleToggle('emailEventInvites', v)}
              disabled={!preferences?.emailEnabled}
              indented
            />
            <ToggleRow
              title="Promotions & Deals"
              subtitle="Special offers and discounts on events"
              value={preferences?.emailPromotions ?? false}
              onValueChange={(v) => handleToggle('emailPromotions', v)}
              disabled={!preferences?.emailEnabled}
              indented
            />
            <ToggleRow
              title="Newsletter"
              subtitle="Monthly newsletter with event trends"
              value={preferences?.emailNewsletter ?? false}
              onValueChange={(v) => handleToggle('emailNewsletter', v)}
              disabled={!preferences?.emailEnabled}
              indented
            />
          </View>
        </View>

        {/* SMS Notifications */}
        <View className="mx-5 mt-5 rounded-2xl border border-gray200 bg-white p-5">
          <View className="flex-row items-center gap-x-2 mb-2">
            <Feather name="smartphone" size={18} color="#111827" />
            <Text className="text-base font-semibold text-black">SMS Notifications</Text>
          </View>

          <ToggleRow
            title="Enable SMS Notifications"
            subtitle="Receive text messages for important updates"
            value={preferences?.smsEnabled ?? false}
            onValueChange={(v) => handleToggle('smsEnabled', v)}
          />

          <View className="border-t border-gray200 mt-2 pt-2">
            <ToggleRow
              title="Urgent Updates"
              subtitle="Critical event changes or emergencies"
              value={preferences?.smsUrgentUpdates ?? false}
              onValueChange={(v) => handleToggle('smsUrgentUpdates', v)}
              disabled={!preferences?.smsEnabled}
              indented
            />
            <ToggleRow
              title="Event Cancellations"
              subtitle="When events you're attending are cancelled"
              value={preferences?.smsEventCancellations ?? true}
              onValueChange={(v) => handleToggle('smsEventCancellations', v)}
              disabled={!preferences?.smsEnabled}
              indented
            />
          </View>
        </View>

        {/* Marketing & Personalization */}
        <View className="mx-5 mt-5 rounded-2xl border border-gray200 bg-white p-5">
          <Text className="text-base font-semibold text-black mb-4">Marketing & Personalization</Text>

          <ToggleRow
            title="Personalized Ads"
            subtitle="Show ads relevant to your interests"
            value={preferences?.personalizedAds ?? true}
            onValueChange={(v) => handleToggle('personalizedAds', v)}
          />
          <View className="border-t border-gray200" />
          <ToggleRow
            title="Location-Based Suggestions"
            subtitle="Get event suggestions based on your location"
            value={preferences?.locationBasedSuggestions ?? true}
            onValueChange={(v) => handleToggle('locationBasedSuggestions', v)}
          />
        </View>

        {/* Quiet Hours */}
        <View className="mx-5 mt-5 rounded-2xl border border-gray200 bg-white p-5">
          <Text className="text-base font-semibold text-black mb-2">Quiet Hours</Text>
          <Text className="text-sm text-gray500 mb-4">
            Set times when you don't want to receive non-urgent notifications
          </Text>

          <ToggleRow
            title="Enable Quiet Hours"
            value={preferences?.quietHoursEnabled ?? false}
            onValueChange={(v) => handleToggle('quietHoursEnabled', v)}
          />

          {preferences?.quietHoursEnabled && (
            <View className="flex-row gap-x-4 mt-4">
              <View className="flex-1">
                <Text className="text-sm text-gray700 mb-2">Start Time</Text>
                <View className="border border-gray300 rounded-xl px-4 py-3">
                  <TextInput
                    placeholder="22:00"
                    value={preferences?.quietHoursStart ?? ''}
                    onChangeText={(text) => updatePreferences({ quietHoursStart: text })}
                    className="text-gray900"
                    placeholderTextColor="#9CA3AF"
                  />
                </View>
              </View>
              <View className="flex-1">
                <Text className="text-sm text-gray700 mb-2">End Time</Text>
                <View className="border border-gray300 rounded-xl px-4 py-3">
                  <TextInput
                    placeholder="08:00"
                    value={preferences?.quietHoursEnd ?? ''}
                    onChangeText={(text) => updatePreferences({ quietHoursEnd: text })}
                    className="text-gray900"
                    placeholderTextColor="#9CA3AF"
                  />
                </View>
              </View>
            </View>
          )}
        </View>

        {/* Save Button */}
        <View className="mx-5 mt-6">
          <Pressable
            className={cx(
              'bg-gray900 rounded-2xl py-4 items-center active:opacity-90',
              isSaving && 'opacity-70'
            )}
            onPress={handleSaveQuietHours}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text className="text-white font-semibold">Save Preferences</Text>
            )}
          </Pressable>
        </View>
      </ScrollView> 
    </SafeAreaView>
  );
}