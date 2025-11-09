import React, { type ReactElement } from 'react';
import { View, Text, Image } from 'react-native';
import { Feather } from '@expo/vector-icons';
import Card from '@/components/ui/Card';
import SectionHeader from './SectionHeader';

export type MiniEvent = Readonly<{
  id: string;
  title: string;
  imageUrl: string | null | undefined;
  startsAtIso: string | null | undefined;
  priceLabel: string | null | undefined;
}>;

export type MoreFromOrganizerProps = Readonly<{
  organizer: string;
  items: ReadonlyArray<MiniEvent>;
  subtitleCity?: string | null;
}>;

function formatDate(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const date = d.toLocaleDateString(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  const time = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  return `${date} · ${time}`;
}

function PricePill({ label }: { label: string }): ReactElement {
  return (
    <View className="rounded-2xl bg-white border border-gray300 px-4 py-2.5 min-w-[64px] items-center">
      <Text className="text-gray800 font-medium">{label}</Text>
    </View>
  );
}

export default function MoreFromOrganizer({
  organizer,
  subtitleCity,
  items,
}: MoreFromOrganizerProps): ReactElement {
  return (
    <>
      <SectionHeader title={`More from ${organizer}`} subtitle={subtitleCity ?? undefined} action="View all" />
      <View className="px-2 mt-3 gap-y-3">
        {items.map((ev) => (
          <Card
            key={ev.id}
            variant="outlined"
            padding="md"
            className="rounded-3xl border-gray200"
          >
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-x-4 flex-1 pr-3">
                <View className="h-16 w-24 rounded-xl bg-gray-200" />
                <View className="flex-1">
                  <Text numberOfLines={1} className="text-gray900 font-medium">
                    {ev.title}
                  </Text>
                  <View className="mt-1 flex-row items-center gap-x-2">
                    <Feather name="calendar" size={14} color="#6B7280" />
                    <Text className="text-sm text-gray600">{formatDate(ev.startsAtIso)}</Text>
                  </View>
                </View>
              </View>

              {ev.priceLabel ? <PricePill label={ev.priceLabel} /> : <View />}
            </View>
          </Card>
        ))}
      </View>
    </>
  );
}
