// hooks/profile/useLoginHistory.ts
// Phase 1 stub — login history is not exposed by the new API yet.

import { useCallback, useMemo } from 'react';
import type { LoginHistoryEntry } from '@/types/domain';

type UseLoginHistoryReturn = {
  history: ReadonlyArray<LoginHistoryEntry>;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
};

const EMPTY: ReadonlyArray<LoginHistoryEntry> = [];

export function useLoginHistory(_limit: number = 20): UseLoginHistoryReturn {
  const refetch = useCallback(async () => {
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.log('[STUB] hooks/profile/useLoginHistory.refetch()');
    }
  }, []);

  return useMemo(
    () => ({
      history: EMPTY,
      isLoading: false,
      error: null,
      refetch,
    }),
    [refetch],
  );
}
