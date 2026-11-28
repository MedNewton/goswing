// lib/api/profile.ts
// Profile-area API calls that are not in lib/api/me.ts yet, mostly Phase 4
// routes (docs/superpowers/specs/2026-11-27-rest-api-phase-4-redesign-routes.md).
//
// Every Phase 4 call goes through `optional()`: a 404 / 405 / 501 from the
// server means "this route is not deployed yet" and resolves to null, so the
// screens can hide (or label as "coming soon") the matching UI and light it up
// automatically once the backend ships. Phase 4 response fields are declared
// here as optional types; the shared lib/api/types.ts is left untouched.

import { ApiError, getBoundApiCall, type BoundApiCall } from './client';
import type { ApiMyReview, ApiProfile } from './types';

function call(): BoundApiCall {
  return getBoundApiCall();
}

/** True when the error means the route does not exist on this server yet. */
export function isUnavailable(e: unknown): boolean {
  return e instanceof ApiError && (e.status === 404 || e.status === 405 || e.status === 501);
}

/** Resolves to null when the route is not deployed (404 / 405 / 501). */
export async function optional<T>(p: Promise<T>): Promise<T | null> {
  try {
    return await p;
  } catch (e) {
    if (isUnavailable(e)) return null;
    throw e;
  }
}

// ─── § K.1 — Phase 4 profile fields ───────────────────────────────────────────

/** Fields Phase 4 adds to GET/PATCH /v1/me/profile (all optional today). */
export type ProfilePhase4Fields = Readonly<{
  username?: string | null;
  bio?: string | null;
  dateOfBirth?: string | null;
  emailVerified?: boolean | null;
  /** § K.4: 'pendingDeletion' once delete-with-grace-period ships. */
  accountStatus?: string | null;
  scheduledDeletionAt?: string | null;
}>;

export type ApiProfileV4 = Omit<ApiProfile, 'accountStatus'> & ProfilePhase4Fields;

/** Which Phase 4 profile fields the server returns (key present, even if null). */
export type ProfileSupport = Readonly<{ username: boolean; bio: boolean; dateOfBirth: boolean }>;

export function profileSupport(raw: ApiProfileV4 | null | undefined): ProfileSupport {
  const has = (k: string): boolean => !!raw && Object.prototype.hasOwnProperty.call(raw, k);
  return { username: has('username'), bio: has('bio'), dateOfBirth: has('dateOfBirth') };
}

export type ProfilePatch = Partial<{
  displayName: string;
  avatarUrl: string | null;
  phone: string | null;
  city: string | null;
  // Phase 4 — only sent when the profile response carries them.
  username: string | null;
  bio: string | null;
  dateOfBirth: string | null;
}>;

export function patchProfile(body: ProfilePatch): Promise<ApiProfileV4> {
  return call()<ApiProfileV4>('/v1/me/profile', { method: 'PATCH', body });
}

// ─── § K.2 — Route 168: username availability ────────────────────────────────

export type UsernameAvailability = Readonly<{
  username: string;
  available: boolean;
  reason?: 'taken' | 'reserved' | 'invalid' | null;
}>;

export function checkUsername(username: string, signal?: AbortSignal): Promise<UsernameAvailability | null> {
  return optional(
    call()<UsernameAvailability>(`/v1/usernames/${encodeURIComponent(username)}/availability`, { signal }),
  );
}

// ─── § K.3 — Route 169: avatar upload ─────────────────────────────────────────

export function uploadAvatar(file: { uri: string; name: string; type: string }): Promise<{ avatarUrl: string } | null> {
  const form = new FormData();
  // React Native FormData accepts { uri, name, type } file descriptors.
  form.append('file', file as unknown as Blob);
  return optional(call()<{ avatarUrl: string }>('/v1/me/avatar', { method: 'POST', body: form }));
}

/** Resolves to false when the route is not deployed yet. */
export async function deleteAvatar(): Promise<boolean> {
  const res = await optional(call()<void>('/v1/me/avatar', { method: 'DELETE' }).then(() => true));
  return res === true;
}

// ─── § K.4 — Delete with grace period, route 170 ─────────────────────────────

export type DeleteAccountResult = Readonly<{
  accountStatus?: string | null;
  deletedAt?: string | null;
  scheduledDeletionAt?: string | null;
}>;

export function deleteAccount(): Promise<DeleteAccountResult> {
  return call()<DeleteAccountResult>('/v1/me/profile/delete', { method: 'POST' });
}

export function cancelDeletion(): Promise<ApiProfileV4 | null> {
  return optional(call()<ApiProfileV4>('/v1/me/profile/cancel-deletion', { method: 'POST' }));
}

// ─── § K.5 — Route 171: data export ──────────────────────────────────────────

export type DataExportRequest = Readonly<{ requestId: string; estimatedReadyAt?: string | null }>;

export function requestDataExport(): Promise<DataExportRequest | null> {
  return optional(call()<DataExportRequest>('/v1/me/data-export', { method: 'POST' }));
}

// ─── § J.7 — Routes 165 / 167: saved songs ───────────────────────────────────

export type ApiSavedSong = Readonly<{
  id: string;
  provider?: string | null;
  providerTrackId?: string | null;
  title: string;
  artistName?: string | null;
  artworkUrl?: string | null;
  durationSec?: number | null;
  previewUrl?: string | null;
  externalUrl?: string | null;
  fromEvent?: Readonly<{ id: string; title?: string | null }> | null;
  savedAt?: string | null;
}>;

type CursorPage<T> = Readonly<{ items: ReadonlyArray<T>; nextCursor?: string | null; hasMore?: boolean }>;

export async function listSavedSongs(): Promise<ReadonlyArray<ApiSavedSong> | null> {
  const page = await optional(call()<CursorPage<ApiSavedSong>>('/v1/me/saved-songs', { query: { limit: 100 } }));
  return page ? page.items ?? [] : null;
}

export function deleteSavedSong(id: string): Promise<void> {
  return call()<void>(`/v1/me/saved-songs/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

// ─── § I.1 — Route 154: review eligibility ───────────────────────────────────

export type ReviewTargetType = 'event' | 'venue' | 'organizer';

export type ApiReviewEligibility = Readonly<{
  targetType: ReviewTargetType;
  targetId: string;
  targetName?: string | null;
  imageUrl?: string | null;
  reservationId?: string | null;
  visitDate?: string | null;
  eventTitle?: string | null;
  reviewed?: boolean | null;
}>;

export async function getReviewEligibility(): Promise<ReadonlyArray<ApiReviewEligibility> | null> {
  const res = await optional(call()<{ items: ReadonlyArray<ApiReviewEligibility> }>('/v1/me/review-eligibility'));
  return res ? res.items ?? [] : null;
}

// ─── § I.6 — /v1/me/reviews with Phase 4 extensions ──────────────────────────

export type ApiMyReviewV4 = ApiMyReview &
  Readonly<{
    targetType?: ReviewTargetType | null;
    target?: Readonly<{ id: string; name?: string | null; imageUrl?: string | null }> | null;
  }>;

export type ApiMyReviewsV4 = Readonly<{
  items: ReadonlyArray<ApiMyReviewV4>;
  totals?: Readonly<{ publishedCount?: number | null; draftCount?: number | null; averageRating?: number | null }> | null;
  stats?: Readonly<{ count?: number | null; averageGiven?: number | null; helpfulReceived?: number | null }> | null;
  nextCursor?: string | null;
  hasMore?: boolean;
}>;

export function getMyReviews(): Promise<ApiMyReviewsV4> {
  return call()<ApiMyReviewsV4>('/v1/me/reviews', { query: { limit: 100 } });
}

export function updateReview(id: string, body: { rating?: number; comment?: string | null }): Promise<unknown> {
  return call()<unknown>(`/v1/reviews/${encodeURIComponent(id)}`, { method: 'PATCH', body });
}

export function deleteReview(id: string): Promise<void> {
  return call()<void>(`/v1/reviews/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

/** Routes 155 / 156 (venue, organizer) and the existing event review route. */
export function createReview(
  target: Readonly<{ targetType: ReviewTargetType; targetId: string; reservationId?: string | null }>,
  body: { rating: number; comment?: string | null },
): Promise<unknown> {
  const base = target.targetType === 'event' ? 'events' : target.targetType === 'venue' ? 'venues' : 'organizers';
  return call()<unknown>(`/v1/${base}/${encodeURIComponent(target.targetId)}/reviews`, {
    method: 'POST',
    body: { ...body, reservationId: target.reservationId ?? null },
  });
}

// ─── § G.10 — Route 152: payment history ─────────────────────────────────────

export type ApiPaymentTx = Readonly<{
  paymentId: string;
  label?: string | null;
  reservationId?: string | null;
  method?: string | null;
  cardLastFour?: string | null;
  amountCents: number;
  currency?: string | null;
  kind?: 'payment' | 'refund' | null;
  status?: string | null;
  createdAt?: string | null;
}>;

export async function listMyPayments(): Promise<ReadonlyArray<ApiPaymentTx> | null> {
  const page = await optional(call()<CursorPage<ApiPaymentTx>>('/v1/me/payments', { query: { limit: 10 } }));
  return page ? page.items ?? [] : null;
}
