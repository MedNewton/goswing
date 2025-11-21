// pages/PhoneCodePage.tsx
import React, { useState, type ReactElement } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import type { ConfirmationResult } from 'firebase/auth';
import { getAdditionalUserInfo } from 'firebase/auth';
import { useAuth } from '@/providers/AuthProvider';

type Props = Readonly<{
  phone: string;
  confirmation: ConfirmationResult;
  onBack: () => void;
  onClose: () => void;
}>;

const cx = (...c: Array<string | false | null | undefined>) => c.filter(Boolean).join(' ');

export default function PhoneCodePage({
  phone,
  confirmation,
  onBack,
  onClose,
}: Props): ReactElement {
  const { setOnboardingPending } = useAuth();

  const [code, setCode] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const canVerify = /^\d{6}$/.test(code.trim());

  const handleVerify = async (): Promise<void> => {
    setError(null);
    if (!canVerify) {
      setError('Enter the 6-digit code.');
      return;
    }
    setSubmitting(true);
    try {
      // Confirms the SMS code and signs the user in
      const cred = await confirmation.confirm(code.trim());

      // --- Determine if this is a brand-new user ---
      // 1) Preferred: additionalUserInfo.isNewUser
      let isNew = !!getAdditionalUserInfo(cred)?.isNewUser;

      // 2) Fallback: compare auth metadata (creation === lastSignIn => first time)
      if (!isNew && cred.user?.metadata) {
        const { creationTime, lastSignInTime } = cred.user.metadata;
        if (creationTime && lastSignInTime && creationTime === lastSignInTime) {
          isNew = true;
        }
      }

      // If new, mark onboarding pending. AuthGate will route to consent + phone-collect.
      if (isNew) {
        await setOnboardingPending();
      }
      // No explicit navigation here: your onAuthStateChanged in AuthProvider
      // advances to Home (existing user) or Onboarding (new user).
    } catch (e: any) {
      console.warn('verify error', e);
      setError('Invalid or expired code. Please try again.');
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
        {/* Top bar */}
        <View className="px-4 py-3 flex-row items-center justify-between">
          <Pressable
            onPress={onBack}
            className="h-10 w-10 items-center justify-center rounded-full active:opacity-80"
          >
            <Feather name="arrow-left" size={20} color="#0B1220" />
          </Pressable>
        </View>

        <View className="flex-1 px-5">
          <Text className="text-[34px] leading-[40px] text-black font-semibold text-center mt-4">
            Enter Code
          </Text>
          <Text className="text-lg text-gray500 text-center mt-2">
            We sent a 6-digit code to {phone || 'your number'}
          </Text>

          <View className="mt-8">
            <TextInput
              value={code}
              onChangeText={(t) => setCode(t.replace(/[^\d]/g, '').slice(0, 6))}
              keyboardType="number-pad"
              placeholder="Enter 6-digit code"
              placeholderTextColor="#9CA3AF"
              className="w-full rounded-2xl bg-gray100 px-4 py-4 text-gray900"
            />
          </View>

          {error ? (
            <View className="mt-3 rounded-xl bg-red-50 border border-red-200 px-3 py-2">
              <Text className="text-red-600">{error}</Text>
            </View>
          ) : null}

          <Pressable
            onPress={handleVerify}
            disabled={!canVerify || submitting}
            className={cx(
              'mt-6 rounded-2xl bg-black px-5 py-4 items-center justify-center',
              (!canVerify || submitting) && 'opacity-70'
            )}
          >
            {submitting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text className="text-white text-base font-semibold">Verify & Continue</Text>
            )}
          </Pressable>

          <View className="mt-4 items-center">
            <Text className="text-black opacity-90">Resend Code</Text>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
