// src/lib/SupabaseClerkBridge.tsx
import React, { type ReactNode, useLayoutEffect } from 'react';
import { useAuth } from '@clerk/clerk-expo';
import { setClerkSupabaseTokenGetter } from '@/lib/supabase';

type Props = Readonly<{ children: ReactNode }>;

export default function SupabaseClerkBridge({ children }: Props) {
  const { isSignedIn, getToken } = useAuth();

  useLayoutEffect(() => {
    setClerkSupabaseTokenGetter(async () => {
      if (!isSignedIn) return null;
      return (await getToken({ template: 'supabase' })) ?? null;
    });
  }, [isSignedIn, getToken]);

  return children as any;
}
