// hooks/useEventFavorites.ts
// Phase 1 stub — favorites are disabled; toggle is a no-op so the heart icon
// doesn't crash. Signature preserved (supabase + userId still accepted) so
// HomePage's import site stays valid.

import { useCallback, useMemo, useRef } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';

export function useEventFavorites(_params: {
  supabase: SupabaseClient;
  userId: string | null | undefined;
}) {
  const emptySetRef = useRef<ReadonlySet<string>>(new Set<string>());

  const refresh = useCallback(async (): Promise<void> => {}, []);

  const isFavorite = useCallback((_eventId: string): boolean => false, []);

  const toggle = useCallback(
    async (_eventId: string, _next: boolean): Promise<void> => {
      if (__DEV__) {
        // eslint-disable-next-line no-console
        console.log('[STUB] hooks/useEventFavorites.toggle()');
      }
    },
    [],
  );

  return useMemo(
    () => ({
      favoriteIds: emptySetRef.current,
      loading: false,
      refresh,
      isFavorite,
      toggle,
    }),
    [refresh, isFavorite, toggle],
  );
}
