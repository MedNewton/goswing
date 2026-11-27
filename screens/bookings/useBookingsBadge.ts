// screens/bookings/useBookingsBadge.ts — count shown on the Bookings tab.
// Number of active bookings from the shared (cached) bookings list; refreshed
// when the tab changes and when the app comes back to the foreground.
import { useEffect } from 'react';
import { AppState } from 'react-native';
import { useAppNav } from '@/navigation/AppNav';
import { useAuth } from '@/providers/AuthProvider';
import { activeCount, bindBookingsUser, refreshBookings, useBookings } from './bookingsStore';

export function useBookingsBadge(): number | undefined {
  // Rendered once by the shell, above every bookings screen: bind the user first.
  const { user } = useAuth();
  bindBookingsUser(user?.id ? String(user.id) : null);
  const { data } = useBookings();
  const { tab } = useAppNav();

  useEffect(() => {
    void refreshBookings();
  }, [tab]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') void refreshBookings();
    });
    return () => sub.remove();
  }, []);

  const n = activeCount(data);
  return n > 0 ? n : undefined;
}

