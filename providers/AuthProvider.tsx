// providers/AuthProvider.tsx
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  useUser,
  useAuth as useClerkAuth,
  useOAuth,
} from '@clerk/clerk-expo';

import AuthPage from '@/pages/AuthPage';
import EmailAuthPage from '@/pages/EmailAuthPage';
import NewUserOnboardingGate from '@/components/auth/NewUserOnboardingGate';

const ONBOARDING_FLAG = '@gs:onboardPending';

type AuthContextValue = Readonly<{
  user: any | null;
  initializing: boolean;
  needsOnboarding: boolean;
  setOnboardingPending: () => Promise<void>;
  completeOnboarding: () => Promise<void>;
  signOutAsync: () => Promise<void>;
}>;

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }): ReactElement {
  const { user, isLoaded, isSignedIn } = useUser();
  const { signOut } = useClerkAuth();

  const [needsOnboarding, setNeedsOnboarding] = useState<boolean>(false);

  // Sync onboarding flag with current signed-in user
  useEffect(() => {
    (async () => {
      if (!isSignedIn || !user) {
        setNeedsOnboarding(false);
        return;
      }
      const v = await AsyncStorage.getItem(ONBOARDING_FLAG);
      setNeedsOnboarding(v === '1');
    })();
  }, [isSignedIn, user?.id]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user: isSignedIn ? user ?? null : null,
      initializing: !isLoaded,
      needsOnboarding,
      // We want to be able to mark onboarding right after sign-up,
      // even before Clerk has fully propagated the session.
      setOnboardingPending: async () => {
        await AsyncStorage.setItem(ONBOARDING_FLAG, '1');
        setNeedsOnboarding(true);
      },
      completeOnboarding: async () => {
        await AsyncStorage.removeItem(ONBOARDING_FLAG);
        setNeedsOnboarding(false);
      },
      signOutAsync: async () => {
        await signOut();
        await AsyncStorage.removeItem(ONBOARDING_FLAG);
        setNeedsOnboarding(false);
      },
    }),
    [isSignedIn, isLoaded, user, needsOnboarding, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
}

/** Auth gate + simple unauthenticated router (Clerk-based) */
export function AuthGate({ children }: { children: ReactNode }): ReactElement | null {
  const {
    user,
    initializing,
    needsOnboarding,
    completeOnboarding,
    signOutAsync,
    setOnboardingPending,
  } = useAuth();

  const [authRoute, setAuthRoute] = useState<'portal' | 'email'>('portal');
  const [googleLoading, setGoogleLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);

  // OAuth via Clerk
  const { startOAuthFlow: startGoogleOAuthFlow } = useOAuth({
    strategy: 'oauth_google',
  });
  const { startOAuthFlow: startAppleOAuthFlow } = useOAuth({
    strategy: 'oauth_apple',
  });

  const handleContinueGoogle = async () => {
    if (googleLoading) return;

    try {
      setGoogleLoading(true);

      const { createdSessionId, signUp, setActive } =
        await startGoogleOAuthFlow();

      if (createdSessionId) {
        await setActive?.({ session: createdSessionId });
      }

      // For OAuth, presence of signUp means this was a *sign-up* flow (new user)
      const isNewUser = !!signUp;

      if (isNewUser) {
        await setOnboardingPending();
      }
      // Existing users just land in the app
    } catch (err) {
      console.error('Google OAuth error:', err);
      Alert.alert(
        'Google sign-in error',
        'Something went wrong while signing in with Google. Please try again.'
      );
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleContinueApple = async () => {
    if (appleLoading) return;

    try {
      setAppleLoading(true);

      const { createdSessionId, signUp, setActive } =
        await startAppleOAuthFlow();

      if (createdSessionId) {
        await setActive?.({ session: createdSessionId });
      }

      const isNewUser = !!signUp;

      if (isNewUser) {
        // New Apple user → Terms → Phone → Notifications → Location
        await setOnboardingPending();
      }
      // Existing Apple users just land in the app
    } catch (err) {
      console.error('Apple OAuth error:', err);
      Alert.alert(
        'Apple sign-in error',
        'Something went wrong while signing in with Apple. Please try again.'
      );
    } finally {
      setAppleLoading(false);
    }
  };

  if (initializing) return null;

  // =============== SIGNED OUT =====================================
  if (!user) {
    if (authRoute === 'email') {
      return (
        <EmailAuthPage
          onBack={() => setAuthRoute('portal')}
          onSuccess={() => {
            // existing user – once Clerk sets session,
            // user becomes truthy and AuthGate will render children
          }}
          onNewUser={async () => {
            // new user – mark onboarding; AuthGate will show NewUserOnboardingGate
            await setOnboardingPending();
          }}
          onForgotPassword={() => {
            Alert.alert('Not implemented', 'Password reset will be added later.');
          }}
        />
      );
    }

    return (
      <AuthPage
        onClose={() => {}}
        onContinueEmail={() => setAuthRoute('email')}
        onContinuePhone={() => {
          Alert.alert('Coming soon', 'Phone sign-in will be added later.');
        }}
        onContinueGoogle={handleContinueGoogle}
        onContinueApple={handleContinueApple}
      />
    );
  }

  // =============== SIGNED IN BUT NEEDS ONBOARDING =================
  if (needsOnboarding) {
    return (
      <NewUserOnboardingGate
        onDone={completeOnboarding}
        onCancel={signOutAsync}
      />
    );
  }

  // =============== FULLY SIGNED IN + ONBOARDING DONE ==============
  return <>{children}</>;
}
