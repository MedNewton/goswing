// lib/supabase/reviews.ts
// Event reviews — backed by the Gooswing REST API (routes N.1–N.5).

import * as engagementApi from '@/lib/api/engagement';
import type { ApiMyReview } from '@/lib/api/types';

export type ReviewRating = 1 | 2 | 3 | 4 | 5;

export type CreateEventReviewInput = Readonly<{
  eventId: string;
  rating: ReviewRating;
  comment?: string | null;
  reservationId?: string | null;
}>;

export type MyEventReview = Readonly<{
  rating: ReviewRating;
  comment: string | null;
  createdAt: string;
}>;

export type UserReview = Readonly<{
  id: string;
  eventId: string;
  eventTitle: string;
  eventImageUrl: string | null;
  organizerName: string;
  eventDate: string;
  rating: ReviewRating;
  comment: string | null;
  createdAt: string;
  updatedAt: string;
  helpfulCount: number;
  images: ReadonlyArray<string>;
  isDraft: boolean;
  adminLiked: boolean;
  adminReply: string | null;
  adminReplyAt: string | null;
}>;

export type UserReviewsResult = Readonly<{
  published: ReadonlyArray<UserReview>;
  drafts: ReadonlyArray<UserReview>;
  totalCount: number;
  averageRating: number;
}>;

function toRating(v: unknown): ReviewRating {
  const n = typeof v === 'number' ? Math.round(v) : Number(v);
  if (n >= 1 && n <= 5) return n as ReviewRating;
  return 5;
}

function mapUserReview(r: ApiMyReview): UserReview {
  return {
    id: String(r.id),
    eventId: String(r.eventId ?? ''),
    eventTitle: String(r.eventTitle ?? ''),
    eventImageUrl: r.eventImageUrl ?? null,
    organizerName: String(r.organizerName ?? ''),
    eventDate: String(r.eventStartsAtIso ?? ''),
    rating: toRating(r.rating),
    comment: r.comment ?? null,
    createdAt: String(r.createdAt ?? ''),
    updatedAt: String(r.updatedAt ?? r.createdAt ?? ''),
    helpfulCount: typeof r.helpfulCount === 'number' ? r.helpfulCount : 0,
    images: (r.images ?? []).map(String),
    isDraft: Boolean(r.isDraft),
    adminLiked: Boolean(r.adminLiked),
    adminReply: r.adminReply ?? null,
    adminReplyAt: r.adminReplyAt ?? null,
  };
}

export async function createEventReview(
  input: CreateEventReviewInput,
): Promise<void> {
  await engagementApi.createReview(input.eventId, {
    rating: input.rating,
    comment: input.comment ?? null,
    reservationId: input.reservationId ?? null,
  });
}

export async function getMyReviewForEvent(
  eventId: string,
): Promise<MyEventReview | null> {
  const { review } = await engagementApi.getMyReviewForEvent(eventId);
  if (!review) return null;
  return {
    rating: toRating(review.rating),
    comment: review.comment ?? null,
    createdAt: String(review.createdAt ?? ''),
  };
}

export async function getMyReviews(): Promise<UserReviewsResult> {
  const res = await engagementApi.getMyReviews({ limit: 100 });
  const all = (res.items ?? []).map(mapUserReview);

  const published = all.filter((r) => !r.isDraft);
  const drafts = all.filter((r) => r.isDraft);

  const totals = res.totals ?? null;
  const totalCount =
    typeof totals?.publishedCount === 'number'
      ? totals.publishedCount
      : published.length;
  const averageRating =
    typeof totals?.averageRating === 'number'
      ? totals.averageRating
      : published.length > 0
        ? published.reduce((acc, r) => acc + r.rating, 0) / published.length
        : 0;

  return { published, drafts, totalCount, averageRating };
}

export async function updateReview(
  reviewId: string,
  input: { rating?: ReviewRating; comment?: string | null },
): Promise<void> {
  await engagementApi.updateReview(reviewId, input);
}

export async function deleteReview(reviewId: string): Promise<void> {
  await engagementApi.deleteReview(reviewId);
}
