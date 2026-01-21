// hooks/profile/useProfile.ts
import { useEffect, useState, useCallback } from 'react';
import { useUser } from '@clerk/clerk-expo';
import { supabase } from '@/lib/supabase';
import type { UserProfile, ID } from '@/types/domain';

type UseProfileReturn = {
  profile: UserProfile | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  deactivateAccount: () => Promise<void>;
  deleteAccount: () => Promise<void>;
};

export function useProfile(): UseProfileReturn {
  const { user: clerkUser } = useUser();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchProfile = useCallback(async () => {
    if (!clerkUser?.id) {
      setProfile(null);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Fetch profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', clerkUser.id)
        .single();

      if (profileError && profileError.code !== 'PGRST116') {
        throw profileError;
      }

      // Fetch stats in parallel
      const now = new Date().toISOString();

      const [attendedRes, savedRes, reviewsRes] = await Promise.all([
        // Attended = past reservations (events that have ended)
        // We need to join with events to check if the event has ended
        supabase
          .from('reservations')
          .select(`
            id,
            events!inner (
              id,
              ends_at,
              starts_at
            )
          `)
          .eq('user_id', clerkUser.id)
          .in('status', ['confirmed', 'completed']),

        // Saved = favorites count
        supabase
          .from('event_favorites')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', clerkUser.id),

        // Reviews count
        supabase
          .from('event_reviews')
          .select('*', { count: 'exact', head: true })
          .eq('clerk_user_id', clerkUser.id),
      ]);

      // Calculate attended count (past events)
      let attendedCount = 0;
      if (attendedRes.data) {
        const nowMs = Date.now();
        attendedCount = attendedRes.data.filter((r: any) => {
          const event = r.events;
          if (!event) return false;

          const endsAt = event.ends_at;
          const startsAt = event.starts_at;

          // If ends_at exists and is in the past
          if (endsAt) {
            return new Date(endsAt).getTime() <= nowMs;
          }

          // If no ends_at but starts_at is in the past (assume event is over)
          if (startsAt) {
            return new Date(startsAt).getTime() <= nowMs;
          }

          return false;
        }).length;
      }

      // Fetch interests with tag labels
      const { data: interestsData } = await supabase
        .from('user_interests')
        .select('tag_id, tags(label)')
        .eq('user_id', clerkUser.id);

      const interests = interestsData?.map((i: any) => i.tags?.label).filter(Boolean) ?? [];

      const mappedProfile: UserProfile = {
        id: clerkUser.id as ID,
        name: profileData?.display_name ?? clerkUser.fullName ?? '',
        avatarUri: profileData?.avatar_url ?? clerkUser.imageUrl ?? null,
        email: profileData?.email ?? clerkUser.primaryEmailAddress?.emailAddress ?? null,
        phone: profileData?.phone_number ?? clerkUser.primaryPhoneNumber?.phoneNumber ?? null,
        phoneVerified: profileData?.phone_verified ?? clerkUser.primaryPhoneNumber?.verification?.status === 'verified',
        city: profileData?.location ?? undefined,
        profileVisibility: profileData?.profile_visibility ?? 'public',
        accountStatus: profileData?.account_status ?? 'active',
        createdAt: profileData?.created_at,
        updatedAt: profileData?.updated_at,
        deactivatedAt: profileData?.deactivated_at,
        deletedAt: profileData?.deleted_at,
        interests,
        stats: {
          attendedCount,
          savedCount: savedRes.count ?? 0,
          reviewsCount: reviewsRes.count ?? 0,
        },
      };

      setProfile(mappedProfile);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch profile'));
    } finally {
      setIsLoading(false);
    }
  }, [clerkUser?.id]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const updateProfile = useCallback(async (updates: Partial<UserProfile>) => {
    if (!clerkUser?.id) throw new Error('Not authenticated');

    const dbUpdates: Record<string, any> = {};

    if (updates.name !== undefined) dbUpdates.display_name = updates.name;
    if (updates.avatarUri !== undefined) dbUpdates.avatar_url = updates.avatarUri;
    if (updates.email !== undefined) dbUpdates.email = updates.email;
    if (updates.phone !== undefined) dbUpdates.phone_number = updates.phone;
    if (updates.phoneVerified !== undefined) dbUpdates.phone_verified = updates.phoneVerified;
    if (updates.city !== undefined) dbUpdates.location = updates.city;
    if (updates.profileVisibility !== undefined) dbUpdates.profile_visibility = updates.profileVisibility;

    const { error: updateError } = await supabase
      .from('profiles')
      .upsert({
        user_id: clerkUser.id,
        ...dbUpdates,
        updated_at: new Date().toISOString(),
      });

    if (updateError) throw updateError;

    // Optimistic update
    setProfile((prev) => prev ? { ...prev, ...updates } : null);
  }, [clerkUser?.id]);

  const deactivateAccount = useCallback(async () => {
    if (!clerkUser?.id) throw new Error('Not authenticated');

    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        account_status: 'deactivated',
        deactivated_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', clerkUser.id);

    if (updateError) throw updateError;

    setProfile((prev) => prev ? { ...prev, accountStatus: 'deactivated' } : null);
  }, [clerkUser?.id]);

  const deleteAccount = useCallback(async () => {
    if (!clerkUser?.id) throw new Error('Not authenticated');

    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        account_status: 'deleted',
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', clerkUser.id);

    if (updateError) throw updateError;

    setProfile((prev) => prev ? { ...prev, accountStatus: 'deleted' } : null);
  }, [clerkUser?.id]);

  return {
    profile,
    isLoading,
    error,
    refetch: fetchProfile,
    updateProfile,
    deactivateAccount,
    deleteAccount,
  };
}