// lib/supabase/profile.ts
// Profile bootstrap — backed by the Gooswing REST API (routes C.2, C.4).
// The server seeds profile + user_settings + notification_preferences on init.

import * as meApi from '@/lib/api/me';

type InitializeProfileParams = {
  userId: string;
  displayName?: string | null;
  email?: string | null;
  avatarUrl?: string | null;
  phone?: string | null;
  location?: string | null;
};

export async function initializeUserProfile(
  params: InitializeProfileParams,
): Promise<void> {
  await meApi.initMyProfile({
    displayName: params.displayName ?? null,
    email: params.email ?? null,
    avatarUrl: params.avatarUrl ?? null,
    phone: params.phone ?? null,
    location: params.location ?? null,
  });
}

export async function updateProfileFromOnboarding(params: {
  userId: string;
  phone?: string | null;
  location?: string | null;
  pushNotificationsEnabled?: boolean;
  locationServicesEnabled?: boolean;
}): Promise<void> {
  await meApi.completeOnboarding({
    phone: params.phone ?? null,
    location: params.location ?? null,
    pushNotificationsEnabled: params.pushNotificationsEnabled,
    locationServicesEnabled: params.locationServicesEnabled,
  });
}
