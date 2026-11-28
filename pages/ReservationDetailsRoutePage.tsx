// pages/ReservationDetailsRoutePage.tsx — `reservationDetails` route: the ticket
// view for one reservation, pushed on top of any tab (e.g. after checkout).
// Shows the cached booking at once (works offline), then refreshes it from
// GET /v1/reservations/:id.
import React, { useEffect, useState, type ReactElement } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { GsButton } from '@/components/gs';
import { gs } from '@/theme/colors';
import TicketView from '@/components/reservations/TicketView';
import { fetchBooking, isNetworkError, type Booking } from '@/lib/api/bookings';
import { currentBookingsUser, findBooking, refreshBookings, useBookings } from '@/screens/bookings/bookingsStore';
import { applyMockPayments, loadMockState } from '@/screens/bookings/mockPayments';
import { useAppNav } from '@/navigation/AppNav';
import { useEvents } from '@/providers/EventsProvider';

export type ReservationDetailsRoutePageProps = Readonly<{
  reservationId: string;
  onBack?: () => void;
}>;

export default function ReservationDetailsRoutePage({ reservationId, onBack }: ReservationDetailsRoutePageProps): ReactElement {
  const { t } = useTranslation();
  const nav = useAppNav();
  const insets = useSafeAreaInsets();
  const { events } = useEvents();
  const [booking, setBooking] = useState<Booking | null>(() => findBooking(reservationId));
  const [error, setError] = useState<string | null>(null);
  const [offline, setOffline] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    (async () => {
      try {
        const raw = await fetchBooking(reservationId);
        // Same test-mode payment overlay as the bookings list.
        const fresh = applyMockPayments({ active: [raw], past: [], summary: null }, await loadMockState(currentBookingsUser())).active[0];
        if (cancelled) return;
        // Keep the richer list copy (savings, cover) when the detail lacks it.
        const cached = findBooking(reservationId);
        setBooking(cached ? { ...fresh, imageUrl: fresh.imageUrl ?? cached.imageUrl, savingsCents: fresh.savingsCents || cached.savingsCents, isPast: cached.isPast } : fresh);
        setOffline(false);
      } catch (e: unknown) {
        if (cancelled) return;
        // Not loaded yet in the store (e.g. just booked): try the list too.
        await refreshBookings({ force: true });
        const fromList = findBooking(reservationId);
        if (cancelled) return;
        if (fromList) {
          setBooking(fromList);
          setOffline(isNetworkError(e));
        } else {
          setError(isNetworkError(e) ? t('bookings.offlineError') : t('bookings.notFound'));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reservationId, attempt, t]);

  const close = onBack ?? nav.back;
  // Prefer the shared list copy once it has this booking: it updates after "Pay X now".
  const { data } = useBookings();
  const live = data ? (data.active.find((b) => b.id === reservationId) ?? data.past.find((b) => b.id === reservationId) ?? null) : null;
  const shown = live ?? booking;

  if (!shown) {
    return (
      <View className="flex-1 items-center justify-center px-8" style={{ backgroundColor: gs.violet, marginTop: -insets.top }}>
        {error ? (
          <>
            <Text className="text-[17px] font-bold text-white text-center">{error}</Text>
            <View className="flex-row mt-5" style={{ gap: 10 }}>
              <GsButton label={t('gs.back')} onPress={close} variant="secondary" />
              <GsButton label={t('gs.retry')} onPress={() => setAttempt((n) => n + 1)} variant="soft" />
            </View>
          </>
        ) : (
          <ActivityIndicator color={gs.white} />
        )}
      </View>
    );
  }

  const image = shown.imageUrl ?? booking?.imageUrl ?? events.find((e) => String(e.id) === shown.eventId)?.imageUrl ?? null;
  // Paint the violet under the status bar too (the shell pads the top inset).
  return (
    <View className="flex-1" style={{ backgroundColor: gs.violet, marginTop: -insets.top, paddingTop: insets.top }}>
      <TicketView
        booking={shown}
        imageUrl={image}
        onClose={close}
        onOpenEvent={(eventId) => nav.openEvent(eventId)}
        notice={offline ? t('bookings.offlineBanner') : null}
      />
    </View>
  );
}
