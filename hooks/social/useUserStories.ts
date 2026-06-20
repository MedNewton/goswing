// hooks/social/useUserStories.ts
import { useCallback, useEffect, useState } from 'react';
import {
  addUserStory,
  deleteUserStory,
  listActiveUserStories,
} from '@/lib/supabase/social/stories';
import type { MediaType, UserStory } from '@/lib/social/types';

type UseUserStoriesReturn = {
  stories: ReadonlyArray<UserStory>;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  add: (input: { userId: string; uri: string; caption?: string | null; kind?: MediaType }) => Promise<void>;
  remove: (storyId: string) => Promise<void>;
};

export function useUserStories(userId?: string | null): UseUserStoriesReturn {
  const [stories, setStories] = useState<ReadonlyArray<UserStory>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchStories = useCallback(async () => {
    if (!userId) {
      setStories([]);
      setIsLoading(false);
      return;
    }
    try {
      setIsLoading(true);
      setError(null);
      setStories(await listActiveUserStories(userId));
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load stories'));
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchStories();
  }, [fetchStories]);

  const add = useCallback(
    async (input: { userId: string; uri: string; caption?: string | null; kind?: MediaType }) => {
      const created = await addUserStory(input);
      setStories((prev) => [created, ...prev]);
    },
    [],
  );

  const remove = useCallback(async (storyId: string) => {
    await deleteUserStory(storyId);
    setStories((prev) => prev.filter((s) => s.id !== storyId));
  }, []);

  return { stories, isLoading, error, refetch: fetchStories, add, remove };
}
