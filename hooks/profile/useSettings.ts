// hooks/profile/useSettings.ts
// User settings — backed by the Gooswing REST API (routes D.1–D.2).

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useUser } from '@clerk/clerk-expo';
import * as meApi from '@/lib/api/me';
import type { ApiUserSettings } from '@/lib/api/types';
import type { UserSettings, ID } from '@/types/domain';
import { DEFAULT_USER_SETTINGS } from '@/types/domain';

type UseSettingsReturn = {
  settings: UserSettings | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  updateSettings: (updates: Partial<UserSettings>) => Promise<void>;
};

function mapSettings(raw: ApiUserSettings, userId: string): UserSettings {
  return {
    userId: (raw.userId || userId) as ID,
    pushNotificationsEnabled:
      raw.pushNotificationsEnabled ?? DEFAULT_USER_SETTINGS.pushNotificationsEnabled,
    locationServicesEnabled:
      raw.locationServicesEnabled ?? DEFAULT_USER_SETTINGS.locationServicesEnabled,
    loginNotificationsEnabled:
      raw.loginNotificationsEnabled ?? DEFAULT_USER_SETTINGS.loginNotificationsEnabled,
    savePaymentInfo: raw.savePaymentInfo ?? DEFAULT_USER_SETTINGS.savePaymentInfo,
    autoReloadWallet: raw.autoReloadWallet ?? DEFAULT_USER_SETTINGS.autoReloadWallet,
    emailReceipts: raw.emailReceipts ?? DEFAULT_USER_SETTINGS.emailReceipts,
    createdAt: raw.createdAt ?? undefined,
    updatedAt: raw.updatedAt ?? undefined,
  };
}

export function useSettings(): UseSettingsReturn {
  const { user: clerkUser } = useUser();
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchSettings = useCallback(async () => {
    if (!clerkUser?.id) {
      setSettings(null);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const raw = await meApi.getMySettings();
      setSettings(mapSettings(raw, clerkUser.id));
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch settings'));
    } finally {
      setIsLoading(false);
    }
  }, [clerkUser?.id]);

  useEffect(() => {
    void fetchSettings();
  }, [fetchSettings]);

  const updateSettings = useCallback(
    async (updates: Partial<UserSettings>) => {
      if (!clerkUser?.id) throw new Error('Not authenticated');

      const { userId: _userId, createdAt: _c, updatedAt: _u, ...body } = updates;
      const raw = await meApi.patchMySettings(body);
      setSettings(mapSettings(raw, clerkUser.id));
    },
    [clerkUser?.id],
  );

  return useMemo(
    () => ({
      settings,
      isLoading,
      error,
      refetch: fetchSettings,
      updateSettings,
    }),
    [settings, isLoading, error, fetchSettings, updateSettings],
  );
}
