// pages/social/GroupInvitesPage.tsx
import React, { useState, type ReactElement } from 'react';
import { View, Text, Image, Pressable, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

import { useGroupInvites } from '@/hooks/social/useGroups';
import type { GroupInvite } from '@/lib/social/groupTypes';

type Props = Readonly<{
  onBack: () => void;
  onAccepted?: (groupId: string) => void;
}>;

export default function GroupInvitesPage({ onBack, onAccepted }: Props): ReactElement {
  const { invites, isLoading, accept, decline } = useGroupInvites();
  const [busyId, setBusyId] = useState<string | null>(null);

  const handle = async (invite: GroupInvite, action: 'accept' | 'decline'): Promise<void> => {
    try {
      setBusyId(invite.id);
      if (action === 'accept') {
        await accept(invite);
        onAccepted?.(invite.groupId);
      } else {
        await decline(invite.id);
      }
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
        <Text className="text-lg font-semibold text-black">Group invites</Text>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#6B7280" />
        </View>
      ) : invites.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8">
          <Feather name="mail" size={28} color="#9CA3AF" />
          <Text className="text-gray600 mt-3">No pending invites</Text>
        </View>
      ) : (
        <ScrollView contentContainerClassName="py-3">
          {invites.map((inv) => (
            <View key={inv.id} className="flex-row items-center px-5 py-3">
              {inv.groupCoverUrl ? (
                <Image source={{ uri: inv.groupCoverUrl }} className="w-12 h-12 rounded-xl" />
              ) : (
                <View className="w-12 h-12 rounded-xl bg-brand/15 items-center justify-center">
                  <Feather name="users" size={20} color="#0EA5E9" />
                </View>
              )}
              <Text className="ml-3 flex-1 text-gray900 font-medium" numberOfLines={1}>
                {inv.groupName}
              </Text>
              <View className="flex-row items-center gap-x-2">
                <Pressable
                  onPress={() => handle(inv, 'accept')}
                  disabled={busyId === inv.id}
                  className="px-3 py-2 rounded-xl bg-brand active:opacity-90"
                >
                  {busyId === inv.id ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text className="text-white text-sm font-medium">Join</Text>
                  )}
                </Pressable>
                <Pressable
                  onPress={() => handle(inv, 'decline')}
                  disabled={busyId === inv.id}
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
