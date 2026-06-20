// lib/supabase/social/friends.ts
// Friend requests + friendships (request/accept model).

import { supabase } from '@/lib/supabase';

export type FriendshipStatus =
  | 'none'
  | 'friends'
  | 'outgoing' // viewer sent a pending request
  | 'incoming' // viewer received a pending request
  | 'self';

export type FriendshipState = Readonly<{
  status: FriendshipStatus;
  friendshipId: string | null;
}>;

export type FriendSummary = Readonly<{
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  initials: string;
  /** Friendship row id, for unfriend actions. */
  friendshipId: string;
}>;

export type FriendRequest = Readonly<{
  friendshipId: string;
  requesterId: string;
  displayName: string;
  avatarUrl: string | null;
  initials: string;
  createdAt: string;
}>;

function initialsOf(name: string): string {
  return (
    name
      .trim()
      .split(/\s+/)
      .map((w) => w[0] ?? '')
      .join('')
      .toUpperCase()
      .slice(0, 2) || 'U'
  );
}

/** Resolve the relationship between the viewer and a target user. */
export async function getFriendshipState(
  viewerId: string,
  targetId: string,
): Promise<FriendshipState> {
  if (viewerId === targetId) return { status: 'self', friendshipId: null };

  const { data, error } = await supabase
    .from('friendships')
    .select('id, requester_id, addressee_id, status')
    .or(
      `and(requester_id.eq.${viewerId},addressee_id.eq.${targetId}),` +
        `and(requester_id.eq.${targetId},addressee_id.eq.${viewerId})`,
    )
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return { status: 'none', friendshipId: null };

  if (data.status === 'accepted') return { status: 'friends', friendshipId: String(data.id) };
  if (data.status === 'pending') {
    return {
      status: data.requester_id === viewerId ? 'outgoing' : 'incoming',
      friendshipId: String(data.id),
    };
  }
  // declined/blocked are treated as "none" for the button (can re-request)
  return { status: 'none', friendshipId: String(data.id) };
}

export async function sendFriendRequest(targetId: string): Promise<string> {
  // If a prior declined row exists in either direction, reset it to pending
  // from the viewer instead of violating the unique pair index.
  const { data: existing } = await supabase
    .from('friendships')
    .select('id, requester_id, addressee_id, status')
    .or(`requester_id.eq.${targetId},addressee_id.eq.${targetId}`)
    .limit(50);

  const reusable = (existing ?? []).find(
    (r: any) =>
      (r.requester_id === targetId || r.addressee_id === targetId) &&
      r.status !== 'accepted' &&
      r.status !== 'pending',
  );

  if (reusable) {
    const { error } = await supabase
      .from('friendships')
      .update({ status: 'pending', responded_at: null })
      .eq('id', reusable.id);
    if (error) throw new Error(error.message);
    return String(reusable.id);
  }

  const { data, error } = await supabase
    .from('friendships')
    .insert({ addressee_id: targetId, status: 'pending' })
    .select('id')
    .single();
  if (error) throw new Error(error.message);
  return String(data.id);
}

export async function acceptFriendRequest(friendshipId: string): Promise<void> {
  const { error } = await supabase
    .from('friendships')
    .update({ status: 'accepted', responded_at: new Date().toISOString() })
    .eq('id', friendshipId);
  if (error) throw new Error(error.message);
}

export async function declineFriendRequest(friendshipId: string): Promise<void> {
  const { error } = await supabase
    .from('friendships')
    .update({ status: 'declined', responded_at: new Date().toISOString() })
    .eq('id', friendshipId);
  if (error) throw new Error(error.message);
}

/** Cancel an outgoing request or unfriend an accepted friendship. */
export async function removeFriendship(friendshipId: string): Promise<void> {
  const { error } = await supabase.from('friendships').delete().eq('id', friendshipId);
  if (error) throw new Error(error.message);
}

export async function countIncomingRequests(viewerId: string): Promise<number> {
  const { count } = await supabase
    .from('friendships')
    .select('id', { count: 'exact', head: true })
    .eq('addressee_id', viewerId)
    .eq('status', 'pending');
  return count ?? 0;
}

export async function listIncomingRequests(
  viewerId: string,
): Promise<ReadonlyArray<FriendRequest>> {
  const { data, error } = await supabase
    .from('friendships')
    .select('id, requester_id, created_at, profiles!friendships_requester_fkey(display_name, avatar_url)')
    .eq('addressee_id', viewerId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);

  return (data ?? []).map((row: any) => {
    const name = String(row.profiles?.display_name ?? '').trim() || 'GoSwing user';
    return {
      friendshipId: String(row.id),
      requesterId: String(row.requester_id),
      displayName: name,
      avatarUrl: row.profiles?.avatar_url ?? null,
      initials: initialsOf(name),
      createdAt: String(row.created_at),
    };
  });
}

/** Accepted friends of `userId` (the other party in each accepted row). */
export async function listFriends(userId: string): Promise<ReadonlyArray<FriendSummary>> {
  const { data, error } = await supabase
    .from('friendships')
    .select(
      'id, requester_id, addressee_id,' +
        'req:profiles!friendships_requester_fkey(user_id, display_name, avatar_url),' +
        'addr:profiles!friendships_addressee_fkey(user_id, display_name, avatar_url)',
    )
    .eq('status', 'accepted')
    .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)
    .order('responded_at', { ascending: false });

  if (error) throw new Error(error.message);

  return (data ?? []).map((row: any) => {
    const other = row.requester_id === userId ? row.addr : row.req;
    const name = String(other?.display_name ?? '').trim() || 'GoSwing user';
    return {
      userId: String(other?.user_id ?? ''),
      displayName: name,
      avatarUrl: other?.avatar_url ?? null,
      initials: initialsOf(name),
      friendshipId: String(row.id),
    };
  });
}

/** Whether two users are accepted friends (used to gate friends-list privacy). */
export async function areFriends(a: string, b: string): Promise<boolean> {
  if (a === b) return true;
  const state = await getFriendshipState(a, b);
  return state.status === 'friends';
}
