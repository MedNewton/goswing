// hooks/social/useSocialProfile.ts
import { useCallback, useEffect, useState } from 'react';
import { useUser } from '@clerk/clerk-expo';
import {
  getSocialProfile,
  updateSocialProfile,
} from '@/lib/supabase/social/profileSocial';
import type { SocialProfile, SocialProfileUpdate } from '@/lib/social/types';

type UseSocialProfileReturn = {
  profile: SocialProfile | null;
  isLoading: boolean;
  error: Error | null;
  viewerId: string | null;
  refetch: () => Promise<void>;
  update: (updates: SocialProfileUpdate) => Promise<void>;
};

/**
 * Loads the social profile for `targetUserId` (defaults to the signed-in user).
 * Updates are only meaningful when viewing your own profile.
 */
export function useSocialProfile(targetUserId?: string): UseSocialProfileReturn {
  const { user } = useUser();
  const viewerId = user?.id ?? null;
  const resolvedTarget = targetUserId ?? viewerId ?? null;

  const [profile, setProfile] = useState<SocialProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchProfile = useCallback(async () => {
    if (!resolvedTarget || !viewerId) {
      setProfile(null);
      setIsLoading(false);
      return;
    }
    try {
      setIsLoading(true);
      setError(null);
      const data = await getSocialProfile(resolvedTarget, viewerId);
      setProfile(data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load profile'));
    } finally {
      setIsLoading(false);
    }
  }, [resolvedTarget, viewerId]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const update = useCallback(
    async (updates: SocialProfileUpdate) => {
      if (!viewerId) throw new Error('Not authenticated');
      await updateSocialProfile(viewerId, updates);
      setProfile((prev) =>
        prev
          ? {
              ...prev,
              displayName: updates.displayName ?? prev.displayName,
              avatarUrl:
                updates.avatarUrl !== undefined ? updates.avatarUrl : prev.avatarUrl,
              coverImageUrl:
                updates.coverImageUrl !== undefined
                  ? updates.coverImageUrl
                  : prev.coverImageUrl,
              bio: updates.bio !== undefined ? updates.bio : prev.bio,
              occupation:
                updates.occupation !== undefined ? updates.occupation : prev.occupation,
              city: updates.city !== undefined ? updates.city : prev.city,
              profileVisibility: updates.profileVisibility ?? prev.profileVisibility,
              friendsVisibility: updates.friendsVisibility ?? prev.friendsVisibility,
            }
          : prev,
      );
    },
    [viewerId],
  );

  return { profile, isLoading, error, viewerId, refetch: fetchProfile, update };
}
