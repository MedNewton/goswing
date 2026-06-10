// hooks/profile/useProfile.ts
// Phase 1 stub — profile reads/writes are disabled until Phase 2.
// Returns null profile + no-op mutations so ProfilePage renders its empty state.

import { useCallback, useMemo } from 'react';
import type { UserProfile } from '@/types/domain';

type UseProfileReturn = {
  profile: UserProfile | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  deactivateAccount: () => Promise<void>;
  deleteAccount: () => Promise<void>;
};

function stubLog(name: string): void {
  if (__DEV__) {
    // eslint-disable-next-line no-console
    console.log(`[STUB] hooks/profile/useProfile.${name}()`);
  }
}

export function useProfile(): UseProfileReturn {
  const refetch = useCallback(async () => {
    stubLog('refetch');
  }, []);
  const updateProfile = useCallback(async (_updates: Partial<UserProfile>) => {
    stubLog('updateProfile');
  }, []);
  const deactivateAccount = useCallback(async () => {
    stubLog('deactivateAccount');
  }, []);
  const deleteAccount = useCallback(async () => {
    stubLog('deleteAccount');
  }, []);

  return useMemo(
    () => ({
      profile: null,
      isLoading: false,
      error: null,
      refetch,
      updateProfile,
      deactivateAccount,
      deleteAccount,
    }),
    [refetch, updateProfile, deactivateAccount, deleteAccount],
  );
}
