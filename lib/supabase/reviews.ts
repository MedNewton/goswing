// lib/supabase/reviews.ts
import { supabase } from '@/lib/supabase';

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
}>;

export type UserReviewsResult = Readonly<{
  published: ReadonlyArray<UserReview>;
  drafts: ReadonlyArray<UserReview>;
  totalCount: number;
  averageRating: number;
}>;

function asString(v: unknown): string {
  return typeof v === 'string' ? v : String(v ?? '');
}

function clampRating(n: unknown): ReviewRating {
  const x = typeof n === 'number' ? n : Number(n);
  if (x === 1 || x === 2 || x === 3 || x === 4 || x === 5) return x;
  if (x < 1) return 1;
  if (x > 5) return 5;
  return 5;
}

function normalizeComment(v: unknown): string | null {
  if (v == null) return null;
  const s = typeof v === 'string' ? v.trim() : String(v).trim();
  return s.length ? s : null;
}

export async function createEventReview(input: CreateEventReviewInput): Promise<void> {
  const eventId = asString(input.eventId).trim();
  if (!eventId) throw new Error('Missing eventId.');

  const rating = clampRating(input.rating);
  const comment = normalizeComment(input.comment);
  const reservationId = input.reservationId ? asString(input.reservationId).trim() : null;

  const payload: Record<string, unknown> = {
    event_id: eventId,
    rating,
    comment,
  };
  if (reservationId) payload.reservation_id = reservationId;

  const { error } = await supabase.from('event_reviews').insert(payload);

  if (error) {
    const msg = String(error.message ?? '');
    if (msg.toLowerCase().includes('duplicate') || msg.toLowerCase().includes('unique')) {
      throw new Error('You already submitted a review for this event.');
    }
    throw new Error(msg || 'Failed to submit review.');
  }
}

export async function getMyReviewForEvent(eventId: string): Promise<MyEventReview | null> {
  const id = asString(eventId).trim();
  if (!id) throw new Error('Missing eventId.');

  const { data, error } = await supabase
    .from('event_reviews')
    .select('rating, comment, created_at')
    .eq('event_id', id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  return {
    rating: clampRating((data as any).rating),
    comment: normalizeComment((data as any).comment),
    createdAt: asString((data as any).created_at),
  };
}

/**
 * Fetch all reviews by the current user with event details
 */
export async function getMyReviews(): Promise<UserReviewsResult> {
  const { data, error } = await supabase
    .from('event_reviews')
    .select(`
      id,
      event_id,
      rating,
      comment,
      created_at,
      updated_at,
      events:event_id (
        id,
        title,
        hero_image_url,
        starts_at,
        organizers:organizer_id (
          name
        )
      )
    `)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);

  const reviews: UserReview[] = (data ?? []).map((row: any) => {
    const event = row.events;
    
    return {
      id: asString(row.id),
      eventId: asString(row.event_id),
      eventTitle: asString(event?.title ?? 'Event'),
      eventImageUrl: event?.hero_image_url ?? null,
      organizerName: asString(event?.organizers?.name ?? 'Organizer'),
      eventDate: event?.starts_at 
        ? new Date(event.starts_at).toLocaleDateString(undefined, { 
            month: 'short', 
            day: 'numeric', 
            year: 'numeric' 
          })
        : '',
      rating: clampRating(row.rating),
      comment: normalizeComment(row.comment),
      createdAt: asString(row.created_at),
      updatedAt: asString(row.updated_at),
      helpfulCount: 0, // TODO: Add helpful_count to schema if needed
      images: [], // TODO: Add review images support if needed
      isDraft: !row.comment || row.comment.trim().length === 0,
    };
  });

  const published = reviews.filter((r) => !r.isDraft);
  const drafts = reviews.filter((r) => r.isDraft);

  const totalCount = published.length;
  const averageRating = totalCount > 0
    ? published.reduce((sum, r) => sum + r.rating, 0) / totalCount
    : 0;

  return {
    published,
    drafts,
    totalCount,
    averageRating: Math.round(averageRating * 10) / 10,
  };
}

/**
 * Update an existing review
 */
export async function updateReview(
  reviewId: string,
  input: { rating?: ReviewRating; comment?: string | null }
): Promise<void> {
  const id = asString(reviewId).trim();
  if (!id) throw new Error('Missing reviewId.');

  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (input.rating !== undefined) {
    updates.rating = clampRating(input.rating);
  }
  if (input.comment !== undefined) {
    updates.comment = normalizeComment(input.comment);
  }

  const { error } = await supabase
    .from('event_reviews')
    .update(updates)
    .eq('id', id);

  if (error) throw new Error(error.message);
}

/**
 * Delete a review
 */
export async function deleteReview(reviewId: string): Promise<void> {
  const id = asString(reviewId).trim();
  if (!id) throw new Error('Missing reviewId.');

  const { error } = await supabase
    .from('event_reviews')
    .delete()
    .eq('id', id);

  if (error) throw new Error(error.message);
}