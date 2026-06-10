// hooks/profile/useNotificationPreferences.ts
// Phase 1 stub — returns defaults; mutations are no-ops.

import { useCallback, useMemo } from 'react';
import { useUser } from '@clerk/clerk-expo';
import type { NotificationPreferences, ID } from '@/types/domain';
import { DEFAULT_NOTIFICATION_PREFERENCES } from '@/types/domain';

type UseNotificationPreferencesReturn = {
  preferences: NotificationPreferences | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  updatePreferences: (updates: Partial<NotificationPreferences>) => Promise<void>;
};

export function useNotificationPreferences(): UseNotificationPreferencesReturn {
  const { user: clerkUser } = useUser();

  const preferences = useMemo<NotificationPreferences | null>(() => {
    if (!clerkUser?.id) return null;
    return {
      userId: clerkUser.id as ID,
      ...DEFAULT_NOTIFICATION_PREFERENCES,
    };
  }, [clerkUser?.id]);

  const refetch = useCallback(async () => {
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.log('[STUB] hooks/profile/useNotificationPreferences.refetch()');
    }
  }, []);
  const updatePreferences = useCallback(
    async (_updates: Partial<NotificationPreferences>) => {
      if (__DEV__) {
        // eslint-disable-next-line no-console
        console.log('[STUB] hooks/profile/useNotificationPreferences.updatePreferences()');
      }
    },
    [],
  );

  return useMemo(
    () => ({
      preferences,
      isLoading: false,
      error: null,
      refetch,
      updatePreferences,
    }),
    [preferences, refetch, updatePreferences],
  );
}
