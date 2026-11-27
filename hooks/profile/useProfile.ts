// hooks/profile/useProfile.ts
// Current user's profile — backed by the Gooswing REST API (routes C.1–C.6).
//
// Every component calling useProfile() shares one in-memory copy, so an edit
// made in Edit profile shows up at once in the Profile tab header (and in the
// shell, which reads the city).

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useUser } from '@clerk/clerk-expo';
import * as meApi from '@/lib/api/me';
import * as profileApi from '@/lib/api/profile';
import type { ApiProfileV4, ProfilePatch, ProfileSupport, DeleteAccountResult } from '@/lib/api/profile';
import type { UserProfile, ID } from '@/types/domain';

/** Phase 4 profile fields, null when absent. */
export type ProfileExtras = Readonly<{
  username: string | null;
  bio: string | null;
  dateOfBirth: string | null;
  accountStatus: string | null;
  scheduledDeletionAt: string | null;
}>;

type UseProfileReturn = {
  profile: UserProfile | null;
  /** Phase 4 fields (username, bio…) when the server returns them. */
  extras: ProfileExtras;
  /** Which Phase 4 fields the server supports (present in the response). */
  support: ProfileSupport;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  /** Raw PATCH /v1/me/profile, including Phase 4 fields. */
  patchProfile: (body: ProfilePatch) => Promise<void>;
  /** Replace the shared copy with a server response (e.g. after an avatar upload). */
  applyProfile: (raw: Partial<ApiProfileV4>) => void;
  deactivateAccount: () => Promise<void>;
  deleteAccount: () => Promise<DeleteAccountResult>;
};

// ─── Shared store ─────────────────────────────────────────────────────────────

type Store = { raw: ApiProfileV4 | null; userId: string | null; inflight: Promise<void> | null };
const store: Store = { raw: null, userId: null, inflight: null };
const listeners = new Set<() => void>();
const emit = (): void => listeners.forEach((l) => l());

function setShared(raw: ApiProfileV4 | null): void {
  store.raw = raw;
  emit();
}

export function useProfile(): UseProfileReturn {
  const { user: clerkUser } = useUser();
  const userId = clerkUser?.id ?? null;
  const [, force] = useState(0);
  const [isLoading, setIsLoading] = useState(store.raw == null || store.userId !== userId);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const l = (): void => force((n) => n + 1);
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  }, []);

  const mapProfile = useCallback(
    (raw: ApiProfileV4): UserProfile => ({
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
      accountStatus: (raw.accountStatus as UserProfile['accountStatus']) ?? 'active',
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
    if (!userId) {
      setShared(null);
      setIsLoading(false);
      return;
    }
    try {
      setIsLoading(true);
      setError(null);
      if (!store.inflight) {
        store.inflight = meApi
          .getMyProfile()
          .then((raw) => {
            store.userId = userId;
            setShared(raw as ApiProfileV4);
          })
          .finally(() => {
            store.inflight = null;
          });
      }
      await store.inflight;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch profile'));
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (store.raw && store.userId === userId) {
      setIsLoading(false);
      return;
    }
    void fetchProfile();
  }, [fetchProfile, userId]);

  const patchProfile = useCallback(
    async (body: ProfilePatch) => {
      if (!userId) throw new Error('Not authenticated');
      const raw = await profileApi.patchProfile(body);
      setShared({ ...(store.raw ?? {}), ...raw } as ApiProfileV4);
    },
    [userId],
  );

  const updateProfile = useCallback(
    async (updates: Partial<UserProfile>) => {
      if (!userId) throw new Error('Not authenticated');

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
      setShared({ ...(store.raw ?? {}), ...raw } as ApiProfileV4);
    },
    [userId],
  );

  const applyProfile = useCallback((raw: Partial<ApiProfileV4>) => {
    setShared({ ...(store.raw ?? {}), ...raw } as ApiProfileV4);
  }, []);

  const deactivateAccount = useCallback(async () => {
    if (!userId) throw new Error('Not authenticated');
    await meApi.deactivateMyAccount();
    store.raw = null;
    await fetchProfile();
  }, [userId, fetchProfile]);

  const deleteAccount = useCallback(async () => {
    if (!userId) throw new Error('Not authenticated');
    const res = await profileApi.deleteAccount();
    if (res.accountStatus === 'pendingDeletion') {
      applyProfile({ accountStatus: res.accountStatus, scheduledDeletionAt: res.scheduledDeletionAt ?? null });
    } else {
      setShared(null);
    }
    return res;
  }, [userId, applyProfile]);

  const raw = store.userId === userId ? store.raw : null;
  const profile = useMemo(() => (raw ? mapProfile(raw) : null), [raw, mapProfile]);
  const extras = useMemo<ProfileExtras>(
    () => ({
      username: raw?.username ?? null,
      bio: raw?.bio ?? null,
      dateOfBirth: raw?.dateOfBirth ?? null,
      accountStatus: raw?.accountStatus ?? null,
      scheduledDeletionAt: raw?.scheduledDeletionAt ?? null,
    }),
    [raw],
  );
  const support = useMemo(() => profileApi.profileSupport(raw), [raw]);

  return useMemo(
    () => ({
      profile,
      extras,
      support,
      isLoading: isLoading && !raw,
      error,
      refetch: fetchProfile,
      updateProfile,
      patchProfile,
      applyProfile,
      deactivateAccount,
      deleteAccount,
    }),
    [profile, extras, support, isLoading, raw, error, fetchProfile, updateProfile, patchProfile, applyProfile, deactivateAccount, deleteAccount],
  );
}
