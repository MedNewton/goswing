// lib/social/types.ts
// Domain types shared across the social features (profile, media, stories,
// friends, groups). Kept separate from types/domain.ts to keep the social
// surface self-contained.

export type MediaType = 'image' | 'video';

export type ProfileVisibility = 'public' | 'private';
export type FriendsVisibility = 'public' | 'friends' | 'private';

export type SocialProfileStats = Readonly<{
  attendedCount: number;
  mediaCount: number;
  friendsCount: number;
}>;

export type SocialProfile = Readonly<{
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  coverImageUrl: string | null;
  bio: string | null;
  occupation: string | null;
  city: string | null;
  profileVisibility: ProfileVisibility;
  friendsVisibility: FriendsVisibility;
  stats: SocialProfileStats;
  /** True when the viewer is looking at their own profile. */
  isSelf: boolean;
  /** True when the viewer is allowed to see the full profile body. */
  canView: boolean;
}>;

export type SocialProfileUpdate = Partial<{
  displayName: string;
  avatarUrl: string | null;
  coverImageUrl: string | null;
  bio: string | null;
  occupation: string | null;
  city: string | null;
  profileVisibility: ProfileVisibility;
  friendsVisibility: FriendsVisibility;
}>;

export type UserMedia = Readonly<{
  id: string;
  userId: string;
  mediaType: MediaType;
  mediaUrl: string;
  thumbnailUrl: string | null;
  caption: string | null;
  createdAt: string;
}>;

export type UserStory = Readonly<{
  id: string;
  userId: string;
  mediaType: MediaType;
  mediaUrl: string;
  thumbnailUrl: string | null;
  caption: string | null;
  createdAt: string;
  expiresAt: string;
  // Denormalized author info (filled when listing many users' stories)
  userName?: string | null;
  userAvatarUrl?: string | null;
}>;
