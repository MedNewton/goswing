import React, { type ReactElement } from 'react';
import { View, Text, Image } from 'react-native';
import { Feather } from '@expo/vector-icons';
import Card from '@/components/ui/Card';
import type { MiniEvent } from './MoreFromOrganizer';

export default function SimilarEvents({
  items,
  title = 'Similar Events You Might Like',
}: {
  items: ReadonlyArray<MiniEvent>;
  title?: string;
}): ReactElement {
  return (
    <View className="px-2 mt-4">
      <Text className="text-base font-semibold text-black">{title}</Text>
      <View className="mt-3 gap-y-3">
        {items.map((ev) => (
          <Card
            key={ev.id}
            variant="outlined"
            padding="md"
            className="rounded-3xl border-gray200"
          >
            <View className="flex-row items-center justify-between">
              {/* Left */}
              <View className="flex-row items-center gap-x-4 flex-1 pr-3">
                <View className="h-16 w-24 rounded-xl bg-gray-200" />
                <View className="flex-1">
                  <Text numberOfLines={1} className="text-gray900 font-medium">
                    {ev.title}
                  </Text>
                  <View className="mt-1 flex-row items-center gap-x-2">
                    <Feather name="calendar" size={14} color="#6B7280" />
                    <Text className="text-sm text-gray600">{formatDateOnly(ev.startsAtIso)}</Text>
                  </View>
                </View>
              </View>

              {/* Right */}
              {ev.priceLabel ? (
                <View className="rounded-2xl bg-white border border-gray300 px-4 py-2.5 min-w-[64px] items-center">
                  <Text className="text-gray800 font-medium">{ev.priceLabel}</Text>
                </View>
              ) : <View />}
            </View>
          </Card>
        ))}
      </View>
    </View>
  );
}

function formatDateOnly(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
}
