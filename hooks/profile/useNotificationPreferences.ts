// hooks/profile/useNotificationPreferences.ts
import { useEffect, useState, useCallback } from 'react';
import { useUser } from '@clerk/clerk-expo';
import { supabase } from '@/lib/supabase';
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

      const { data, error: fetchError } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', clerkUser.id)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        throw fetchError;
      }

      if (data) {
        setPreferences({
          userId: clerkUser.id as ID,
          pushEnabled: data.push_enabled,
          pushEventReminders: data.push_event_reminders,
          pushEventUpdates: data.push_event_updates,
          pushNewFollowers: data.push_new_followers,
          pushEventRecommendations: data.push_event_recommendations,
          emailEnabled: data.email_enabled,
          emailWeeklyDigest: data.email_weekly_digest,
          emailEventInvites: data.email_event_invites,
          emailPromotions: data.email_promotions,
          emailNewsletter: data.email_newsletter,
          smsEnabled: data.sms_enabled,
          smsUrgentUpdates: data.sms_urgent_updates,
          smsEventCancellations: data.sms_event_cancellations,
          personalizedAds: data.personalized_ads,
          locationBasedSuggestions: data.location_based_suggestions,
          quietHoursEnabled: data.quiet_hours_enabled,
          quietHoursStart: data.quiet_hours_start,
          quietHoursEnd: data.quiet_hours_end,
          createdAt: data.created_at,
          updatedAt: data.updated_at,
        });
      } else {
        setPreferences({
          userId: clerkUser.id as ID,
          ...DEFAULT_NOTIFICATION_PREFERENCES,
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch notification preferences'));
    } finally {
      setIsLoading(false);
    }
  }, [clerkUser?.id]);

  useEffect(() => {
    fetchPreferences();
  }, [fetchPreferences]);

  const updatePreferences = useCallback(async (updates: Partial<NotificationPreferences>) => {
    if (!clerkUser?.id) throw new Error('Not authenticated');

    const dbUpdates: Record<string, any> = {};

    // Map all fields
    const fieldMap: Record<string, string> = {
      pushEnabled: 'push_enabled',
      pushEventReminders: 'push_event_reminders',
      pushEventUpdates: 'push_event_updates',
      pushNewFollowers: 'push_new_followers',
      pushEventRecommendations: 'push_event_recommendations',
      emailEnabled: 'email_enabled',
      emailWeeklyDigest: 'email_weekly_digest',
      emailEventInvites: 'email_event_invites',
      emailPromotions: 'email_promotions',
      emailNewsletter: 'email_newsletter',
      smsEnabled: 'sms_enabled',
      smsUrgentUpdates: 'sms_urgent_updates',
      smsEventCancellations: 'sms_event_cancellations',
      personalizedAds: 'personalized_ads',
      locationBasedSuggestions: 'location_based_suggestions',
      quietHoursEnabled: 'quiet_hours_enabled',
      quietHoursStart: 'quiet_hours_start',
      quietHoursEnd: 'quiet_hours_end',
    };

    for (const [key, value] of Object.entries(updates)) {
      if (fieldMap[key] && value !== undefined) {
        dbUpdates[fieldMap[key]] = value;
      }
    }

    const { error: upsertError } = await supabase
      .from('notification_preferences')
      .upsert({
        user_id: clerkUser.id,
        ...dbUpdates,
        updated_at: new Date().toISOString(),
      });

    if (upsertError) throw upsertError;

    // Optimistic update
    setPreferences((prev) => prev ? { ...prev, ...updates } : null);
  }, [clerkUser?.id]);

  return {
    preferences,
    isLoading,
    error,
    refetch: fetchPreferences,
    updatePreferences,
  };
}