import React, { useState, type ReactElement } from 'react';
import { View } from 'react-native';
import TermsConsentModal from '@/components/auth/TermsConsentModal';
import PhoneCollectPage from '@/pages/PhoneCollectPage';

type Props = Readonly<{
  onDone: () => Promise<void>;
  onCancel: () => Promise<void>;
}>;

export default function NewUserOnboardingGate({ onDone, onCancel }: Props): ReactElement {
  const [accepted, setAccepted] = useState<boolean>(false);

  if (!accepted) {
    return (
      <View className="flex-1 bg-white">
        <TermsConsentModal
          visible
          onAccept={async () => setAccepted(true)}
          onCancel={onCancel}
        />
      </View>
    );
  }

  return (
    <PhoneCollectPage
      onSubmit={onDone}
      onSkip={onDone}
    />
  );
}
