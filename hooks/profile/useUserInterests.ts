// hooks/profile/useUserInterests.ts
// Phase 1 stub — interests are not exposed by the new API yet.

import { useCallback, useMemo } from 'react';
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

const EMPTY: ReadonlyArray<UserInterest> = [];

function stubLog(name: string): void {
  if (__DEV__) {
    // eslint-disable-next-line no-console
    console.log(`[STUB] hooks/profile/useUserInterests.${name}()`);
  }
}

export function useUserInterests(): UseUserInterestsReturn {
  const refetch = useCallback(async () => {
    stubLog('refetch');
  }, []);
  const addInterest = useCallback(async (_tagId: ID) => {
    stubLog('addInterest');
  }, []);
  const removeInterest = useCallback(async (_tagId: ID) => {
    stubLog('removeInterest');
  }, []);
  const replaceAllInterests = useCallback(
    async (_tagIds: ReadonlyArray<ID>) => {
      stubLog('replaceAllInterests');
    },
    [],
  );

  return useMemo(
    () => ({
      interests: EMPTY,
      isLoading: false,
      error: null,
      refetch,
      addInterest,
      removeInterest,
      replaceAllInterests,
    }),
    [refetch, addInterest, removeInterest, replaceAllInterests],
  );
}
