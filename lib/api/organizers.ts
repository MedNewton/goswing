// lib/api/organizers.ts
// Typed wrappers for the /v1/organizers/* routes and organizer follows.
// Raw shapes only — mapping to UI types lives in lib/supabase/organizers.ts.

import { getBoundApiCall, type BoundApiCall } from './client';
import type {
  ApiFollowResult,
  ApiFollowedOrganizer,
  ApiOrganizer,
  ApiOrganizerGalleryItem,
  ApiOrganizerReview,
  ApiOrganizerSummary,
  ApiPage,
} from './types';

function call(): BoundApiCall {
  return getBoundApiCall();
}

export function getOrganizer(organizerId: string): Promise<ApiOrganizer> {
  return call()<ApiOrganizer>(`/v1/organizers/${encodeURIComponent(organizerId)}`);
}

export function getOrganizerSummary(
  organizerId: string,
): Promise<ApiOrganizerSummary> {
  return call()<ApiOrganizerSummary>(
    `/v1/organizers/${encodeURIComponent(organizerId)}/summary`,
  );
}

export function getOrganizerGallery(
  organizerId: string,
  params?: { limit?: number; cursor?: string },
): Promise<ApiPage<ApiOrganizerGalleryItem>> {
  return call()<ApiPage<ApiOrganizerGalleryItem>>(
    `/v1/organizers/${encodeURIComponent(organizerId)}/gallery`,
    { query: { limit: params?.limit, cursor: params?.cursor } },
  );
}

export function getOrganizerReviews(
  organizerId: string,
  params?: { limit?: number; cursor?: string },
): Promise<ApiPage<ApiOrganizerReview>> {
  return call()<ApiPage<ApiOrganizerReview>>(
    `/v1/organizers/${encodeURIComponent(organizerId)}/reviews`,
    { query: { limit: params?.limit, cursor: params?.cursor } },
  );
}

export function followOrganizer(organizerId: string): Promise<ApiFollowResult> {
  return call()<ApiFollowResult>(
    `/v1/me/followed-organizers/${encodeURIComponent(organizerId)}`,
    { method: 'PUT' },
  );
}

export function unfollowOrganizer(organizerId: string): Promise<ApiFollowResult> {
  return call()<ApiFollowResult>(
    `/v1/me/followed-organizers/${encodeURIComponent(organizerId)}`,
    { method: 'DELETE' },
  );
}

export function listFollowedOrganizers(params?: {
  limit?: number;
  cursor?: string;
}): Promise<ApiPage<ApiFollowedOrganizer>> {
  return call()<ApiPage<ApiFollowedOrganizer>>('/v1/me/followed-organizers', {
    query: { limit: params?.limit, cursor: params?.cursor },
  });
}
