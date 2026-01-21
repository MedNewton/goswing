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
import DateTimePicker from '@react-native-community/datetimepicker';

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
  const insets = useSafeAreaInsets();
  const { profile, updateProfile, isLoading: profileLoading } = useProfile();

  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Form state
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [fullName, setFullName] = useState('');
  const [bio, setBio] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [location, setLocation] = useState('');

  // Initialize form with profile data
  useEffect(() => {
    if (profile) {
      setAvatarUri(profile.avatarUri ?? null);
      setFullName(profile.name ?? '');
      setBio((profile as any).bio ?? '');
      setDateOfBirth((profile as any).dateOfBirth ? new Date((profile as any).dateOfBirth) : null);
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
      bio !== ((profile as any).bio ?? '') ||
      email !== (profile.email ?? '') ||
      phone !== (profile.phone ?? '') ||
      location !== (profile.city ?? '');

    setHasChanges(changed);
  }, [avatarUri, fullName, bio, email, phone, location, profile]);

  const handlePickImage = async (): Promise<void> => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permissionResult.granted) {
      Alert.alert('Permission Required', 'Please allow access to your photo library to change your profile photo.');
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
      Alert.alert('Permission Required', 'Please allow access to your camera to take a profile photo.');
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
    Alert.alert('Change Profile Photo', 'Choose an option', [
      { text: 'Take Photo', onPress: handleTakePhoto },
      { text: 'Choose from Library', onPress: handlePickImage },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const handleDateChange = (event: any, selectedDate?: Date): void => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setDateOfBirth(selectedDate);
      setHasChanges(true);
    }
  };

  const formatDate = (date: Date | null): string => {
    if (!date) return '';
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const handleSave = async (): Promise<void> => {
    if (!fullName.trim()) {
      Alert.alert('Error', 'Please enter your full name.');
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
        // Note: bio and dateOfBirth would need to be added to the profile type and database
      });

      Alert.alert('Success', 'Your profile has been updated.', [
        { text: 'OK', onPress: onBack },
      ]);
    } catch (err: any) {
      Alert.alert('Error', err?.message ?? 'Failed to update profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = (): void => {
    if (hasChanges) {
      Alert.alert(
        'Discard Changes?',
        'You have unsaved changes. Are you sure you want to discard them?',
        [
          { text: 'Keep Editing', style: 'cancel' },
          { text: 'Discard', style: 'destructive', onPress: onBack },
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
        <Text className="text-gray600 mt-3">Loading profile...</Text>
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
          <Text className="text-lg font-semibold text-black">Edit Profile</Text>
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
              Save
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
            <Text className="text-base font-semibold text-black mb-4">Profile Photo</Text>
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
                <Text className="text-sm font-medium text-gray900">Change Profile Photo</Text>
                <Text className="text-xs text-gray500 mt-1">
                  Upload a new photo or take one with your camera
                </Text>
              </View>
            </View>
          </SectionCard>

          {/* Basic Information Section */}
          <SectionCard>
            <SectionTitle icon="user" title="Basic Information" />

            <InputField
              label="Full Name"
              value={fullName}
              onChangeText={setFullName}
              placeholder="John Doe"
            />

            <InputField
              label="Bio"
              value={bio}
              onChangeText={setBio}
              placeholder="Tell us about yourself..."
              multiline
            />

            <View className="mb-4">
              <Text className="text-sm text-gray700 mb-2">Date of Birth</Text>
              <Pressable
                onPress={() => setShowDatePicker(true)}
                className="border border-gray200 rounded-xl bg-white px-4 py-3 flex-row items-center justify-between"
              >
                <Text className={`text-sm ${dateOfBirth ? 'text-gray900' : 'text-gray400'}`}>
                  {dateOfBirth ? formatDate(dateOfBirth) : 'Select date'}
                </Text>
                <Feather name="calendar" size={18} color="#9CA3AF" />
              </Pressable>
            </View>

            {showDatePicker && (
              <DateTimePicker
                value={dateOfBirth ?? new Date(2000, 0, 1)}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={handleDateChange}
                maximumDate={new Date()}
              />
            )}
          </SectionCard>

          {/* Contact Information Section */}
          <SectionCard>
            <SectionTitle icon="phone" title="Contact Information" />

            <InputField
              label="Email Address"
              icon="mail"
              value={email}
              onChangeText={setEmail}
              placeholder="john.doe@example.com"
              keyboardType="email-address"
            />

            <InputField
              label="Phone Number"
              icon="phone"
              value={phone}
              onChangeText={setPhone}
              placeholder="+1 (555) 123-4567"
              keyboardType="phone-pad"
            />

            <InputField
              label="Location"
              icon="map-pin"
              value={location}
              onChangeText={setLocation}
              placeholder="Paris"
            />
          </SectionCard>

          {/* Privacy Notice */}
          <SectionCard>
            <Text className="text-base font-semibold text-black mb-2">Privacy Notice</Text>
            <Text className="text-sm text-gray600 leading-5">
              Your profile information will be visible to other users and event organizers. You can control what information is shared in your privacy settings.
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
                  Save Changes
                </Text>
              )}
            </Pressable>

            <Pressable
              onPress={handleCancel}
              className="mt-3 rounded-xl py-4 items-center border border-gray300 bg-white active:opacity-80"
            >
              <Text className="font-medium text-gray900">Cancel</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}