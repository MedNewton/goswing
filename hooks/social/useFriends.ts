// hooks/social/useFriends.ts
import { useCallback, useEffect, useState } from 'react';
import { useUser } from '@clerk/clerk-expo';
import {
  acceptFriendRequest,
  countIncomingRequests,
  declineFriendRequest,
  getFriendshipState,
  listFriends,
  listIncomingRequests,
  removeFriendship,
  sendFriendRequest,
  type FriendRequest,
  type FriendshipState,
  type FriendSummary,
} from '@/lib/supabase/social/friends';

// ---------------------------------------------------------------------------
// useFriendship — relationship + actions between viewer and a target user
// ---------------------------------------------------------------------------
type UseFriendshipReturn = {
  state: FriendshipState;
  isLoading: boolean;
  busy: boolean;
  add: () => Promise<void>;
  cancel: () => Promise<void>;
  accept: () => Promise<void>;
  decline: () => Promise<void>;
  unfriend: () => Promise<void>;
  refetch: () => Promise<void>;
};

export function useFriendship(targetId?: string | null): UseFriendshipReturn {
  const { user } = useUser();
  const viewerId = user?.id ?? null;

  const [state, setState] = useState<FriendshipState>({ status: 'none', friendshipId: null });
  const [isLoading, setIsLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!viewerId || !targetId) {
      setState({ status: 'none', friendshipId: null });
      setIsLoading(false);
      return;
    }
    try {
      setIsLoading(true);
      setState(await getFriendshipState(viewerId, targetId));
    } catch {
      setState({ status: 'none', friendshipId: null });
    } finally {
      setIsLoading(false);
    }
  }, [viewerId, targetId]);

  useEffect(() => {
    load();
  }, [load]);

  const guard = async (fn: () => Promise<void>) => {
    if (busy) return;
    setBusy(true);
    try {
      await fn();
    } finally {
      setBusy(false);
    }
  };

  const add = () =>
    guard(async () => {
      if (!targetId) return;
      const id = await sendFriendRequest(targetId);
      setState({ status: 'outgoing', friendshipId: id });
    });

  const cancel = () =>
    guard(async () => {
      if (state.friendshipId) await removeFriendship(state.friendshipId);
      setState({ status: 'none', friendshipId: null });
    });

  const accept = () =>
    guard(async () => {
      if (state.friendshipId) await acceptFriendRequest(state.friendshipId);
      setState((s) => ({ status: 'friends', friendshipId: s.friendshipId }));
    });

  const decline = () =>
    guard(async () => {
      if (state.friendshipId) await declineFriendRequest(state.friendshipId);
      setState({ status: 'none', friendshipId: null });
    });

  const unfriend = () =>
    guard(async () => {
      if (state.friendshipId) await removeFriendship(state.friendshipId);
      setState({ status: 'none', friendshipId: null });
    });

  return { state, isLoading, busy, add, cancel, accept, decline, unfriend, refetch: load };
}

// ---------------------------------------------------------------------------
// useFriendRequests — incoming pending requests for the signed-in user
// ---------------------------------------------------------------------------
type UseFriendRequestsReturn = {
  requests: ReadonlyArray<FriendRequest>;
  count: number;
  isLoading: boolean;
  refetch: () => Promise<void>;
  accept: (friendshipId: string) => Promise<void>;
  decline: (friendshipId: string) => Promise<void>;
};

export function useFriendRequests(): UseFriendRequestsReturn {
  const { user } = useUser();
  const viewerId = user?.id ?? null;

  const [requests, setRequests] = useState<ReadonlyArray<FriendRequest>>([]);
  const [count, setCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    if (!viewerId) {
      setRequests([]);
      setCount(0);
      setIsLoading(false);
      return;
    }
    try {
      setIsLoading(true);
      const [list, c] = await Promise.all([
        listIncomingRequests(viewerId),
        countIncomingRequests(viewerId),
      ]);
      setRequests(list);
      setCount(c);
    } catch {
      setRequests([]);
      setCount(0);
    } finally {
      setIsLoading(false);
    }
  }, [viewerId]);

  useEffect(() => {
    load();
  }, [load]);

  const accept = useCallback(async (friendshipId: string) => {
    await acceptFriendRequest(friendshipId);
    setRequests((prev) => prev.filter((r) => r.friendshipId !== friendshipId));
    setCount((c) => Math.max(0, c - 1));
  }, []);

  const decline = useCallback(async (friendshipId: string) => {
    await declineFriendRequest(friendshipId);
    setRequests((prev) => prev.filter((r) => r.friendshipId !== friendshipId));
    setCount((c) => Math.max(0, c - 1));
  }, []);

  return { requests, count, isLoading, refetch: load, accept, decline };
}

// ---------------------------------------------------------------------------
// useFriends — accepted friends list for a given user
// ---------------------------------------------------------------------------
type UseFriendsReturn = {
  friends: ReadonlyArray<FriendSummary>;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
};

export function useFriends(userId?: string | null): UseFriendsReturn {
  const [friends, setFriends] = useState<ReadonlyArray<FriendSummary>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const load = useCallback(async () => {
    if (!userId) {
      setFriends([]);
      setIsLoading(false);
      return;
    }
    try {
      setIsLoading(true);
      setError(null);
      setFriends(await listFriends(userId));
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load friends'));
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  return { friends, isLoading, error, refetch: load };
}
