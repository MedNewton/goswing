// lib/supabase/songSuggestions.ts
// Phase 1 stub — the new REST API does not expose song suggestions yet.
// See docs/superpowers/specs/2026-05-20-rest-api-read-side-migration.md § 6.3.

export type CreateDeezerSongSuggestionInput = Readonly<{
  eventId: string;
  deezerTrackId: string;
  trackTitle: string;
  artistName: string;
  deezerArtistId?: string | null;
  deezerAlbumId?: string | null;
  albumTitle?: string | null;
  artworkUrl?: string | null;
  deezerLink?: string | null;
  reservationId?: string | null;
}>;

export type MySongSuggestion = Readonly<{
  id: string;
  deezerTrackId: string;
  trackTitle: string;
  artistName: string;
  deezerArtistId: string | null;
  deezerAlbumId: string | null;
  albumTitle: string | null;
  artworkUrl: string | null;
  deezerLink: string | null;
  createdAt: string;
}>;

function stubLog(name: string): void {
  if (__DEV__) {
    // eslint-disable-next-line no-console
    console.log(`[STUB] lib/supabase/songSuggestions.${name}()`);
  }
}

export async function createDeezerSongSuggestion(
  _input: CreateDeezerSongSuggestionInput,
): Promise<void> {
  stubLog('createDeezerSongSuggestion');
}

export async function getMySongSuggestionsForEvent(
  _eventId: string,
): Promise<ReadonlyArray<MySongSuggestion>> {
  stubLog('getMySongSuggestionsForEvent');
  return [];
}

export async function deleteMySongSuggestionById(_id: string): Promise<void> {
  stubLog('deleteMySongSuggestionById');
}
