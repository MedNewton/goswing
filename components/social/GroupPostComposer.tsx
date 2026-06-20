// components/social/GroupPostComposer.tsx
// Compose a group wall post: text and/or an optional image/video.

import React, { useState, type ReactElement } from 'react';
import {
  Modal,
  View,
  Text,
  Image,
  Pressable,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { Video, ResizeMode } from 'expo-av';
import { choosePickSource, type PickedAsset } from '@/components/social/mediaPicker';

type Props = Readonly<{
  visible: boolean;
  submitting: boolean;
  onCancel: () => void;
  onSubmit: (input: { body: string; asset: PickedAsset | null }) => void;
}>;

export default function GroupPostComposer({
  visible,
  submitting,
  onCancel,
  onSubmit,
}: Props): ReactElement {
  const [body, setBody] = useState('');
  const [asset, setAsset] = useState<PickedAsset | null>(null);

  const reset = (): void => {
    setBody('');
    setAsset(null);
  };

  const close = (): void => {
    if (submitting) return;
    reset();
    onCancel();
  };

  const attach = (): void => {
    choosePickSource({ allowVideos: true }, (picked) => {
      if (picked) setAsset(picked);
    });
  };

  const canPost = body.trim().length > 0 || asset != null;

  const submit = (): void => {
    if (!canPost) return;
    onSubmit({ body: body.trim(), asset });
    reset();
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={close}>
      <SafeAreaView edges={['top', 'left', 'right']} className="flex-1 bg-white">
        <View className="flex-row items-center justify-between px-5 py-3 border-b border-gray100">
          <Pressable onPress={close} disabled={submitting} className="active:opacity-70">
            <Feather name="x" size={24} color="#111827" />
          </Pressable>
          <Text className="text-lg font-semibold text-black">New post</Text>
          <Pressable
            onPress={submit}
            disabled={submitting || !canPost}
            className={`px-4 py-2 rounded-full ${submitting || !canPost ? 'bg-gray300' : 'bg-brand'}`}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text className="text-white text-sm font-semibold">Post</Text>
            )}
          </Pressable>
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          className="flex-1"
        >
          <View className="flex-1 px-5 pt-4">
            <TextInput
              value={body}
              onChangeText={setBody}
              placeholder="Share something with the group…"
              placeholderTextColor="#9CA3AF"
              multiline
              className="text-base text-gray900 min-h-[120px]"
              textAlignVertical="top"
            />

            {asset ? (
              <View className="mt-3 rounded-xl overflow-hidden bg-gray100">
                {asset.kind === 'video' ? (
                  <Video
                    source={{ uri: asset.uri }}
                    style={{ width: '100%', height: 220 }}
                    useNativeControls
                    resizeMode={ResizeMode.COVER}
                  />
                ) : (
                  <Image source={{ uri: asset.uri }} style={{ width: '100%', height: 220 }} resizeMode="cover" />
                )}
                <Pressable
                  onPress={() => setAsset(null)}
                  className="absolute top-2 right-2 bg-black/50 rounded-full p-1.5 active:opacity-80"
                >
                  <Feather name="x" size={16} color="#FFFFFF" />
                </Pressable>
              </View>
            ) : null}
          </View>

          <View className="px-5 py-3 border-t border-gray200">
            <Pressable onPress={attach} className="flex-row items-center gap-x-2 active:opacity-70">
              <Feather name="image" size={20} color="#0EA5E9" />
              <Text className="text-sm text-gray700">{asset ? 'Change media' : 'Add photo / video'}</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}
