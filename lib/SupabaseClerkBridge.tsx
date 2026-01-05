import { type ReactNode, useEffect } from 'react';
import { useAuth } from '@clerk/clerk-expo';
import { setClerkSupabaseTokenGetter } from '@/lib/supabase';

type Props = Readonly<{ children: ReactNode }>;

export default function SupabaseClerkBridge({ children }: Props) {
  const { isSignedIn, getToken } = useAuth();

  useEffect(() => {
    setClerkSupabaseTokenGetter(async () => {
      if (!isSignedIn) return null;

      // IMPORTANT: use the JWT template you created in Clerk ("supabase")
      return (await getToken({ template: 'supabase' })) ?? null;
    });
  }, [isSignedIn, getToken]);

  return children;
}
