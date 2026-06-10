// hooks/profile/useLoginHistory.ts
// Login history — backed by the Gooswing REST API (route G.1).

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useUser } from '@clerk/clerk-expo';
import * as meApi from '@/lib/api/me';
import type { ApiLoginHistoryEntry } from '@/lib/api/types';
import type { LoginHistoryEntry, DeviceType, ID } from '@/types/domain';

type UseLoginHistoryReturn = {
  history: ReadonlyArray<LoginHistoryEntry>;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
};

const DEVICE_TYPES: ReadonlySet<DeviceType> = new Set([
  'mobile',
  'desktop',
  'tablet',
  'unknown',
]);

function toDeviceType(v: unknown): DeviceType {
  const s = typeof v === 'string' ? v.toLowerCase() : '';
  return DEVICE_TYPES.has(s as DeviceType) ? (s as DeviceType) : 'unknown';
}

function mapEntry(raw: ApiLoginHistoryEntry): LoginHistoryEntry {
  return {
    id: String(raw.id) as ID,
    userId: String(raw.userId) as ID,
    loggedInAt: String(raw.loggedInAt ?? ''),
    ipAddress: raw.ipAddress ?? null,
    userAgent: raw.userAgent ?? null,
    deviceType: toDeviceType(raw.deviceType),
    location: raw.location ?? null,
    sessionId: raw.sessionId ?? null,
    wasSuccessful: raw.wasSuccessful ?? true,
    failureReason: raw.failureReason ?? null,
  };
}

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
      const page = await meApi.getMyLoginHistory({ limit });
      setHistory((page.items ?? []).map(mapEntry));
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch login history'));
    } finally {
      setIsLoading(false);
    }
  }, [clerkUser?.id, limit]);

  useEffect(() => {
    void fetchHistory();
  }, [fetchHistory]);

  return useMemo(
    () => ({
      history,
      isLoading,
      error,
      refetch: fetchHistory,
    }),
    [history, isLoading, error, fetchHistory],
  );
}
