// components/auth/NewUserOnboardingGate.tsx
import React, { useState, type ReactElement } from 'react';
import { View } from 'react-native';
import TermsConsentModal from '@/components/auth/TermsConsentModal';
import PhoneCollectPage from '@/pages/PhoneCollectPage';
import NotificationOptInPage from '@/pages/NotificationOptInPage';
import NewUserLocationPage from '@/pages/NewUserLocationPage';

type Props = Readonly<{
  onDone: () => Promise<void>;
  onCancel: () => Promise<void>;
}>;

type OnboardingStep = 'terms' | 'phone' | 'notifications' | 'location';

export default function NewUserOnboardingGate({
  onDone,
  onCancel,
}: Props): ReactElement {
  const [step, setStep] = useState<OnboardingStep>('terms');

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

  if (step === 'phone') {
    return (
      <PhoneCollectPage
        onSubmit={async () => {
          setStep('notifications');
        }}
        onSkip={async () => {
          setStep('notifications');
        }}
      />
    );
  }

  if (step === 'notifications') {
    return (
      <NotificationOptInPage
        onAllow={async () => {
          setStep('location');
        }}
        onSkip={async () => {
          setStep('location');
        }}
      />
    );
  }

  // step === 'location'
  return <NewUserLocationPage onDone={onDone} />;
}
