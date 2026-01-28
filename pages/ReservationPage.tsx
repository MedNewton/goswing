// pages/ReservationsPage.tsx
import React, { useEffect, useMemo, useState, type ReactElement } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import SegmentedTabs, { type SegKey } from '@/components/reservations/SegmentedTabs';
import ReservationCard, { type Reservation } from '@/components/reservations/ReservationCard';
import QuickActions from '@/components/reservations/QuickActions';

import { getMyReservations } from '@/lib/supabase/myReservations';

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ');

export type ReservationsPageProps = Readonly<{
  /**
   * Initial tab to show ('active' or 'past')
   */
  initialTab?: SegKey;
  /**
   * Lifted routing hook (same pattern you used elsewhere).
   */
  route?: (r: { name: 'reservationDetails'; reservationId: string }) => void;
}>;

export default function ReservationsPage({ initialTab = 'active', route }: ReservationsPageProps): ReactElement {
  const [tab, setTab] = useState<SegKey>(initialTab);
  const insets = useSafeAreaInsets();
  const bottomPad = (insets.bottom || 0) + 96;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [active, setActive] = useState<ReadonlyArray<Reservation>>([]);
  const [past, setPast] = useState<ReadonlyArray<Reservation>>([]);

  // Update tab when initialTab prop changes
  useEffect(() => {
    setTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await getMyReservations();

        const mapToCard = (r: any): Reservation => ({
          id: String(r.id),
          title: String(r.title ?? ''),
          ticketsBadge: String(r.ticketsBadge ?? ''),
          dateLabel: String(r.dateLabel ?? ''),
          timeLabel: String(r.timeLabel ?? ''),
          venueLabel: String(r.venueLabel ?? ''),
          totalAmount: String(r.totalAmount ?? ''),
          groups: Array.isArray(r.groups) ? r.groups : [],
          savedBadge: r.savedBadge ?? null,
        });

        if (!cancelled) {
          setActive((res.active ?? []).map(mapToCard));
          setPast((res.past ?? []).map(mapToCard));
        }
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        if (!cancelled) setError(msg);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const list = useMemo(() => (tab === 'active' ? active : past), [tab, active, past]);

  const openReservationDetails = (reservationId: string): void => {
    if (typeof route === 'function') {
      route({ name: 'reservationDetails', reservationId: String(reservationId) });
      return;
    }

    console.warn(
      '[ReservationsPage] No route() prop provided; cannot navigate to reservationDetails.',
    );
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right']} className="flex-1 bg-white">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerClassName="pb-24"
        contentContainerStyle={{ paddingBottom: bottomPad }}
      >
        <View className="px-5 pt-2">
          <Text className="text-3xl font-semibold text-black">My Reservations</Text>
          <Text className="text-base text-gray600 mt-1">
            Manage your event reservations and tickets
          </Text>
        </View>

        <View className="px-5 mt-4">
          <SegmentedTabs
            active={tab}
            onChange={setTab}
            counts={{ active: active.length, past: past.length }}
          />
        </View>

        {loading ? (
          <View className="px-5 mt-6">
            <Text className="text-base text-gray700">Loading reservations…</Text>
          </View>
        ) : error ? (
          <View className="px-5 mt-6">
            <Text className="text-base font-semibold text-black">Could not load reservations</Text>
            <Text className="text-base text-gray600 mt-2">{error}</Text>
          </View>
        ) : (
          <>
            <View className="mt-4 px-4 gap-y-5">
              {list.length === 0 ? (
                <View className="px-1">
                  <Text className="text-base text-gray700">
                    {tab === 'active'
                      ? 'No active reservations yet.'
                      : 'No past reservations yet.'}
                  </Text>
                </View>
              ) : (
                list.map((r) => (
                  <ReservationCard
                    key={r.id}
                    reservation={r}
                    onPressReservation={openReservationDetails}
                  />
                ))
              )}
            </View>

            <View className={cx('mt-5', 'px-4')}>
              <QuickActions subtleBackground={tab === 'past'} />
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}