// preview/mocks/clerk.tsx — signed-in Clerk stand-in for the web preview.
// Only used when GOSWING_PREVIEW=1 (see metro.config.js).
import React, { type ReactElement, type ReactNode } from 'react';

export type TokenCache = {
  getToken: (key: string) => Promise<string | null | undefined>;
  saveToken: (key: string, value: string) => Promise<void>;
};

const user = {
  id: 'user_preview',
  firstName: 'Mehdi',
  lastName: 'Louijab',
  fullName: 'Mehdi Louijab',
  username: 'mehdi.lj',
  imageUrl: '',
  hasImage: false,
  primaryEmailAddress: { emailAddress: 'mehdi@example.com', verification: { status: 'verified' } },
  emailAddresses: [{ id: 'em_1', emailAddress: 'mehdi@example.com', verification: { status: 'verified' } }],
  primaryPhoneNumber: { phoneNumber: '+33 6 12 34 56 78', verification: { status: 'verified' } },
  phoneNumbers: [],
  passwordEnabled: true,
  twoFactorEnabled: false,
  createdAt: new Date('2025-01-10'),
  publicMetadata: {},
  unsafeMetadata: {},
  update: async () => user,
  updatePassword: async () => user,
  setProfileImage: async () => ({}),
  reload: async () => user,
  getSessions: async () => [
    { id: 'sess_preview', status: 'active', lastActiveAt: new Date(), latestActivity: { id: 'a1', browserName: 'GoSwing app', deviceType: 'iPhone', city: 'Paris', country: 'FR', isMobile: true }, revoke: async () => ({}) },
    { id: 'sess_2', status: 'active', lastActiveAt: new Date(Date.now() - 2 * 86400_000), latestActivity: { id: 'a2', browserName: 'Chrome', deviceType: 'Macintosh', city: 'Lyon', country: 'FR', isMobile: false }, revoke: async () => ({}) },
  ],
  totpEnabled: false,
  backupCodeEnabled: false,
  createTOTP: async () => ({ id: 'totp_1', secret: 'JBSWY3DPEHPK3PXP', uri: 'otpauth://totp/GoSwing:mehdi@example.com?secret=JBSWY3DPEHPK3PXP&issuer=GoSwing', verified: false }),
  verifyTOTP: async () => ({ id: 'totp_1', verified: true }),
  disableTOTP: async () => ({}),
  createEmailAddress: async () => ({}),
  createPhoneNumber: async () => ({}),
  delete: async () => undefined,
};

const noop = async (): Promise<void> => undefined;

export function ClerkProvider({ children }: { children: ReactNode; publishableKey?: string; tokenCache?: TokenCache }): ReactElement {
  return <>{children}</>;
}
export const ClerkLoaded = ({ children }: { children: ReactNode }): ReactElement => <>{children}</>;
export const SignedIn = ClerkLoaded;
export const SignedOut = (): null => null;

export function useUser() {
  return { isLoaded: true, isSignedIn: true, user };
}
export function useAuth() {
  return {
    isLoaded: true,
    isSignedIn: true,
    userId: user.id,
    sessionId: 'sess_preview',
    getToken: async () => 'preview-token',
    signOut: noop,
  };
}
export function useClerk() {
  return { signOut: noop, user, session: { id: 'sess_preview' }, setActive: noop };
}
export function useSession() {
  return { isLoaded: true, isSignedIn: true, session: { id: 'sess_preview' } };
}
export function useOAuth() {
  return { startOAuthFlow: async () => ({ createdSessionId: null }) };
}
export function useSSO() {
  return { startSSOFlow: async () => ({ createdSessionId: null }) };
}
export function useSignInWithApple() {
  return { startAppleAuthenticationFlow: async () => ({ createdSessionId: null }) };
}
export function useSignIn() {
  return { isLoaded: true, signIn: { create: async () => ({}) }, setActive: noop };
}
export function useSignUp() {
  return { isLoaded: true, signUp: { create: async () => ({}) }, setActive: noop };
}
