// screens/discover/components/DetailParts.tsx — building blocks shared by the
// place, organizer and artist pages (plc-1, org-1, art-1).
import React, { type ReactElement, type ReactNode } from 'react';
import { Image, Pressable, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Bell, BellRing, ChevronLeft, Share2, Star } from 'lucide-react-native';
import { Cover, RoundButton, toneFor } from '@/components/gs';
import { gs } from '@/theme/colors';
import { initials } from '../lib/places';

/** Cover band with back / share / alerts buttons. */
export function DetailCover({
  uri,
  toneKey,
  height = 170,
  onBack,
  onShare,
  bell,
}: Readonly<{
  uri?: string | null;
  toneKey: string;
  height?: number;
  onBack: () => void;
  onShare?: () => void;
  /** Alerts bell, shown only when the user follows (and the API supports it). */
  bell?: Readonly<{ on: boolean; onPress: () => void; label: string }> | null;
}>): ReactElement {
  const { t } = useTranslation();
  return (
    <Cover uri={uri} toneKey={toneKey} style={{ height }}>
      <View className="absolute left-4 right-4 top-3 flex-row items-center justify-between">
        <RoundButton icon={<ChevronLeft size={24} color={gs.ink} />} onPress={onBack} accessibilityLabel={t('gs.back')} size={46} />
        <View className="flex-row items-center gap-x-2.5">
          {onShare ? <RoundButton icon={<Share2 size={19} color={gs.ink} />} onPress={onShare} accessibilityLabel={t('gs.share')} size={46} /> : null}
          {bell ? (
            <RoundButton
              icon={bell.on ? <BellRing size={19} color={gs.white} /> : <Bell size={19} color={gs.ink} />}
              onPress={bell.onPress}
              accessibilityLabel={bell.label}
              variant={bell.on ? 'primary' : 'white'}
              size={46}
            />
          ) : null}
        </View>
      </View>
    </Cover>
  );
}

/** Logo / avatar with the pink ring, overlapping the cover. */
export function RingAvatar({
  name,
  uri,
  shape = 'square',
  size = 96,
}: Readonly<{ name: string; uri?: string | null; shape?: 'square' | 'circle'; size?: number }>): ReactElement {
  const [a] = toneFor(name);
  const radius = shape === 'circle' ? size / 2 : 26;
  return (
    <View style={{ width: size, height: size, borderRadius: radius, borderWidth: 3, borderColor: gs.pink, backgroundColor: gs.white, padding: 3 }}>
      <View style={{ flex: 1, borderRadius: radius - 5, backgroundColor: a, overflow: 'hidden' }} className="items-center justify-center">
        {uri ? (
          <Image source={{ uri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
        ) : (
          <Text className="font-extrabold text-white" style={{ fontSize: Math.round(size * 0.27) }}>
            {initials(name)}
          </Text>
        )}
      </View>
    </View>
  );
}

export function KindChip({ icon, label, tone = 'violet' }: Readonly<{ icon: ReactNode; label: string; tone?: 'violet' | 'pink' | 'gray' }>): ReactElement {
  const bg = tone === 'pink' ? gs.pinkSoft : tone === 'gray' ? gs.surface2 : gs.violetSoft;
  const fg = tone === 'pink' ? gs.pinkDark : tone === 'gray' ? gs.subtle : gs.violetDark;
  return (
    <View className="flex-row items-center self-start rounded-full px-2.5 py-1" style={{ backgroundColor: bg }}>
      {icon}
      <Text className="ml-1 text-[12px] font-extrabold" style={{ color: fg }}>
        {label}
      </Text>
    </View>
  );
}

/** "3.1k followers · 14 events this month · 4.8 ★ rating" with bold numbers. */
export function StatsLine({ items }: Readonly<{ items: ReadonlyArray<{ value: string; label: string; star?: boolean } | null> }>): ReactElement | null {
  const list = items.filter((x): x is { value: string; label: string; star?: boolean } => !!x);
  if (list.length === 0) return null;
  return (
    <Text className="mt-2 text-[14px] text-subtle">
      {list.map((it, i) => (
        <Text key={`${it.label}-${i}`}>
          {i > 0 ? ' · ' : ''}
          <Text className="font-extrabold text-ink">{it.value}</Text>
          {it.star ? ' ★ ' : ' '}
          {it.label}
        </Text>
      ))}
    </Text>
  );
}

export function UnderlineTabs<K extends string>({
  tabs,
  active,
  onChange,
}: Readonly<{ tabs: ReadonlyArray<{ key: K; label: string }>; active: K; onChange: (k: K) => void }>): ReactElement {
  return (
    <View className="mt-5 flex-row border-b border-line px-2" accessibilityRole="tablist">
      {tabs.map((tab) => {
        const on = tab.key === active;
        return (
          <Pressable
            key={tab.key}
            onPress={() => onChange(tab.key)}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            className="min-h-[48px] flex-1 items-center justify-center"
          >
            <Text className="text-[15px] font-extrabold" style={{ color: on ? gs.ink : gs.muted }}>
              {tab.label}
            </Text>
            <View className="absolute bottom-[-1px] h-[3px] w-[78%] rounded-full" style={{ backgroundColor: on ? gs.ink : 'transparent' }} />
          </Pressable>
        );
      })}
    </View>
  );
}

export function Stars({ value, size = 14 }: Readonly<{ value: number; size?: number }>): ReactElement {
  return (
    <View className="flex-row items-center">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} size={size} color="#E8A317" fill={value >= i - 0.25 ? '#E8A317' : 'transparent'} style={{ marginRight: 2 }} />
      ))}
    </View>
  );
}

/** GoSwing rating summary with the 5→1 breakdown bars. */
export function RatingSummary({
  average,
  count,
  breakdown,
}: Readonly<{ average: number; count: number; breakdown?: Readonly<Record<string, number>> | null }>): ReactElement {
  const { t } = useTranslation();
  const total = Math.max(1, Object.values(breakdown ?? {}).reduce((a, b) => a + (Number(b) || 0), 0));
  return (
    <View className="flex-row items-center rounded-[22px] bg-white p-4" style={{ borderWidth: 1, borderColor: gs.line }}>
      <View className="mr-4 items-center">
        <View className="rounded-full px-2 py-0.5" style={{ backgroundColor: gs.violetSoft }}>
          <Text className="text-[11px] font-extrabold" style={{ color: gs.violetDark }}>
            GoSwing
          </Text>
        </View>
        <Text className="mt-1 text-[40px] font-extrabold leading-[44px] text-ink">{average.toFixed(1)}</Text>
        <Stars value={average} size={13} />
        <Text className="mt-1 text-[12px] text-muted">{t('discover.reviewsCount', { count, n: count })}</Text>
      </View>
      {breakdown ? (
        <View className="flex-1">
          {[5, 4, 3, 2, 1].map((n) => {
            const v = Number(breakdown[String(n)] ?? 0);
            return (
              <View key={n} className="flex-row items-center py-[3px]">
                <Text className="w-4 text-[12px] text-muted">{n}</Text>
                <View className="h-2 flex-1 overflow-hidden rounded-full" style={{ backgroundColor: gs.surface2 }}>
                  <View className="h-2 rounded-full" style={{ width: `${Math.round((v / total) * 100)}%`, backgroundColor: '#E8A317' }} />
                </View>
              </View>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

export function ReviewItem({
  author,
  avatarUrl,
  rating,
  comment,
  meta,
  reply,
}: Readonly<{ author: string; avatarUrl?: string | null; rating: number; comment: string | null; meta?: string | null; reply?: string | null }>): ReactElement {
  const { t } = useTranslation();
  return (
    <View className="rounded-[22px] bg-white p-4" style={{ borderWidth: 1, borderColor: gs.line }}>
      <View className="flex-row items-center">
        <View className="h-9 w-9 items-center justify-center overflow-hidden rounded-full" style={{ backgroundColor: gs.violetSoft }}>
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={{ width: 36, height: 36 }} />
          ) : (
            <Text className="text-[12px] font-extrabold" style={{ color: gs.violetDark }}>
              {initials(author)}
            </Text>
          )}
        </View>
        <View className="ml-3 flex-1">
          <Text className="text-[15px] font-extrabold text-ink">{author}</Text>
          {meta ? <Text className="text-[12px] text-muted">{meta}</Text> : null}
        </View>
        <View className="flex-row items-center">
          <Star size={14} color="#E8A317" fill="#E8A317" />
          <Text className="ml-1 text-[14px] font-extrabold text-ink">{rating.toFixed(1)}</Text>
        </View>
      </View>
      {comment ? <Text className="mt-2.5 text-[15px] leading-[21px] text-subtle">{comment}</Text> : null}
      {reply ? (
        <View className="mt-3 rounded-[16px] p-3" style={{ backgroundColor: gs.surface }}>
          <Text className="text-[12px] font-extrabold text-ink">{t('discover.reviews.reply')}</Text>
          <Text className="mt-1 text-[14px] text-subtle">{reply}</Text>
        </View>
      ) : null}
    </View>
  );
}

/** Icon + label + value row inside an About card. */
export function InfoRow({
  icon,
  label,
  value,
  onPress,
  last,
}: Readonly<{ icon: ReactNode; label: string; value?: string | null; onPress?: () => void; last?: boolean }>): ReactElement {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'link' : undefined}
      className="min-h-[56px] flex-row items-center py-3"
      style={last ? undefined : { borderBottomWidth: 1, borderBottomColor: gs.line }}
    >
      <View className="h-10 w-10 items-center justify-center rounded-[14px]" style={{ backgroundColor: gs.violetSoft }}>
        {icon}
      </View>
      <View className="ml-3 flex-1">
        <Text className="text-[15px] font-bold text-ink" numberOfLines={2}>
          {label}
        </Text>
        {value ? (
          <Text className="text-[13px] text-muted" numberOfLines={2} style={onPress ? { color: gs.violet } : undefined}>
            {value}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

export function Card({ children, className }: Readonly<{ children: ReactNode; className?: string }>): ReactElement {
  return (
    <View className={`rounded-[22px] bg-white px-4 ${className ?? ''}`} style={{ borderWidth: 1, borderColor: gs.line }}>
      {children}
    </View>
  );
}

export function BlockTitle({ title, right }: Readonly<{ title: string; right?: ReactNode }>): ReactElement {
  return (
    <View className="mb-3 mt-7 flex-row items-center justify-between">
      <Text className="text-[22px] font-extrabold text-ink" accessibilityRole="header">
        {title}
      </Text>
      {right}
    </View>
  );
}
