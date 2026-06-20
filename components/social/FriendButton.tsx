// components/social/FriendButton.tsx
// Relationship-aware action button shown on another user's profile.

import React, { type ReactElement } from 'react';
import { View, Text, Pressable, ActivityIndicator, Alert } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useFriendship } from '@/hooks/social/useFriends';

type Props = Readonly<{
  targetId: string;
  onChanged?: () => void;
}>;

export default function FriendButton({ targetId, onChanged }: Props): ReactElement | null {
  const { state, isLoading, busy, add, cancel, accept, decline, unfriend } = useFriendship(targetId);

  if (isLoading) {
    return (
      <View className="px-4 py-2 rounded-xl border border-gray200 bg-white">
        <ActivityIndicator size="small" color="#9CA3AF" />
      </View>
    );
  }

  const run = async (fn: () => Promise<void>): Promise<void> => {
    try {
      await fn();
      onChanged?.();
    } catch (err: any) {
      Alert.alert('Something went wrong', err?.message ?? 'Please try again.');
    }
  };

  const confirmUnfriend = (): void => {
    Alert.alert('Remove friend', 'Remove this person from your friends?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => run(unfriend) },
    ]);
  };

  if (state.status === 'self') return null;

  if (state.status === 'friends') {
    return (
      <Pressable
        onPress={confirmUnfriend}
        disabled={busy}
        className="flex-row items-center gap-x-2 px-4 py-2 rounded-xl border border-gray300 bg-white active:opacity-90"
      >
        <Feather name="user-check" size={16} color="#10B981" />
        <Text className="text-sm text-gray900 font-medium">Friends</Text>
      </Pressable>
    );
  }

  if (state.status === 'outgoing') {
    return (
      <Pressable
        onPress={() => run(cancel)}
        disabled={busy}
        className="flex-row items-center gap-x-2 px-4 py-2 rounded-xl border border-gray300 bg-white active:opacity-90"
      >
        {busy ? (
          <ActivityIndicator size="small" color="#9CA3AF" />
        ) : (
          <Feather name="clock" size={16} color="#6B7280" />
        )}
        <Text className="text-sm text-gray700 font-medium">Requested</Text>
      </Pressable>
    );
  }

  if (state.status === 'incoming') {
    return (
      <View className="flex-row items-center gap-x-2">
        <Pressable
          onPress={() => run(accept)}
          disabled={busy}
          className="flex-row items-center gap-x-2 px-4 py-2 rounded-xl bg-brand active:opacity-90"
        >
          {busy ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Feather name="user-check" size={16} color="#FFFFFF" />
          )}
          <Text className="text-sm text-white font-medium">Accept</Text>
        </Pressable>
        <Pressable
          onPress={() => run(decline)}
          disabled={busy}
          className="px-3 py-2 rounded-xl border border-gray300 bg-white active:opacity-90"
        >
          <Feather name="x" size={16} color="#6B7280" />
        </Pressable>
      </View>
    );
  }

  // none
  return (
    <Pressable
      onPress={() => run(add)}
      disabled={busy}
      className="flex-row items-center gap-x-2 px-4 py-2 rounded-xl bg-brand active:opacity-90"
    >
      {busy ? (
        <ActivityIndicator size="small" color="#FFFFFF" />
      ) : (
        <Feather name="user-plus" size={16} color="#FFFFFF" />
      )}
      <Text className="text-sm text-white font-medium">Add friend</Text>
    </Pressable>
  );
}
