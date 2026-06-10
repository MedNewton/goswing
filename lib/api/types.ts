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

// ---------------------------------------------------------------------------
// Phase 2 shapes — docs/superpowers/specs/2026-05-21-rest-api-phase-2-routes.md
// ---------------------------------------------------------------------------

export type ApiPage<T> = Readonly<{
  items: ReadonlyArray<T>;
  nextCursor?: string | null;
  hasMore?: boolean;
}>;

// § C — Profile

export type ApiProfileInterest = Readonly<{
  tagId: string;
  tagLabel: string;
  tagSlug: string;
}>;

export type ApiProfileStats = Readonly<{
  attendedCount?: number | null;
  savedCount?: number | null;
  reviewsCount?: number | null;
}>;

export type ApiProfile = Readonly<{
  id: string;
  displayName?: string | null;
  avatarUrl?: string | null;
  email?: string | null;
  phone?: string | null;
  phoneVerified?: boolean | null;
  city?: string | null;
  countryCode?: string | null;
  occupation?: string | null;
  profileVisibility?: 'public' | 'private' | null;
  accountStatus?: 'active' | 'deactivated' | 'deleted' | null;
  interests?: ReadonlyArray<ApiProfileInterest> | null;
  stats?: ApiProfileStats | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  deactivatedAt?: string | null;
  deletedAt?: string | null;
}>;

// § D — Settings

export type ApiUserSettings = Readonly<{
  userId: string;
  pushNotificationsEnabled?: boolean | null;
  locationServicesEnabled?: boolean | null;
  loginNotificationsEnabled?: boolean | null;
  savePaymentInfo?: boolean | null;
  autoReloadWallet?: boolean | null;
  emailReceipts?: boolean | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}>;

// § E — Notification preferences

export type ApiNotificationPreferences = Readonly<{
  userId: string;
  pushEnabled?: boolean | null;
  pushEventReminders?: boolean | null;
  pushEventUpdates?: boolean | null;
  pushNewFollowers?: boolean | null;
  pushEventRecommendations?: boolean | null;
  emailEnabled?: boolean | null;
  emailWeeklyDigest?: boolean | null;
  emailEventInvites?: boolean | null;
  emailPromotions?: boolean | null;
  emailNewsletter?: boolean | null;
  smsEnabled?: boolean | null;
  smsUrgentUpdates?: boolean | null;
  smsEventCancellations?: boolean | null;
  personalizedAds?: boolean | null;
  locationBasedSuggestions?: boolean | null;
  quietHoursEnabled?: boolean | null;
  quietHoursStart?: string | null;
  quietHoursEnd?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}>;

// § F — Payment methods

export type ApiPaymentMethod = Readonly<{
  id: string;
  userId: string;
  provider?: string | null;
  providerPaymentMethodId?: string | null;
  cardBrand?: string | null;
  cardLastFour?: string | null;
  cardExpMonth?: number | null;
  cardExpYear?: number | null;
  cardholderName?: string | null;
  isDefault?: boolean | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}>;

// § G — Login history

export type ApiLoginHistoryEntry = Readonly<{
  id: string;
  userId: string;
  loggedInAt: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  deviceType?: string | null;
  location?: string | null;
  sessionId?: string | null;
  wasSuccessful?: boolean | null;
  failureReason?: string | null;
}>;

// § H — Interests + tags catalog

export type ApiUserInterest = Readonly<{
  userId: string;
  tagId: string;
  tagLabel: string;
  tagSlug: string;
  createdAt?: string | null;
}>;

export type ApiTag = Readonly<{
  id: string;
  slug: string;
  label: string;
  type?: string | null;
  emoji?: string | null;
}>;

// § I — Organizers

export type ApiOrganizerStats = Readonly<{
  avgRating?: number | null;
  reviewCount?: number | null;
  eventCount?: number | null;
  followerCount?: number | null;
  totalAttendees?: number | null;
  successRate?: number | null;
}>;

export type ApiOrganizer = Readonly<{
  id: string;
  name?: string | null;
  tagline?: string | null;
  about?: string | null;
  logoUrl?: string | null;
  coverImageUrl?: string | null;
  establishedYear?: number | null;
  isVerified?: boolean | null;
  city?: string | null;
  countryCode?: string | null;
  phone?: string | null;
  email?: string | null;
  websiteUrl?: string | null;
  instagramHandle?: string | null;
  facebookHandle?: string | null;
  tiktokHandle?: string | null;
  youtubeHandle?: string | null;
  twitterHandle?: string | null;
  pinterestHandle?: string | null;
  snapchatHandle?: string | null;
  googleBusinessUrl?: string | null;
  specialties?: ReadonlyArray<string> | null;
  cancellationPolicy?: string | null;
  refundPolicy?: string | null;
  responseTimeHours?: number | null;
  customPolicies?: ReadonlyArray<unknown> | null;
  stats?: ApiOrganizerStats | null;
  isFollowing?: boolean | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}>;

export type ApiOrganizerSummary = Readonly<{
  organizerId: string;
  logoUrl?: string | null;
  followerCount?: number | null;
  avgRating?: number | null;
  isFollowing?: boolean | null;
  cancellationPolicy?: string | null;
  refundPolicy?: string | null;
}>;

export type ApiOrganizerGalleryItem = Readonly<{
  id: string;
  imageUrl: string;
  caption?: string | null;
  createdAt?: string | null;
  mediaType?: string | null;
}>;

export type ApiOrganizerReview = Readonly<{
  id: string;
  userId: string;
  userName?: string | null;
  userAvatarUrl?: string | null;
  rating?: number | null;
  comment?: string | null;
  eventId?: string | null;
  eventTitle?: string | null;
  createdAt?: string | null;
}>;

// § J — Follows

export type ApiFollowResult = Readonly<{
  organizerId: string;
  isFollowing: boolean;
  followedAt?: string | null;
  followerCount?: number | null;
}>;

export type ApiFollowedOrganizer = Readonly<{
  id: string;
  name?: string | null;
  logoUrl?: string | null;
  followedAt?: string | null;
}>;

// § K — Favorites

export type ApiFavoriteEvent = Readonly<{
  id: string;
  title?: string | null;
  organizer?: string | null;
  venue?: string | null;
  city?: string | null;
  startsAtIso?: string | null;
  imageUrl?: string | null;
  priceLabel?: string | null;
  favorite?: boolean | null;
}>;

export type ApiFavoriteToggleResult = Readonly<{
  eventId: string;
  favorite: boolean;
  favoritedAt?: string | null;
}>;

// § L — Reservations

export type ApiReservationTotals = Readonly<{
  totalTickets?: number | null;
  subtotalCents?: number | null;
  serviceFeeCents?: number | null;
  totalCents?: number | null;
  currency?: string | null;
}>;

export type ApiCreateReservationResult = Readonly<{
  reservationId: string;
  status?: string | null;
  totals?: ApiReservationTotals | null;
}>;

export type ApiTicketHolder = Readonly<{
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  phoneNumber?: string | null;
}>;

export type ApiReservationItem = Readonly<{
  id: string;
  ticketTypeId?: string | null;
  ticketTypeName?: string | null;
  quantity?: number | null;
  unitPriceCents?: number | null;
  lineTotalCents?: number | null;
  benefits?: ReadonlyArray<string> | null;
}>;

export type ApiReservationTicket = Readonly<{
  id: string;
  reservationItemId?: string | null;
  ticketNo?: number | null;
  ticketCode?: string | null;
  ticketTypeName?: string | null;
  unitPriceCents?: number | null;
  currency?: string | null;
  holder?: ApiTicketHolder | null;
  qrValue?: string | null;
  qrCaption?: string | null;
  checkedInAt?: string | null;
}>;

export type ApiMyReservation = Readonly<{
  id: string;
  eventId?: string | null;
  eventExternalId?: string | null;
  status?: string | null;
  title?: string | null;
  startsAtIso?: string | null;
  endsAtIso?: string | null;
  venueName?: string | null;
  venueCity?: string | null;
  currency?: string | null;
  totalAmountCents?: number | null;
  savingsCents?: number | null;
  orderedAt?: string | null;
  totalTickets?: number | null;
  items?: ReadonlyArray<ApiReservationItem> | null;
  tickets?: ReadonlyArray<ApiReservationTicket> | null;
}>;

export type ApiMyReservationsResponse = Readonly<{
  active: ReadonlyArray<ApiMyReservation>;
  past: ReadonlyArray<ApiMyReservation>;
  nextCursor?: string | null;
  hasMore?: boolean;
}>;

export type ApiReservationDetail = Readonly<{
  id: string;
  status?: string | null;
  currency?: string | null;
  totalAmountCents?: number | null;
  subtotalCents?: number | null;
  serviceFeeCents?: number | null;
  orderedAt?: string | null;
  event?: Readonly<{
    id: string;
    externalId?: string | null;
    title?: string | null;
    startsAtIso?: string | null;
    endsAtIso?: string | null;
    venueName?: string | null;
    venueCity?: string | null;
    imageUrl?: string | null;
  }> | null;
  items?: ReadonlyArray<ApiReservationItem> | null;
  tickets?: ReadonlyArray<ApiReservationTicket> | null;
}>;

// § M — Event access

export type ApiEventAccess = Readonly<{
  eventId: string;
  hasReservation: boolean;
  reservationId?: string | null;
  statusRaw?: string | null;
  status?: string | null;
  steps?: Readonly<{
    ticketsPurchased?: boolean | null;
    reservationConfirmed?: boolean | null;
    checkedIn?: boolean | null;
  }> | null;
  canUseCheckedInActions?: boolean | null;
}>;

// § N — Reviews

export type ApiReview = Readonly<{
  id: string;
  eventId?: string | null;
  userId?: string | null;
  rating?: number | null;
  comment?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}>;

export type ApiMyReview = Readonly<{
  id: string;
  eventId?: string | null;
  eventTitle?: string | null;
  eventImageUrl?: string | null;
  eventStartsAtIso?: string | null;
  organizerName?: string | null;
  rating?: number | null;
  comment?: string | null;
  images?: ReadonlyArray<string> | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  helpfulCount?: number | null;
  isDraft?: boolean | null;
  adminLiked?: boolean | null;
  adminReply?: string | null;
  adminReplyAt?: string | null;
}>;

export type ApiMyReviewsResponse = Readonly<{
  items: ReadonlyArray<ApiMyReview>;
  totals?: Readonly<{
    publishedCount?: number | null;
    draftCount?: number | null;
    averageRating?: number | null;
  }> | null;
  nextCursor?: string | null;
  hasMore?: boolean;
}>;

// § O — Song suggestions

export type ApiSongSuggestion = Readonly<{
  id: string;
  eventId?: string | null;
  deezerTrackId?: string | null;
  trackTitle?: string | null;
  artistName?: string | null;
  deezerArtistId?: string | null;
  deezerAlbumId?: string | null;
  albumTitle?: string | null;
  artworkUrl?: string | null;
  deezerLink?: string | null;
  createdAt?: string | null;
}>;

// § P — Stories

export type ApiEventStory = Readonly<{
  id: string;
  userId?: string | null;
  eventId?: string | null;
  photoUrl?: string | null;
  caption?: string | null;
  createdAt?: string | null;
  expiresAt?: string | null;
  userName?: string | null;
  userAvatarUrl?: string | null;
}>;
