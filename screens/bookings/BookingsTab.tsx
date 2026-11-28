// screens/bookings/BookingsTab.tsx — Bookings tab root.
// Foundation placeholder: the existing reservations page. The Bookings area
// PR replaces this with the redesigned Bookings tab.
import React, { type ReactElement } from 'react';
import ReservationsPage from '@/pages/ReservationPage';
import { useAppNav } from '@/navigation/AppNav';

export default function BookingsTab(): ReactElement {
  const nav = useAppNav();
  return (
    <ReservationsPage
      key={nav.tabParams.bookingsTab ?? 'active'}
      initialTab={nav.tabParams.bookingsTab ?? 'active'}
      route={(r) => nav.push(r)}
    />
  );
}
