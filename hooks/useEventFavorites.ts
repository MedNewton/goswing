// hooks/useEventFavorites.ts
// Favorites state — backed by the Gooswing REST API via lib/supabase/saved.

import { useCallback, useEffect, useMemo, useState } from 'react';
import { addFavorite, listFavoriteEventIds, removeFavorite } from '@/lib/supabase/saved';

function errorMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  return 'Unknown error';
}

export function useEventFavorites(params: {
  userId: string | null | undefined;
}) {
  const { userId } = params;

  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(() => new Set());
  const [loading, setLoading] = useState<boolean>(false);

  const refresh = useCallback(async (): Promise<void> => {
    if (!userId) {
      setFavoriteIds(new Set());
      return;
    }

    setLoading(true);
    try {
      const ids = await listFavoriteEventIds();
      setFavoriteIds(new Set(ids.map(String)));
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const isFavorite = useCallback(
    (eventId: string) => favoriteIds.has(String(eventId)),
    [favoriteIds],
  );

  const toggle = useCallback(
    async (eventId: string, next: boolean): Promise<void> => {
      if (!userId) return;

      const id = String(eventId);

      // optimistic
      setFavoriteIds((prev) => {
        const copy = new Set(prev);
        if (next) copy.add(id);
        else copy.delete(id);
        return copy;
      });

      try {
        if (next) await addFavorite({ eventId: id });
        else await removeFavorite({ eventId: id });
      } catch (e: unknown) {
        // rollback
        setFavoriteIds((prev) => {
          const copy = new Set(prev);
          if (next) copy.delete(id);
          else copy.add(id);
          return copy;
        });
        throw new Error(errorMessage(e));
      }
    },
    [userId],
  );

  return useMemo(
    () => ({
      favoriteIds: favoriteIds as ReadonlySet<string>,
      loading,
      refresh,
      isFavorite,
      toggle,
    }),
    [favoriteIds, loading, refresh, isFavorite, toggle],
  );
}
