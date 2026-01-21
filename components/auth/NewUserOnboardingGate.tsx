// components/auth/NewUserOnboardingGate.tsx
import React, { useState, useEffect, type ReactElement } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useUser } from '@clerk/clerk-expo';

import TermsConsentModal from '@/components/auth/TermsConsentModal';
import PhoneCollectPage from '@/pages/PhoneCollectPage';
import NotificationOptInPage from '@/pages/NotificationOptInPage';
import NewUserLocationPage from '@/pages/NewUserLocationPage';

import { initializeUserProfile, updateProfileFromOnboarding } from '@/lib/supabase/profile';

type Props = Readonly<{
  onDone: () => Promise<void>;
  onCancel: () => Promise<void>;
}>;

type OnboardingStep = 'initializing' | 'terms' | 'phone' | 'notifications' | 'location';

export default function NewUserOnboardingGate({
  onDone,
  onCancel,
}: Props): ReactElement {
  const { user, isLoaded } = useUser();
  const [step, setStep] = useState<OnboardingStep>('initializing');
  const [initError, setInitError] = useState<string | null>(null);

  // Collected data during onboarding
  const [collectedPhone, setCollectedPhone] = useState<string | null>(null);
  const [pushEnabled, setPushEnabled] = useState<boolean>(false);
  const [locationEnabled, setLocationEnabled] = useState<boolean>(false);

  // Initialize profile on mount
  useEffect(() => {
    if (!isLoaded || !user?.id) return;

    let cancelled = false;

    const init = async () => {
      try {
        await initializeUserProfile({
          userId: user.id,
          displayName: user.fullName ?? user.firstName ?? null,
          email: user.primaryEmailAddress?.emailAddress ?? null,
          avatarUrl: user.imageUrl ?? null,
          phone: user.primaryPhoneNumber?.phoneNumber ?? null,
        });

        if (!cancelled) {
          setStep('terms');
        }
      } catch (err: any) {
        console.error('Profile initialization failed:', err);
        if (!cancelled) {
          setInitError(err?.message ?? 'Failed to initialize profile');
          // Still proceed to onboarding - we can retry later
          setStep('terms');
        }
      }
    };

    init();

    return () => {
      cancelled = true;
    };
  }, [isLoaded, user?.id]);

  // Final step: save collected data and complete onboarding
  const handleFinalDone = async (location?: string, locationServicesEnabled?: boolean): Promise<void> => {
    if (user?.id) {
      try {
        await updateProfileFromOnboarding({
          userId: user.id,
          phone: collectedPhone,
          location: location ?? null,
          pushNotificationsEnabled: pushEnabled,
          locationServicesEnabled: locationServicesEnabled ?? locationEnabled,
        });
      } catch (err) {
        console.error('Failed to save onboarding data:', err);
        // Don't block completion - data can be updated later
      }
    }

    await onDone();
  };

  // Loading / initializing state
  if (step === 'initializing') {
    return (
      <SafeAreaView edges={['top', 'left', 'right']} className="flex-1 bg-white items-center justify-center">
        <ActivityIndicator size="large" color="#0B0B15" />
        <Text className="mt-4 text-gray600">Setting up your account...</Text>
        {initError && (
          <Text className="mt-2 text-red-500 text-sm px-8 text-center">{initError}</Text>
        )}
      </SafeAreaView>
    );
  }

  // Step: Terms
  if (step === 'terms') {
    return (
      <View className="flex-1 bg-white">
        <TermsConsentModal
          visible
          onAccept={async () => {
            setStep('phone');
          }}
          onCancel={onCancel}
        />
      </View>
    );
  }

  // Step: Phone
  if (step === 'phone') {
    return (
      <PhoneCollectPage
        onSubmit={async (phone: string) => {
          setCollectedPhone(phone);
          setStep('notifications');
        }}
        onSkip={async () => {
          setStep('notifications');
        }}
      />
    );
  }

  // Step: Notifications
  if (step === 'notifications') {
    return (
      <NotificationOptInPage
        onAllow={async () => {
          setPushEnabled(true);
          setStep('location');
        }}
        onSkip={async () => {
          setPushEnabled(false);
          setStep('location');
        }}
      />
    );
  }

  // Step: Location (final step)
  return (
    <NewUserLocationPage
      onDone={async (location?: string, locationServicesEnabled?: boolean) => {
        if (locationServicesEnabled !== undefined) {
          setLocationEnabled(locationServicesEnabled);
        }
        await handleFinalDone(location, locationServicesEnabled);
      }}
    />
  );
}