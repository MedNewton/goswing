// lib/supabase/organizers.ts
// Phase 1 — organizer profile data is NOT exposed by the new REST API.
// Reads are stubbed to empty/default values; mutations resolve as no-ops.
// All exports keep their original names so import sites stay valid.
// See docs/superpowers/specs/2026-05-20-rest-api-read-side-migration.md § 6.3.

const STUB_TAG = '[STUB] lib/supabase/organizers';

function stubLog(name: string): void {
  if (__DEV__) {
    // eslint-disable-next-line no-console
    console.log(`${STUB_TAG}.${name}()`);
  }
}

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
// READ-SIDE STUBS
// ============================================

export async function getOrganizerById(
  _organizerId: string,
): Promise<OrganizerWithStats | null> {
  stubLog('getOrganizerById');
  return null;
}

export async function getOrganizerEvents(
  _organizerId: string,
  _type: 'upcoming' | 'past',
): Promise<ReadonlyArray<OrganizerEvent>> {
  stubLog('getOrganizerEvents');
  return [];
}

export async function getOrganizerGallery(
  _organizerId: string,
): Promise<ReadonlyArray<OrganizerGalleryImage>> {
  stubLog('getOrganizerGallery');
  return [];
}

export async function getOrganizerReviews(
  _organizerId: string,
): Promise<ReadonlyArray<OrganizerReview>> {
  stubLog('getOrganizerReviews');
  return [];
}

export async function getSimilarOrganizers(
  _organizerId: string,
): Promise<ReadonlyArray<SimilarOrganizer>> {
  stubLog('getSimilarOrganizers');
  return [];
}

export async function getOrganizerSummaryForEvent(
  _organizerId: string,
): Promise<OrganizerSummary | null> {
  stubLog('getOrganizerSummaryForEvent');
  return null;
}

export async function listFollowedOrganizers(): Promise<ReadonlyArray<FollowedOrganizer>> {
  stubLog('listFollowedOrganizers');
  return [];
}

export async function checkIsFollowing(_organizerId: string): Promise<boolean> {
  stubLog('checkIsFollowing');
  return false;
}

// ============================================
// WRITE-SIDE STUBS
// ============================================

export async function followOrganizer(_organizerId: string): Promise<void> {
  stubLog('followOrganizer');
}

export async function unfollowOrganizer(_organizerId: string): Promise<void> {
  stubLog('unfollowOrganizer');
}
