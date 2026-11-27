// screens/discover/components/PlaceCards.tsx — venue cards (ranked + list rows).
import React, { type ReactElement } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Star } from 'lucide-react-native';
import type { Venue } from '@/lib/api/venues';
import { Cover, softShadow } from '@/components/gs';
import { gs } from '@/theme/colors';
import { compactCount, formatDistance } from '@/lib/format';
import { openStatus, priceLevelLabel, venueTypeLabel } from '../lib/places';

const toneColor = (tone: 'green' | 'orange' | 'muted'): string => (tone === 'green' ? gs.green : tone === 'orange' ? gs.orange : gs.muted);

export function RatingPill({ value }: Readonly<{ value: number }>): ReactElement {
  return (
    <View className="flex-row items-center rounded-full bg-white px-2 py-1">
      <Star size={12} color="#E8A317" fill="#E8A317" />
      <Text className="ml-1 text-[12px] font-extrabold text-ink">{value.toFixed(1)}</Text>
    </View>
  );
}

export function RankBadge({ rank }: Readonly<{ rank: number }>): ReactElement {
  return (
    <View className="rounded-full px-2 py-1" style={{ backgroundColor: gs.violet }}>
      <Text className="text-[12px] font-extrabold text-white">#{rank}</Text>
    </View>
  );
}

function metaLine(v: Venue, distanceKm: number | null, t: ReturnType<typeof useTranslation>['t']): string {
  return [venueTypeLabel(v.venueType, t), priceLevelLabel(v.priceLevel), formatDistance(distanceKm)].filter(Boolean).join(' · ');
}

/** "Best places this week" card. */
export function PlaceRankCard({
  v,
  rank,
  distanceKm,
  onPress,
  hideRank = false,
}: Readonly<{ v: Venue; rank: number; distanceKm: number | null; onPress: () => void; hideRank?: boolean }>): ReactElement {
  const { t } = useTranslation();
  const status = openStatus(v, t);
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={t('discover.a11y.openPlace', { name: v.name })}
      className="w-[210px] overflow-hidden rounded-[22px] bg-white"
      style={softShadow}
    >
      <Cover uri={v.coverImageUrl} toneKey={v.id} style={{ height: 124 }}>
        <View className="absolute left-2.5 right-2.5 top-2.5 flex-row items-center justify-between">
          {v.rating ? <RatingPill value={v.rating.average} /> : <View />}
          {hideRank ? null : <RankBadge rank={rank} />}
        </View>
      </Cover>
      <View className="px-3 pb-3 pt-2.5">
        <Text className="text-[16px] font-extrabold text-ink" numberOfLines={1}>
          {v.name}
        </Text>
        <Text className="mt-0.5 text-[12px] text-muted" numberOfLines={1}>
          {metaLine(v, distanceKm, t) || v.city || ' '}
        </Text>
        {status ? (
          <Text className="mt-1 text-[12px] font-bold" style={{ color: toneColor(status.tone) }} numberOfLines={1}>
            {status.label}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

/** "All places" row. */
export function PlaceRowCard({
  v,
  distanceKm,
  onPress,
}: Readonly<{ v: Venue; distanceKm: number | null; onPress: () => void }>): ReactElement {
  const { t } = useTranslation();
  const status = openStatus(v, t);
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={t('discover.a11y.openPlace', { name: v.name })}
      className="flex-row items-center rounded-[22px] bg-white p-3"
      style={softShadow}
    >
      <Cover uri={v.coverImageUrl} toneKey={v.id} radius={16} style={{ width: 84, height: 84 }} />
      <View className="flex-1 pl-3.5">
        {status ? (
          <Text className="text-[12px] font-bold" style={{ color: toneColor(status.tone) }} numberOfLines={1}>
            {status.label}
          </Text>
        ) : null}
        <Text className="text-[17px] font-extrabold text-ink" numberOfLines={1}>
          {v.name}
        </Text>
        <Text className="mt-0.5 text-[13px] text-muted" numberOfLines={1}>
          {metaLine(v, distanceKm, t) || [v.addressLine1, v.city].filter(Boolean).join(', ')}
        </Text>
        {v.rating ? (
          <View className="mt-1 flex-row items-center">
            <Star size={13} color="#E8A317" fill="#E8A317" />
            <Text className="ml-1 text-[13px] font-extrabold text-ink">{v.rating.average.toFixed(1)}</Text>
            <Text className="text-[13px] text-muted">
              {' · '}
              {t('discover.reviewsCount', { count: v.rating.count, n: compactCount(v.rating.count) })}
            </Text>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}
