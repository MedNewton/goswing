// lib/api/types.ts
// Raw JSON shapes returned by https://web.gooswing.com/v1/*
// These mirror the verified API contract from
// docs/superpowers/specs/2026-05-20-rest-api-read-side-migration.md (§ 5).

export type ApiErrorEnvelope = Readonly<{
  error: Readonly<{
    code: string;
    message: string;
    details?: unknown;
  }>;
}>;

export type ApiLatLng = Readonly<{ lat: number; lng: number }>;

export type ApiAttendeePreview = Readonly<{
  userId?: string | null;
  displayName?: string | null;
  initials?: string | null;
  avatarUrl?: string | null;
}>;

export type ApiEvent = Readonly<{
  id: string;
  externalId?: string | null;
  title: string;
  description?: string | null;
  organizer?: string | null;
  organizerId?: string | null;
  imageUrl?: string | null;
  startsAtIso?: string | null;
  endsAtIso?: string | null;
  venue?: string | null;
  venueId?: string | null;
  venueType?: string | null;
  city?: string | null;
  countryCode?: string | null;
  category?: string | null;
  categories?: ReadonlyArray<string> | null;
  access?: ReadonlyArray<string> | null;
  musicStyles?: ReadonlyArray<string> | null;
  partyTypes?: ReadonlyArray<string> | null;
  basePrice?: number | null;
  priceLabel?: string | null;
  favorite?: boolean | null;
  attendees?: ReadonlyArray<ApiAttendeePreview> | null;
  attendeesExtraCount?: number | null;
  attendeeCount?: number | null;
  waitlistEnabled?: boolean | null;
  approvalMode?: string | null;
  sharingEnabled?: boolean | null;
  policies?: ReadonlyArray<unknown> | null;
  location?: ApiLatLng | null;
}>;

export type ApiMiniEvent = Readonly<{
  id: string;
  title: string;
  imageUrl?: string | null;
  startsAtIso?: string | null;
  priceLabel?: string | null;
  attendeeCount?: number | null;
  // Route 6 extends with:
  venueId?: string | null;
  venue?: string | null;
  location?: ApiLatLng | null;
}>;

export type ApiTicketType = Readonly<{
  id: string;
  name?: string | null;
  priceCents?: number | null;
  currency?: string | null;
  isFree?: boolean | null;
  freeForLadies?: boolean | null;
  benefits?: ReadonlyArray<string> | null;
  seatsMax?: number | null;
  seatsAvailable?: number | null;
}>;

export type ApiAttendee = Readonly<{
  userId: string;
  displayName?: string | null;
  initials?: string | null;
  avatarUrl?: string | null;
}>;

export type ApiAttendeesResponse = Readonly<{
  attendees: ReadonlyArray<ApiAttendee>;
  totalCount: number;
}>;
