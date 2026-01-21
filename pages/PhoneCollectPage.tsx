// pages/PhoneCollectPage.tsx
import React, { useState, type ReactElement } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useUser } from '@clerk/clerk-expo';

type Props = Readonly<{
  onSubmit: (phone: string) => Promise<void>;  // <-- Changed: now accepts phone
  onSkip: () => Promise<void>;
}>;

export default function PhoneCollectPage({ onSubmit, onSkip }: Props): ReactElement {
  const [phone, setPhone] = useState<string>('');
  const insets = useSafeAreaInsets();
  const disabled = phone.trim().length < 6;

  const { user, isLoaded } = useUser();

  const handleContinue = async (): Promise<void> => {
    if (disabled) return;

    const normalized = phone.trim();

    // Try to persist phone on the Clerk user, but don't block onboarding if it fails
    if (isLoaded && user) {
      try {
        const currentUnsafe = (user.unsafeMetadata ?? {}) as Record<string, unknown>;

        await user.update({
          unsafeMetadata: {
            ...currentUnsafe,
            phoneNumber: normalized,
          },
        });
      } catch (err) {
        console.warn('Failed to save phone to Clerk unsafeMetadata:', err);
      }
    }

    await onSubmit(normalized);  // <-- Pass phone to parent
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right']} className="flex-1 bg-white">
      <KeyboardAvoidingView
        behavior={Platform.select({ ios: 'padding', android: undefined })}
        className="flex-1"
      >
        <View className="px-5 pt-3 mb-20 items-end">
          <Pressable onPress={onSkip} className="px-2 py-1 active:opacity-80">
            <Text className="text-[18px] text-[#0B0B15]">Skip</Text>
          </Pressable>
        </View>

        <View className="flex-1 px-5 pt-2">
          <Text className="text-3xl text-black font-semibold text-center">
            Can we get your number?
          </Text>
          <Text className="text-lg text-gray600 text-center mt-3 px-4">
            Your phone number will be verified and linked to your
            account. With your permission, we&apos;ll use it to help you
            experience GoSwing at the best way.
          </Text>

          <View className="mt-8">
            <TextInput
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              placeholder="Phone number"
              placeholderTextColor="#9CA3AF"
              className="w-full rounded-2xl bg-gray100 px-4 py-4 text-gray900"
            />
          </View>
        </View>

        <View
          className="px-5"
          style={{ paddingBottom: Math.max(insets.bottom, 16) }}
        >
          <Pressable
            onPress={handleContinue}
            disabled={disabled}
            className="rounded-2xl bg-[#0B0B15] py-4 items-center"
            style={{ opacity: disabled ? 0.6 : 1 }}
          >
            <Text className="text-white text-[18px] font-semibold">Continue</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}