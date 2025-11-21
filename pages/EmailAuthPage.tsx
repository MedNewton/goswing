// pages/EmailAuthPage.tsx
import React, { useState, type ReactElement } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useSignIn, useSignUp } from '@clerk/clerk-expo';

type Props = Readonly<{
  onBack?: () => void;
  onSuccess?: () => void;   // existing user signed in
  onNewUser?: () => void;   // new user created → onboarding
  onForgotPassword?: (email?: string) => void;
}>;

const cx = (...c: Array<string | false | null | undefined>) =>
  c.filter(Boolean).join(' ');

export default function EmailAuthPage({
  onBack,
  onSuccess,
  onNewUser,
  onForgotPassword,
}: Props): ReactElement {
  const { signIn, setActive: setActiveFromSignIn, isLoaded: signInLoaded } = useSignIn();
  const { signUp, setActive: setActiveFromSignUp, isLoaded: signUpLoaded } = useSignUp();

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
    if (v) {
      setError(v);
      return;
    }

    if (!signInLoaded || !signUpLoaded) {
      setError('Authentication is still initializing. Please try again in a moment.');
      return;
    }

    setSubmitting(true);
    const identifier = email.trim().toLowerCase();

    try {
      // 1) Try SIGN-IN (existing user)
      try {
        const attempt = await signIn.create({
          identifier,
          password,
        });

        if (attempt.status === 'complete') {
          if (attempt.createdSessionId) {
            await setActiveFromSignIn({ session: attempt.createdSessionId });
          }
          onSuccess?.();
          return;
        }

        console.warn('Unexpected sign-in status:', attempt.status);
        setError('We could not complete sign-in. Please try again.');
        return;
      } catch (err: any) {
        const firstCode: string | undefined = err?.errors?.[0]?.code;

        // "identifier not found" → treat as NEW USER → go to sign-up
        if (firstCode !== 'form_identifier_not_found') {
          if (firstCode === 'form_password_incorrect') {
            setError('Incorrect password. Please try again.');
          } else {
            setError('Something went wrong while signing in. Please try again.');
          }
          console.warn('Clerk sign-in error:', JSON.stringify(err, null, 2));
          return;
        }
        // fallthrough to sign-up
      }

      // 2) SIGN-UP (new user)
      try {
        const signUpAttempt = await signUp.create({
          emailAddress: identifier,
          password,
        });

        if (signUpAttempt.status === 'complete' && signUpAttempt.createdSessionId) {
          await setActiveFromSignUp({ session: signUpAttempt.createdSessionId });
          onNewUser?.(); // AuthGate will mark onboarding pending and show Terms → Phone → Notifications
          return;
        }

        console.warn(
          'Unexpected sign-up status (with email verification disabled):',
          signUpAttempt.status,
          signUpAttempt
        );
        setError('Could not complete sign up. Please try again.');
      } catch (signUpErr: any) {
        console.warn('Clerk sign-up error:', JSON.stringify(signUpErr, null, 2));
        const firstCode: string | undefined = signUpErr?.errors?.[0]?.code;

        if (firstCode === 'form_password_pwned') {
          setError('This password is too weak. Please choose a stronger one.');
        } else if (firstCode === 'form_identifier_exists') {
          setError('This email is already in use. Try signing in instead.');
        } else {
          setError('Could not create your account. Please try again.');
        }
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right']} className="flex-1 bg-white">
      <KeyboardAvoidingView
        behavior={Platform.select({ ios: 'padding', android: undefined })}
        className="flex-1"
      >
        <View className="px-4 py-3 flex-row items-center justify-between">
          <Pressable
            onPress={onBack}
            accessibilityRole="button"
            className="h-10 w-10 items-center justify-center rounded-full active:opacity-80"
          >
            <Feather name="arrow-left" size={20} color="#0B1220" />
          </Pressable>
        </View>

        <View className="flex-1 px-5">
          <Text className="text-3xl text-black font-semibold text-center mt-6">
            Sign in or sign up
          </Text>

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
              <Pressable
                accessibilityRole="button"
                className="h-10 w-10 items-center justify-center rounded-xl active:opacity-80"
                onPress={() => setShowPassword((v) => !v)}
              >
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
            className={cx(
              'mt-6 rounded-2xl bg-black px-5 py-4 items-center justify-center',
              submitting && 'opacity-70'
            )}
          >
            {submitting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text className="text-white text-base font-semibold">Continue</Text>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
