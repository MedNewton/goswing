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
import { findBooking, refreshBookings } from '@/screens/bookings/bookingsStore';
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
        const fresh = await fetchBooking(reservationId);
        if (cancelled) return;
        // Keep the richer list copy (savings, cover) when the detail lacks it.
        const cached = findBooking(reservationId);
        setBooking(cached ? { ...cached, ...fresh, imageUrl: fresh.imageUrl ?? cached.imageUrl, savingsCents: fresh.savingsCents || cached.savingsCents } : fresh);
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

  if (!booking) {
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

  const image = booking.imageUrl ?? events.find((e) => String(e.id) === booking.eventId)?.imageUrl ?? null;
  // Paint the violet under the status bar too (the shell pads the top inset).
  return (
    <View className="flex-1" style={{ backgroundColor: gs.violet, marginTop: -insets.top, paddingTop: insets.top }}>
      <TicketView
        booking={booking}
        imageUrl={image}
        onClose={close}
        onOpenEvent={(eventId) => nav.openEvent(eventId)}
        notice={offline ? t('bookings.offlineBanner') : null}
      />
    </View>
  );
}
