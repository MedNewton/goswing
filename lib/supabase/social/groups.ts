// lib/supabase/social/groups.ts
// Data access for groups: membership, invites, wall posts, likes, comments.

import { supabase } from '@/lib/supabase';
import { removeUserContentByUrl, uploadUserContent } from '@/lib/supabase/storage';
import type { MediaType } from '@/lib/social/types';
import type {
  Group,
  GroupComment,
  GroupInvite,
  GroupMember,
  GroupPost,
  GroupRole,
} from '@/lib/social/groupTypes';

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

// ---------------------------------------------------------------------------
// Groups
// ---------------------------------------------------------------------------
export async function createGroup(input: {
  userId: string;
  name: string;
  description?: string | null;
  coverUri?: string | null;
}): Promise<string> {
  let coverUrl: string | null = null;
  if (input.coverUri) {
    coverUrl = (await uploadUserContent(`groups/${input.userId}`, input.coverUri, 'image')).url;
  }

  const { data, error } = await supabase
    .from('groups')
    .insert({
      name: input.name.trim(),
      description: input.description?.trim() || null,
      cover_image_url: coverUrl,
    })
    .select('id')
    .single();
  if (error) {
    if (coverUrl) await removeUserContentByUrl(coverUrl);
    throw new Error(error.message);
  }

  const groupId = String(data.id);

  // Add the creator as the owner member.
  const { error: memberError } = await supabase
    .from('group_members')
    .insert({ group_id: groupId, user_id: input.userId, role: 'owner' });
  if (memberError) throw new Error(memberError.message);

  return groupId;
}

export async function listMyGroups(userId: string): Promise<ReadonlyArray<Group>> {
  const { data, error } = await supabase
    .from('group_members')
    .select('role, groups!inner(id, name, description, cover_image_url, owner_user_id, privacy, created_at)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);

  const groups = (data ?? []).map((row: any) => ({ role: row.role as GroupRole, g: row.groups }));

  // Member counts per group.
  const ids = groups.map((x) => String(x.g.id));
  const counts = await memberCounts(ids);

  return groups.map(({ role, g }) => ({
    id: String(g.id),
    name: String(g.name),
    description: g.description ?? null,
    coverImageUrl: g.cover_image_url ?? null,
    ownerUserId: String(g.owner_user_id),
    privacy: (g.privacy === 'public' ? 'public' : 'private') as Group['privacy'],
    memberCount: counts[String(g.id)] ?? 0,
    myRole: role,
    createdAt: String(g.created_at),
  }));
}

async function memberCounts(groupIds: ReadonlyArray<string>): Promise<Record<string, number>> {
  if (groupIds.length === 0) return {};
  const { data } = await supabase
    .from('group_members')
    .select('group_id')
    .in('group_id', groupIds as string[]);
  const out: Record<string, number> = {};
  for (const row of data ?? []) {
    const gid = String((row as any).group_id);
    out[gid] = (out[gid] ?? 0) + 1;
  }
  return out;
}

export async function getGroup(groupId: string, viewerId: string): Promise<Group | null> {
  const { data, error } = await supabase
    .from('groups')
    .select('id, name, description, cover_image_url, owner_user_id, privacy, created_at')
    .eq('id', groupId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;

  const { data: mine } = await supabase
    .from('group_members')
    .select('role')
    .eq('group_id', groupId)
    .eq('user_id', viewerId)
    .maybeSingle();

  const counts = await memberCounts([groupId]);

  return {
    id: String(data.id),
    name: String(data.name),
    description: data.description ?? null,
    coverImageUrl: data.cover_image_url ?? null,
    ownerUserId: String(data.owner_user_id),
    privacy: (data.privacy === 'public' ? 'public' : 'private') as Group['privacy'],
    memberCount: counts[groupId] ?? 0,
    myRole: (mine?.role as GroupRole) ?? null,
    createdAt: String(data.created_at),
  };
}

export async function updateGroup(
  groupId: string,
  updates: { name?: string; description?: string | null; coverUri?: string | null; userId: string },
): Promise<void> {
  const db: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (updates.name !== undefined) db.name = updates.name.trim();
  if (updates.description !== undefined) db.description = updates.description?.trim() || null;
  if (updates.coverUri !== undefined) {
    db.cover_image_url = updates.coverUri
      ? (await uploadUserContent(`groups/${updates.userId}`, updates.coverUri, 'image')).url
      : null;
  }
  const { error } = await supabase.from('groups').update(db).eq('id', groupId);
  if (error) throw new Error(error.message);
}

export async function deleteGroup(groupId: string): Promise<void> {
  const { error } = await supabase.from('groups').delete().eq('id', groupId);
  if (error) throw new Error(error.message);
}

export async function leaveGroup(groupId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('group_members')
    .delete()
    .eq('group_id', groupId)
    .eq('user_id', userId);
  if (error) throw new Error(error.message);
}

// ---------------------------------------------------------------------------
// Members + invites
// ---------------------------------------------------------------------------
export async function listGroupMembers(groupId: string): Promise<ReadonlyArray<GroupMember>> {
  const { data, error } = await supabase
    .from('group_members')
    .select('user_id, role, profiles!group_members_user_fkey(display_name, avatar_url)')
    .eq('group_id', groupId);
  if (error) throw new Error(error.message);

  return (data ?? []).map((row: any) => {
    const name = String(row.profiles?.display_name ?? '').trim() || 'GoSwing user';
    return {
      userId: String(row.user_id),
      displayName: name,
      avatarUrl: row.profiles?.avatar_url ?? null,
      initials: initialsOf(name),
      role: (row.role as GroupRole) ?? 'member',
    };
  });
}

/** Directly add a friend to the group (any member may add). */
export async function addGroupMember(groupId: string, userId: string, invitedBy: string): Promise<void> {
  const { error } = await supabase
    .from('group_members')
    .insert({ group_id: groupId, user_id: userId, role: 'member', invited_by: invitedBy });
  if (error) throw new Error(error.message);
}

/** Send a pending invite to a non-friend (or anyone). */
export async function inviteToGroup(groupId: string, inviteeId: string): Promise<void> {
  const { error } = await supabase
    .from('group_invites')
    .upsert(
      { group_id: groupId, invitee_id: inviteeId, status: 'pending', responded_at: null },
      { onConflict: 'group_id,invitee_id' },
    );
  if (error) throw new Error(error.message);
}

export async function countMyGroupInvites(userId: string): Promise<number> {
  const { count } = await supabase
    .from('group_invites')
    .select('id', { count: 'exact', head: true })
    .eq('invitee_id', userId)
    .eq('status', 'pending');
  return count ?? 0;
}

export async function listMyGroupInvites(userId: string): Promise<ReadonlyArray<GroupInvite>> {
  const { data, error } = await supabase
    .from('group_invites')
    .select('id, group_id, inviter_id, created_at, groups!group_invites_group_fkey(name, cover_image_url)')
    .eq('invitee_id', userId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);

  return (data ?? []).map((row: any) => ({
    id: String(row.id),
    groupId: String(row.group_id),
    groupName: String(row.groups?.name ?? 'Group'),
    groupCoverUrl: row.groups?.cover_image_url ?? null,
    inviterId: String(row.inviter_id),
    createdAt: String(row.created_at),
  }));
}

export async function acceptGroupInvite(invite: { id: string; groupId: string; userId: string }): Promise<void> {
  const { error: memberError } = await supabase
    .from('group_members')
    .insert({ group_id: invite.groupId, user_id: invite.userId, role: 'member' });
  if (memberError && !/duplicate key/i.test(memberError.message)) throw new Error(memberError.message);

  const { error } = await supabase
    .from('group_invites')
    .update({ status: 'accepted', responded_at: new Date().toISOString() })
    .eq('id', invite.id);
  if (error) throw new Error(error.message);
}

export async function declineGroupInvite(inviteId: string): Promise<void> {
  const { error } = await supabase
    .from('group_invites')
    .update({ status: 'declined', responded_at: new Date().toISOString() })
    .eq('id', inviteId);
  if (error) throw new Error(error.message);
}

// ---------------------------------------------------------------------------
// Posts + likes + comments
// ---------------------------------------------------------------------------
export async function listGroupPosts(
  groupId: string,
  viewerId: string,
): Promise<ReadonlyArray<GroupPost>> {
  const { data, error } = await supabase
    .from('group_posts')
    .select('id, group_id, author_id, body, media_type, media_url, created_at, profiles!group_posts_author_fkey(display_name, avatar_url)')
    .eq('group_id', groupId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);

  const posts = data ?? [];
  const ids = posts.map((p: any) => String(p.id));
  if (ids.length === 0) return [];

  const [{ data: likes }, { data: comments }] = await Promise.all([
    supabase.from('group_post_likes').select('post_id, user_id').in('post_id', ids),
    supabase.from('group_post_comments').select('post_id').in('post_id', ids),
  ]);

  const likeCount: Record<string, number> = {};
  const likedByMe: Record<string, boolean> = {};
  for (const l of likes ?? []) {
    const pid = String((l as any).post_id);
    likeCount[pid] = (likeCount[pid] ?? 0) + 1;
    if (String((l as any).user_id) === viewerId) likedByMe[pid] = true;
  }
  const commentCount: Record<string, number> = {};
  for (const c of comments ?? []) {
    const pid = String((c as any).post_id);
    commentCount[pid] = (commentCount[pid] ?? 0) + 1;
  }

  return posts.map((p: any) => {
    const name = String(p.profiles?.display_name ?? '').trim() || 'GoSwing user';
    const pid = String(p.id);
    return {
      id: pid,
      groupId: String(p.group_id),
      authorId: String(p.author_id),
      authorName: name,
      authorAvatarUrl: p.profiles?.avatar_url ?? null,
      body: p.body ?? null,
      mediaType: (p.media_type ?? null) as MediaType | null,
      mediaUrl: p.media_url ?? null,
      createdAt: String(p.created_at),
      likeCount: likeCount[pid] ?? 0,
      commentCount: commentCount[pid] ?? 0,
      likedByMe: likedByMe[pid] ?? false,
    };
  });
}

export async function createGroupPost(input: {
  groupId: string;
  authorId: string;
  body?: string | null;
  mediaUri?: string | null;
  kind?: MediaType;
}): Promise<void> {
  let mediaUrl: string | null = null;
  let mediaType: MediaType | null = null;
  if (input.mediaUri) {
    const up = await uploadUserContent(`groups/${input.groupId}/posts`, input.mediaUri, input.kind);
    mediaUrl = up.url;
    mediaType = up.mediaType;
  }

  const { error } = await supabase.from('group_posts').insert({
    group_id: input.groupId,
    body: input.body?.trim() || null,
    media_type: mediaType,
    media_url: mediaUrl,
  });
  if (error) {
    if (mediaUrl) await removeUserContentByUrl(mediaUrl);
    throw new Error(error.message);
  }
}

export async function deleteGroupPost(postId: string): Promise<void> {
  const { data: existing } = await supabase
    .from('group_posts')
    .select('media_url')
    .eq('id', postId)
    .maybeSingle();
  const { error } = await supabase.from('group_posts').delete().eq('id', postId);
  if (error) throw new Error(error.message);
  if (existing?.media_url) await removeUserContentByUrl(String(existing.media_url));
}

export async function setPostLike(postId: string, userId: string, liked: boolean): Promise<void> {
  if (liked) {
    const { error } = await supabase
      .from('group_post_likes')
      .upsert({ post_id: postId, user_id: userId }, { onConflict: 'post_id,user_id' });
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase
      .from('group_post_likes')
      .delete()
      .eq('post_id', postId)
      .eq('user_id', userId);
    if (error) throw new Error(error.message);
  }
}

export async function listPostComments(postId: string): Promise<ReadonlyArray<GroupComment>> {
  const { data, error } = await supabase
    .from('group_post_comments')
    .select('id, post_id, author_id, body, created_at, profiles!group_post_comments_author_fkey(display_name, avatar_url)')
    .eq('post_id', postId)
    .order('created_at', { ascending: true });
  if (error) throw new Error(error.message);

  return (data ?? []).map((row: any) => {
    const name = String(row.profiles?.display_name ?? '').trim() || 'GoSwing user';
    return {
      id: String(row.id),
      postId: String(row.post_id),
      authorId: String(row.author_id),
      authorName: name,
      authorAvatarUrl: row.profiles?.avatar_url ?? null,
      body: String(row.body ?? ''),
      createdAt: String(row.created_at),
    };
  });
}

export async function addPostComment(postId: string, body: string): Promise<GroupComment> {
  const { data, error } = await supabase
    .from('group_post_comments')
    .insert({ post_id: postId, body: body.trim() })
    .select('id, post_id, author_id, body, created_at, profiles!group_post_comments_author_fkey(display_name, avatar_url)')
    .single();
  if (error) throw new Error(error.message);

  const name = String((data as any).profiles?.display_name ?? '').trim() || 'You';
  return {
    id: String(data.id),
    postId: String(data.post_id),
    authorId: String(data.author_id),
    authorName: name,
    authorAvatarUrl: (data as any).profiles?.avatar_url ?? null,
    body: String(data.body ?? ''),
    createdAt: String(data.created_at),
  };
}

export async function deletePostComment(commentId: string): Promise<void> {
  const { error } = await supabase.from('group_post_comments').delete().eq('id', commentId);
  if (error) throw new Error(error.message);
}
