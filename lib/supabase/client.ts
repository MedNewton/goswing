import 'react-native-url-polyfill/auto';
import Constants from 'expo-constants';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const extra =
  (Constants.expoConfig?.extra as Record<string, unknown> | undefined) ?? {};

const SUPABASE_URL =
  (extra.EXPO_PUBLIC_SUPABASE_URL as string | undefined) ??
  (process.env.EXPO_PUBLIC_SUPABASE_URL as string | undefined);

const SUPABASE_PUBLISHABLE_KEY =
  (extra.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY as string | undefined) ??
  (process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY as string | undefined);

if (!SUPABASE_URL) throw new Error('Missing EXPO_PUBLIC_SUPABASE_URL');
if (!SUPABASE_PUBLISHABLE_KEY) throw new Error('Missing EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY');

let tokenGetter: (() => Promise<string | null>) | null = null;

export function setClerkSupabaseTokenGetter(getter: () => Promise<string | null>): void {
  tokenGetter = getter;
}

export const supabase: SupabaseClient = createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },

    /**
     * IMPORTANT:
     * This is the supported way to use third-party JWTs (Clerk) with Supabase.
     * Supabase will attach `Authorization: Bearer <token>` to each request.
     */
    accessToken: async () => {
      try {
        return tokenGetter ? await tokenGetter() : null;
      } catch {
        return null;
      }
    },
  },
);
