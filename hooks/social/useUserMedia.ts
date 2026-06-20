// hooks/social/useUserMedia.ts
import { useCallback, useEffect, useState } from 'react';
import {
  addUserMedia,
  deleteUserMedia,
  listUserMedia,
} from '@/lib/supabase/social/media';
import type { MediaType, UserMedia } from '@/lib/social/types';

type UseUserMediaReturn = {
  media: ReadonlyArray<UserMedia>;
  photos: ReadonlyArray<UserMedia>;
  videos: ReadonlyArray<UserMedia>;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  add: (input: { userId: string; uri: string; caption?: string | null; kind?: MediaType }) => Promise<void>;
  remove: (mediaId: string) => Promise<void>;
};

export function useUserMedia(userId?: string | null): UseUserMediaReturn {
  const [media, setMedia] = useState<ReadonlyArray<UserMedia>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchMedia = useCallback(async () => {
    if (!userId) {
      setMedia([]);
      setIsLoading(false);
      return;
    }
    try {
      setIsLoading(true);
      setError(null);
      setMedia(await listUserMedia(userId));
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load media'));
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchMedia();
  }, [fetchMedia]);

  const add = useCallback(
    async (input: { userId: string; uri: string; caption?: string | null; kind?: MediaType }) => {
      const created = await addUserMedia(input);
      setMedia((prev) => [created, ...prev]);
    },
    [],
  );

  const remove = useCallback(async (mediaId: string) => {
    await deleteUserMedia(mediaId);
    setMedia((prev) => prev.filter((m) => m.id !== mediaId));
  }, []);

  return {
    media,
    photos: media.filter((m) => m.mediaType === 'image'),
    videos: media.filter((m) => m.mediaType === 'video'),
    isLoading,
    error,
    refetch: fetchMedia,
    add,
    remove,
  };
}
