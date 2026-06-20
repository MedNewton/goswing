// hooks/social/useGroupPosts.ts
import { useCallback, useEffect, useState } from 'react';
import { useUser } from '@clerk/clerk-expo';
import {
  addPostComment,
  createGroupPost,
  deleteGroupPost,
  deletePostComment,
  listGroupPosts,
  listPostComments,
  setPostLike,
} from '@/lib/supabase/social/groups';
import type { GroupComment, GroupPost } from '@/lib/social/groupTypes';
import type { MediaType } from '@/lib/social/types';

export function useGroupPosts(groupId?: string | null) {
  const { user } = useUser();
  const viewerId = user?.id ?? null;
  const [posts, setPosts] = useState<ReadonlyArray<GroupPost>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const load = useCallback(async () => {
    if (!groupId || !viewerId) {
      setPosts([]);
      setIsLoading(false);
      return;
    }
    try {
      setIsLoading(true);
      setError(null);
      setPosts(await listGroupPosts(groupId, viewerId));
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load posts'));
    } finally {
      setIsLoading(false);
    }
  }, [groupId, viewerId]);

  useEffect(() => {
    load();
  }, [load]);

  const createPost = useCallback(
    async (input: { body?: string | null; mediaUri?: string | null; kind?: MediaType }) => {
      if (!groupId || !viewerId) return;
      await createGroupPost({ groupId, authorId: viewerId, ...input });
      await load();
    },
    [groupId, viewerId, load],
  );

  const removePost = useCallback(async (postId: string) => {
    await deleteGroupPost(postId);
    setPosts((prev) => prev.filter((p) => p.id !== postId));
  }, []);

  const toggleLike = useCallback(
    async (post: GroupPost) => {
      if (!viewerId) return;
      const liked = !post.likedByMe;
      // optimistic
      setPosts((prev) =>
        prev.map((p) =>
          p.id === post.id
            ? { ...p, likedByMe: liked, likeCount: p.likeCount + (liked ? 1 : -1) }
            : p,
        ),
      );
      try {
        await setPostLike(post.id, viewerId, liked);
      } catch {
        // revert on failure
        setPosts((prev) =>
          prev.map((p) =>
            p.id === post.id
              ? { ...p, likedByMe: !liked, likeCount: p.likeCount + (liked ? -1 : 1) }
              : p,
          ),
        );
      }
    },
    [viewerId],
  );

  const bumpCommentCount = useCallback((postId: string, delta: number) => {
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId ? { ...p, commentCount: Math.max(0, p.commentCount + delta) } : p,
      ),
    );
  }, []);

  return { posts, viewerId, isLoading, error, refetch: load, createPost, removePost, toggleLike, bumpCommentCount };
}

export function usePostComments(postId?: string | null) {
  const [comments, setComments] = useState<ReadonlyArray<GroupComment>>([]);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    if (!postId) {
      setComments([]);
      setIsLoading(false);
      return;
    }
    try {
      setIsLoading(true);
      setComments(await listPostComments(postId));
    } catch {
      setComments([]);
    } finally {
      setIsLoading(false);
    }
  }, [postId]);

  useEffect(() => {
    load();
  }, [load]);

  const add = useCallback(
    async (body: string) => {
      if (!postId) return;
      const created = await addPostComment(postId, body);
      setComments((prev) => [...prev, created]);
    },
    [postId],
  );

  const remove = useCallback(async (commentId: string) => {
    await deletePostComment(commentId);
    setComments((prev) => prev.filter((c) => c.id !== commentId));
  }, []);

  return { comments, isLoading, refetch: load, add, remove };
}
