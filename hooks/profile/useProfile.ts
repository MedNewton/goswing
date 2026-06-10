// hooks/profile/useProfile.ts
// Current user's profile — backed by the Gooswing REST API (routes C.1–C.6).

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useUser } from '@clerk/clerk-expo';
import * as meApi from '@/lib/api/me';
import type { ApiProfile } from '@/lib/api/types';
import type { UserProfile, ID } from '@/types/domain';

type UseProfileReturn = {
  profile: UserProfile | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  deactivateAccount: () => Promise<void>;
  deleteAccount: () => Promise<void>;
};

export function useProfile(): UseProfileReturn {
  const { user: clerkUser } = useUser();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const mapProfile = useCallback(
    (raw: ApiProfile): UserProfile => ({
      id: (raw.id || clerkUser?.id || '') as ID,
      name: raw.displayName ?? clerkUser?.fullName ?? '',
      avatarUri: raw.avatarUrl ?? clerkUser?.imageUrl ?? null,
      email: raw.email ?? clerkUser?.primaryEmailAddress?.emailAddress ?? null,
      phone: raw.phone ?? clerkUser?.primaryPhoneNumber?.phoneNumber ?? null,
      phoneVerified:
        raw.phoneVerified ??
        clerkUser?.primaryPhoneNumber?.verification?.status === 'verified',
      city: raw.city ?? undefined,
      countryCode: raw.countryCode ?? undefined,
      profileVisibility: raw.profileVisibility ?? 'public',
      accountStatus: raw.accountStatus ?? 'active',
      createdAt: raw.createdAt ?? undefined,
      updatedAt: raw.updatedAt ?? undefined,
      deactivatedAt: raw.deactivatedAt ?? null,
      deletedAt: raw.deletedAt ?? null,
      occupation: raw.occupation ?? null,
      interests: (raw.interests ?? []).map((i) => i.tagLabel),
      stats: {
        attendedCount: raw.stats?.attendedCount ?? 0,
        savedCount: raw.stats?.savedCount ?? 0,
        reviewsCount: raw.stats?.reviewsCount ?? 0,
      },
    }),
    [clerkUser],
  );

  const fetchProfile = useCallback(async () => {
    if (!clerkUser?.id) {
      setProfile(null);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const raw = await meApi.getMyProfile();
      setProfile(mapProfile(raw));
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch profile'));
    } finally {
      setIsLoading(false);
    }
  }, [clerkUser?.id, mapProfile]);

  useEffect(() => {
    void fetchProfile();
  }, [fetchProfile]);

  const updateProfile = useCallback(
    async (updates: Partial<UserProfile>) => {
      if (!clerkUser?.id) throw new Error('Not authenticated');

      const body: Parameters<typeof meApi.patchMyProfile>[0] = {};
      if (updates.name !== undefined) body.displayName = updates.name;
      if (updates.avatarUri !== undefined) body.avatarUrl = updates.avatarUri ?? null;
      if (updates.email !== undefined) body.email = updates.email ?? null;
      if (updates.phone !== undefined) body.phone = updates.phone ?? null;
      if (updates.phoneVerified !== undefined) body.phoneVerified = updates.phoneVerified;
      if (updates.city !== undefined) body.city = updates.city ?? null;
      if (updates.countryCode !== undefined) body.countryCode = updates.countryCode ?? null;
      if (updates.occupation !== undefined) body.occupation = updates.occupation ?? null;
      if (updates.profileVisibility !== undefined && updates.profileVisibility) {
        body.profileVisibility = updates.profileVisibility;
      }

      const raw = await meApi.patchMyProfile(body);
      setProfile(mapProfile(raw));
    },
    [clerkUser?.id, mapProfile],
  );

  const deactivateAccount = useCallback(async () => {
    if (!clerkUser?.id) throw new Error('Not authenticated');
    await meApi.deactivateMyAccount();
    await fetchProfile();
  }, [clerkUser?.id, fetchProfile]);

  const deleteAccount = useCallback(async () => {
    if (!clerkUser?.id) throw new Error('Not authenticated');
    await meApi.deleteMyAccount();
    setProfile(null);
  }, [clerkUser?.id]);

  return useMemo(
    () => ({
      profile,
      isLoading,
      error,
      refetch: fetchProfile,
      updateProfile,
      deactivateAccount,
      deleteAccount,
    }),
    [profile, isLoading, error, fetchProfile, updateProfile, deactivateAccount, deleteAccount],
  );
}
