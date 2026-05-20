// App.tsx
import './style/globals.css';
import './lib/i18n'; // initialize i18next
import React, { type ReactElement } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';
import { ClerkProvider, type TokenCache } from '@clerk/clerk-expo';

import { AuthProvider, AuthGate } from '@/providers/AuthProvider';
import HomePage from '@/pages/HomePage';
import SupabaseClerkBridge from '@/lib/SupabaseClerkBridge';
import ApiClerkBridge from '@/lib/ApiClerkBridge';

// ===== Clerk token cache using expo-secure-store ============================
const clerkTokenCache: TokenCache = {
  getToken: (key: string) => SecureStore.getItemAsync(key),
  saveToken: (key: string, value: string) => SecureStore.setItemAsync(key, value),
};

// ===== Publishable key from env / app.json.extra ===========================
const extra = (Constants.expoConfig?.extra ?? {}) as Record<string, any>;

const publishableKey: string | undefined =
  process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY ??
  extra.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;

if (!publishableKey) {
  throw new Error('Missing EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY in env or app.json.extra');
}

export default function App(): ReactElement {
  return (
    <SafeAreaProvider>
      <ClerkProvider publishableKey={publishableKey} tokenCache={clerkTokenCache}>
        <AuthProvider>
          <AuthGate>
            <SupabaseClerkBridge>
              <ApiClerkBridge>
                <HomePage />
              </ApiClerkBridge>
            </SupabaseClerkBridge>
          </AuthGate>
        </AuthProvider>
      </ClerkProvider>
    </SafeAreaProvider>
  );
}
