// types/domain.ts

/** Common ID brand type (string) to avoid mixing with other strings */
export type ID = string & { readonly __brand: 'ID' };

/** User profile shown in header / ownership fields */
export type UserProfile = Readonly<{
  id: ID;
  name: string;
  avatarUri?: string | null;

  // Location
  city?: string;
  countryCode?: string; // e.g., "MA"

  // Contact
  email?: string | null;

  // Interests (shown as chips)
  interests?: ReadonlyArray<string>;

  // Simple stats for the header tiles
  stats?: Readonly<{
    attendedCount?: number;
    savedCount?: number;
    reviewsCount?: number;
  }>;

  // Quick settings (optional; UI can still keep local state if undefined)
  preferences?: Readonly<{
    pushNotifications?: boolean;
    locationServices?: boolean;
  }>;
}>;

/** Lightweight attendee chip shown on EventCard */
export type Attendee = Readonly<{
  id: ID;
  initials: string; // e.g., "AB"
}>;

/** Category used in CategoriesSlider / filtering */
export type Category = Readonly<{
  key: string;          // e.g., "music", "sports"
  label: string;        // e.g., "Music"
  emoji?: string;       // e.g., "🎵"
  disabled?: boolean;
}>;

export type LatLng = Readonly<{
  lat: number;
  lng: number;
}>;

/** Event domain model used across list, map, and details screens */
export type Event = Readonly<{
  id: ID;
  title: string;
  organizer: string;
  imageUrl: string;                 // hero / thumbnail
  startsAtIso: string;              // ISO datetime string
  venue: string;
  city?: string;                    // e.g., "Casablanca"
  countryCode?: string;             // <-- added for filters like "City, CC"
  priceLabel?: string;              // "Free", "From $25", etc.
  favorite?: boolean;
  categories?: ReadonlyArray<string>;
  attendees?: ReadonlyArray<Attendee>;
  attendeesExtraCount?: number;     // number beyond listed attendees
  location?: LatLng;                // map pin coordinates
}>;
