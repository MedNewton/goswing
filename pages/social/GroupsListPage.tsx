// pages/social/GroupsListPage.tsx
// Orchestrator for the groups area: my groups, create, detail, invites, and
// opening a member's social profile.

import React, { useState, type ReactElement } from 'react';
import { View, Text, Image, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

import { useMyGroups, useGroupInvites } from '@/hooks/social/useGroups';
import CreateGroupPage from '@/pages/social/CreateGroupPage';
import GroupDetailPage from '@/pages/social/GroupDetailPage';
import GroupInvitesPage from '@/pages/social/GroupInvitesPage';
import SocialProfilePage from '@/pages/social/SocialProfilePage';
import type { Group } from '@/lib/social/groupTypes';

type Props = Readonly<{
  onBack: () => void;
}>;

type Route =
  | { name: 'list' }
  | { name: 'create' }
  | { name: 'detail'; groupId: string }
  | { name: 'invites' }
  | { name: 'user'; userId: string };

export default function GroupsListPage({ onBack }: Props): ReactElement {
  const [route, setRoute] = useState<Route>({ name: 'list' });
  const { groups, isLoading, refetch } = useMyGroups();
  const invites = useGroupInvites();

  const openUser = (userId: string) => setRoute({ name: 'user', userId });

  if (route.name === 'create') {
    return (
      <CreateGroupPage
        onBack={() => setRoute({ name: 'list' })}
        onCreated={(groupId) => {
          refetch();
          setRoute({ name: 'detail', groupId });
        }}
      />
    );
  }

  if (route.name === 'detail') {
    return (
      <GroupDetailPage
        groupId={route.groupId}
        onBack={() => {
          setRoute({ name: 'list' });
          refetch();
        }}
        onLeft={() => {
          setRoute({ name: 'list' });
          refetch();
        }}
        onOpenUser={openUser}
      />
    );
  }

  if (route.name === 'invites') {
    return (
      <GroupInvitesPage
        onBack={() => {
          setRoute({ name: 'list' });
          invites.refetch();
          refetch();
        }}
        onAccepted={(groupId) => {
          refetch();
          setRoute({ name: 'detail', groupId });
        }}
      />
    );
  }

  if (route.name === 'user') {
    return <SocialProfilePage userId={route.userId} onBack={() => setRoute({ name: 'list' })} />;
  }

  return (
    <SafeAreaView edges={['top', 'left', 'right']} className="flex-1 bg-white">
      <View className="flex-row items-center justify-between px-5 py-3 border-b border-gray100">
        <View className="flex-row items-center">
          <Pressable onPress={onBack} className="mr-3 active:opacity-70">
            <Feather name="arrow-left" size={24} color="#111827" />
          </Pressable>
          <Text className="text-lg font-semibold text-black">Groups</Text>
        </View>
        <View className="flex-row items-center gap-x-2">
          <Pressable
            onPress={() => setRoute({ name: 'invites' })}
            className="p-2 rounded-xl border border-gray200 active:opacity-90"
          >
            <Feather name="mail" size={18} color="#111827" />
            {invites.count > 0 ? (
              <View className="absolute -top-1.5 -right-1.5 bg-danger rounded-full min-w-[18px] h-[18px] items-center justify-center px-1">
                <Text className="text-white text-[10px] font-bold">{invites.count}</Text>
              </View>
            ) : null}
          </Pressable>
          <Pressable
            onPress={() => setRoute({ name: 'create' })}
            className="flex-row items-center gap-x-1.5 px-3 py-2 rounded-xl bg-brand active:opacity-90"
          >
            <Feather name="plus" size={16} color="#FFFFFF" />
            <Text className="text-white text-sm font-medium">New</Text>
          </Pressable>
        </View>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#6B7280" />
        </View>
      ) : groups.length === 0 ? (
        <View className="flex-1 items-center justify-center px-10">
          <Feather name="users" size={32} color="#9CA3AF" />
          <Text className="text-gray700 font-semibold mt-3">No groups yet</Text>
          <Text className="text-gray500 text-sm mt-1 text-center">
            Create a group to share posts, photos and videos with friends.
          </Text>
          <Pressable
            onPress={() => setRoute({ name: 'create' })}
            className="mt-4 px-5 py-2.5 rounded-xl bg-brand active:opacity-90"
          >
            <Text className="text-white font-medium">Create a group</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView contentContainerClassName="p-5">
          {groups.map((g: Group) => (
            <Pressable
              key={g.id}
              onPress={() => setRoute({ name: 'detail', groupId: g.id })}
              className="flex-row items-center rounded-2xl border border-gray200 bg-white p-3 mb-3 active:opacity-90"
            >
              {g.coverImageUrl ? (
                <Image source={{ uri: g.coverImageUrl }} className="w-14 h-14 rounded-xl" />
              ) : (
                <View className="w-14 h-14 rounded-xl bg-brand/15 items-center justify-center">
                  <Feather name="users" size={22} color="#0EA5E9" />
                </View>
              )}
              <View className="flex-1 ml-3">
                <Text className="text-gray900 font-semibold" numberOfLines={1}>
                  {g.name}
                </Text>
                <Text className="text-xs text-gray500 mt-0.5">
                  {g.memberCount} member{g.memberCount === 1 ? '' : 's'}
                  {g.myRole && g.myRole !== 'member' ? ` · ${g.myRole}` : ''}
                </Text>
              </View>
              <Feather name="chevron-right" size={20} color="#D1D5DB" />
            </Pressable>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
