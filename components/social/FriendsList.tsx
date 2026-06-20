// components/social/FriendsList.tsx
// Renders a user's accepted friends as tappable rows.

import React, { type ReactElement } from 'react';
import { View, Text, Image, Pressable, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useFriends } from '@/hooks/social/useFriends';

type Props = Readonly<{
  userId: string;
  emptyLabel: string;
  onOpenUser: (userId: string) => void;
}>;

export default function FriendsList({ userId, emptyLabel, onOpenUser }: Props): ReactElement {
  const { friends, isLoading } = useFriends(userId);

  if (isLoading) {
    return (
      <View className="py-12 items-center">
        <ActivityIndicator size="small" color="#9CA3AF" />
      </View>
    );
  }

  if (friends.length === 0) {
    return (
      <View className="items-center justify-center py-12">
        <Feather name="users" size={26} color="#9CA3AF" />
        <Text className="text-gray500 text-sm mt-3">{emptyLabel}</Text>
      </View>
    );
  }

  return (
    <View className="rounded-2xl border border-gray200 bg-white overflow-hidden">
      {friends.map((f, i) => (
        <Pressable
          key={f.friendshipId}
          onPress={() => onOpenUser(f.userId)}
          className={`flex-row items-center px-4 py-3 active:opacity-80 ${i > 0 ? 'border-t border-gray100' : ''}`}
        >
          {f.avatarUrl ? (
            <Image source={{ uri: f.avatarUrl }} className="w-11 h-11 rounded-full" />
          ) : (
            <View className="w-11 h-11 rounded-full bg-gray100 items-center justify-center">
              <Text className="text-gray700 font-semibold">{f.initials}</Text>
            </View>
          )}
          <Text className="ml-3 flex-1 text-gray900 font-medium" numberOfLines={1}>
            {f.displayName}
          </Text>
          <Feather name="chevron-right" size={18} color="#D1D5DB" />
        </Pressable>
      ))}
    </View>
  );
}
