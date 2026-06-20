// components/social/UserStoryViewerModal.tsx
// Fullscreen, auto-advancing story viewer (images + videos) with progress bars,
// tap-to-navigate, and owner delete.

import React, { useEffect, useRef, useState, type ReactElement } from 'react';
import {
  Modal,
  View,
  Text,
  Image,
  Pressable,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { Video, ResizeMode, type AVPlaybackStatus } from 'expo-av';
import type { UserStory } from '@/lib/social/types';

type Props = Readonly<{
  visible: boolean;
  stories: ReadonlyArray<UserStory>;
  initialIndex?: number;
  canDelete: boolean;
  deleting: boolean;
  onClose: () => void;
  onDelete: (story: UserStory) => void;
}>;

const IMAGE_DURATION_MS = 5000;

export default function UserStoryViewerModal({
  visible,
  stories,
  initialIndex = 0,
  canDelete,
  deleting,
  onClose,
  onDelete,
}: Props): ReactElement | null {
  const [index, setIndex] = useState(initialIndex);
  const [progress, setProgress] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const current = stories[index] ?? null;

  useEffect(() => {
    if (visible) setIndex(initialIndex);
  }, [visible, initialIndex]);

  const clearTimer = (): void => {
    if (timer.current) {
      clearInterval(timer.current);
      timer.current = null;
    }
  };

  const goNext = (): void => {
    clearTimer();
    setProgress(0);
    setIndex((i) => {
      if (i + 1 >= stories.length) {
        onClose();
        return i;
      }
      return i + 1;
    });
  };

  const goPrev = (): void => {
    clearTimer();
    setProgress(0);
    setIndex((i) => Math.max(0, i - 1));
  };

  // Auto-advance images on a fixed timer; videos advance on playback finish.
  useEffect(() => {
    if (!visible || !current) return;
    if (current.mediaType !== 'image') return;
    clearTimer();
    setProgress(0);
    const step = 50;
    let elapsed = 0;
    timer.current = setInterval(() => {
      elapsed += step;
      const ratio = Math.min(1, elapsed / IMAGE_DURATION_MS);
      setProgress(ratio);
      if (ratio >= 1) goNext();
    }, step);
    return clearTimer;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, index, current?.id]);

  const handleVideoStatus = (status: AVPlaybackStatus): void => {
    if (!status.isLoaded) return;
    if (status.durationMillis && status.durationMillis > 0) {
      setProgress(Math.min(1, (status.positionMillis ?? 0) / status.durationMillis));
    }
    if (status.didJustFinish) goNext();
  };

  const confirmDelete = (): void => {
    if (!current) return;
    Alert.alert('Delete story', 'Remove this story?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => onDelete(current) },
    ]);
  };

  if (!visible || !current) return null;

  return (
    <Modal visible animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 bg-black">
        <SafeAreaView edges={['top', 'left', 'right']} className="flex-1">
          {/* Progress bars */}
          <View className="flex-row gap-x-1 px-3 pt-2">
            {stories.map((s, i) => (
              <View key={s.id} className="flex-1 h-0.5 bg-white/30 rounded-full overflow-hidden">
                <View
                  className="h-full bg-white"
                  style={{ width: `${i < index ? 100 : i === index ? progress * 100 : 0}%` }}
                />
              </View>
            ))}
          </View>

          {/* Header */}
          <View className="flex-row items-center justify-between px-4 py-3">
            <View className="flex-row items-center gap-x-2">
              {current.userAvatarUrl ? (
                <Image source={{ uri: current.userAvatarUrl }} className="w-8 h-8 rounded-full" />
              ) : (
                <View className="w-8 h-8 rounded-full bg-gray700 items-center justify-center">
                  <Text className="text-white text-xs font-semibold">
                    {(current.userName ?? 'U').slice(0, 1).toUpperCase()}
                  </Text>
                </View>
              )}
              <Text className="text-white text-sm font-medium">
                {current.userName ?? 'Your story'}
              </Text>
            </View>
            <View className="flex-row items-center gap-x-4">
              {canDelete ? (
                deleting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Pressable onPress={confirmDelete} className="active:opacity-70">
                    <Feather name="trash-2" size={20} color="#EF4444" />
                  </Pressable>
                )
              ) : null}
              <Pressable onPress={onClose} className="active:opacity-70">
                <Feather name="x" size={24} color="#FFFFFF" />
              </Pressable>
            </View>
          </View>

          {/* Media + tap zones */}
          <View className="flex-1">
            {current.mediaType === 'video' ? (
              <Video
                source={{ uri: current.mediaUrl }}
                style={{ flex: 1 }}
                resizeMode={ResizeMode.CONTAIN}
                shouldPlay
                onPlaybackStatusUpdate={handleVideoStatus}
              />
            ) : (
              <Image source={{ uri: current.mediaUrl }} className="flex-1" resizeMode="contain" />
            )}

            <View className="absolute inset-0 flex-row">
              <Pressable className="flex-1" onPress={goPrev} />
              <Pressable className="flex-1" onPress={goNext} />
            </View>

            {current.caption ? (
              <View className="absolute bottom-0 left-0 right-0 px-6 pb-10">
                <Text className="text-white text-base">{current.caption}</Text>
              </View>
            ) : null}
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}
