// pages/social/CreateGroupPage.tsx
import React, { useState, type ReactElement } from 'react';
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
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useUser } from '@clerk/clerk-expo';

import { pickFromLibrary } from '@/components/social/mediaPicker';
import { createGroup } from '@/lib/supabase/social/groups';

type Props = Readonly<{
  onBack: () => void;
  onCreated: (groupId: string) => void;
}>;

export default function CreateGroupPage({ onBack, onCreated }: Props): ReactElement {
  const { user } = useUser();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [coverUri, setCoverUri] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const pickCover = async (): Promise<void> => {
    const asset = await pickFromLibrary({ allowVideos: false });
    if (asset) setCoverUri(asset.uri);
  };

  const submit = async (): Promise<void> => {
    if (!name.trim()) {
      Alert.alert('Name required', 'Give your group a name.');
      return;
    }
    if (!user?.id) return;
    try {
      setSaving(true);
      const id = await createGroup({
        userId: user.id,
        name: name.trim(),
        description: description.trim() || null,
        coverUri,
      });
      onCreated(id);
    } catch (err: any) {
      Alert.alert('Could not create group', err?.message ?? 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right']} className="flex-1 bg-gray50">
      <View className="flex-row items-center justify-between px-5 py-3 bg-white border-b border-gray200">
        <View className="flex-row items-center">
          <Pressable onPress={onBack} className="mr-3 active:opacity-70">
            <Feather name="arrow-left" size={24} color="#111827" />
          </Pressable>
          <Text className="text-lg font-semibold text-black">New group</Text>
        </View>
        <Pressable
          onPress={submit}
          disabled={saving}
          className={`px-4 py-2 rounded-xl ${saving ? 'bg-gray300' : 'bg-gray900'}`}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text className="text-sm font-medium text-white">Create</Text>
          )}
        </Pressable>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1">
        <ScrollView contentContainerClassName="pb-16">
          <Pressable onPress={pickCover} className="active:opacity-90">
            <View className="h-36 bg-gray200">
              {coverUri ? (
                <Image source={{ uri: coverUri }} className="w-full h-full" resizeMode="cover" />
              ) : null}
              <View className="absolute inset-0 items-center justify-center">
                <View className="bg-black/40 rounded-full px-4 py-2 flex-row items-center gap-x-2">
                  <Feather name="camera" size={16} color="#FFFFFF" />
                  <Text className="text-white text-xs font-medium">
                    {coverUri ? 'Change cover' : 'Add cover'}
                  </Text>
                </View>
              </View>
            </View>
          </Pressable>

          <View className="mx-5 mt-5 rounded-2xl border border-gray200 bg-white p-4">
            <Text className="text-sm text-gray700 mb-2">Group name</Text>
            <View className="border border-gray200 rounded-xl overflow-hidden bg-white mb-4">
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="e.g. Saturday Swing Crew"
                placeholderTextColor="#9CA3AF"
                className="px-4 py-3 text-sm text-gray900"
              />
            </View>

            <Text className="text-sm text-gray700 mb-2">Description</Text>
            <View className="border border-gray200 rounded-xl overflow-hidden bg-white">
              <TextInput
                value={description}
                onChangeText={setDescription}
                placeholder="What's this group about?"
                placeholderTextColor="#9CA3AF"
                multiline
                textAlignVertical="top"
                className="px-4 py-3 text-sm text-gray900 min-h-[96px]"
              />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
