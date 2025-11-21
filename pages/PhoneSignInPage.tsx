// pages/PhoneSignInPage.tsx
import React, { useRef, useState, type ReactElement } from 'react';
import { View, Text, TextInput, Pressable, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { FirebaseRecaptchaVerifierModal } from 'expo-firebase-recaptcha';
import { signInWithPhoneNumber, type ConfirmationResult } from 'firebase/auth';
import { auth, app } from '@/lib/firebase';

type Props = Readonly<{
  onBack?: () => void;
  onClose?: () => void;
  onSent: (args: { confirmation: ConfirmationResult; phone: string }) => void;
}>;

const cx = (...c: Array<string | false | null | undefined>) => c.filter(Boolean).join(' ');

export default function PhoneSignInPage({ onBack, onClose, onSent }: Props): ReactElement {
  const recaptchaRef = useRef<FirebaseRecaptchaVerifierModal>(null);
  const [phone, setPhone] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSend = /^\+?[1-9]\d{6,}$/.test(phone.trim());

  const handleSend = async (): Promise<void> => {
    setError(null);
    if (!canSend) {
      setError('Please enter a valid phone number with country code (e.g., +1 234 567 8900).');
      return;
    }
    setSubmitting(true);
    try {
      const confirmation = await signInWithPhoneNumber(auth, phone.trim(), recaptchaRef.current!);
      onSent({ confirmation, phone: phone.trim() });
    } catch (e: any) {
      console.warn('send code error', e);
      setError('Could not send code. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right']} className="flex-1 bg-white">
      {/* Required reCAPTCHA modal for Expo + Firebase phone auth */}
      <FirebaseRecaptchaVerifierModal
        ref={recaptchaRef}
        firebaseConfig={app.options as any}
        attemptInvisibleVerification
      />

      <KeyboardAvoidingView behavior={Platform.select({ ios: 'padding', android: undefined })} className="flex-1">
        {/* Top bar */}
        <View className="px-4 py-3 flex-row items-center justify-between">
          <Pressable onPress={onBack} className="h-10 w-10 items-center justify-center rounded-full active:opacity-80">
            <Feather name="arrow-left" size={20} color="#0B1220" />
          </Pressable>

        </View>

        <View className="flex-1 px-5">
          <Text className="text-[34px] leading-[40px] text-black font-semibold text-center mt-4">Sign in or sign up</Text>
          <Text className="text-lg text-gray500 text-center mt-2">Enter your phone number</Text>

          <View className="mt-8">
            <TextInput
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              placeholder="Phone number (e.g., +1 234 567 8900)"
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
            onPress={handleSend}
            disabled={!canSend || submitting}
            className={cx(
              'mt-6 rounded-2xl bg-black px-5 py-4 items-center justify-center',
              (!canSend || submitting) && 'opacity-70'
            )}
          >
            {submitting ? <ActivityIndicator color="#FFFFFF" /> : <Text className="text-white text-base font-semibold">Send Code</Text>}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
