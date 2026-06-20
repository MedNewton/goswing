// pages/social/EditSocialProfilePage.tsx
// Edit cover photo, avatar, display name, occupation, city and bio.

import React, { useEffect, useState, type ReactElement } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  Image,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

import { useSocialProfile } from '@/hooks/social/useSocialProfile';
import { pickFromLibrary } from '@/components/social/mediaPicker';
import { uploadUserContent } from '@/lib/supabase/storage';

type Props = Readonly<{
  onBack: () => void;
  onSaved?: () => void;
}>;

function isRemoteUrl(uri: string | null): boolean {
  return !!uri && /^https?:\/\//i.test(uri);
}

export default function EditSocialProfilePage({ onBack, onSaved }: Props): ReactElement {
  const insets = useSafeAreaInsets();
  const { profile, viewerId, update, isLoading } = useSocialProfile();

  const [coverUri, setCoverUri] = useState<string | null>(null);
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [occupation, setOccupation] = useState('');
  const [city, setCity] = useState('');
  const [bio, setBio] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!profile) return;
    setCoverUri(profile.coverImageUrl);
    setAvatarUri(profile.avatarUrl);
    setDisplayName(profile.displayName === 'GoSwing user' ? '' : profile.displayName);
    setOccupation(profile.occupation ?? '');
    setCity(profile.city ?? '');
    setBio(profile.bio ?? '');
  }, [profile]);

  const pickCover = async (): Promise<void> => {
    const asset = await pickFromLibrary({ allowVideos: false });
    if (asset) setCoverUri(asset.uri);
  };

  const pickAvatar = async (): Promise<void> => {
    const asset = await pickFromLibrary({ allowVideos: false, square: true });
    if (asset) setAvatarUri(asset.uri);
  };

  const handleSave = async (): Promise<void> => {
    if (!displayName.trim()) {
      Alert.alert('Name required', 'Please enter a display name.');
      return;
    }
    try {
      setSaving(true);

      let avatarUrl = avatarUri;
      if (avatarUri && !isRemoteUrl(avatarUri)) {
        avatarUrl = (await uploadUserContent(`avatars/${viewerId ?? 'me'}`, avatarUri, 'image')).url;
      }
      let coverUrl = coverUri;
      if (coverUri && !isRemoteUrl(coverUri)) {
        coverUrl = (await uploadUserContent(`covers/${viewerId ?? 'me'}`, coverUri, 'image')).url;
      }

      await update({
        displayName: displayName.trim(),
        avatarUrl,
        coverImageUrl: coverUrl,
        occupation: occupation.trim() || null,
        city: city.trim() || null,
        bio: bio.trim() || null,
      });

      onSaved?.();
      onBack();
    } catch (err: any) {
      Alert.alert('Could not save', err?.message ?? 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView edges={['top', 'left', 'right']} className="flex-1 bg-white items-center justify-center">
        <ActivityIndicator size="large" color="#6B7280" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['left', 'right']} className="flex-1 bg-gray50">
      <View className="flex-row items-center justify-between px-5 py-4 bg-white border-b border-gray200">
        <View className="flex-row items-center">
          <Pressable onPress={onBack} className="mr-3 active:opacity-70">
            <Feather name="arrow-left" size={24} color="#111827" />
          </Pressable>
          <Text className="text-lg font-semibold text-black">Edit profile</Text>
        </View>
        <Pressable
          onPress={handleSave}
          disabled={saving}
          className={`px-4 py-2 rounded-xl ${saving ? 'bg-gray300' : 'bg-gray900'}`}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text className="text-sm font-medium text-white">Save</Text>
          )}
        </Pressable>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1">
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 16) + 80 }}
        >
          {/* Cover */}
          <Pressable onPress={pickCover} className="active:opacity-90">
            <View className="h-40 bg-gray200">
              {coverUri ? (
                <Image source={{ uri: coverUri }} className="w-full h-full" resizeMode="cover" />
              ) : null}
              <View className="absolute inset-0 items-center justify-center">
                <View className="bg-black/40 rounded-full px-4 py-2 flex-row items-center gap-x-2">
                  <Feather name="camera" size={16} color="#FFFFFF" />
                  <Text className="text-white text-xs font-medium">Change cover</Text>
                </View>
              </View>
            </View>
          </Pressable>

          {/* Avatar */}
          <View className="px-5 -mt-10">
            <Pressable onPress={pickAvatar} className="active:opacity-90 w-24">
              {avatarUri ? (
                <Image
                  source={{ uri: avatarUri }}
                  className="h-24 w-24 rounded-full border-4 border-gray50"
                />
              ) : (
                <View className="h-24 w-24 rounded-full border-4 border-gray50 bg-gray200 items-center justify-center">
                  <Text className="text-3xl font-semibold text-gray700">
                    {(displayName || 'U').slice(0, 1).toUpperCase()}
                  </Text>
                </View>
              )}
              <View className="absolute bottom-0 right-0 bg-gray900 rounded-full p-2 border-2 border-gray50">
                <Feather name="camera" size={12} color="#FFFFFF" />
              </View>
            </Pressable>
          </View>

          {/* Fields */}
          <View className="mx-5 mt-5 rounded-2xl border border-gray200 bg-white p-4">
            <Field label="Display name" value={displayName} onChangeText={setDisplayName} placeholder="Your name" />
            <Field label="Occupation" value={occupation} onChangeText={setOccupation} placeholder="What you do" />
            <Field label="City" value={city} onChangeText={setCity} placeholder="Where you're based" />
            <Field label="Bio" value={bio} onChangeText={setBio} placeholder="Tell people about yourself" multiline />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  multiline = false,
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  multiline?: boolean;
}): ReactElement {
  return (
    <View className="mb-4">
      <Text className="text-sm text-gray700 mb-2">{label}</Text>
      <View className="border border-gray200 rounded-xl overflow-hidden bg-white">
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#9CA3AF"
          multiline={multiline}
          textAlignVertical={multiline ? 'top' : 'center'}
          className={`px-4 py-3 text-sm text-gray900 ${multiline ? 'min-h-[96px]' : ''}`}
        />
      </View>
    </View>
  );
}
