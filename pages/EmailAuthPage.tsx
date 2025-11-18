import React, { useState, type ReactElement } from 'react';
import { View, Text, TextInput, Pressable, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import {
  fetchSignInMethodsForEmail,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useAuth } from '@/providers/AuthProvider';

type Props = Readonly<{
  onBack?: () => void;
  onSuccess?: () => void;   // existing user signed in
  onNewUser?: () => void;   // new user created (optional)
  onForgotPassword?: (email?: string) => void;
}>;

const cx = (...c: Array<string | false | null | undefined>) => c.filter(Boolean).join(' ');

export default function EmailAuthPage({
  onBack,
  onSuccess,
  onNewUser,
  onForgotPassword,
}: Props): ReactElement {
  const { setOnboardingPending } = useAuth();

  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const validate = (): string | null => {
    const e = email.trim();
    if (!e) return 'Please enter an email address.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) return 'Please enter a valid email address.';
    if (!password || password.length < 6) return 'Please enter a password (min 6 characters).';
    return null;
  };

  const handleContinue = async (): Promise<void> => {
    setError(null);
    const v = validate();
    if (v) { setError(v); return; }

    setSubmitting(true);
    const e = email.trim().toLowerCase();
    try {
      const methods = await fetchSignInMethodsForEmail(auth, e);

      if (methods.includes('password')) {
        // EXISTING user → login → Home
        const cred = await signInWithEmailAndPassword(auth, e, password);
        if (cred.user) onSuccess?.();
        return;
      }

      if (methods.length === 0) {
        // NEW user → create → mark onboarding → AuthGate will show consent → phone collect
        const cred = await createUserWithEmailAndPassword(auth, e, password);
        if (cred.user) {
          await setOnboardingPending();  // <-- critical line
          onNewUser?.();
        }
        return;
      }

      setError('This email is registered with a different sign-in method. Please use that method.');
    } catch (err: any) {
      const code: string = err?.code ?? '';
      if (code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
        setError('Incorrect password. Please try again.');
      } else if (code === 'auth/user-disabled') {
        setError('This account has been disabled.');
      } else if (code === 'auth/too-many-requests') {
        setError('Too many attempts. Please try again later.');
      } else if (code === 'auth/weak-password') {
        setError('Password should be at least 6 characters.');
      } else {
        setError('Something went wrong. Please try again.');
        console.warn('EmailAuth error:', err);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right']} className="flex-1 bg-white">
      <KeyboardAvoidingView behavior={Platform.select({ ios: 'padding', android: undefined })} className="flex-1">
        <View className="px-4 py-3 flex-row items-center justify-between">
          <Pressable onPress={onBack} accessibilityRole="button" className="h-10 w-10 items-center justify-center rounded-full active:opacity-80">
            <Feather name="arrow-left" size={20} color="#0B1220" />
          </Pressable>
        </View>

        <View className="flex-1 px-5">
          <Text className="text-3xl text-black font-semibold text-center mt-6">Sign in or sign up</Text>

          <View className="mt-8">
            <TextInput
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              placeholder="Email address"
              placeholderTextColor="#9CA3AF"
              className="w-full rounded-2xl bg-gray100 px-4 py-4 text-gray900"
            />
          </View>

          <View className="mt-4">
            <View className="flex-row items-center rounded-2xl bg-gray100 px-2">
              <TextInput
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                placeholder="Password"
                placeholderTextColor="#9CA3AF"
                className="flex-1 px-2 py-4 text-gray900"
              />
              <Pressable accessibilityRole="button" className="h-10 w-10 items-center justify-center rounded-xl active:opacity-80" onPress={() => setShowPassword((v) => !v)}>
                <Feather name={showPassword ? 'eye-off' : 'eye'} size={18} color="#0B1220" />
              </Pressable>
            </View>
          </View>

          <View className="items-end mt-3">
            <Pressable onPress={() => onForgotPassword?.(email.trim())}>
              <Text className="text-base text-black">Forgot password?</Text>
            </Pressable>
          </View>

          {error ? (
            <View className="mt-3 rounded-xl bg-red-50 border border-red-200 px-3 py-2">
              <Text className="text-red-600">{error}</Text>
            </View>
          ) : null}

          <Pressable
            onPress={handleContinue}
            disabled={submitting}
            className={cx('mt-6 rounded-2xl bg-black px-5 py-4 items-center justify-center', submitting && 'opacity-70')}
          >
            {submitting ? <ActivityIndicator color="#FFFFFF" /> : <Text className="text-white text-base font-semibold">Continue</Text>}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
