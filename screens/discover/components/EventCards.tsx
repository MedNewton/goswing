// screens/discover/components/EventCards.tsx — event cards of the Discover tab
// and the place / organizer / artist pages.
import React, { type ReactElement } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { ChevronRight } from 'lucide-react-native';
import type { Event } from '@/types/domain';
import { Cover, StatusChip, softShadow } from '@/components/gs';
import { gs } from '@/theme/colors';
import { compactCount, eventPriceLabel, eventWhenLabel, formatDistance, isLiveNow } from '@/lib/format';
import { eventTypeLabel } from '../lib/filtering';
import Shade from './Shade';

function priceFrom(ev: Event, t: ReturnType<typeof useTranslation>['t']): string | null {
  const p = eventPriceLabel(ev, t);
  if (!p) return null;
  return typeof ev.basePrice === 'number' && ev.basePrice > 0 ? t('gs.from', { price: p }) : p;
}

export function LiveBadge(): ReactElement {
  const { t } = useTranslation();
  return (
    <View className="flex-row items-center rounded-full bg-white px-2.5 py-1">
      <View className="h-1.5 w-1.5 rounded-full mr-1.5" style={{ backgroundColor: gs.pink }} />
      <Text className="text-[12px] font-extrabold" style={{ color: gs.pinkDark }}>
        {t('gs.live')}
      </Text>
    </View>
  );
}

/** Large cover card: "Happening now & today", "Top events this week". */
export function EventHeroCard({
  ev,
  distanceKm,
  onPress,
  width = 282,
  height = 350,
}: Readonly<{ ev: Event; distanceKm: number | null; onPress: () => void; width?: number; height?: number }>): ReactElement {
  const { t, i18n } = useTranslation();
  const type = eventTypeLabel(ev);
  const live = isLiveNow(ev);
  const dist = formatDistance(distanceKm);
  const price = priceFrom(ev, t);
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={t('discover.a11y.openEvent', { title: ev.title })}
      style={[{ width, height, borderRadius: 28 }, softShadow]}
    >
      <Cover uri={ev.imageUrl} toneKey={String(ev.id)} radius={28} style={{ width, height }}>
        <Shade id={`h${String(ev.id)}`} from={0.35} />
        <View className="absolute left-4 top-4 right-4 flex-row items-center gap-x-2">
          {type ? <StatusChip label={type} tone="dark" /> : null}
          {live ? <LiveBadge /> : null}
        </View>
        <View className="absolute left-[18px] right-[18px] bottom-[18px]">
          <Text className="text-[14px] font-bold" style={{ color: '#E4DCFF' }} numberOfLines={1}>
            {eventWhenLabel(ev, t, i18n.language)}
          </Text>
          <Text className="mt-1 text-[26px] leading-[30px] font-extrabold text-white" numberOfLines={2}>
            {ev.title}
          </Text>
          <View className="mt-2 flex-row items-center justify-between">
            <Text className="flex-1 pr-3 text-[14px]" style={{ color: 'rgba(255,255,255,0.82)' }} numberOfLines={1}>
              {[ev.venue, dist].filter(Boolean).join(' · ')}
            </Text>
            {price ? <Text className="text-[17px] font-extrabold text-white">{price}</Text> : null}
          </View>
        </View>
      </Cover>
    </Pressable>
  );
}

/** List row: thumbnail + when / title / venue · distance · going / price. */
export function EventRowCard({
  ev,
  distanceKm,
  onPress,
}: Readonly<{ ev: Event; distanceKm: number | null; onPress: () => void }>): ReactElement {
  const { t, i18n } = useTranslation();
  const dist = formatDistance(distanceKm);
  const price = eventPriceLabel(ev, t);
  const going = ev.attendeeCount ? t('gs.going', { count: compactCount(ev.attendeeCount) as unknown as number }) : null;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={t('discover.a11y.openEvent', { title: ev.title })}
      className="flex-row items-center rounded-[22px] bg-white p-3"
      style={softShadow}
    >
      <Cover uri={ev.imageUrl} toneKey={String(ev.id)} radius={16} style={{ width: 96, height: 96 }} />
      <View className="flex-1 pl-3.5">
        <Text className="text-[13px] font-bold" style={{ color: gs.violet }} numberOfLines={1}>
          {eventWhenLabel(ev, t, i18n.language)}
        </Text>
        <Text className="mt-0.5 text-[17px] font-extrabold text-ink" numberOfLines={1}>
          {ev.title}
        </Text>
        <Text className="mt-0.5 text-[13px] text-muted" numberOfLines={1}>
          {[ev.venue, dist, going].filter(Boolean).join(' · ')}
        </Text>
        {price ? <Text className="mt-1 text-[18px] font-extrabold text-ink">{price}</Text> : null}
      </View>
    </Pressable>
  );
}

/** Date badge row used on place / organizer / artist pages. */
export function EventDateRow({
  id,
  title,
  startsAtIso,
  subtitle,
  highlight,
  onPress,
}: Readonly<{
  id: string;
  title: string;
  startsAtIso: string | null;
  /** "Studio Neuf · from 13 €". */
  subtitle?: string | null;
  /** Violet line above the title ("Live tonight · 23:00"). */
  highlight?: string | null;
  onPress?: () => void;
}>): ReactElement {
  const { t, i18n } = useTranslation();
  const d = startsAtIso ? new Date(startsAtIso) : null;
  const ok = d && !Number.isNaN(d.getTime());
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole="button"
      accessibilityLabel={t('discover.a11y.openEvent', { title })}
      className="flex-row items-center rounded-[22px] bg-white px-4 py-3.5"
      style={softShadow}
      key={id}
    >
      <View className="h-[56px] w-[56px] items-center justify-center rounded-[16px]" style={{ backgroundColor: gs.pinkSoft }}>
        <Text className="text-[20px] font-extrabold leading-[22px]" style={{ color: gs.pinkDark }}>
          {ok ? d.getDate() : '–'}
        </Text>
        <Text className="text-[11px] font-extrabold uppercase" style={{ color: gs.pinkDark }}>
          {ok ? d.toLocaleDateString(i18n.language, { month: 'short' }).replace('.', '') : ''}
        </Text>
      </View>
      <View className="flex-1 px-3.5">
        {highlight ? (
          <Text className="text-[13px] font-bold" style={{ color: gs.pink }} numberOfLines={1}>
            {highlight}
          </Text>
        ) : null}
        <Text className="text-[16px] font-extrabold text-ink" numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text className="mt-0.5 text-[13px] text-muted" numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {onPress ? <ChevronRight size={20} color={gs.muted} /> : null}
    </Pressable>
  );
}
