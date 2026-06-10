// hooks/profile/useUserInterests.ts
// User interests — backed by the Gooswing REST API (routes H.1–H.4).

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useUser } from '@clerk/clerk-expo';
import * as meApi from '@/lib/api/me';
import type { ApiUserInterest } from '@/lib/api/types';
import type { UserInterest, ID } from '@/types/domain';

type UseUserInterestsReturn = {
  interests: ReadonlyArray<UserInterest>;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  addInterest: (tagId: ID) => Promise<void>;
  removeInterest: (tagId: ID) => Promise<void>;
  replaceAllInterests: (tagIds: ReadonlyArray<ID>) => Promise<void>;
};

function mapInterest(raw: ApiUserInterest): UserInterest {
  return {
    userId: String(raw.userId) as ID,
    tagId: String(raw.tagId) as ID,
    tagLabel: String(raw.tagLabel ?? ''),
    tagSlug: String(raw.tagSlug ?? ''),
    createdAt: raw.createdAt ?? undefined,
  };
}

export function useUserInterests(): UseUserInterestsReturn {
  const { user: clerkUser } = useUser();
  const [interests, setInterests] = useState<ReadonlyArray<UserInterest>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchInterests = useCallback(async () => {
    if (!clerkUser?.id) {
      setInterests([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const page = await meApi.getMyInterests();
      setInterests((page.items ?? []).map(mapInterest));
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch interests'));
    } finally {
      setIsLoading(false);
    }
  }, [clerkUser?.id]);

  useEffect(() => {
    void fetchInterests();
  }, [fetchInterests]);

  const addInterest = useCallback(
    async (tagId: ID) => {
      if (!clerkUser?.id) throw new Error('Not authenticated');
      const page = await meApi.addMyInterest(String(tagId));
      setInterests((page.items ?? []).map(mapInterest));
    },
    [clerkUser?.id],
  );

  const removeInterest = useCallback(
    async (tagId: ID) => {
      if (!clerkUser?.id) throw new Error('Not authenticated');
      await meApi.removeMyInterest(String(tagId));
      setInterests((prev) => prev.filter((i) => String(i.tagId) !== String(tagId)));
    },
    [clerkUser?.id],
  );

  const replaceAllInterests = useCallback(
    async (tagIds: ReadonlyArray<ID>) => {
      if (!clerkUser?.id) throw new Error('Not authenticated');
      const page = await meApi.replaceMyInterests(tagIds.map(String));
      setInterests((page.items ?? []).map(mapInterest));
    },
    [clerkUser?.id],
  );

  return useMemo(
    () => ({
      interests,
      isLoading,
      error,
      refetch: fetchInterests,
      addInterest,
      removeInterest,
      replaceAllInterests,
    }),
    [interests, isLoading, error, fetchInterests, addInterest, removeInterest, replaceAllInterests],
  );
}
