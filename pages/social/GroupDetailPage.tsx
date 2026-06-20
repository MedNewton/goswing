// pages/social/GroupDetailPage.tsx
// A group's wall: header + post composer + feed of posts (likes & comments).

import React, { useCallback, useEffect, useState, type ReactElement } from 'react';
import {
  View,
  Text,
  Image,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useUser } from '@clerk/clerk-expo';

import { useGroupPosts } from '@/hooks/social/useGroupPosts';
import GroupPostCard from '@/components/social/GroupPostCard';
import GroupPostComposer from '@/components/social/GroupPostComposer';
import GroupCommentsModal from '@/components/social/GroupCommentsModal';
import GroupMembersPage from '@/pages/social/GroupMembersPage';
import { deleteGroup, getGroup, leaveGroup } from '@/lib/supabase/social/groups';
import type { Group, GroupPost } from '@/lib/social/groupTypes';

type Props = Readonly<{
  groupId: string;
  onBack: () => void;
  onLeft: () => void;
  onOpenUser?: (userId: string) => void;
}>;

export default function GroupDetailPage({ groupId, onBack, onLeft, onOpenUser }: Props): ReactElement {
  const { user } = useUser();
  const viewerId = user?.id ?? null;

  const [group, setGroup] = useState<Group | null>(null);
  const [loadingGroup, setLoadingGroup] = useState(true);
  const [subRoute, setSubRoute] = useState<'wall' | 'members'>('wall');
  const [composerOpen, setComposerOpen] = useState(false);
  const [posting, setPosting] = useState(false);
  const [commentsPost, setCommentsPost] = useState<GroupPost | null>(null);

  const { posts, isLoading, createPost, removePost, toggleLike, bumpCommentCount } =
    useGroupPosts(groupId);

  const loadGroup = useCallback(async () => {
    if (!viewerId) return;
    try {
      setLoadingGroup(true);
      setGroup(await getGroup(groupId, viewerId));
    } catch {
      setGroup(null);
    } finally {
      setLoadingGroup(false);
    }
  }, [groupId, viewerId]);

  useEffect(() => {
    loadGroup();
  }, [loadGroup]);

  const isOwner = !!group && group.ownerUserId === viewerId;
  const canModerate = !!group && (group.myRole === 'owner' || group.myRole === 'admin');

  const handleCreate = async (input: { body: string; asset: { uri: string; kind: 'image' | 'video' } | null }): Promise<void> => {
    try {
      setPosting(true);
      await createPost({
        body: input.body || null,
        mediaUri: input.asset?.uri ?? null,
        kind: input.asset?.kind,
      });
      setComposerOpen(false);
    } catch (err: any) {
      Alert.alert('Could not post', err?.message ?? 'Please try again.');
    } finally {
      setPosting(false);
    }
  };

  const handleDeletePost = async (post: GroupPost): Promise<void> => {
    try {
      await removePost(post.id);
    } catch (err: any) {
      Alert.alert('Could not delete', err?.message ?? 'Please try again.');
    }
  };

  const confirmLeave = (): void => {
    if (isOwner) {
      Alert.alert('Delete group', 'You own this group. Deleting it removes it for everyone.', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteGroup(groupId);
              onLeft();
            } catch (err: any) {
              Alert.alert('Could not delete', err?.message ?? 'Please try again.');
            }
          },
        },
      ]);
    } else {
      Alert.alert('Leave group', 'Leave this group?', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: async () => {
            if (!viewerId) return;
            try {
              await leaveGroup(groupId, viewerId);
              onLeft();
            } catch (err: any) {
              Alert.alert('Could not leave', err?.message ?? 'Please try again.');
            }
          },
        },
      ]);
    }
  };

  if (subRoute === 'members') {
    return (
      <GroupMembersPage
        groupId={groupId}
        onBack={() => {
          setSubRoute('wall');
          loadGroup();
        }}
        onOpenUser={onOpenUser}
      />
    );
  }

  return (
    <SafeAreaView edges={['top', 'left', 'right']} className="flex-1 bg-gray50">
      <View className="flex-row items-center justify-between px-5 py-3 bg-white border-b border-gray100">
        <View className="flex-row items-center flex-1">
          <Pressable onPress={onBack} className="mr-3 active:opacity-70">
            <Feather name="arrow-left" size={24} color="#111827" />
          </Pressable>
          <Text numberOfLines={1} className="text-lg font-semibold text-black flex-1">
            {group?.name ?? 'Group'}
          </Text>
        </View>
        <Pressable onPress={confirmLeave} className="p-1 active:opacity-70">
          <Feather name={isOwner ? 'trash-2' : 'log-out'} size={20} color="#6B7280" />
        </Pressable>
      </View>

      {loadingGroup ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#6B7280" />
        </View>
      ) : !group ? (
        <View className="flex-1 items-center justify-center px-8">
          <Feather name="users" size={28} color="#9CA3AF" />
          <Text className="text-gray600 mt-3 text-center">This group is unavailable.</Text>
        </View>
      ) : (
        <ScrollView contentContainerClassName="pb-24">
          {/* Header */}
          <View className="h-32 bg-gray200">
            {group.coverImageUrl ? (
              <Image source={{ uri: group.coverImageUrl }} className="w-full h-full" resizeMode="cover" />
            ) : (
              <View className="w-full h-full bg-brand/15" />
            )}
          </View>
          <View className="px-5 pt-4">
            <Text className="text-xl font-bold text-black">{group.name}</Text>
            {group.description ? (
              <Text className="text-sm text-gray600 mt-1 leading-5">{group.description}</Text>
            ) : null}
            <Pressable
              onPress={() => setSubRoute('members')}
              className="flex-row items-center gap-x-2 mt-3 active:opacity-70"
            >
              <Feather name="users" size={16} color="#0EA5E9" />
              <Text className="text-sm text-brand font-medium">
                {group.memberCount} member{group.memberCount === 1 ? '' : 's'}
              </Text>
              {canModerate ? <Text className="text-xs text-gray500">· manage</Text> : null}
            </Pressable>
          </View>

          {/* Composer trigger */}
          <Pressable
            onPress={() => setComposerOpen(true)}
            className="mx-5 mt-4 rounded-2xl border border-gray200 bg-white px-4 py-3 flex-row items-center gap-x-3 active:opacity-90"
          >
            <Feather name="edit-3" size={18} color="#0EA5E9" />
            <Text className="text-gray500">Share something with the group…</Text>
          </Pressable>

          {/* Feed */}
          <View className="px-5 mt-4">
            {isLoading ? (
              <View className="py-10 items-center">
                <ActivityIndicator size="small" color="#9CA3AF" />
              </View>
            ) : posts.length === 0 ? (
              <View className="py-12 items-center">
                <Feather name="message-square" size={28} color="#9CA3AF" />
                <Text className="text-gray500 text-sm mt-3">No posts yet — start the conversation.</Text>
              </View>
            ) : (
              posts.map((post) => (
                <GroupPostCard
                  key={post.id}
                  post={post}
                  canDelete={post.authorId === viewerId || canModerate}
                  onToggleLike={toggleLike}
                  onOpenComments={setCommentsPost}
                  onDelete={handleDeletePost}
                  onOpenUser={onOpenUser}
                />
              ))
            )}
          </View>
        </ScrollView>
      )}

      <GroupPostComposer
        visible={composerOpen}
        submitting={posting}
        onCancel={() => setComposerOpen(false)}
        onSubmit={handleCreate}
      />
      <GroupCommentsModal
        postId={commentsPost?.id ?? null}
        viewerId={viewerId}
        onClose={() => setCommentsPost(null)}
        onChanged={bumpCommentCount}
        onOpenUser={onOpenUser}
      />
    </SafeAreaView>
  );
}
