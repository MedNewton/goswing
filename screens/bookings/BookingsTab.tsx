// screens/bookings/BookingsTab.tsx — Bookings tab root ("My bookings").
// Savings header, Active / Past segments, booking cards and the ticket sheet.
// Data comes from the shared bookings store (cached for offline use).
import React, { useCallback, useEffect, useMemo, useState, type ReactElement } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, Text, View } from 'react-native';
import { CalendarSearch, History, WifiOff } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { EmptyState, GsButton, floatShadow } from '@/components/gs';
import { useTabBarSpace } from '@/components/navigation/BottomTabBar';
import { useAppNav } from '@/navigation/AppNav';
import { useEvents } from '@/providers/EventsProvider';
import { gs } from '@/theme/colors';
import SegmentedTabs, { type SegKey } from '@/components/reservations/SegmentedTabs';
import BookingCard from '@/components/reservations/BookingCard';
import TicketSheet from '@/components/reservations/TicketSheet';
import { money } from '@/components/reservations/bookingFormat';
import type { Booking, BookingsData } from '@/lib/api/bookings';
import { refreshBookings, useBookings } from './bookingsStore';

type Summary = Readonly<{ savingsCents: number; currency: string; bookings: number; tickets: number }>;

function summarize(d: BookingsData): Summary {
  const all = [...d.active, ...d.past];
  const s = d.summary ?? {};
  return {
    savingsCents: s.totalSavingsCents ?? all.reduce((a, b) => a + b.savingsCents, 0),
    currency: s.currency ?? all[0]?.currency ?? 'EUR',
    bookings: s.bookingsCount ?? all.length,
    tickets: s.ticketsCount ?? all.reduce((a, b) => a + b.ticketsCount, 0),
  };
}

export default function BookingsTab(): ReactElement {
  const { t, i18n } = useTranslation();
  const nav = useAppNav();
  const { events } = useEvents();
  const bottom = useTabBarSpace();
  const { data, loading, refreshing, error, offline } = useBookings();
  const [seg, setSeg] = useState<SegKey>(nav.tabParams.bookingsTab ?? 'active');
  const [openId, setOpenId] = useState<string | null>(null);

  // Respect the segment asked for when another screen switches to this tab.
  useEffect(() => {
    if (nav.tab !== 'bookings') return;
    if (nav.tabParams.bookingsTab) setSeg(nav.tabParams.bookingsTab);
    void refreshBookings();
  }, [nav.tab, nav.tabParams]);

  const imageByEvent = useMemo(() => {
    const m = new Map<string, string>();
    for (const e of events) if (e.imageUrl) m.set(String(e.id), e.imageUrl);
    return m;
  }, [events]);
  const imageFor = useCallback((b: Booking) => b.imageUrl ?? (b.eventId ? imageByEvent.get(b.eventId) : undefined) ?? null, [imageByEvent]);

  const list = data ? (seg === 'active' ? data.active : data.past) : [];
  const open = useMemo(
    () => (openId && data ? (data.active.find((b) => b.id === openId) ?? data.past.find((b) => b.id === openId) ?? null) : null),
    [openId, data],
  );
  const summary = data ? summarize(data) : null;
  const onOpen = useCallback((b: Booking) => setOpenId(b.id), []);

  return (
    <View className="flex-1 bg-surface">
      <ScrollView
        contentContainerStyle={{ paddingBottom: bottom + 16 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void refreshBookings({ force: true, pull: true })} tintColor={gs.violet} />}
      >
        <Text className="px-5 pt-5 text-[38px] leading-[44px] font-extrabold text-ink" accessibilityRole="header">
          {t('bookings.title')}
        </Text>

        {offline ? (
          <View className="mx-5 mt-3 flex-row items-center self-start rounded-full px-3 py-1.5" style={{ backgroundColor: gs.orangeSoft, gap: 6 }}>
            <WifiOff size={14} color={gs.orange} />
            <Text className="text-[13px] font-bold" style={{ color: gs.orange }}>
              {t('bookings.offlineBanner')}
            </Text>
          </View>
        ) : null}

        {summary && summary.bookings > 0 ? (
          <View className="mx-5 mt-5 rounded-[28px] px-[22px] py-5 flex-row items-center" style={[{ backgroundColor: gs.violet }, floatShadow]}>
            <View className="flex-1 pr-3">
              {summary.savingsCents > 0 ? (
                <>
                  <Text className="text-[15px] font-semibold" style={{ color: 'rgba(255,255,255,0.85)' }}>
                    {t('bookings.savedWith')}
                  </Text>
                  <Text className="text-[40px] leading-[46px] font-extrabold text-white mt-0.5">
                    {money(summary.savingsCents, summary.currency, i18n.language)}
                  </Text>
                </>
              ) : (
                <Text className="text-[20px] leading-[26px] font-extrabold text-white">{t('bookings.yourBookings')}</Text>
              )}
            </View>
            <View className="items-end">
              <Text className="text-[13px] font-bold text-white">{t('bookings.bookingsCount', { count: summary.bookings })}</Text>
              <Text className="text-[13px] font-bold text-white mt-0.5">{t('bookings.ticketsCount', { count: summary.tickets })}</Text>
            </View>
          </View>
        ) : null}

        <View className="px-5 mt-5">
          <SegmentedTabs active={seg} onChange={setSeg} counts={{ active: data?.active.length ?? 0, past: data?.past.length ?? 0 }} />
        </View>

        {loading && !data ? (
          <View className="py-16 items-center">
            <ActivityIndicator color={gs.violet} />
          </View>
        ) : error && !data ? (
          <View className="items-center px-8 py-12">
            <EmptyState
              icon={<WifiOff size={28} color={gs.violet} />}
              title={t('bookings.couldNotLoad')}
              message={error === 'network' ? t('bookings.offlineError') : error}
            />
            <GsButton label={t('gs.retry')} onPress={() => void refreshBookings({ force: true })} variant="soft" />
          </View>
        ) : list.length === 0 ? (
          seg === 'active' ? (
            <EmptyState
              icon={<CalendarSearch size={28} color={gs.violet} />}
              title={t('bookings.emptyActive')}
              message={t('bookings.emptyActiveSub')}
              actionLabel={t('bookings.discoverEvents')}
              onAction={() => nav.switchTab('discover')}
            />
          ) : (
            <EmptyState
              icon={<History size={28} color={gs.violet} />}
              title={t('bookings.emptyPast')}
              message={t('bookings.emptyPastSub')}
              actionLabel={t('bookings.discoverEvents')}
              onAction={() => nav.switchTab('discover')}
            />
          )
        ) : (
          <View className="px-5 mt-4" style={{ gap: 12 }}>
            {list.map((b) => (
              <BookingCard key={b.id} booking={b} imageUrl={imageFor(b)} onOpen={onOpen} />
            ))}
          </View>
        )}
      </ScrollView>

      <TicketSheet
        booking={open}
        imageUrl={open ? imageFor(open) : null}
        onClose={() => setOpenId(null)}
        notice={offline ? t('bookings.offlineBanner') : null}
        onOpenEvent={(eventId) => {
          setOpenId(null);
          nav.openEvent(eventId);
        }}
      />
    </View>
  );
}
