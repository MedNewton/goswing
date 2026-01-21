// hooks/profile/useLoginHistory.ts
import { useEffect, useState, useCallback } from 'react';
import { useUser } from '@clerk/clerk-expo';
import { supabase } from '@/lib/supabase';
import type { LoginHistoryEntry, ID, DeviceType } from '@/types/domain';

type UseLoginHistoryReturn = {
  history: ReadonlyArray<LoginHistoryEntry>;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
};

export function useLoginHistory(limit: number = 20): UseLoginHistoryReturn {
  const { user: clerkUser } = useUser();
  const [history, setHistory] = useState<ReadonlyArray<LoginHistoryEntry>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchHistory = useCallback(async () => {
    if (!clerkUser?.id) {
      setHistory([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('login_history')
        .select('*')
        .eq('user_id', clerkUser.id)
        .order('logged_in_at', { ascending: false })
        .limit(limit);

      if (fetchError) throw fetchError;

      const mapped: LoginHistoryEntry[] = (data ?? []).map((entry: any) => ({
        id: entry.id as ID,
        userId: entry.user_id as ID,
        loggedInAt: entry.logged_in_at,
        ipAddress: entry.ip_address,
        userAgent: entry.user_agent,
        deviceType: (entry.device_type as DeviceType) ?? 'unknown',
        location: entry.location,
        sessionId: entry.session_id,
        wasSuccessful: entry.was_successful,
        failureReason: entry.failure_reason,
      }));

      setHistory(mapped);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch login history'));
    } finally {
      setIsLoading(false);
    }
  }, [clerkUser?.id, limit]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  return {
    history,
    isLoading,
    error,
    refetch: fetchHistory,
  };
}