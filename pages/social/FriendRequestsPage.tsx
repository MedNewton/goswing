// pages/social/FriendRequestsPage.tsx
// Incoming friend requests with accept / decline.

import React, { useState, type ReactElement } from 'react';
import { View, Text, Image, Pressable, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

import { useFriendRequests } from '@/hooks/social/useFriends';
import type { FriendRequest } from '@/lib/supabase/social/friends';

type Props = Readonly<{
  onBack: () => void;
  onOpenUser?: (userId: string) => void;
}>;

export default function FriendRequestsPage({ onBack, onOpenUser }: Props): ReactElement {
  const { requests, isLoading, accept, decline } = useFriendRequests();
  const [busyId, setBusyId] = useState<string | null>(null);

  const handle = async (id: string, action: 'accept' | 'decline'): Promise<void> => {
    try {
      setBusyId(id);
      if (action === 'accept') await accept(id);
      else await decline(id);
    } catch (err: any) {
      Alert.alert('Something went wrong', err?.message ?? 'Please try again.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right']} className="flex-1 bg-white">
      <View className="flex-row items-center px-5 py-3 border-b border-gray100">
        <Pressable onPress={onBack} className="mr-3 active:opacity-70">
          <Feather name="arrow-left" size={24} color="#111827" />
        </Pressable>
        <Text className="text-lg font-semibold text-black">Friend requests</Text>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#6B7280" />
        </View>
      ) : requests.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8">
          <Feather name="user-plus" size={28} color="#9CA3AF" />
          <Text className="text-gray600 mt-3">No pending requests</Text>
        </View>
      ) : (
        <ScrollView contentContainerClassName="py-3">
          {requests.map((r: FriendRequest) => (
            <View key={r.friendshipId} className="flex-row items-center px-5 py-3">
              <Pressable
                className="flex-row items-center flex-1 active:opacity-80"
                onPress={() => onOpenUser?.(r.requesterId)}
              >
                {r.avatarUrl ? (
                  <Image source={{ uri: r.avatarUrl }} className="w-12 h-12 rounded-full" />
                ) : (
                  <View className="w-12 h-12 rounded-full bg-gray100 items-center justify-center">
                    <Text className="text-gray700 font-semibold">{r.initials}</Text>
                  </View>
                )}
                <Text className="ml-3 text-gray900 font-medium flex-1" numberOfLines={1}>
                  {r.displayName}
                </Text>
              </Pressable>

              <View className="flex-row items-center gap-x-2 ml-2">
                <Pressable
                  onPress={() => handle(r.friendshipId, 'accept')}
                  disabled={busyId === r.friendshipId}
                  className="px-3 py-2 rounded-xl bg-brand active:opacity-90"
                >
                  {busyId === r.friendshipId ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text className="text-white text-sm font-medium">Accept</Text>
                  )}
                </Pressable>
                <Pressable
                  onPress={() => handle(r.friendshipId, 'decline')}
                  disabled={busyId === r.friendshipId}
                  className="px-3 py-2 rounded-xl border border-gray300 active:opacity-90"
                >
                  <Feather name="x" size={16} color="#6B7280" />
                </Pressable>
              </View>
            </View>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
