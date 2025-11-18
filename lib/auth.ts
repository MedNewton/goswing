import {
    type Auth,
    type User,
    type UserCredential,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    sendPasswordResetEmail,
    signOut,
  } from 'firebase/auth';
  import { auth } from '@/lib/firebase';
  
  export type EmailPassword = Readonly<{
    email: string;
    password: string;
  }>;
  
  export type AuthResult = Readonly<{
    user: User;
    credential: UserCredential;
  }>;
  
  function assertEmailPassword(input: EmailPassword): void {
    const { email, password } = input;
    if (!email || !email.includes('@')) {
      throw new Error('A valid email is required.');
    }
    if (!password || password.length < 6) {
      throw new Error('Password must be at least 6 characters.');
    }
  }
  
  /** Create an account using email + password. */
  export async function signUpWithEmailPassword(
    input: EmailPassword,
    a: Auth = auth
  ): Promise<AuthResult> {
    assertEmailPassword(input);
    const cred = await createUserWithEmailAndPassword(a, input.email, input.password);
    return { user: cred.user, credential: cred };
  }
  
  /** Sign in using email + password. */
  export async function signInWithEmailPassword(
    input: EmailPassword,
    a: Auth = auth
  ): Promise<AuthResult> {
    assertEmailPassword(input);
    const cred = await signInWithEmailAndPassword(a, input.email, input.password);
    return { user: cred.user, credential: cred };
  }
  
  /** Send a password reset email. */
  export async function sendResetEmail(
    email: string,
    a: Auth = auth
  ): Promise<void> {
    if (!email || !email.includes('@')) {
      throw new Error('A valid email is required.');
    }
    await sendPasswordResetEmail(a, email);
  }
  
  /** Sign out the current user. */
  export async function signOutCurrent(a: Auth = auth): Promise<void> {
    await signOut(a);
  }
  