// components/event/SectionTabs.tsx
import React, { useState, type ReactElement } from 'react';
import { View, Text, Pressable } from 'react-native';
import { Feather } from '@expo/vector-icons';
import AboutSection from '@/components/event/AboutSection';
import AttendeesSection from '@/components/event/AttendeesSection';
import CancellationPolicy from '@/components/event/CancellationPolicy';
import MoreFromOrganizer from '@/components/event/MoreFromOrganizer';
import SimilarEvents from '@/components/event/SimilarEvents';
import Card from '@/components/ui/Card';
import { Event } from '@/types/domain';

type TabKey = 'about' | 'offers' | 'upcoming';

export default function SectionTabs({ event }: { event: Event }): ReactElement {
  const [active, setActive] = useState<TabKey>('about');

  return (
    <View className="px-5 mt-5">
      {/* Pills */}
      <View className="flex-row items-center rounded-full bg-gray100 p-1 border border-gray200">
        <TabPill label="About" selected={active === 'about'} onPress={() => setActive('about')} />
        <TabPill label="Offers" selected={active === 'offers'} onPress={() => setActive('offers')} />
        <TabPill
          label="Upcoming"
          selected={active === 'upcoming'}
          onPress={() => setActive('upcoming')}
        />
      </View>

      {/* Panels */}
      <View className="mt-5">
        {active === 'about' && (
          <View>
            <AboutSection />
            <AttendeesSection />
            <CancellationPolicy />
            <MoreFromOrganizer
              organizer={event.organizer}
              subtitleCity={event.city ?? null}
              items={[
                { id: '1', title: 'Event 1', imageUrl: 'https://via.placeholder.com/300x200', startsAtIso: '2025-01-01', priceLabel: '$10' },
                { id: '2', title: 'Event 2', imageUrl: 'https://via.placeholder.com/300x200', startsAtIso: '2025-01-02', priceLabel: '$20' },
              ]}
            />
            <View className="mt-5 mx-5 border-t border-gray200" />
            <SimilarEvents items={[
              { id: '1', title: 'Event 1', imageUrl: 'https://via.placeholder.com/300x200', startsAtIso: '2025-01-01', priceLabel: '$10' },
              { id: '2', title: 'Event 2', imageUrl: 'https://via.placeholder.com/300x200', startsAtIso: '2025-01-02', priceLabel: '$20' },
            ]} />
          </View>
        )}
        {active === 'offers' && <OffersPanel />}
        {active === 'upcoming' && <UpcomingPanel />}
      </View>
    </View>
  );
}

function TabPill({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}): ReactElement {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      className={`px-0 py-1.5 rounded-full flex-1 items-center ${selected ? 'bg-white border border-gray300' : ''
        }`}
    >
      <Text className={selected ? 'text-brand font-medium' : 'text-gray700 font-medium'}>
        {label}
      </Text>
    </Pressable>
  );
}

/* ---------------------------------- OFFERS --------------------------------- */

type Offer = Readonly<{
  id: string;
  title: string;
  subtitle: string;
  price: string;
  originalPrice?: string | null;
  leftLabel?: string | null;
}>;

function OffersPanel(): ReactElement {
  const offers: ReadonlyArray<Offer> = [
    {
      id: 'o1',
      title: 'General Admission',
      subtitle: 'Standard entry to the club',
      price: '$25',
      originalPrice: '$35',
      leftLabel: '80 left',
    },
    {
      id: 'o2',
      title: 'VIP Table',
      subtitle: 'VIP table with bottle service',
      price: '$120',
      originalPrice: null,
      leftLabel: '8 left',
    },
  ];

  return (
    <View className="px-2">
      <View className="flex-row items-center justify-between">
        <Text className="text-xl font-semibold text-black">Available Offers</Text>
        <Pressable className="rounded-2xl bg-white border border-gray300 px-4 py-2">
          <Text className="text-gray800">See all offers</Text>
        </Pressable>
      </View>

      <View className="mt-3 gap-y-4">
        {offers.map((o) => (
          <OfferCard key={o.id} offer={o} />
        ))}
      </View>
    </View>
  );
}

function OfferCard({ offer }: { offer: Offer }): ReactElement {
  const [qty, setQty] = useState<number>(0);

  return (
    <Card variant="outlined" padding="lg" className="rounded-3xl border-gray200">
      <View className="flex-row items-start justify-between">
        <View className="flex-1 pr-3">
          <Text className="text-xl font-semibold text-black">{offer.title}</Text>
          <Text className="text-base text-gray600 mt-1">{offer.subtitle}</Text>

          {/* bullets */}
          <View className="mt-3 gap-y-1">
            {offer.id === 'o1'
              ? ['Club entry', 'Coat check included'].map((b) => (
                <Text key={b} className="text-gray700">
                  • {b}
                </Text>
              ))
              : ['Reserved table', 'Priority entry', 'Dedicated server'].map((b) => (
                <Text key={b} className="text-gray700">
                  • {b}
                </Text>
              ))}
          </View>

          {/* qty selector */}
          <View className="mt-4 flex-row items-center gap-x-6">
            <StepperButton
              label="-"
              onPress={() => setQty((n) => Math.max(0, n - 1))}
              disabled={qty === 0}
            />
            <Text className="text-xl text-gray900">{qty}</Text>
            <StepperButton label="+" onPress={() => setQty((n) => n + 1)} />
          </View>
        </View>

        {/* price side */}
        <View className="items-end">
          <View className="flex-row items-baseline gap-x-2">
            {offer.originalPrice ? (
              <Text className="text-gray400 line-through">{offer.originalPrice}</Text>
            ) : null}
            <Text className="text-xl text-gray900 font-semibold">{offer.price}</Text>
          </View>
          {offer.leftLabel ? (
            <Text className="mt-2 text-gray500">{offer.leftLabel}</Text>
          ) : null}
        </View>
      </View>
    </Card>
  );
}

function StepperButton({
  label,
  onPress,
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}): ReactElement {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      className={`h-11 w-11 rounded-2xl border items-center justify-center ${disabled ? 'border-gray200 bg-gray100' : 'border-gray300 bg-white active:opacity-80'
        }`}
    >
      <Text className="text-lg text-gray800">{label}</Text>
    </Pressable>
  );
}

/* --------------------------------- UPCOMING -------------------------------- */

function UpcomingPanel(): ReactElement {
  return (
    <View className="px-2">
      <Text className="text-xl font-semibold text-black">
        Upcoming Events from Nightlife Events Paris
      </Text>

      {/* calendar mock card */}
      <Card variant="outlined" padding="lg" className="rounded-3xl border-gray200 mt-3">
        <View className="flex-row items-center justify-between mb-3">
          <Pressable className="rounded-2xl bg-white border border-gray300 h-9 w-9 items-center justify-center">
            <Feather name="chevron-left" size={18} color="#6B7280" />
          </Pressable>
          <Text className="text-base font-medium text-gray900">November 2025</Text>
          <Pressable className="rounded-2xl bg-white border border-gray300 h-9 w-9 items-center justify-center">
            <Feather name="chevron-right" size={18} color="#6B7280" />
          </Pressable>
        </View>

        {/* simple 7x5 grid */}
        <CalendarGrid />

        <View className="mt-4 flex-row items-center gap-x-2">
          <View className="h-3 w-3 rounded-full bg-black" />
          <Text className="text-gray600">Tap to view full calendar</Text>
        </View>
      </Card>

      {/* next events list */}
      <Text className="text-xl font-semibold text-black mt-6">Next Events</Text>
      <View className="mt-3 gap-y-4">
        <NextEventCard
          title="Jazz Night Under Stars"
          date="Dec 28, 2024"
          time="8:00 PM"
          venue="Madison Square Garden"
          price="$45"
        />
        <NextEventCard
          title="New Year Concert"
          date="Dec 31, 2024"
          time="10:00 PM"
          venue="Times Square"
          price="$80"
        />
      </View>
    </View>
  );
}

function CalendarGrid(): ReactElement {
  const daysRow: ReadonlyArray<string> = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
  const grid: ReadonlyArray<ReadonlyArray<string>> = [
    ['26', '27', '28', '29', '30', '31', '1'],
    ['2', '3', '4', '5', '6', '7', '8'],
    ['9', '10', '11', '12', '13', '14', '15'],
    ['16', '17', '18', '19', '20', '21', '22'],
    ['23', '24', '25', '26', '27', '28', '29'],
    ['30', '1', '2', '3', '4', '5', '6'],
  ];

  return (
    <View>
      <View className="flex-row justify-between mb-2">
        {daysRow.map((d) => (
          <Text key={d} className="w-10 text-center text-gray500">
            {d}
          </Text>
        ))}
      </View>
      {grid.map((row, i) => (
        <View key={String(i)} className="flex-row justify-between mb-2">
          {row.map((d, j) => (
            <View
              key={`${i}-${j}`}
              className={`h-10 w-10 rounded-xl items-center justify-center ${i === 2 && j === 0 ? 'bg-gray200' : ''
                }`}
            >
              <Text className="text-gray800">{d}</Text>
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

function NextEventCard({
  title,
  date,
  time,
  venue,
  price,
}: {
  title: string;
  date: string;
  time: string;
  venue: string;
  price: string;
}): ReactElement {
  return (
    <Card variant="outlined" padding="lg" className="rounded-3xl border-gray200">
      <View className="flex-row items-center justify-between">
        <View className="flex-1 pr-3">
          <Text className="text-xl font-semibold text-black">{title}</Text>

          <View className="mt-2 flex-row items-center gap-x-3">
            <View className="flex-row items-center gap-x-1">
              <Feather name="calendar" size={14} color="#6B7280" />
              <Text className="text-gray600">{date}</Text>
            </View>
            <View className="flex-row items-center gap-x-1">
              <Feather name="clock" size={14} color="#6B7280" />
              <Text className="text-gray600">{time}</Text>
            </View>
          </View>

          <View className="mt-2 flex-row items-center gap-x-1">
            <Feather name="map-pin" size={14} color="#6B7280" />
            <Text className="text-gray600">{venue}</Text>
          </View>
        </View>

        <View className="rounded-2xl bg-white border border-gray300 px-4 py-3 min-w-[64px] items-center">
          <Text className="text-gray800 font-medium">{price}</Text>
        </View>
      </View>
    </Card>
  );
}
