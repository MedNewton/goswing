// screens/profile/ProfileTab.tsx — Profile tab root.
// Foundation placeholder: the existing profile page. The Profile area PR
// replaces this with the redesigned Profile tab.
import React, { type ReactElement } from 'react';
import ProfilePage from '@/pages/ProfilePage';
import { useAppNav } from '@/navigation/AppNav';

export default function ProfileTab(): ReactElement {
  const nav = useAppNav();
  return (
    <ProfilePage
      onNavigateToReservations={(tab) => nav.switchTab('bookings', { bookingsTab: tab })}
      onNavigateToSaved={() => nav.push({ name: 'saved' })}
    />
  );
}
