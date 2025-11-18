import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { onAuthStateChanged, signOut, type User } from 'firebase/auth';
import { auth, waitForAuthReady } from '@/lib/firebase';
import AuthPage from '@/pages/AuthPage';
import EmailAuthPage from '@/pages/EmailAuthPage';
import NewUserOnboardingGate from '@/components/auth/NewUserOnboardingGate';

const ONBOARDING_FLAG = '@gs:onboardPending';

type AuthContextValue = Readonly<{
  user: User | null;
  initializing: boolean;
  needsOnboarding: boolean;
  setOnboardingPending: () => Promise<void>;
  completeOnboarding: () => Promise<void>;
  signOutAsync: () => Promise<void>;
}>;

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }): ReactElement {
  const [user, setUser] = useState<User | null>(null);
  const [initializing, setInitializing] = useState<boolean>(true);
  const [needsOnboarding, setNeedsOnboarding] = useState<boolean>(false);

  const readFlag = async () => {
    if (!user) return setNeedsOnboarding(false);
    const v = await AsyncStorage.getItem(ONBOARDING_FLAG);
    setNeedsOnboarding(v === '1');
  };

  useEffect(() => {
    let unsub: (() => void) | null = null;
    waitForAuthReady().then((u) => {
      setUser(u);
      setInitializing(false);
      unsub = onAuthStateChanged(auth, (next) => setUser(next ?? null));
    });
    return () => { unsub?.(); };
  }, []);

  useEffect(() => { void readFlag(); }, [user?.uid]);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    initializing,
    needsOnboarding,
    setOnboardingPending: async () => {
      await AsyncStorage.setItem(ONBOARDING_FLAG, '1');
      setNeedsOnboarding(true);
    },
    completeOnboarding: async () => {
      await AsyncStorage.removeItem(ONBOARDING_FLAG);
      setNeedsOnboarding(false);
    },
    signOutAsync: async () => {
      await signOut(auth);
      await AsyncStorage.removeItem(ONBOARDING_FLAG);
      setNeedsOnboarding(false);
    },
  }), [user, initializing, needsOnboarding]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
}

export function AuthGate({ children }: { children: ReactNode }): ReactElement | null {
  const { user, initializing, needsOnboarding, completeOnboarding, signOutAsync } = useAuth();

  const [authRoute, setAuthRoute] = useState<'portal' | 'email'>('portal');

  if (initializing) return null;

  if (!user) {
    if (authRoute === 'email') {
      return (
        <EmailAuthPage
          onBack={() => setAuthRoute('portal')}
          onSuccess={() => {}}
          onNewUser={() => {}}
          onForgotPassword={() => {}}
        />
      );
    }
    return (
      <AuthPage
        onClose={() => {}}
        onContinueEmail={() => setAuthRoute('email')}
        onContinuePhone={() => {}}
        onContinueGoogle={() => {}}
        onContinueApple={() => {}}
      />
    );
  }

  if (needsOnboarding) {
    return (
      <NewUserOnboardingGate
        onDone={completeOnboarding}
        onCancel={signOutAsync}
      />
    );
  }

  return <>{children}</>;
}
