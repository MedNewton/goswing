// hooks/profile/useSettings.ts
// Phase 1 stub — returns defaults; mutations are no-ops.

import { useCallback, useMemo } from 'react';
import { useUser } from '@clerk/clerk-expo';
import type { UserSettings, ID } from '@/types/domain';
import { DEFAULT_USER_SETTINGS } from '@/types/domain';

type UseSettingsReturn = {
  settings: UserSettings | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  updateSettings: (updates: Partial<UserSettings>) => Promise<void>;
};

export function useSettings(): UseSettingsReturn {
  const { user: clerkUser } = useUser();

  const settings = useMemo<UserSettings | null>(() => {
    if (!clerkUser?.id) return null;
    return {
      userId: clerkUser.id as ID,
      ...DEFAULT_USER_SETTINGS,
    };
  }, [clerkUser?.id]);

  const refetch = useCallback(async () => {
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.log('[STUB] hooks/profile/useSettings.refetch()');
    }
  }, []);
  const updateSettings = useCallback(
    async (_updates: Partial<UserSettings>) => {
      if (__DEV__) {
        // eslint-disable-next-line no-console
        console.log('[STUB] hooks/profile/useSettings.updateSettings()');
      }
    },
    [],
  );

  return useMemo(
    () => ({
      settings,
      isLoading: false,
      error: null,
      refetch,
      updateSettings,
    }),
    [settings, refetch, updateSettings],
  );
}
