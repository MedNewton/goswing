// hooks/profile/useUserInterests.ts
import { useEffect, useState, useCallback } from 'react';
import { useUser } from '@clerk/clerk-expo';
import { supabase } from '@/lib/supabase';
import type { UserInterest, ID } from '@/types/domain';

type UseUserInterestsReturn = {
  interests: ReadonlyArray<UserInterest>;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  addInterest: (tagId: ID) => Promise<void>;
  removeInterest: (tagId: ID) => Promise<void>;
  replaceAllInterests: (tagIds: ReadonlyArray<ID>) => Promise<void>;
};

export function useUserInterests(): UseUserInterestsReturn {
  const { user: clerkUser } = useUser();
  const [interests, setInterestsState] = useState<ReadonlyArray<UserInterest>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchInterests = useCallback(async () => {
    if (!clerkUser?.id) {
      setInterestsState([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('user_interests')
        .select('user_id, tag_id, created_at, tags(label, slug)')
        .eq('user_id', clerkUser.id);

      if (fetchError) throw fetchError;

      const mapped: UserInterest[] = (data ?? []).map((item: any) => ({
        userId: item.user_id as ID,
        tagId: item.tag_id as ID,
        tagLabel: item.tags?.label ?? '',
        tagSlug: item.tags?.slug ?? '',
        createdAt: item.created_at,
      }));

      setInterestsState(mapped);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch interests'));
    } finally {
      setIsLoading(false);
    }
  }, [clerkUser?.id]);

  useEffect(() => {
    fetchInterests();
  }, [fetchInterests]);

  const addInterest = useCallback(async (tagId: ID) => {
    if (!clerkUser?.id) throw new Error('Not authenticated');

    const { error: insertError } = await supabase
      .from('user_interests')
      .insert({ user_id: clerkUser.id, tag_id: tagId });

    if (insertError) throw insertError;

    await fetchInterests();
  }, [clerkUser?.id, fetchInterests]);

  const removeInterest = useCallback(async (tagId: ID) => {
    if (!clerkUser?.id) throw new Error('Not authenticated');

    const { error: deleteError } = await supabase
      .from('user_interests')
      .delete()
      .eq('user_id', clerkUser.id)
      .eq('tag_id', tagId);

    if (deleteError) throw deleteError;

    // Optimistic update
    setInterestsState((prev) => prev.filter((i) => i.tagId !== tagId));
  }, [clerkUser?.id]);

  const replaceAllInterests = useCallback(async (tagIds: ReadonlyArray<ID>) => {
    if (!clerkUser?.id) throw new Error('Not authenticated');

    // Delete all existing interests
    const { error: deleteError } = await supabase
      .from('user_interests')
      .delete()
      .eq('user_id', clerkUser.id);

    if (deleteError) throw deleteError;

    // Insert new interests
    if (tagIds.length > 0) {
      const { error: insertError } = await supabase
        .from('user_interests')
        .insert(tagIds.map((tagId) => ({ user_id: clerkUser.id, tag_id: tagId })));

      if (insertError) throw insertError;
    }

    await fetchInterests();
  }, [clerkUser?.id, fetchInterests]);

  return {
    interests,
    isLoading,
    error,
    refetch: fetchInterests,
    addInterest,
    removeInterest,
    replaceAllInterests,
  };
}