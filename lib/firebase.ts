import { initializeApp, type FirebaseOptions, getApps, getApp } from 'firebase/app';
import {
  initializeAuth,
  getReactNativePersistence,
  getAuth,
  onAuthStateChanged,
  type Auth,
  type User,
} from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

function readPublicEnv(name: string): string {
  const value = process.env[`EXPO_PUBLIC_${name}`];
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`Missing required env: EXPO_PUBLIC_${name}`);
  }
  return value;
}

const firebaseConfig: FirebaseOptions = {
  apiKey: readPublicEnv('FIREBASE_API_KEY'),
  authDomain: readPublicEnv('FIREBASE_AUTH_DOMAIN'),
  projectId: readPublicEnv('FIREBASE_PROJECT_ID'),
  storageBucket: readPublicEnv('FIREBASE_STORAGE_BUCKET'),
  messagingSenderId: readPublicEnv('FIREBASE_MESSAGING_SENDER_ID'),
  appId: readPublicEnv('FIREBASE_APP_ID'),
};

export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

let _auth: Auth;
try {
  _auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
} catch {
  _auth = getAuth(app);
}
export const auth = _auth;

export function waitForAuthReady(): Promise<User | null> {
  return new Promise((resolve) => {
    const unsub = onAuthStateChanged(auth, (user) => {
      unsub();
      resolve(user ?? null);
    });
  });
}
