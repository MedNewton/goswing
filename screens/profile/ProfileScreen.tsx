// screens/profile/ProfileScreen.tsx — maps a Profile sub-screen route to its page.
import React, { type ReactElement } from 'react';
import type { ProfileScreenKey } from '@/navigation/routes';

import EditProfilePage from '@/pages/Editprofilepage';
import AccountSettingsPage from '@/pages/AccountSettingsPage';
import PaymentMethodsPage from '@/pages/PaymentMethodsPage';
import NotificationPreferencesPage from '@/pages/NotificationPreferencesPage';
import MyReviewsPage from '@/pages/MyReviewsPage';
import HelpSupportPage from '@/pages/Helpsupportpage';
import PrivacySecurityPage from '@/pages/Privacysecuritypage';
import TermsConditionsPage from '@/pages/Termsconditionspage';

export default function ProfileScreen({
  screen,
  onBack,
}: Readonly<{ screen: ProfileScreenKey; onBack: () => void }>): ReactElement | null {
  switch (screen) {
    case 'editProfile':
      return <EditProfilePage onBack={onBack} />;
    case 'account':
      return <AccountSettingsPage onBack={onBack} />;
    case 'payments':
      return <PaymentMethodsPage onBack={onBack} />;
    case 'notificationPrefs':
      return <NotificationPreferencesPage onBack={onBack} />;
    case 'reviews':
      return <MyReviewsPage onBack={onBack} />;
    case 'help':
      return <HelpSupportPage onBack={onBack} />;
    case 'privacy':
      return <PrivacySecurityPage onBack={onBack} />;
    case 'terms':
      return <TermsConditionsPage onBack={onBack} />;
    default:
      return null;
  }
}
