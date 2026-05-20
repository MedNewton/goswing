// lib/ApiClerkBridge.tsx
// Installs a Clerk-backed token getter into lib/api/client.ts so that
// non-React callers (anything inside lib/supabase/*.ts) can mint a fresh JWT
// without holding a hook. Mirrors the SupabaseClerkBridge pattern.

import React, { type ReactNode, useLayoutEffect } from 'react';
import { useAuth } from '@clerk/clerk-expo';
import { setGooswingApiTokenGetter } from '@/lib/api/client';

type Props = Readonly<{ children: ReactNode }>;

export default function ApiClerkBridge({ children }: Props) {
  const { isSignedIn, getToken } = useAuth();

  useLayoutEffect(() => {
    setGooswingApiTokenGetter(async () => {
      if (!isSignedIn) return null;
      return (await getToken()) ?? null;
    });
    return () => {
      setGooswingApiTokenGetter(null);
    };
  }, [isSignedIn, getToken]);

  return children as any;
}
