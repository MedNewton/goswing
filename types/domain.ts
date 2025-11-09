/** Common ID brand type (string) to avoid mixing with other strings */
export type ID = string & { readonly __brand: 'ID' };

/** User profile shown in header / ownership fields */
export type UserProfile = Readonly<{
  id: ID;
  name: string;
  avatarUri?: string | null;
  city?: string;
  countryCode?: string; // e.g., "MA"
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

/** Event domain model used across the app */
export type Event = Readonly<{
  id: ID;
  title: string;
  organizer: string;
  imageUrl: string;
  startsAtIso: string;  // ISO datetime string
  venue: string;
  city?: string;
  priceLabel?: string;  // "Free", "From $25", etc.
  favorite?: boolean;
  categories?: ReadonlyArray<string>; // category keys
  attendees?: ReadonlyArray<Attendee>;
  attendeesExtraCount?: number;
}>;
