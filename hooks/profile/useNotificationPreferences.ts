// hooks/profile/useNotificationPreferences.ts
// Notification preferences — backed by the Gooswing REST API (routes E.1–E.2).

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useUser } from '@clerk/clerk-expo';
import * as meApi from '@/lib/api/me';
import type { ApiNotificationPreferences } from '@/lib/api/types';
import type { NotificationPreferences, ID } from '@/types/domain';
import { DEFAULT_NOTIFICATION_PREFERENCES } from '@/types/domain';

type UseNotificationPreferencesReturn = {
  preferences: NotificationPreferences | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  updatePreferences: (updates: Partial<NotificationPreferences>) => Promise<void>;
};

const D = DEFAULT_NOTIFICATION_PREFERENCES;

function mapPreferences(
  raw: ApiNotificationPreferences,
  userId: string,
): NotificationPreferences {
  return {
    userId: (raw.userId || userId) as ID,
    pushEnabled: raw.pushEnabled ?? D.pushEnabled,
    pushEventReminders: raw.pushEventReminders ?? D.pushEventReminders,
    pushEventUpdates: raw.pushEventUpdates ?? D.pushEventUpdates,
    pushNewFollowers: raw.pushNewFollowers ?? D.pushNewFollowers,
    pushEventRecommendations:
      raw.pushEventRecommendations ?? D.pushEventRecommendations,
    emailEnabled: raw.emailEnabled ?? D.emailEnabled,
    emailWeeklyDigest: raw.emailWeeklyDigest ?? D.emailWeeklyDigest,
    emailEventInvites: raw.emailEventInvites ?? D.emailEventInvites,
    emailPromotions: raw.emailPromotions ?? D.emailPromotions,
    emailNewsletter: raw.emailNewsletter ?? D.emailNewsletter,
    smsEnabled: raw.smsEnabled ?? D.smsEnabled,
    smsUrgentUpdates: raw.smsUrgentUpdates ?? D.smsUrgentUpdates,
    smsEventCancellations: raw.smsEventCancellations ?? D.smsEventCancellations,
    personalizedAds: raw.personalizedAds ?? D.personalizedAds,
    locationBasedSuggestions:
      raw.locationBasedSuggestions ?? D.locationBasedSuggestions,
    quietHoursEnabled: raw.quietHoursEnabled ?? D.quietHoursEnabled,
    quietHoursStart: raw.quietHoursStart ?? null,
    quietHoursEnd: raw.quietHoursEnd ?? null,
    createdAt: raw.createdAt ?? undefined,
    updatedAt: raw.updatedAt ?? undefined,
  };
}

export function useNotificationPreferences(): UseNotificationPreferencesReturn {
  const { user: clerkUser } = useUser();
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchPreferences = useCallback(async () => {
    if (!clerkUser?.id) {
      setPreferences(null);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const raw = await meApi.getMyNotificationPreferences();
      setPreferences(mapPreferences(raw, clerkUser.id));
    } catch (err) {
      setError(
        err instanceof Error ? err : new Error('Failed to fetch notification preferences'),
      );
    } finally {
      setIsLoading(false);
    }
  }, [clerkUser?.id]);

  useEffect(() => {
    void fetchPreferences();
  }, [fetchPreferences]);

  const updatePreferences = useCallback(
    async (updates: Partial<NotificationPreferences>) => {
      if (!clerkUser?.id) throw new Error('Not authenticated');

      const { userId: _userId, createdAt: _c, updatedAt: _u, ...body } = updates;
      const raw = await meApi.patchMyNotificationPreferences(body);
      setPreferences(mapPreferences(raw, clerkUser.id));
    },
    [clerkUser?.id],
  );

  return useMemo(
    () => ({
      preferences,
      isLoading,
      error,
      refetch: fetchPreferences,
      updatePreferences,
    }),
    [preferences, isLoading, error, fetchPreferences, updatePreferences],
  );
}
