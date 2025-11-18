import './style/globals.css';
import React, { type ReactElement } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider, AuthGate } from '@/providers/AuthProvider';
import HomePage from '@/pages/HomePage';

export default function App(): ReactElement {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <AuthGate>
          <HomePage />
        </AuthGate>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
