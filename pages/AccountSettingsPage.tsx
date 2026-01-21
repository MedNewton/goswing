// pages/AccountSettingsPage.tsx
import React, { useState, type ReactElement } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Switch,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useUser } from '@clerk/clerk-expo';

import { useProfile, useSettings, useLoginHistory } from '@/hooks/profile';

const cx = (...c: ReadonlyArray<string | null | undefined | false>) =>
  c.filter(Boolean).join(' ');

type AccountSettingsPageProps = Readonly<{
  onBack: () => void;
}>;

export default function AccountSettingsPage({ onBack }: AccountSettingsPageProps): ReactElement {
  const insets = useSafeAreaInsets();
  const { user: clerkUser } = useUser();

  const { profile, updateProfile, deactivateAccount, deleteAccount, isLoading: profileLoading } = useProfile();
  const { settings, updateSettings, isLoading: settingsLoading } = useSettings();
  const { history, isLoading: historyLoading } = useLoginHistory(5);

  const [showLoginHistory, setShowLoginHistory] = useState(false);
  const [isDeactivating, setIsDeactivating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const isLoading = profileLoading || settingsLoading;

  // Clerk handles email/phone verification status
  const emailVerified = clerkUser?.primaryEmailAddress?.verification?.status === 'verified';
  const phoneVerified = clerkUser?.primaryPhoneNumber?.verification?.status === 'verified';

  const handleToggleVisibility = async (isPublic: boolean): Promise<void> => {
    try {
      await updateProfile({ profileVisibility: isPublic ? 'public' : 'private' });
    } catch (err: any) {
      Alert.alert('Error', err?.message ?? 'Could not update visibility.');
    }
  };

  const handleToggleLoginNotifications = async (value: boolean): Promise<void> => {
    try {
      await updateSettings({ loginNotificationsEnabled: value });
    } catch (err: any) {
      Alert.alert('Error', err?.message ?? 'Could not update setting.');
    }
  };

  const handleDeactivateAccount = (): void => {
    Alert.alert(
      'Deactivate Account',
      'Your account will be deactivated. You can reactivate it by signing in again. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Deactivate',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsDeactivating(true);
              await deactivateAccount();
              Alert.alert('Account Deactivated', 'Your account has been deactivated.');
            } catch (err: any) {
              Alert.alert('Error', err?.message ?? 'Could not deactivate account.');
            } finally {
              setIsDeactivating(false);
            }
          },
        },
      ]
    );
  };

  const handleDeleteAccount = (): void => {
    Alert.alert(
      'Delete Account Permanently',
      'This action cannot be undone. All your data will be permanently deleted. Are you absolutely sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Forever',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsDeleting(true);
              await deleteAccount();
              Alert.alert('Account Deleted', 'Your account has been permanently deleted.');
            } catch (err: any) {
              Alert.alert('Error', err?.message ?? 'Could not delete account.');
            } finally {
              setIsDeleting(false);
            }
          },
        },
      ]
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView edges={['top', 'left', 'right']} className="flex-1 bg-white items-center justify-center">
        <ActivityIndicator size="large" color="#6B7280" />
        <Text className="text-gray600 mt-3">Loading settings…</Text>
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
        <Text className="text-lg font-semibold text-black">Account Settings</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 16) + 40 }}
      >
        {/* Password & Security */}
        <View className="mx-5 mt-5 rounded-2xl border border-gray200 bg-white p-5">
          <View className="flex-row items-center gap-x-2 mb-4">
            <Feather name="shield" size={18} color="#111827" />
            <Text className="text-base font-semibold text-black">Password & Security</Text>
          </View>

          <View className="mb-4">
            <Text className="text-sm text-gray700 mb-2">Current Password</Text>
            <View className="flex-row items-center border border-gray300 rounded-xl px-4 py-3">
              <TextInput
                placeholder="Enter current password"
                secureTextEntry
                className="flex-1 text-gray900"
                placeholderTextColor="#9CA3AF"
              />
              <Feather name="eye" size={18} color="#9CA3AF" />
            </View>
          </View>

          <View className="mb-4">
            <Text className="text-sm text-gray700 mb-2">New Password</Text>
            <View className="flex-row items-center border border-gray300 rounded-xl px-4 py-3">
              <TextInput
                placeholder="Enter new password"
                secureTextEntry
                className="flex-1 text-gray900"
                placeholderTextColor="#9CA3AF"
              />
              <Feather name="eye" size={18} color="#9CA3AF" />
            </View>
          </View>

          <Pressable className="bg-gray900 rounded-xl py-3 items-center active:opacity-90">
            <Text className="text-white font-medium">Update Password</Text>
          </Pressable>

          <View className="flex-row items-center justify-between mt-5 pt-4 border-t border-gray200">
            <View>
              <Text className="text-gray900 font-medium">Two-Factor Authentication</Text>
              <Text className="text-xs text-gray500 mt-1">Add an extra layer of security</Text>
            </View>
            <Switch
              value={false}
              onValueChange={() => Alert.alert('2FA', 'Two-factor authentication is managed through Clerk.')}
              thumbColor="#808080"
              trackColor={{ false: '#E5E7EB', true: '#59B259' }}
            />
          </View>
        </View>

        {/* Account Verification */}
        <View className="mx-5 mt-5 rounded-2xl border border-gray200 bg-white p-5">
          <Text className="text-base font-semibold text-black mb-4">Account Verification</Text>

          <View className="flex-row items-center justify-between py-3 border-b border-gray200">
            <View className="flex-row items-center gap-x-3">
              <Feather name="mail" size={18} color="#111827" />
              <View>
                <Text className="text-gray900 font-medium">Email Address</Text>
                <Text className="text-xs text-gray500 mt-0.5">
                  {clerkUser?.primaryEmailAddress?.emailAddress ?? 'Not set'}
                </Text>
              </View>
            </View>
            <Text className={cx('text-sm font-medium', emailVerified ? 'text-green-600' : 'text-orange-500')}>
              {emailVerified ? 'Verified' : 'Unverified'}
            </Text>
          </View>

          <View className="flex-row items-center justify-between py-3">
            <View className="flex-row items-center gap-x-3">
              <Feather name="smartphone" size={18} color="#111827" />
              <View>
                <Text className="text-gray900 font-medium">Phone Number</Text>
                <Text className="text-xs text-gray500 mt-0.5">
                  {clerkUser?.primaryPhoneNumber?.phoneNumber ?? 'Not set'}
                </Text>
              </View>
            </View>
            {phoneVerified ? (
              <Text className="text-sm font-medium text-green-600">Verified</Text>
            ) : (
              <Pressable className="px-3 py-1.5 border border-gray300 rounded-lg active:opacity-70">
                <Text className="text-sm text-gray900">Verify</Text>
              </Pressable>
            )}
          </View>
        </View>

        {/* Login & Activity */}
        <View className="mx-5 mt-5 rounded-2xl border border-gray200 bg-white p-5">
          <Text className="text-base font-semibold text-black mb-4">Login & Activity</Text>

          <View className="flex-row items-center justify-between pb-4 border-b border-gray200">
            <View>
              <Text className="text-gray900 font-medium">Login Notifications</Text>
              <Text className="text-xs text-gray500 mt-1">Get notified when someone logs into your account</Text>
            </View>
            <Switch
              value={settings?.loginNotificationsEnabled ?? false}
              onValueChange={handleToggleLoginNotifications}
              thumbColor={settings?.loginNotificationsEnabled ? '#FFFFFF' : '#808080'}
              trackColor={{ false: '#E5E7EB', true: '#59B259' }}
            />
          </View>

          <Pressable
            className="mt-4 border border-gray300 rounded-xl py-3 items-center active:opacity-70"
            onPress={() => setShowLoginHistory(!showLoginHistory)}
          >
            <Text className="text-gray900 font-medium">
              {showLoginHistory ? 'Hide Login History' : 'View Login History'}
            </Text>
          </Pressable>

          {showLoginHistory && (
            <View className="mt-4 pt-4 border-t border-gray200">
              {historyLoading ? (
                <ActivityIndicator size="small" color="#6B7280" />
              ) : history.length === 0 ? (
                <Text className="text-sm text-gray500">No login history available.</Text>
              ) : (
                history.map((entry) => (
                  <View key={entry.id} className="py-2 border-b border-gray100 last:border-b-0">
                    <View className="flex-row items-center justify-between">
                      <View className="flex-row items-center gap-x-2">
                        <Feather
                          name={entry.deviceType === 'mobile' ? 'smartphone' : 'monitor'}
                          size={14}
                          color="#6B7280"
                        />
                        <Text className="text-sm text-gray700">{entry.location ?? 'Unknown location'}</Text>
                      </View>
                      <Text className={cx('text-xs', entry.wasSuccessful ? 'text-green-600' : 'text-red-500')}>
                        {entry.wasSuccessful ? 'Success' : 'Failed'}
                      </Text>
                    </View>
                    <Text className="text-xs text-gray500 mt-1">
                      {new Date(entry.loggedInAt).toLocaleString()}
                    </Text>
                  </View>
                ))
              )}
            </View>
          )}
        </View>

        {/* Account Visibility */}
        <View className="mx-5 mt-5 rounded-2xl border border-gray200 bg-white p-5">
          <Text className="text-base font-semibold text-black mb-2">Account Visibility</Text>
          <Text className="text-sm text-gray500 mb-4">Control who can see your profile information</Text>

          <Pressable
            className={cx(
              'flex-row items-center px-4 py-3 rounded-xl border mb-3',
              profile?.profileVisibility === 'public' ? 'border-green-500 bg-green-50' : 'border-gray300'
            )}
            onPress={() => handleToggleVisibility(true)}
          >
            <View className="flex-1">
              <Text className="text-gray900 font-medium">Public</Text>
              <Text className="text-xs text-gray500 mt-0.5">Anyone can see your profile</Text>
            </View>
            {profile?.profileVisibility === 'public' && (
              <Feather name="check-circle" size={20} color="#22C55E" />
            )}
          </Pressable>

          <Pressable
            className={cx(
              'flex-row items-center px-4 py-3 rounded-xl border',
              profile?.profileVisibility === 'private' ? 'border-green-500 bg-green-50' : 'border-gray300'
            )}
            onPress={() => handleToggleVisibility(false)}
          >
            <View className="flex-1">
              <Text className="text-gray900 font-medium">Private</Text>
              <Text className="text-xs text-gray500 mt-0.5">Only people you follow can see your profile</Text>
            </View>
            {profile?.profileVisibility === 'private' && (
              <Feather name="check-circle" size={20} color="#22C55E" />
            )}
          </Pressable>
        </View>

        {/* Danger Zone */}
        <View className="mx-5 mt-5 mb-10 rounded-2xl border border-red-200 bg-red-50 p-5">
          <Text className="text-base font-semibold text-red-600 mb-2">Danger Zone</Text>

          <Pressable
            disabled={isDeactivating}
            onPress={handleDeactivateAccount}
            className={cx(
              'border border-gray300 bg-white rounded-xl py-3 items-center mb-3 active:opacity-70',
              isDeactivating && 'opacity-70'
            )}
          >
            {isDeactivating ? (
              <ActivityIndicator size="small" color="#6B7280" />
            ) : (
              <Text className="text-gray900 font-medium">Deactivate Account</Text>
            )}
          </Pressable>

          <Pressable
            disabled={isDeleting}
            onPress={handleDeleteAccount}
            className={cx(
              'bg-red-500 rounded-xl py-3 items-center active:opacity-90',
              isDeleting && 'opacity-70'
            )}
          >
            {isDeleting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text className="text-white font-medium">Delete Account Permanently</Text>
            )}
          </Pressable>

          <Text className="text-xs text-red-600 mt-3 text-center">
            Warning: These actions cannot be undone. Please be certain.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}