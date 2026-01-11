// types/domain.ts
export type ID = string & { readonly __brand: 'ID' };

export type UserProfile = Readonly<{
  id: ID;
  name: string;
  avatarUri?: string | null;
  city?: string;
  countryCode?: string;
  email?: string | null;
  interests?: ReadonlyArray<string>;
  stats?: Readonly<{
    attendedCount?: number;
    savedCount?: number;
    reviewsCount?: number;
  }>;
  preferences?: Readonly<{
    pushNotifications?: boolean;
    locationServices?: boolean;
  }>;
}>;

export type Attendee = Readonly<{
  id: ID;
  initials: string;
}>;

export type Category = Readonly<{
  key: string;
  label: string;
  emoji?: string;
  disabled?: boolean;
}>;

export type LatLng = Readonly<{ lat: number; lng: number }>;

export type Event = Readonly<{
  id: ID;
  externalId?: string;
  title: string;
  organizer: string;
  imageUrl: string;
  startsAtIso: string;
  venue: string;
  city?: string;
  countryCode?: string;
  priceLabel?: string;
  favorite?: boolean;
  categories?: ReadonlyArray<string>;
  attendees?: ReadonlyArray<Attendee>;
  attendeesExtraCount?: number;
  location?: LatLng;

  // NEW fields used by filters
  venueType?: string;
  musicStyles?: ReadonlyArray<string>;
  partyTypes?: ReadonlyArray<string>;
  access?: ReadonlyArray<'free' | 'free_ladies'>;
  basePrice?: number;
}>;
