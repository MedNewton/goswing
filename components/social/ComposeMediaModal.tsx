// components/social/ComposeMediaModal.tsx
// Preview a picked image/video, add an optional caption, and submit.
// Reused by the media-add flow and the story composer.

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
import type { PickedAsset } from '@/components/social/mediaPicker';

type Props = Readonly<{
  visible: boolean;
  asset: PickedAsset | null;
  title: string;
  submitLabel: string;
  submitting: boolean;
  onCancel: () => void;
  onSubmit: (caption: string) => void;
}>;

export default function ComposeMediaModal({
  visible,
  asset,
  title,
  submitLabel,
  submitting,
  onCancel,
  onSubmit,
}: Props): ReactElement {
  const [caption, setCaption] = useState('');

  const handleClose = (): void => {
    if (submitting) return;
    setCaption('');
    onCancel();
  };

  const handleSubmit = (): void => {
    onSubmit(caption.trim());
    setCaption('');
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={handleClose}>
      <SafeAreaView edges={['top', 'left', 'right']} className="flex-1 bg-black">
        <View className="flex-row items-center justify-between px-5 py-4">
          <Pressable onPress={handleClose} disabled={submitting} className="active:opacity-70">
            <Feather name="x" size={26} color="#FFFFFF" />
          </Pressable>
          <Text className="text-white text-base font-semibold">{title}</Text>
          <Pressable
            onPress={handleSubmit}
            disabled={submitting || !asset}
            className={`px-4 py-2 rounded-full ${submitting || !asset ? 'bg-gray700' : 'bg-brand'}`}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text className="text-white text-sm font-semibold">{submitLabel}</Text>
            )}
          </Pressable>
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          className="flex-1"
        >
          <View className="flex-1 items-center justify-center px-5">
            {asset ? (
              asset.kind === 'video' ? (
                <Video
                  source={{ uri: asset.uri }}
                  style={{ width: '100%', height: '80%', borderRadius: 16 }}
                  useNativeControls
                  resizeMode={ResizeMode.CONTAIN}
                  isLooping
                />
              ) : (
                <Image
                  source={{ uri: asset.uri }}
                  className="w-full h-4/5 rounded-2xl"
                  resizeMode="contain"
                />
              )
            ) : null}
          </View>

          <View className="px-5 pb-5">
            <TextInput
              value={caption}
              onChangeText={setCaption}
              placeholder="Write a caption…"
              placeholderTextColor="#9CA3AF"
              multiline
              className="bg-gray900 text-white rounded-2xl px-4 py-3 text-sm min-h-[56px]"
            />
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}
