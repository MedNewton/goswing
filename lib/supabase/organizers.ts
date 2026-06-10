// lib/supabase/organizers.ts
// Organizer profiles, gallery, reviews, follows — backed by the Gooswing REST
// API (routes I.1–I.5, J.1–J.3). All exports keep their original names so
// import sites stay valid.
//
// `getSimilarOrganizers` has no dedicated route; it is derived client-side
// from existing routes (similar events → their organizers → full profiles).

import { ApiError } from '@/lib/api/client';
import * as eventsApi from '@/lib/api/events';
import * as organizersApi from '@/lib/api/organizers';
import type { ApiOrganizer } from '@/lib/api/types';

// ============================================
// TYPES (preserved for UI import compatibility)
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
  tiktokHandle: string | null;
  youtubeHandle: string | null;
  twitterHandle: string | null;
  pinterestHandle: string | null;
  snapchatHandle: string | null;
  googleBusinessUrl: string | null;
  customPolicies: ReadonlyArray<unknown>;
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
  mediaType: 'image' | 'video';
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

export type OrganizerSummary = Readonly<{
  logoUrl: string | null;
  followerCount: number;
  avgRating: number;
  isFollowing: boolean;
  cancellationPolicy: string | null;
  refundPolicy: string | null;
}>;

export type FollowedOrganizer = Readonly<{
  id: string;
  name: string;
  logoUrl: string | null;
  followedAt: string;
}>;

// ============================================
// HELPERS
// ============================================

function asString(v: unknown, fallback = ''): string {
  if (typeof v === 'string') return v;
  if (v == null) return fallback;
  return String(v);
}

function toNumber(v: unknown, fallback = 0): number {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return fallback;
}

function isNotFound(e: unknown): boolean {
  return e instanceof ApiError && (e.status === 404 || e.code === 'not_found');
}

function mapStats(raw: ApiOrganizer['stats']): OrganizerStats {
  return {
    avgRating: toNumber(raw?.avgRating, 0),
    reviewCount: toNumber(raw?.reviewCount, 0),
    eventCount: toNumber(raw?.eventCount, 0),
    followerCount: toNumber(raw?.followerCount, 0),
    totalAttendees: toNumber(raw?.totalAttendees, 0),
    successRate: toNumber(raw?.successRate, 0),
  };
}

function mapOrganizer(raw: ApiOrganizer): OrganizerWithStats {
  return {
    id: asString(raw.id),
    name: asString(raw.name),
    tagline: raw.tagline ?? null,
    about: raw.about ?? null,
    logoUrl: raw.logoUrl ?? null,
    coverImageUrl: raw.coverImageUrl ?? null,
    establishedYear: raw.establishedYear ?? null,
    isVerified: Boolean(raw.isVerified),
    city: raw.city ?? null,
    countryCode: raw.countryCode ?? null,
    phone: raw.phone ?? null,
    email: raw.email ?? null,
    websiteUrl: raw.websiteUrl ?? null,
    instagramHandle: raw.instagramHandle ?? null,
    facebookHandle: raw.facebookHandle ?? null,
    specialties: (raw.specialties ?? []).map((s) => asString(s)),
    cancellationPolicy: raw.cancellationPolicy ?? null,
    refundPolicy: raw.refundPolicy ?? null,
    responseTimeHours: raw.responseTimeHours ?? null,
    tiktokHandle: raw.tiktokHandle ?? null,
    youtubeHandle: raw.youtubeHandle ?? null,
    twitterHandle: raw.twitterHandle ?? null,
    pinterestHandle: raw.pinterestHandle ?? null,
    snapchatHandle: raw.snapchatHandle ?? null,
    googleBusinessUrl: raw.googleBusinessUrl ?? null,
    customPolicies: raw.customPolicies ?? [],
    createdAt: asString(raw.createdAt),
    updatedAt: asString(raw.updatedAt),
    stats: mapStats(raw.stats),
    isFollowing: Boolean(raw.isFollowing),
  };
}

// ============================================
// READS
// ============================================

export async function getOrganizerById(
  organizerId: string,
): Promise<OrganizerWithStats | null> {
  const id = asString(organizerId).trim();
  if (!id) return null;

  try {
    return mapOrganizer(await organizersApi.getOrganizer(id));
  } catch (e) {
    if (isNotFound(e)) return null;
    throw e;
  }
}

export async function getOrganizerEvents(
  organizerId: string,
  type: 'upcoming' | 'past',
): Promise<ReadonlyArray<OrganizerEvent>> {
  const id = asString(organizerId).trim();
  if (!id) return [];

  const rows = await eventsApi.getOrganizerEventsExpanded(id, {
    when: type,
    limit: 50,
  });

  return rows.map((r) => ({
    id: asString(r.id),
    externalId: r.externalId ?? null,
    title: asString(r.title),
    imageUrl: r.imageUrl ?? null,
    startsAt: asString(r.startsAtIso),
    venue: r.venue ?? null,
    city: r.city ?? null,
    priceLabel: r.priceLabel ?? null,
    attendeeCount: toNumber(r.attendeeCount, 0),
  }));
}

export async function getOrganizerGallery(
  organizerId: string,
): Promise<ReadonlyArray<OrganizerGalleryImage>> {
  const id = asString(organizerId).trim();
  if (!id) return [];

  const page = await organizersApi.getOrganizerGallery(id, { limit: 50 });
  return (page.items ?? []).map((g) => ({
    id: asString(g.id),
    imageUrl: asString(g.imageUrl),
    caption: g.caption ?? null,
    createdAt: asString(g.createdAt),
    mediaType: g.mediaType === 'video' ? 'video' : 'image',
  }));
}

export async function getOrganizerReviews(
  organizerId: string,
): Promise<ReadonlyArray<OrganizerReview>> {
  const id = asString(organizerId).trim();
  if (!id) return [];

  const page = await organizersApi.getOrganizerReviews(id, { limit: 50 });
  return (page.items ?? []).map((r) => ({
    id: asString(r.id),
    userId: asString(r.userId),
    userName: r.userName ?? null,
    userAvatarUrl: r.userAvatarUrl ?? null,
    rating: toNumber(r.rating, 0),
    comment: r.comment ?? null,
    eventId: asString(r.eventId),
    eventTitle: r.eventTitle ?? null,
    createdAt: asString(r.createdAt),
  }));
}

/**
 * Derived client-side (no dedicated API route): organizers of events similar
 * to this organizer's next event — biased toward the same category — then
 * hydrated with stats via the full organizer route. Falls back to organizers
 * found in the global published-events list when the organizer has no events.
 */
export async function getSimilarOrganizers(
  organizerId: string,
): Promise<ReadonlyArray<SimilarOrganizer>> {
  const id = asString(organizerId).trim();
  if (!id) throw new Error('Missing organizerId.');

  const MAX_RESULTS = 5;
  const candidateIds: string[] = [];
  const seen = new Set<string>([id]);

  const pushCandidate = (orgId: unknown): void => {
    const v = asString(orgId).trim();
    if (!v || seen.has(v)) return;
    seen.add(v);
    candidateIds.push(v);
  };

  // 1) Seed with organizers of events similar to this organizer's events.
  try {
    const ownEvents = await eventsApi.getOrganizerEvents(id, { limit: 3 });
    const similarLists = await Promise.all(
      ownEvents.slice(0, 3).map((e) =>
        eventsApi.getSimilarEvents(asString(e.id), { limit: 10 }).catch(() => []),
      ),
    );
    const similarIds = similarLists.flat().map((m) => asString(m.id));
    if (similarIds.length > 0) {
      const detailed = await Promise.all(
        similarIds.slice(0, 10).map((eventId) =>
          eventsApi.getEventById(eventId).catch(() => null),
        ),
      );
      for (const ev of detailed) {
        if (ev?.organizerId) pushCandidate(ev.organizerId);
        if (candidateIds.length >= MAX_RESULTS) break;
      }
    }
  } catch {
    // fall through to the global fallback below
  }

  // 2) Fallback: most-represented organizers in the published events list.
  if (candidateIds.length < MAX_RESULTS) {
    try {
      const events = await eventsApi.getPublishedEvents();
      const countByOrganizer = new Map<string, number>();
      for (const ev of events) {
        const orgId = asString(ev.organizerId).trim();
        if (!orgId || orgId === id) continue;
        countByOrganizer.set(orgId, (countByOrganizer.get(orgId) ?? 0) + 1);
      }
      const ranked = [...countByOrganizer.entries()].sort((a, b) => b[1] - a[1]);
      for (const [orgId] of ranked) {
        pushCandidate(orgId);
        if (candidateIds.length >= MAX_RESULTS) break;
      }
    } catch {
      // best-effort — return whatever we have
    }
  }

  // 3) Hydrate each candidate with name/logo/stats.
  const profiles = await Promise.all(
    candidateIds.slice(0, MAX_RESULTS).map((orgId) =>
      organizersApi.getOrganizer(orgId).catch(() => null),
    ),
  );

  const results: SimilarOrganizer[] = [];
  for (const org of profiles) {
    if (!org) continue;
    const stats = mapStats(org.stats);
    results.push({
      id: asString(org.id),
      name: asString(org.name),
      logoUrl: org.logoUrl ?? null,
      avgRating: stats.avgRating,
      eventCount: stats.eventCount,
      followerCount: stats.followerCount,
    });
  }

  results.sort((a, b) => b.eventCount - a.eventCount);
  return results.slice(0, MAX_RESULTS);
}

export async function getOrganizerSummaryForEvent(
  organizerId: string,
): Promise<OrganizerSummary | null> {
  const id = asString(organizerId).trim();
  if (!id) return null;

  try {
    const raw = await organizersApi.getOrganizerSummary(id);
    return {
      logoUrl: raw.logoUrl ?? null,
      followerCount: toNumber(raw.followerCount, 0),
      avgRating: toNumber(raw.avgRating, 0),
      isFollowing: Boolean(raw.isFollowing),
      cancellationPolicy: raw.cancellationPolicy ?? null,
      refundPolicy: raw.refundPolicy ?? null,
    };
  } catch (e) {
    if (isNotFound(e)) return null;
    throw e;
  }
}

export async function listFollowedOrganizers(): Promise<ReadonlyArray<FollowedOrganizer>> {
  const page = await organizersApi.listFollowedOrganizers({ limit: 50 });
  return (page.items ?? []).map((o) => ({
    id: asString(o.id),
    name: asString(o.name),
    logoUrl: o.logoUrl ?? null,
    followedAt: asString(o.followedAt),
  }));
}

export async function checkIsFollowing(organizerId: string): Promise<boolean> {
  const id = asString(organizerId).trim();
  if (!id) return false;

  try {
    const raw = await organizersApi.getOrganizerSummary(id);
    return Boolean(raw.isFollowing);
  } catch (e) {
    if (isNotFound(e)) return false;
    throw e;
  }
}

// ============================================
// WRITES
// ============================================

export async function followOrganizer(organizerId: string): Promise<void> {
  const id = asString(organizerId).trim();
  if (!id) throw new Error('Missing organizerId.');
  await organizersApi.followOrganizer(id);
}

export async function unfollowOrganizer(organizerId: string): Promise<void> {
  const id = asString(organizerId).trim();
  if (!id) throw new Error('Missing organizerId.');
  await organizersApi.unfollowOrganizer(id);
}
