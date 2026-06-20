// hooks/social/useGroups.ts
import { useCallback, useEffect, useState } from 'react';
import { useUser } from '@clerk/clerk-expo';
import {
  acceptGroupInvite,
  countMyGroupInvites,
  declineGroupInvite,
  listMyGroupInvites,
  listMyGroups,
} from '@/lib/supabase/social/groups';
import type { Group, GroupInvite } from '@/lib/social/groupTypes';

export function useMyGroups() {
  const { user } = useUser();
  const userId = user?.id ?? null;
  const [groups, setGroups] = useState<ReadonlyArray<Group>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const load = useCallback(async () => {
    if (!userId) {
      setGroups([]);
      setIsLoading(false);
      return;
    }
    try {
      setIsLoading(true);
      setError(null);
      setGroups(await listMyGroups(userId));
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load groups'));
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  return { groups, isLoading, error, refetch: load };
}

export function useGroupInvites() {
  const { user } = useUser();
  const userId = user?.id ?? null;
  const [invites, setInvites] = useState<ReadonlyArray<GroupInvite>>([]);
  const [count, setCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    if (!userId) {
      setInvites([]);
      setCount(0);
      setIsLoading(false);
      return;
    }
    try {
      setIsLoading(true);
      const [list, c] = await Promise.all([
        listMyGroupInvites(userId),
        countMyGroupInvites(userId),
      ]);
      setInvites(list);
      setCount(c);
    } catch {
      setInvites([]);
      setCount(0);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  const accept = useCallback(
    async (invite: GroupInvite) => {
      if (!userId) return;
      await acceptGroupInvite({ id: invite.id, groupId: invite.groupId, userId });
      setInvites((prev) => prev.filter((i) => i.id !== invite.id));
      setCount((c) => Math.max(0, c - 1));
    },
    [userId],
  );

  const decline = useCallback(async (inviteId: string) => {
    await declineGroupInvite(inviteId);
    setInvites((prev) => prev.filter((i) => i.id !== inviteId));
    setCount((c) => Math.max(0, c - 1));
  }, []);

  return { invites, count, isLoading, refetch: load, accept, decline };
}
