// lib/supabase/profile.ts
// Phase 1 stub — onboarding writes are no-ops; users continue through the
// onboarding gate without persisting profile data until Phase 2 wires it back up.
// See docs/superpowers/specs/2026-05-20-rest-api-read-side-migration.md § 6.3.

type InitializeProfileParams = {
  userId: string;
  displayName?: string | null;
  email?: string | null;
  avatarUrl?: string | null;
  phone?: string | null;
  location?: string | null;
};

export async function initializeUserProfile(
  _params: InitializeProfileParams,
): Promise<void> {
  if (__DEV__) {
    // eslint-disable-next-line no-console
    console.log('[STUB] lib/supabase/profile.initializeUserProfile()');
  }
}

export async function updateProfileFromOnboarding(_params: {
  userId: string;
  phone?: string | null;
  location?: string | null;
  pushNotificationsEnabled?: boolean;
  locationServicesEnabled?: boolean;
}): Promise<void> {
  if (__DEV__) {
    // eslint-disable-next-line no-console
    console.log('[STUB] lib/supabase/profile.updateProfileFromOnboarding()');
  }
}
