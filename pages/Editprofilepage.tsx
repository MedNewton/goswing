// pages/EditProfilePage.tsx
import React, { useState, useEffect, type ReactElement } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  Image,
  Alert,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useTranslation } from 'react-i18next';

import { useProfile } from '@/hooks/profile';

type EditProfilePageProps = Readonly<{
  onBack: () => void;
}>;

function SectionCard({ children }: { children: React.ReactNode }): ReactElement {
  return (
    <View className="mx-5 mt-4 rounded-2xl border border-gray200 bg-white p-4">
      {children}
    </View>
  );
}

function SectionTitle({ icon, title }: { icon: keyof typeof Feather.glyphMap; title: string }): ReactElement {
  return (
    <View className="flex-row items-center gap-x-2 mb-4">
      <Feather name={icon} size={18} color="#111827" />
      <Text className="text-base font-semibold text-black">{title}</Text>
    </View>
  );
}

function InputField({
  label,
  icon,
  value,
  onChangeText,
  placeholder,
  multiline = false,
  editable = true,
  keyboardType = 'default',
}: {
  label: string;
  icon?: keyof typeof Feather.glyphMap;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  multiline?: boolean;
  editable?: boolean;
  keyboardType?: 'default' | 'email-address' | 'phone-pad';
}): ReactElement {
  return (
    <View className="mb-4">
      <View className="flex-row items-center gap-x-2 mb-2">
        {icon && <Feather name={icon} size={16} color="#111827" />}
        <Text className="text-sm text-gray700">{label}</Text>
      </View>
      <View className={`border border-gray200 rounded-xl overflow-hidden ${!editable ? 'bg-gray50' : 'bg-white'}`}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#9CA3AF"
          multiline={multiline}
          editable={editable}
          keyboardType={keyboardType}
          textAlignVertical={multiline ? 'top' : 'center'}
          className={`px-4 py-3 text-sm ${editable ? 'text-gray900' : 'text-gray500'} ${multiline ? 'min-h-[100px]' : ''}`}
        />
      </View>
    </View>
  );
}

export default function EditProfilePage({ onBack }: EditProfilePageProps): ReactElement {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { profile, updateProfile, isLoading: profileLoading } = useProfile();

  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Form state
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [location, setLocation] = useState('');

  // Initialize form with profile data
  useEffect(() => {
    if (profile) {
      setAvatarUri(profile.avatarUri ?? null);
      setFullName(profile.name ?? '');
      setEmail(profile.email ?? '');
      setPhone(profile.phone ?? '');
      setLocation(profile.city ?? '');
    }
  }, [profile]);

  // Track changes
  useEffect(() => {
    if (!profile) return;

    const changed =
      avatarUri !== (profile.avatarUri ?? null) ||
      fullName !== (profile.name ?? '') ||
      email !== (profile.email ?? '') ||
      phone !== (profile.phone ?? '') ||
      location !== (profile.city ?? '');

    setHasChanges(changed);
  }, [avatarUri, fullName, email, phone, location, profile]);

  const handlePickImage = async (): Promise<void> => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permissionResult.granted) {
      Alert.alert(t('editProfile.permissionRequired'), t('editProfile.libraryPermissionMessage'));
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setAvatarUri(result.assets[0].uri);
    }
  };

  const handleTakePhoto = async (): Promise<void> => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();

    if (!permissionResult.granted) {
      Alert.alert(t('editProfile.permissionRequired'), t('editProfile.cameraPermissionMessage'));
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setAvatarUri(result.assets[0].uri);
    }
  };

  const handleChangePhoto = (): void => {
    Alert.alert(t('editProfile.changePhotoTitle'), t('editProfile.changePhotoMessage'), [
      { text: t('editProfile.takePhoto'), onPress: handleTakePhoto },
      { text: t('editProfile.chooseFromLibrary'), onPress: handlePickImage },
      { text: t('common.cancel'), style: 'cancel' },
    ]);
  };

  const handleSave = async (): Promise<void> => {
    if (!fullName.trim()) {
      Alert.alert(t('common.error'), t('editProfile.errNameRequired'));
      return;
    }

    try {
      setIsSaving(true);

      await updateProfile({
        name: fullName.trim(),
        avatarUri: avatarUri,
        email: email.trim() || null,
        phone: phone.trim() || null,
        city: location.trim() || undefined,
      });

      Alert.alert(t('editProfile.successTitle'), t('editProfile.successMessage'), [
        { text: t('editProfile.ok'), onPress: onBack },
      ]);
    } catch (err: any) {
      Alert.alert(t('common.error'), err?.message ?? t('editProfile.errSaveFailed'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = (): void => {
    if (hasChanges) {
      Alert.alert(
        t('editProfile.discardTitle'),
        t('editProfile.discardMessage'),
        [
          { text: t('editProfile.keepEditing'), style: 'cancel' },
          { text: t('editProfile.discard'), style: 'destructive', onPress: onBack },
        ]
      );
    } else {
      onBack();
    }
  };

  if (profileLoading) {
    return (
      <SafeAreaView edges={['top', 'left', 'right']} className="flex-1 bg-white items-center justify-center">
        <ActivityIndicator size="large" color="#6B7280" />
        <Text className="text-gray600 mt-3">{t('editProfile.loading')}</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['left', 'right']} className="flex-1 bg-gray50">
      {/* Header */}
      <View className="flex-row items-center justify-between px-5 py-4 bg-white border-b border-gray200">
        <View className="flex-row items-center">
          <Pressable onPress={handleCancel} className="mr-3 active:opacity-70">
            <Feather name="arrow-left" size={24} color="#111827" />
          </Pressable>
          <Text className="text-lg font-semibold text-black">{t('editProfile.title')}</Text>
        </View>
        <Pressable
          onPress={handleSave}
          disabled={isSaving || !hasChanges}
          className={`px-4 py-2 rounded-xl ${hasChanges ? 'bg-gray900' : 'bg-gray300'}`}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text className={`text-sm font-medium ${hasChanges ? 'text-white' : 'text-gray500'}`}>
              {t('editProfile.save')}
            </Text>
          )}
        </Pressable>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 16) + 100 }}
        >
          {/* Profile Photo Section */}
          <SectionCard>
            <Text className="text-base font-semibold text-black mb-4">{t('editProfile.profilePhoto')}</Text>
            <View className="flex-row items-center">
              <View className="relative">
                {avatarUri ? (
                  <Image
                    source={{ uri: avatarUri }}
                    className="h-20 w-20 rounded-full border border-gray200"
                  />
                ) : (
                  <View className="h-20 w-20 rounded-full bg-gray100 border border-gray200 items-center justify-center">
                    <Text className="text-2xl text-gray800 font-semibold">
                      {fullName ? fullName.slice(0, 1).toUpperCase() : 'U'}
                    </Text>
                  </View>
                )}
                <Pressable
                  onPress={handleChangePhoto}
                  className="absolute bottom-0 right-0 bg-gray900 rounded-full p-2 active:opacity-80"
                >
                  <Feather name="camera" size={14} color="#FFFFFF" />
                </Pressable>
              </View>
              <View className="ml-4 flex-1">
                <Text className="text-sm font-medium text-gray900">{t('editProfile.changeProfilePhoto')}</Text>
                <Text className="text-xs text-gray500 mt-1">
                  {t('editProfile.uploadOrTake')}
                </Text>
              </View>
            </View>
          </SectionCard>

          {/* Basic Information Section */}
          <SectionCard>
            <SectionTitle icon="user" title={t('editProfile.basicInformation')} />

            <InputField
              label={t('editProfile.fullName')}
              value={fullName}
              onChangeText={setFullName}
              placeholder={t('editProfile.fullNamePlaceholder')}
            />
          </SectionCard>

          {/* Contact Information Section */}
          <SectionCard>
            <SectionTitle icon="phone" title={t('editProfile.contactInformation')} />

            <InputField
              label={t('editProfile.emailAddress')}
              icon="mail"
              value={email}
              onChangeText={setEmail}
              placeholder={t('editProfile.emailPlaceholder')}
              keyboardType="email-address"
            />

            <InputField
              label={t('editProfile.phoneNumber')}
              icon="phone"
              value={phone}
              onChangeText={setPhone}
              placeholder={t('editProfile.phonePlaceholder')}
              keyboardType="phone-pad"
            />

            <InputField
              label={t('editProfile.location')}
              icon="map-pin"
              value={location}
              onChangeText={setLocation}
              placeholder={t('editProfile.locationPlaceholder')}
            />
          </SectionCard>

          {/* Privacy Notice */}
          <SectionCard>
            <Text className="text-base font-semibold text-black mb-2">{t('editProfile.privacyNotice')}</Text>
            <Text className="text-sm text-gray600 leading-5">
              {t('editProfile.privacyNoticeBody')}
            </Text>
          </SectionCard>

          {/* Action Buttons */}
          <View className="mx-5 mt-6">
            <Pressable
              onPress={handleSave}
              disabled={isSaving || !hasChanges}
              className={`rounded-xl py-4 items-center ${hasChanges ? 'bg-gray900 active:opacity-90' : 'bg-gray300'}`}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text className={`font-medium ${hasChanges ? 'text-white' : 'text-gray500'}`}>
                  {t('editProfile.saveChanges')}
                </Text>
              )}
            </Pressable>

            <Pressable
              onPress={handleCancel}
              className="mt-3 rounded-xl py-4 items-center border border-gray300 bg-white active:opacity-80"
            >
              <Text className="font-medium text-gray900">{t('common.cancel')}</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}