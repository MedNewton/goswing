// pages/social/GroupMembersPage.tsx
// Group members list + add friends directly or send invites.

import React, { useCallback, useEffect, useMemo, useState, type ReactElement } from 'react';
import { View, Text, Image, Pressable, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useUser } from '@clerk/clerk-expo';

import { useFriends } from '@/hooks/social/useFriends';
import {
  addGroupMember,
  inviteToGroup,
  listGroupMembers,
} from '@/lib/supabase/social/groups';
import type { GroupMember } from '@/lib/social/groupTypes';

type Props = Readonly<{
  groupId: string;
  onBack: () => void;
  onOpenUser?: (userId: string) => void;
}>;

export default function GroupMembersPage({ groupId, onBack, onOpenUser }: Props): ReactElement {
  const { user } = useUser();
  const viewerId = user?.id ?? null;
  const { friends } = useFriends(viewerId);

  const [members, setMembers] = useState<ReadonlyArray<GroupMember>>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [invitedIds, setInvitedIds] = useState<ReadonlySet<string>>(new Set());

  const loadMembers = useCallback(async () => {
    try {
      setLoading(true);
      setMembers(await listGroupMembers(groupId));
    } catch {
      setMembers([]);
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  const memberIds = useMemo(() => new Set(members.map((m) => m.userId)), [members]);
  const eligibleFriends = useMemo(
    () => friends.filter((f) => !memberIds.has(f.userId)),
    [friends, memberIds],
  );

  const addFriend = async (userId: string): Promise<void> => {
    if (!viewerId) return;
    try {
      setBusyId(userId);
      await addGroupMember(groupId, userId, viewerId);
      await loadMembers();
    } catch (err: any) {
      Alert.alert('Could not add', err?.message ?? 'Please try again.');
    } finally {
      setBusyId(null);
    }
  };

  const invite = async (userId: string): Promise<void> => {
    try {
      setBusyId(userId);
      await inviteToGroup(groupId, userId);
      setInvitedIds((prev) => new Set(prev).add(userId));
    } catch (err: any) {
      Alert.alert('Could not invite', err?.message ?? 'Please try again.');
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
        <Text className="text-lg font-semibold text-black">Members</Text>
      </View>

      <ScrollView contentContainerClassName="pb-16">
        {/* Current members */}
        <Text className="px-5 pt-4 pb-1 text-xs font-semibold text-gray500 uppercase">
          {members.length} member{members.length === 1 ? '' : 's'}
        </Text>
        {loading ? (
          <View className="py-8 items-center">
            <ActivityIndicator size="small" color="#9CA3AF" />
          </View>
        ) : (
          members.map((m) => (
            <Pressable
              key={m.userId}
              onPress={() => onOpenUser?.(m.userId)}
              className="flex-row items-center px-5 py-3 active:opacity-80"
            >
              {m.avatarUrl ? (
                <Image source={{ uri: m.avatarUrl }} className="w-11 h-11 rounded-full" />
              ) : (
                <View className="w-11 h-11 rounded-full bg-gray100 items-center justify-center">
                  <Text className="text-gray700 font-semibold">{m.initials}</Text>
                </View>
              )}
              <Text className="ml-3 flex-1 text-gray900 font-medium" numberOfLines={1}>
                {m.displayName}
              </Text>
              {m.role !== 'member' ? (
                <View className="px-2 py-0.5 rounded-full bg-gray100">
                  <Text className="text-[11px] text-gray600 capitalize">{m.role}</Text>
                </View>
              ) : null}
            </Pressable>
          ))
        )}

        {/* Add from friends */}
        <Text className="px-5 pt-6 pb-1 text-xs font-semibold text-gray500 uppercase">
          Add from friends
        </Text>
        {eligibleFriends.length === 0 ? (
          <Text className="px-5 py-4 text-sm text-gray500">
            All your friends are already in this group.
          </Text>
        ) : (
          eligibleFriends.map((f) => {
            const invited = invitedIds.has(f.userId);
            return (
              <View key={f.userId} className="flex-row items-center px-5 py-3">
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
                <View className="flex-row items-center gap-x-2">
                  <Pressable
                    onPress={() => addFriend(f.userId)}
                    disabled={busyId === f.userId}
                    className="px-3 py-1.5 rounded-xl bg-brand active:opacity-90"
                  >
                    {busyId === f.userId ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text className="text-white text-xs font-medium">Add</Text>
                    )}
                  </Pressable>
                  <Pressable
                    onPress={() => invite(f.userId)}
                    disabled={busyId === f.userId || invited}
                    className="px-3 py-1.5 rounded-xl border border-gray300 active:opacity-90"
                  >
                    <Text className="text-gray700 text-xs font-medium">
                      {invited ? 'Invited' : 'Invite'}
                    </Text>
                  </Pressable>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
