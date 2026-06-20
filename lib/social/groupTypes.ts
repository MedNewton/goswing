// lib/social/groupTypes.ts
import type { MediaType } from '@/lib/social/types';

export type GroupRole = 'owner' | 'admin' | 'member';
export type GroupPrivacy = 'private' | 'public';

export type Group = Readonly<{
  id: string;
  name: string;
  description: string | null;
  coverImageUrl: string | null;
  ownerUserId: string;
  privacy: GroupPrivacy;
  memberCount: number;
  myRole: GroupRole | null;
  createdAt: string;
}>;

export type GroupMember = Readonly<{
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  initials: string;
  role: GroupRole;
}>;

export type GroupPost = Readonly<{
  id: string;
  groupId: string;
  authorId: string;
  authorName: string;
  authorAvatarUrl: string | null;
  body: string | null;
  mediaType: MediaType | null;
  mediaUrl: string | null;
  createdAt: string;
  likeCount: number;
  commentCount: number;
  likedByMe: boolean;
}>;

export type GroupComment = Readonly<{
  id: string;
  postId: string;
  authorId: string;
  authorName: string;
  authorAvatarUrl: string | null;
  body: string;
  createdAt: string;
}>;

export type GroupInvite = Readonly<{
  id: string;
  groupId: string;
  groupName: string;
  groupCoverUrl: string | null;
  inviterId: string;
  createdAt: string;
}>;
