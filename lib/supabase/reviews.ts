// src/lib/supabase/reviews.ts
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
    // Common case: user already reviewed (unique violation)
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
