// lib/supabase/songSuggestions.ts
// Song suggestions — backed by the Gooswing REST API (routes O.1–O.3).

import * as engagementApi from '@/lib/api/engagement';

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

export async function createDeezerSongSuggestion(
  input: CreateDeezerSongSuggestionInput,
): Promise<void> {
  await engagementApi.createSongSuggestion(input.eventId, {
    deezerTrackId: input.deezerTrackId,
    trackTitle: input.trackTitle,
    artistName: input.artistName,
    deezerArtistId: input.deezerArtistId ?? null,
    deezerAlbumId: input.deezerAlbumId ?? null,
    albumTitle: input.albumTitle ?? null,
    artworkUrl: input.artworkUrl ?? null,
    deezerLink: input.deezerLink ?? null,
    reservationId: input.reservationId ?? null,
  });
}

export async function getMySongSuggestionsForEvent(
  eventId: string,
): Promise<ReadonlyArray<MySongSuggestion>> {
  const page = await engagementApi.getMySongSuggestions(eventId);
  return (page.items ?? []).map((s) => ({
    id: String(s.id),
    deezerTrackId: String(s.deezerTrackId ?? ''),
    trackTitle: String(s.trackTitle ?? ''),
    artistName: String(s.artistName ?? ''),
    deezerArtistId: s.deezerArtistId ?? null,
    deezerAlbumId: s.deezerAlbumId ?? null,
    albumTitle: s.albumTitle ?? null,
    artworkUrl: s.artworkUrl ?? null,
    deezerLink: s.deezerLink ?? null,
    createdAt: String(s.createdAt ?? ''),
  }));
}

export async function deleteMySongSuggestionById(id: string): Promise<void> {
  await engagementApi.deleteSongSuggestion(id);
}
