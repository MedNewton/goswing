// lib/supabase/reviews.ts
// Phase 1 stub — reviews are not exposed by the new REST API yet.
// Reads return empty/null; writes resolve as no-ops.
// See docs/superpowers/specs/2026-05-20-rest-api-read-side-migration.md § 6.3.

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

function stubLog(name: string): void {
  if (__DEV__) {
    // eslint-disable-next-line no-console
    console.log(`[STUB] lib/supabase/reviews.${name}()`);
  }
}

export async function createEventReview(
  _input: CreateEventReviewInput,
): Promise<void> {
  stubLog('createEventReview');
}

export async function getMyReviewForEvent(
  _eventId: string,
): Promise<MyEventReview | null> {
  stubLog('getMyReviewForEvent');
  return null;
}

export async function getMyReviews(): Promise<UserReviewsResult> {
  stubLog('getMyReviews');
  return { published: [], drafts: [], totalCount: 0, averageRating: 0 };
}

export async function updateReview(
  _reviewId: string,
  _input: { rating?: ReviewRating; comment?: string | null },
): Promise<void> {
  stubLog('updateReview');
}

export async function deleteReview(_reviewId: string): Promise<void> {
  stubLog('deleteReview');
}
