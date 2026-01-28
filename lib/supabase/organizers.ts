// lib/supabase/organizers.ts
import { supabase } from "@/lib/supabase";

function asString(v: unknown): string {
  return typeof v === "string" ? v : String(v ?? "");
}

function normalizeNullableString(v: unknown): string | null {
  if (v == null) return null;
  const s = typeof v === "string" ? v.trim() : String(v).trim();
  return s.length ? s : null;
}

function toNumber(v: unknown, fallback: number): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
  }
  return fallback;
}

// ============================================
// TYPES
// ============================================

export type Organizer = Readonly<{
  id: string;
  name: string;
  tagline: string | null;
  about: string | null;
  logoUrl: string | null;
  coverImageUrl: string | null;
  establishedYear: number | null;
  isVerified: boolean;
  city: string | null;
  countryCode: string | null;
  phone: string | null;
  email: string | null;
  websiteUrl: string | null;
  instagramHandle: string | null;
  facebookHandle: string | null;
  specialties: ReadonlyArray<string>;
  cancellationPolicy: string | null;
  refundPolicy: string | null;
  responseTimeHours: number | null;
  createdAt: string;
  updatedAt: string;
}>;

export type OrganizerStats = Readonly<{
  avgRating: number;
  reviewCount: number;
  eventCount: number;
  followerCount: number;
  totalAttendees: number;
  successRate: number;
}>;

export type OrganizerWithStats = Organizer & {
  stats: OrganizerStats;
  isFollowing: boolean;
};

export type OrganizerEvent = Readonly<{
  id: string;
  externalId: string | null;
  title: string;
  imageUrl: string | null;
  startsAt: string;
  venue: string | null;
  city: string | null;
  priceLabel: string | null;
  attendeeCount: number;
}>;

export type OrganizerGalleryImage = Readonly<{
  id: string;
  imageUrl: string;
  caption: string | null;
  createdAt: string;
}>;

export type OrganizerReview = Readonly<{
  id: string;
  userId: string;
  userName: string | null;
  userAvatarUrl: string | null;
  rating: number;
  comment: string | null;
  eventId: string;
  eventTitle: string | null;
  createdAt: string;
}>;

export type SimilarOrganizer = Readonly<{
  id: string;
  name: string;
  logoUrl: string | null;
  avgRating: number;
  eventCount: number;
  followerCount: number;
}>;

// ============================================
// GET ORGANIZER BY ID
// ============================================

export async function getOrganizerById(
  organizerId: string
): Promise<OrganizerWithStats | null> {
  const id = asString(organizerId).trim();
  if (!id) throw new Error("Missing organizerId.");

  // Fetch organizer data
  const { data: org, error: orgError } = await supabase
    .from("organizers")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (orgError) throw new Error(orgError.message);
  if (!org) return null;

  // Fetch stats in parallel
  const [followerCount, eventStats, isFollowing] = await Promise.all([
    getFollowerCount(id),
    getEventStats(id),
    checkIsFollowing(id),
  ]);

  const organizer: Organizer = {
    id: asString(org.id),
    name: asString(org.name),
    tagline: normalizeNullableString(org.tagline),
    about: normalizeNullableString(org.about),
    logoUrl: normalizeNullableString(org.logo_url),
    coverImageUrl: normalizeNullableString(org.cover_image_url),
    establishedYear: org.established_year ?? null,
    isVerified: Boolean(org.is_verified),
    city: normalizeNullableString(org.city),
    countryCode: normalizeNullableString(org.country_code),
    phone: normalizeNullableString(org.phone),
    email: normalizeNullableString(org.email),
    websiteUrl: normalizeNullableString(org.website_url),
    instagramHandle: normalizeNullableString(org.instagram_handle),
    facebookHandle: normalizeNullableString(org.facebook_handle),
    specialties: Array.isArray(org.specialties) ? org.specialties : [],
    cancellationPolicy: normalizeNullableString(org.cancellation_policy),
    refundPolicy: normalizeNullableString(org.refund_policy),
    responseTimeHours: org.response_time_hours ?? null,
    createdAt: asString(org.created_at),
    updatedAt: asString(org.updated_at),
  };

  return {
    ...organizer,
    stats: {
      avgRating: eventStats.avgRating,
      reviewCount: eventStats.reviewCount,
      eventCount: eventStats.eventCount,
      followerCount,
      totalAttendees: eventStats.totalAttendees,
      successRate: eventStats.successRate,
    },
    isFollowing,
  };
}

// ============================================
// HELPER: GET FOLLOWER COUNT
// ============================================

async function getFollowerCount(organizerId: string): Promise<number> {
  const { count, error } = await supabase
    .from("organizer_follows")
    .select("*", { count: "exact", head: true })
    .eq("organizer_id", organizerId);

  if (error) return 0;
  return count ?? 0;
}

// ============================================
// HELPER: GET EVENT STATS
// ============================================

async function getEventStats(organizerId: string): Promise<{
  eventCount: number;
  avgRating: number;
  reviewCount: number;
  totalAttendees: number;
  successRate: number;
}> {
  // Get events for this organizer
  const { data: events, error: eventsError } = await supabase
    .from("events")
    .select("id, status")
    .eq("organizer_id", organizerId);

  if (eventsError || !events) {
    return { eventCount: 0, avgRating: 0, reviewCount: 0, totalAttendees: 0, successRate: 0 };
  }

  const eventCount = events.length;
  const eventIds = events.map((e) => e.id);

  if (eventIds.length === 0) {
    return { eventCount: 0, avgRating: 0, reviewCount: 0, totalAttendees: 0, successRate: 0 };
  }

  // Get reviews for these events
  const { data: reviews, error: reviewsError } = await supabase
    .from("event_reviews")
    .select("rating")
    .in("event_id", eventIds);

  let avgRating = 0;
  let reviewCount = 0;
  if (!reviewsError && reviews && reviews.length > 0) {
    reviewCount = reviews.length;
    const totalRating = reviews.reduce((sum, r) => sum + toNumber(r.rating, 0), 0);
    avgRating = Math.round((totalRating / reviewCount) * 10) / 10;
  }

  // Get total attendees (confirmed reservations)
  const { count: attendeeCount, error: attendeeError } = await supabase
    .from("reservations")
    .select("*", { count: "exact", head: true })
    .in("event_id", eventIds)
    .eq("status", "confirmed");

  const totalAttendees = attendeeError ? 0 : (attendeeCount ?? 0);

  // Calculate success rate (published events / total events)
  const publishedCount = events.filter((e) => e.status === "published").length;
  const successRate = eventCount > 0 ? Math.round((publishedCount / eventCount) * 1000) / 10 : 0;

  return { eventCount, avgRating, reviewCount, totalAttendees, successRate };
}

// ============================================
// CHECK IF USER IS FOLLOWING
// ============================================

async function checkIsFollowing(organizerId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("organizer_follows")
    .select("id")
    .eq("organizer_id", organizerId)
    .maybeSingle();

  if (error) return false;
  return !!data;
}

// ============================================
// FOLLOW ORGANIZER
// ============================================

export async function followOrganizer(organizerId: string): Promise<void> {
  const id = asString(organizerId).trim();
  if (!id) throw new Error("Missing organizerId.");

  const { error } = await supabase
    .from("organizer_follows")
    .insert({ organizer_id: id });

  if (error && !error.message.includes("duplicate")) {
    throw new Error(error.message);
  }
}

// ============================================
// UNFOLLOW ORGANIZER
// ============================================

export async function unfollowOrganizer(organizerId: string): Promise<void> {
  const id = asString(organizerId).trim();
  if (!id) throw new Error("Missing organizerId.");

  const { error } = await supabase
    .from("organizer_follows")
    .delete()
    .eq("organizer_id", id);

  if (error) throw new Error(error.message);
}

// ============================================
// GET ORGANIZER EVENTS
// ============================================

export async function getOrganizerEvents(
  organizerId: string,
  type: "upcoming" | "past"
): Promise<ReadonlyArray<OrganizerEvent>> {
  const id = asString(organizerId).trim();
  if (!id) throw new Error("Missing organizerId.");

  const now = new Date().toISOString();

  let query = supabase
    .from("events")
    .select(`
      id,
      external_id,
      title,
      hero_image_url,
      starts_at,
      min_price_cents,
      is_free,
      venues:venue_id ( name, city )
    `)
    .eq("organizer_id", id)
    .eq("status", "published");

  if (type === "upcoming") {
    query = query.gte("starts_at", now).order("starts_at", { ascending: true });
  } else {
    query = query.lt("starts_at", now).order("starts_at", { ascending: false });
  }

  const { data, error } = await query.limit(20);

  if (error) throw new Error(error.message);

  const events: OrganizerEvent[] = [];
  for (const row of data ?? []) {
    // Get attendee count for this event
    const { count } = await supabase
      .from("reservations")
      .select("*", { count: "exact", head: true })
      .eq("event_id", row.id)
      .eq("status", "confirmed");

    const venue = row.venues as { name: string | null; city: string | null } | null;
    const minPriceCents = toNumber(row.min_price_cents, 0);
    const isFree = Boolean(row.is_free);

    events.push({
      id: asString(row.id),
      externalId: normalizeNullableString(row.external_id),
      title: asString(row.title),
      imageUrl: normalizeNullableString(row.hero_image_url),
      startsAt: asString(row.starts_at),
      venue: venue?.name ?? null,
      city: venue?.city ?? null,
      priceLabel: isFree || minPriceCents === 0 ? "Free" : `$${Math.round(minPriceCents / 100)}`,
      attendeeCount: count ?? 0,
    });
  }

  return events;
}

// ============================================
// GET ORGANIZER GALLERY
// ============================================

export async function getOrganizerGallery(
  organizerId: string
): Promise<ReadonlyArray<OrganizerGalleryImage>> {
  const id = asString(organizerId).trim();
  if (!id) throw new Error("Missing organizerId.");

  const { data, error } = await supabase
    .from("organizer_gallery")
    .select("id, image_url, caption, created_at")
    .eq("organizer_id", id)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => ({
    id: asString(row.id),
    imageUrl: asString(row.image_url),
    caption: normalizeNullableString(row.caption),
    createdAt: asString(row.created_at),
  }));
}

// ============================================
// GET ORGANIZER REVIEWS
// ============================================

export async function getOrganizerReviews(
  organizerId: string
): Promise<ReadonlyArray<OrganizerReview>> {
  const id = asString(organizerId).trim();
  if (!id) throw new Error("Missing organizerId.");

  // Get event IDs for this organizer
  const { data: events, error: eventsError } = await supabase
    .from("events")
    .select("id, title")
    .eq("organizer_id", id);

  if (eventsError) throw new Error(eventsError.message);
  if (!events || events.length === 0) return [];

  const eventIds = events.map((e) => e.id);
  const eventMap = new Map(events.map((e) => [e.id, e.title]));

  // Get reviews for these events
  const { data: reviews, error: reviewsError } = await supabase
    .from("event_reviews")
    .select(`
      id,
      clerk_user_id,
      rating,
      comment,
      event_id,
      created_at,
      profiles:clerk_user_id ( display_name, avatar_url )
    `)
    .in("event_id", eventIds)
    .order("created_at", { ascending: false })
    .limit(50);

  if (reviewsError) throw new Error(reviewsError.message);

  return (reviews ?? []).map((row) => {
    const profile = row.profiles as { display_name: string | null; avatar_url: string | null } | null;
    return {
      id: asString(row.id),
      userId: asString(row.clerk_user_id),
      userName: profile?.display_name ?? null,
      userAvatarUrl: profile?.avatar_url ?? null,
      rating: toNumber(row.rating, 0),
      comment: normalizeNullableString(row.comment),
      eventId: asString(row.event_id),
      eventTitle: eventMap.get(row.event_id) ?? null,
      createdAt: asString(row.created_at),
    };
  });
}

// ============================================
// GET SIMILAR ORGANIZERS
// ============================================

export async function getSimilarOrganizers(
  organizerId: string
): Promise<ReadonlyArray<SimilarOrganizer>> {
  const id = asString(organizerId).trim();
  if (!id) throw new Error("Missing organizerId.");

  // Get current organizer's specialties
  const { data: currentOrg } = await supabase
    .from("organizers")
    .select("specialties, city")
    .eq("id", id)
    .maybeSingle();

  // Get other organizers (excluding current)
  const { data: organizers, error } = await supabase
    .from("organizers")
    .select("id, name, logo_url, city, specialties")
    .neq("id", id)
    .limit(10);

  if (error) throw new Error(error.message);

  const results: SimilarOrganizer[] = [];

  for (const org of organizers ?? []) {
    // Get stats for each organizer
    const [followerCount, eventStats] = await Promise.all([
      getFollowerCount(org.id),
      getEventStats(org.id),
    ]);

    results.push({
      id: asString(org.id),
      name: asString(org.name),
      logoUrl: normalizeNullableString(org.logo_url),
      avgRating: eventStats.avgRating,
      eventCount: eventStats.eventCount,
      followerCount,
    });
  }

  // Sort by event count (most active first)
  results.sort((a, b) => b.eventCount - a.eventCount);

  return results.slice(0, 5);
}
