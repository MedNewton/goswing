// lib/api/engagement.ts
// Typed wrappers for the per-event engagement routes: favorites, reviews,
// song suggestions, and stories. Raw shapes only — mapping lives in lib/supabase/*.

import { getBoundApiCall, type BoundApiCall } from './client';
import type {
  ApiEventStory,
  ApiFavoriteEvent,
  ApiFavoriteToggleResult,
  ApiMyReviewsResponse,
  ApiPage,
  ApiReview,
  ApiSongSuggestion,
} from './types';

function call(): BoundApiCall {
  return getBoundApiCall();
}

// § K — Favorites

export function listFavorites(params?: {
  limit?: number;
  cursor?: string;
}): Promise<ApiPage<ApiFavoriteEvent>> {
  return call()<ApiPage<ApiFavoriteEvent>>('/v1/me/favorites', {
    query: { limit: params?.limit, cursor: params?.cursor },
  });
}

export function listFavoriteIds(): Promise<{ eventIds: ReadonlyArray<string> }> {
  return call()<{ eventIds: ReadonlyArray<string> }>('/v1/me/favorites/ids');
}

export function addFavorite(eventId: string): Promise<ApiFavoriteToggleResult> {
  return call()<ApiFavoriteToggleResult>(
    `/v1/me/favorites/${encodeURIComponent(eventId)}`,
    { method: 'PUT' },
  );
}

export function removeFavorite(eventId: string): Promise<ApiFavoriteToggleResult> {
  return call()<ApiFavoriteToggleResult>(
    `/v1/me/favorites/${encodeURIComponent(eventId)}`,
    { method: 'DELETE' },
  );
}

// § N — Reviews

export function createReview(
  eventId: string,
  body: { rating: number; comment?: string | null; reservationId?: string | null },
): Promise<ApiReview> {
  return call()<ApiReview>(
    `/v1/events/${encodeURIComponent(eventId)}/reviews`,
    { method: 'POST', body },
  );
}

export function getMyReviewForEvent(
  eventId: string,
): Promise<{ review: ApiReview | null }> {
  return call()<{ review: ApiReview | null }>(
    `/v1/events/${encodeURIComponent(eventId)}/reviews/mine`,
  );
}

export function getMyReviews(params?: {
  limit?: number;
  cursor?: string;
}): Promise<ApiMyReviewsResponse> {
  return call()<ApiMyReviewsResponse>('/v1/me/reviews', {
    query: { limit: params?.limit, cursor: params?.cursor },
  });
}

export function updateReview(
  reviewId: string,
  body: { rating?: number; comment?: string | null },
): Promise<ApiReview> {
  return call()<ApiReview>(`/v1/reviews/${encodeURIComponent(reviewId)}`, {
    method: 'PATCH',
    body,
  });
}

export function deleteReview(reviewId: string): Promise<void> {
  return call()<void>(`/v1/reviews/${encodeURIComponent(reviewId)}`, {
    method: 'DELETE',
  });
}

// § O — Song suggestions

export function createSongSuggestion(
  eventId: string,
  body: {
    deezerTrackId: string;
    trackTitle: string;
    artistName: string;
    deezerArtistId?: string | null;
    deezerAlbumId?: string | null;
    albumTitle?: string | null;
    artworkUrl?: string | null;
    deezerLink?: string | null;
    reservationId?: string | null;
  },
): Promise<ApiSongSuggestion> {
  return call()<ApiSongSuggestion>(
    `/v1/events/${encodeURIComponent(eventId)}/song-suggestions`,
    { method: 'POST', body },
  );
}

export function getMySongSuggestions(
  eventId: string,
): Promise<ApiPage<ApiSongSuggestion>> {
  return call()<ApiPage<ApiSongSuggestion>>(
    `/v1/events/${encodeURIComponent(eventId)}/song-suggestions/mine`,
  );
}

export function deleteSongSuggestion(suggestionId: string): Promise<void> {
  return call()<void>(
    `/v1/song-suggestions/${encodeURIComponent(suggestionId)}`,
    { method: 'DELETE' },
  );
}

// § P — Stories

export function createStory(
  eventId: string,
  photo: { uri: string; name: string; type: string },
  meta: { caption?: string | null; reservationId?: string | null },
): Promise<ApiEventStory> {
  const form = new FormData();
  // React Native FormData accepts { uri, name, type } file descriptors.
  form.append('photo', photo as unknown as Blob);
  form.append('meta', JSON.stringify(meta));
  return call()<ApiEventStory>(
    `/v1/events/${encodeURIComponent(eventId)}/stories`,
    { method: 'POST', body: form },
  );
}

export function listStories(
  eventId: string,
  params?: { limit?: number; cursor?: string },
): Promise<ApiPage<ApiEventStory>> {
  return call()<ApiPage<ApiEventStory>>(
    `/v1/events/${encodeURIComponent(eventId)}/stories`,
    { query: { limit: params?.limit, cursor: params?.cursor } },
  );
}

export function getMyStory(
  eventId: string,
): Promise<{ story: ApiEventStory | null }> {
  return call()<{ story: ApiEventStory | null }>(
    `/v1/events/${encodeURIComponent(eventId)}/stories/mine`,
  );
}

export function getStoryCount(eventId: string): Promise<{ count: number }> {
  return call()<{ count: number }>(
    `/v1/events/${encodeURIComponent(eventId)}/stories/count`,
  );
}

export function deleteStory(storyId: string): Promise<void> {
  return call()<void>(`/v1/stories/${encodeURIComponent(storyId)}`, {
    method: 'DELETE',
  });
}
