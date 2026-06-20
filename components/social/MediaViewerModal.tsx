// components/social/MediaViewerModal.tsx
// Fullscreen viewer for a single media item with optional owner delete.

import React, { type ReactElement } from 'react';
import {
  Modal,
  View,
  Text,
  Image,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { Video, ResizeMode } from 'expo-av';
import type { UserMedia } from '@/lib/social/types';

type Props = Readonly<{
  item: UserMedia | null;
  canDelete: boolean;
  deleting: boolean;
  onClose: () => void;
  onDelete: (item: UserMedia) => void;
}>;

export default function MediaViewerModal({
  item,
  canDelete,
  deleting,
  onClose,
  onDelete,
}: Props): ReactElement | null {
  if (!item) return null;

  return (
    <Modal visible animationType="fade" transparent={false} onRequestClose={onClose}>
      <SafeAreaView edges={['top', 'left', 'right']} className="flex-1 bg-black">
        <View className="flex-row items-center justify-between px-5 py-4">
          <Pressable onPress={onClose} className="active:opacity-70">
            <Feather name="x" size={26} color="#FFFFFF" />
          </Pressable>
          {canDelete ? (
            <Pressable
              onPress={() => onDelete(item)}
              disabled={deleting}
              className="flex-row items-center gap-x-2 active:opacity-70"
            >
              {deleting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Feather name="trash-2" size={22} color="#EF4444" />
              )}
            </Pressable>
          ) : (
            <View style={{ width: 26 }} />
          )}
        </View>

        <View className="flex-1 items-center justify-center px-3">
          {item.mediaType === 'video' ? (
            <Video
              source={{ uri: item.mediaUrl }}
              style={{ width: '100%', height: '80%' }}
              useNativeControls
              resizeMode={ResizeMode.CONTAIN}
              shouldPlay
              isLooping
            />
          ) : (
            <Image
              source={{ uri: item.mediaUrl }}
              className="w-full h-4/5"
              resizeMode="contain"
            />
          )}
        </View>

        {item.caption ? (
          <View className="px-6 pb-6">
            <Text className="text-white text-sm leading-5">{item.caption}</Text>
          </View>
        ) : null}
      </SafeAreaView>
    </Modal>
  );
}
