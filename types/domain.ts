// types/domain.ts
export type ID = string & { readonly __brand: 'ID' };

// =====================================================
// USER PROFILE (expanded)
// =====================================================
export type UserProfile = Readonly<{
  id: ID;
  name: string;
  avatarUri?: string | null;
  email?: string | null;
  phone?: string | null;
  phoneVerified?: boolean;
  city?: string;
  countryCode?: string;
  interests?: ReadonlyArray<string>;
  
  // Profile visibility & status
  profileVisibility?: 'public' | 'private';
  accountStatus?: 'active' | 'deactivated' | 'deleted';
  
  // Timestamps
  createdAt?: string;
  updatedAt?: string;
  deactivatedAt?: string | null;
  deletedAt?: string | null;
  
  // Computed stats (from other tables)
  stats?: Readonly<{
    attendedCount?: number;
    savedCount?: number;
    reviewsCount?: number;
  }>;
}>;

// =====================================================
// USER SETTINGS
// =====================================================
export type UserSettings = Readonly<{
  userId: ID;
  
  // Quick Settings
  pushNotificationsEnabled: boolean;
  locationServicesEnabled: boolean;
  
  // Login & Activity
  loginNotificationsEnabled: boolean;
  
  // Payment Settings
  savePaymentInfo: boolean;
  autoReloadWallet: boolean;
  emailReceipts: boolean;
  
  createdAt?: string;
  updatedAt?: string;
}>;

// =====================================================
// NOTIFICATION PREFERENCES
// =====================================================
export type NotificationPreferences = Readonly<{
  userId: ID;
  
  // Push Notifications
  pushEnabled: boolean;
  pushEventReminders: boolean;
  pushEventUpdates: boolean;
  pushNewFollowers: boolean;
  pushEventRecommendations: boolean;
  
  // Email Notifications
  emailEnabled: boolean;
  emailWeeklyDigest: boolean;
  emailEventInvites: boolean;
  emailPromotions: boolean;
  emailNewsletter: boolean;
  
  // SMS Notifications
  smsEnabled: boolean;
  smsUrgentUpdates: boolean;
  smsEventCancellations: boolean;
  
  // Marketing & Personalization
  personalizedAds: boolean;
  locationBasedSuggestions: boolean;
  
  // Quiet Hours
  quietHoursEnabled: boolean;
  quietHoursStart?: string | null; // HH:MM format
  quietHoursEnd?: string | null;   // HH:MM format
  
  createdAt?: string;
  updatedAt?: string;
}>;

// =====================================================
// PAYMENT METHODS
// =====================================================
export type CardBrand = 'visa' | 'mastercard' | 'amex' | 'discover' | 'other';

export type PaymentMethod = Readonly<{
  id: ID;
  userId: ID;
  
  // Provider info
  provider: 'stripe' | 'other';
  providerPaymentMethodId: string;
  
  // Display info (safe to store/show)
  cardBrand: CardBrand;
  cardLastFour: string;
  cardExpMonth: number;
  cardExpYear: number;
  cardholderName?: string;
  
  // Settings
  isDefault: boolean;
  
  createdAt?: string;
  updatedAt?: string;
}>;

// =====================================================
// LOGIN HISTORY
// =====================================================
export type DeviceType = 'mobile' | 'desktop' | 'tablet' | 'unknown';

export type LoginHistoryEntry = Readonly<{
  id: ID;
  userId: ID;
  
  loggedInAt: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  deviceType: DeviceType;
  location?: string | null;
  
  sessionId?: string | null;
  wasSuccessful: boolean;
  failureReason?: string | null;
}>;

// =====================================================
// USER INTERESTS
// =====================================================
export type UserInterest = Readonly<{
  userId: ID;
  tagId: ID;
  tagLabel: string;    // Denormalized for easy display
  tagSlug: string;
  createdAt?: string;
}>;

// =====================================================
// EXISTING TYPES (unchanged)
// =====================================================
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
  description?: string | null;
  organizer: string;
  organizerId?: string;
  imageUrl: string;
  startsAtIso: string;
  venue: string;
  venueId?: string;
  city?: string;
  countryCode?: string;
  priceLabel?: string;
  favorite?: boolean;
  category?: string | null;
  categories?: ReadonlyArray<string>;
  attendees?: ReadonlyArray<Attendee>;
  attendeesExtraCount?: number;
  location?: LatLng;

  // Filter fields
  venueType?: string;
  musicStyles?: ReadonlyArray<string>;
  partyTypes?: ReadonlyArray<string>;
  access?: ReadonlyArray<'free' | 'free_ladies'>;
  basePrice?: number;
}>;

// =====================================================
// DEFAULT VALUES (for initialization)
// =====================================================
export const DEFAULT_USER_SETTINGS: Omit<UserSettings, 'userId'> = {
  pushNotificationsEnabled: true,
  locationServicesEnabled: false,
  loginNotificationsEnabled: false,
  savePaymentInfo: true,
  autoReloadWallet: false,
  emailReceipts: true,
};

export const DEFAULT_NOTIFICATION_PREFERENCES: Omit<NotificationPreferences, 'userId'> = {
  pushEnabled: true,
  pushEventReminders: true,
  pushEventUpdates: true,
  pushNewFollowers: true,
  pushEventRecommendations: true,
  
  emailEnabled: true,
  emailWeeklyDigest: true,
  emailEventInvites: true,
  emailPromotions: false,
  emailNewsletter: false,
  
  smsEnabled: false,
  smsUrgentUpdates: false,
  smsEventCancellations: true,
  
  personalizedAds: true,
  locationBasedSuggestions: true,
  
  quietHoursEnabled: false,
  quietHoursStart: null,
  quietHoursEnd: null,
};
