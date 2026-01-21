// lib/supabase/profile.ts
import { supabase } from '@/lib/supabase';
import type { ID } from '@/types/domain';
import { DEFAULT_USER_SETTINGS, DEFAULT_NOTIFICATION_PREFERENCES } from '@/types/domain';

type InitializeProfileParams = {
  userId: string;
  displayName?: string | null;
  email?: string | null;
  avatarUrl?: string | null;
  phone?: string | null;
  location?: string | null;
};

/**
 * Initialize all profile-related tables for a new user.
 * Call this after sign-up completes.
 */
export async function initializeUserProfile(params: InitializeProfileParams): Promise<void> {
  const { userId, displayName, email, avatarUrl, phone, location } = params;

  // 1. Create profile
  const { error: profileError } = await supabase
    .from('profiles')
    .upsert({
      user_id: userId,
      display_name: displayName ?? null,
      email: email ?? null,
      avatar_url: avatarUrl ?? null,
      phone_number: phone ?? null,
      phone_verified: false,
      location: location ?? null,
      profile_visibility: 'public',
      account_status: 'active',
      initials: displayName ? getInitials(displayName) : null,
    }, { onConflict: 'user_id' });

  if (profileError) {
    console.error('Failed to create profile:', profileError);
    throw profileError;
  }

  // 2. Create user settings with defaults
  const { error: settingsError } = await supabase
    .from('user_settings')
    .upsert({
      user_id: userId,
      push_notifications_enabled: DEFAULT_USER_SETTINGS.pushNotificationsEnabled,
      location_services_enabled: DEFAULT_USER_SETTINGS.locationServicesEnabled,
      login_notifications_enabled: DEFAULT_USER_SETTINGS.loginNotificationsEnabled,
      save_payment_info: DEFAULT_USER_SETTINGS.savePaymentInfo,
      auto_reload_wallet: DEFAULT_USER_SETTINGS.autoReloadWallet,
      email_receipts: DEFAULT_USER_SETTINGS.emailReceipts,
    }, { onConflict: 'user_id' });

  if (settingsError) {
    console.error('Failed to create user settings:', settingsError);
    throw settingsError;
  }

  // 3. Create notification preferences with defaults
  const { error: notifError } = await supabase
    .from('notification_preferences')
    .upsert({
      user_id: userId,
      push_enabled: DEFAULT_NOTIFICATION_PREFERENCES.pushEnabled,
      push_event_reminders: DEFAULT_NOTIFICATION_PREFERENCES.pushEventReminders,
      push_event_updates: DEFAULT_NOTIFICATION_PREFERENCES.pushEventUpdates,
      push_new_followers: DEFAULT_NOTIFICATION_PREFERENCES.pushNewFollowers,
      push_event_recommendations: DEFAULT_NOTIFICATION_PREFERENCES.pushEventRecommendations,
      email_enabled: DEFAULT_NOTIFICATION_PREFERENCES.emailEnabled,
      email_weekly_digest: DEFAULT_NOTIFICATION_PREFERENCES.emailWeeklyDigest,
      email_event_invites: DEFAULT_NOTIFICATION_PREFERENCES.emailEventInvites,
      email_promotions: DEFAULT_NOTIFICATION_PREFERENCES.emailPromotions,
      email_newsletter: DEFAULT_NOTIFICATION_PREFERENCES.emailNewsletter,
      sms_enabled: DEFAULT_NOTIFICATION_PREFERENCES.smsEnabled,
      sms_urgent_updates: DEFAULT_NOTIFICATION_PREFERENCES.smsUrgentUpdates,
      sms_event_cancellations: DEFAULT_NOTIFICATION_PREFERENCES.smsEventCancellations,
      personalized_ads: DEFAULT_NOTIFICATION_PREFERENCES.personalizedAds,
      location_based_suggestions: DEFAULT_NOTIFICATION_PREFERENCES.locationBasedSuggestions,
      quiet_hours_enabled: DEFAULT_NOTIFICATION_PREFERENCES.quietHoursEnabled,
      quiet_hours_start: DEFAULT_NOTIFICATION_PREFERENCES.quietHoursStart,
      quiet_hours_end: DEFAULT_NOTIFICATION_PREFERENCES.quietHoursEnd,
    }, { onConflict: 'user_id' });

  if (notifError) {
    console.error('Failed to create notification preferences:', notifError);
    throw notifError;
  }

  console.log('User profile initialized successfully for:', userId);
}

/**
 * Update profile with data collected during onboarding
 */
export async function updateProfileFromOnboarding(params: {
  userId: string;
  phone?: string | null;
  location?: string | null;
  pushNotificationsEnabled?: boolean;
  locationServicesEnabled?: boolean;
}): Promise<void> {
  const { userId, phone, location, pushNotificationsEnabled, locationServicesEnabled } = params;

  // Update profile if phone or location provided
  if (phone !== undefined || location !== undefined) {
    const profileUpdates: Record<string, any> = { updated_at: new Date().toISOString() };
    if (phone !== undefined) profileUpdates.phone_number = phone;
    if (location !== undefined) profileUpdates.location = location;

    const { error } = await supabase
      .from('profiles')
      .update(profileUpdates)
      .eq('user_id', userId);

    if (error) console.error('Failed to update profile:', error);
  }

  // Update settings if notification/location preferences changed
  if (pushNotificationsEnabled !== undefined || locationServicesEnabled !== undefined) {
    const settingsUpdates: Record<string, any> = { updated_at: new Date().toISOString() };
    if (pushNotificationsEnabled !== undefined) {
      settingsUpdates.push_notifications_enabled = pushNotificationsEnabled;
    }
    if (locationServicesEnabled !== undefined) {
      settingsUpdates.location_services_enabled = locationServicesEnabled;
    }

    const { error } = await supabase
      .from('user_settings')
      .update(settingsUpdates)
      .eq('user_id', userId);

    if (error) console.error('Failed to update settings:', error);
  }
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((part) => part.charAt(0).toUpperCase())
    .slice(0, 2)
    .join('');
}