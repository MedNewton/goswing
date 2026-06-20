// components/social/GroupPostCard.tsx
import React, { type ReactElement } from 'react';
import { View, Text, Image, Pressable, Alert } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Video, ResizeMode } from 'expo-av';
import type { GroupPost } from '@/lib/social/groupTypes';

type Props = Readonly<{
  post: GroupPost;
  canDelete: boolean;
  onToggleLike: (post: GroupPost) => void;
  onOpenComments: (post: GroupPost) => void;
  onDelete: (post: GroupPost) => void;
  onOpenUser?: (userId: string) => void;
}>;

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min}m`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h`;
  const d = Math.floor(hr / 24);
  if (d < 7) return `${d}d`;
  return new Date(iso).toLocaleDateString();
}

export default function GroupPostCard({
  post,
  canDelete,
  onToggleLike,
  onOpenComments,
  onDelete,
  onOpenUser,
}: Props): ReactElement {
  const confirmDelete = (): void => {
    Alert.alert('Delete post', 'Remove this post?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => onDelete(post) },
    ]);
  };

  return (
    <View className="rounded-2xl border border-gray200 bg-white p-4 mb-3">
      {/* Author */}
      <View className="flex-row items-center">
        <Pressable
          className="flex-row items-center flex-1 active:opacity-80"
          onPress={() => onOpenUser?.(post.authorId)}
        >
          {post.authorAvatarUrl ? (
            <Image source={{ uri: post.authorAvatarUrl }} className="w-10 h-10 rounded-full" />
          ) : (
            <View className="w-10 h-10 rounded-full bg-gray100 items-center justify-center">
              <Text className="text-gray700 font-semibold">
                {(post.authorName || 'U').slice(0, 1).toUpperCase()}
              </Text>
            </View>
          )}
          <View className="ml-3">
            <Text className="text-gray900 font-medium">{post.authorName}</Text>
            <Text className="text-xs text-gray500">{timeAgo(post.createdAt)}</Text>
          </View>
        </Pressable>
        {canDelete ? (
          <Pressable onPress={confirmDelete} className="p-1 active:opacity-70">
            <Feather name="more-horizontal" size={20} color="#9CA3AF" />
          </Pressable>
        ) : null}
      </View>

      {/* Body */}
      {post.body ? <Text className="text-gray800 mt-3 leading-6">{post.body}</Text> : null}

      {/* Media */}
      {post.mediaUrl ? (
        <View className="mt-3 rounded-xl overflow-hidden bg-gray100">
          {post.mediaType === 'video' ? (
            <Video
              source={{ uri: post.mediaUrl }}
              style={{ width: '100%', aspectRatio: 1 }}
              useNativeControls
              resizeMode={ResizeMode.COVER}
            />
          ) : (
            <Image
              source={{ uri: post.mediaUrl }}
              style={{ width: '100%', aspectRatio: 1 }}
              resizeMode="cover"
            />
          )}
        </View>
      ) : null}

      {/* Actions */}
      <View className="flex-row items-center gap-x-6 mt-3 pt-3 border-t border-gray100">
        <Pressable onPress={() => onToggleLike(post)} className="flex-row items-center gap-x-2 active:opacity-70">
          <Feather
            name="heart"
            size={18}
            color={post.likedByMe ? '#EF4444' : '#6B7280'}
          />
          <Text className={`text-sm ${post.likedByMe ? 'text-danger' : 'text-gray600'}`}>
            {post.likeCount}
          </Text>
        </Pressable>
        <Pressable onPress={() => onOpenComments(post)} className="flex-row items-center gap-x-2 active:opacity-70">
          <Feather name="message-circle" size={18} color="#6B7280" />
          <Text className="text-sm text-gray600">{post.commentCount}</Text>
        </Pressable>
      </View>
    </View>
  );
}
