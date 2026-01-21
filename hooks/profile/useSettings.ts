// hooks/profile/useSettings.ts
import { useEffect, useState, useCallback } from 'react';
import { useUser } from '@clerk/clerk-expo';
import { supabase } from '@/lib/supabase';
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

      const { data, error: fetchError } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', clerkUser.id)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        throw fetchError;
      }

      if (data) {
        setSettings({
          userId: clerkUser.id as ID,
          pushNotificationsEnabled: data.push_notifications_enabled,
          locationServicesEnabled: data.location_services_enabled,
          loginNotificationsEnabled: data.login_notifications_enabled,
          savePaymentInfo: data.save_payment_info,
          autoReloadWallet: data.auto_reload_wallet,
          emailReceipts: data.email_receipts,
          createdAt: data.created_at,
          updatedAt: data.updated_at,
        });
      } else {
        // Return defaults if no record exists
        setSettings({
          userId: clerkUser.id as ID,
          ...DEFAULT_USER_SETTINGS,
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch settings'));
    } finally {
      setIsLoading(false);
    }
  }, [clerkUser?.id]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const updateSettings = useCallback(async (updates: Partial<UserSettings>) => {
    if (!clerkUser?.id) throw new Error('Not authenticated');

    const dbUpdates: Record<string, any> = {};

    if (updates.pushNotificationsEnabled !== undefined) {
      dbUpdates.push_notifications_enabled = updates.pushNotificationsEnabled;
    }
    if (updates.locationServicesEnabled !== undefined) {
      dbUpdates.location_services_enabled = updates.locationServicesEnabled;
    }
    if (updates.loginNotificationsEnabled !== undefined) {
      dbUpdates.login_notifications_enabled = updates.loginNotificationsEnabled;
    }
    if (updates.savePaymentInfo !== undefined) {
      dbUpdates.save_payment_info = updates.savePaymentInfo;
    }
    if (updates.autoReloadWallet !== undefined) {
      dbUpdates.auto_reload_wallet = updates.autoReloadWallet;
    }
    if (updates.emailReceipts !== undefined) {
      dbUpdates.email_receipts = updates.emailReceipts;
    }

    const { error: upsertError } = await supabase
      .from('user_settings')
      .upsert({
        user_id: clerkUser.id,
        ...dbUpdates,
        updated_at: new Date().toISOString(),
      });

    if (upsertError) throw upsertError;

    // Optimistic update
    setSettings((prev) => prev ? { ...prev, ...updates } : null);
  }, [clerkUser?.id]);

  return {
    settings,
    isLoading,
    error,
    refetch: fetchSettings,
    updateSettings,
  };
}