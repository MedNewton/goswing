// lib/supabase/social/profileSocial.ts
// Read/update the social view of a user's profile (cover, bio, visibility) and
// compute the header stats shown on the social profile page.

import { supabase } from '@/lib/supabase';
import type {
  FriendsVisibility,
  ProfileVisibility,
  SocialProfile,
  SocialProfileUpdate,
} from '@/lib/social/types';

const PROFILE_COLS =
  'user_id, display_name, avatar_url, cover_image_url, bio, occupation, location, profile_visibility, friends_visibility';

function asString(v: unknown): string {
  return typeof v === 'string' ? v : v == null ? '' : String(v);
}

function nullableString(v: unknown): string | null {
  if (v == null) return null;
  const s = typeof v === 'string' ? v.trim() : String(v).trim();
  return s.length ? s : null;
}

async function countMedia(userId: string): Promise<number> {
  const { count } = await supabase
    .from('user_media')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId);
  return count ?? 0;
}

async function countFriends(userId: string): Promise<number> {
  // Friendships land in a later slice; guard so this works before that table
  // exists (a missing relation just yields an error we swallow to 0).
  try {
    const { count, error } = await supabase
      .from('friendships')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'accepted')
      .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`);
    if (error) return 0;
    return count ?? 0;
  } catch {
    return 0;
  }
}

async function countAttended(userId: string): Promise<number> {
  const { data } = await supabase
    .from('reservations')
    .select('id, events!inner(ends_at, starts_at)')
    .eq('user_id', userId)
    .in('status', ['confirmed', 'completed']);

  if (!data) return 0;
  const nowMs = Date.now();
  return data.filter((r: any) => {
    const ev = r.events;
    if (!ev) return false;
    if (ev.ends_at) return new Date(ev.ends_at).getTime() <= nowMs;
    if (ev.starts_at) return new Date(ev.starts_at).getTime() <= nowMs;
    return false;
  }).length;
}

/**
 * Fetch the social profile for `targetUserId` as seen by `viewerUserId`.
 * Honors profile visibility: a private profile viewed by someone else returns
 * `canView: false` with stats zeroed so the page can render a gated state.
 */
export async function getSocialProfile(
  targetUserId: string,
  viewerUserId: string,
): Promise<SocialProfile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select(PROFILE_COLS)
    .eq('user_id', targetUserId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  const isSelf = targetUserId === viewerUserId;
  const visibility = (asString(data.profile_visibility) || 'public') as ProfileVisibility;
  const canView = isSelf || visibility === 'public';

  const [mediaCount, friendsCount, attendedCount] = canView
    ? await Promise.all([
        countMedia(targetUserId),
        countFriends(targetUserId),
        countAttended(targetUserId),
      ])
    : [0, 0, 0];

  return {
    userId: asString(data.user_id),
    displayName: asString(data.display_name) || 'GoSwing user',
    avatarUrl: nullableString(data.avatar_url),
    coverImageUrl: nullableString(data.cover_image_url),
    bio: nullableString(data.bio),
    occupation: nullableString(data.occupation),
    city: nullableString(data.location),
    profileVisibility: visibility,
    friendsVisibility: (asString(data.friends_visibility) || 'public') as FriendsVisibility,
    stats: { attendedCount, mediaCount, friendsCount },
    isSelf,
    canView,
  };
}

/** Update social profile fields. Maps camelCase domain keys to DB columns. */
export async function updateSocialProfile(
  userId: string,
  updates: SocialProfileUpdate,
): Promise<void> {
  const db: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (updates.displayName !== undefined) db.display_name = updates.displayName;
  if (updates.avatarUrl !== undefined) db.avatar_url = updates.avatarUrl;
  if (updates.coverImageUrl !== undefined) db.cover_image_url = updates.coverImageUrl;
  if (updates.bio !== undefined) db.bio = updates.bio;
  if (updates.occupation !== undefined) db.occupation = updates.occupation;
  if (updates.city !== undefined) db.location = updates.city;
  if (updates.profileVisibility !== undefined) db.profile_visibility = updates.profileVisibility;
  if (updates.friendsVisibility !== undefined) db.friends_visibility = updates.friendsVisibility;

  const { error } = await supabase
    .from('profiles')
    .upsert({ user_id: userId, ...db }, { onConflict: 'user_id' });

  if (error) throw new Error(error.message);
}
