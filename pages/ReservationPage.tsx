import React, { useMemo, useState, type ReactElement } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import SegmentedTabs, { type SegKey } from '@/components/reservations/SegmentedTabs';
import ReservationCard, { type Reservation } from '@/components/reservations/ReservationCard';
import QuickActions from '@/components/reservations/QuickActions';

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ');

export default function ReservationsPage(): ReactElement {
  const [tab, setTab] = useState<SegKey>('active');
  const insets = useSafeAreaInsets();
  const bottomPad = (insets.bottom || 0) + 96;

  const active: ReadonlyArray<Reservation> = useMemo(
    () => [
      {
        id: 'res_001',
        title: 'Summer Music Festival',
        ticketsBadge: '3 tickets',
        dateLabel: 'Aug 30, 2025',
        timeLabel: '6:00 PM',
        venueLabel: 'Central Park, NYC',
        totalAmount: '$187',
        groups: [
          {
            id: 'g1',
            title: 'Early Bird',
            subtitle: '2 tickets • $60 each',
            tickets: [
              { id: 't1', holder: 'John', qrLabel: '#1' },
              { id: 't2', holder: 'Jane', qrLabel: '#2' },
            ],
          },
          {
            id: 'g2',
            title: 'VIP Experience',
            subtitle: '1 ticket • $150 each',
            tickets: [{ id: 't3', holder: 'John', qrLabel: '#3' }],
          },
        ],
        savedBadge: null,
      },
      {
        id: 'res_002',
        title: 'Jazz Night at Blue Note',
        ticketsBadge: '1 ticket',
        dateLabel: 'Sep 5, 2025',
        timeLabel: '9:00 PM',
        venueLabel: 'Blue Note NYC',
        totalAmount: '$68',
        groups: [
          {
            id: 'g3',
            title: 'Group Ticket',
            subtitle: '1 ticket • $68 each',
            tickets: [{ id: 't4', holder: 'Sarah', qrLabel: '#1' }],
          },
        ],
        savedBadge: 'Saved $12',
      },
    ],
    []
  );

  const past: ReadonlyArray<Reservation> = useMemo(
    () => [
      {
        id: 'res_100',
        title: 'Tech Conference 2024',
        ticketsBadge: '1 ticket',
        dateLabel: 'Jul 15, 2024',
        timeLabel: '9:00 AM',
        venueLabel: 'Convention Center',
        totalAmount: '$150',
        groups: [],
        savedBadge: null,
      },
    ],
    []
  );

  const list = tab === 'active' ? active : past;

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
          <SegmentedTabs active={tab} onChange={setTab} />
        </View>

        <View className="mt-4 px-4 gap-y-5">
          {list.map((r) => (
            <ReservationCard key={r.id} reservation={r} />
          ))}
        </View>

        <View className={cx('mt-5', tab === 'active' ? 'px-4' : 'px-4')}>
          <QuickActions subtleBackground={tab === 'past'} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
