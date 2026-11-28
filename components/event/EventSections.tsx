// components/event/EventSections.tsx — sections of the redesigned event page
// (ev-a / ev-b / ev-c): ticket offers, line-up, location, rules, refund
// policy, related event rows.
import React, { type ReactElement, type ReactNode } from 'react';
import { Image, Pressable, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { BadgeCheck, Check, Info, MapPin, Music2, Navigation, UserCheck, UserPlus } from 'lucide-react-native';
import { Cover, GsButton, softShadow } from '@/components/gs';
import { gs } from '@/theme/colors';
import { formatCents, hhmm } from '@/lib/format';
import { effectivePriceCents, type TicketOffer } from '@/lib/api/discover';
import type { LineupItem } from '@/lib/api/artists';
import { Avatar } from '@/screens/discover/components/ArtistCards';

export function SectionTitle({ title, right }: Readonly<{ title: string; right?: ReactNode }>): ReactElement {
  return (
    <View className="mb-3 mt-8 flex-row items-end justify-between">
      <Text className="text-[22px] font-extrabold text-ink" accessibilityRole="header">
        {title}
      </Text>
      {right}
    </View>
  );
}

export function WhiteCard({ children, className, style }: Readonly<{ children: ReactNode; className?: string; style?: object }>): ReactElement {
  return (
    <View className={`rounded-[24px] bg-white px-4 ${className ?? ''}`} style={[softShadow, style]}>
      {children}
    </View>
  );
}

/** Icon tile + title + subtitle row (date, time, venue). */
export function FactRow({
  icon,
  title,
  subtitle,
  onPress,
  last,
}: Readonly<{ icon: ReactNode; title: string; subtitle?: string | null; onPress?: () => void; last?: boolean }>): ReactElement {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      className="min-h-[64px] flex-row items-center py-3"
      style={last ? undefined : { borderBottomWidth: 1, borderBottomColor: gs.line }}
    >
      <View className="h-11 w-11 items-center justify-center rounded-[14px]" style={{ backgroundColor: gs.violetSoft }}>
        {icon}
      </View>
      <View className="ml-3.5 flex-1">
        <Text className="text-[17px] font-extrabold text-ink">{title}</Text>
        {subtitle ? <Text className="mt-0.5 text-[14px] text-muted">{subtitle}</Text> : null}
      </View>
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// Ticket offers
// ---------------------------------------------------------------------------

export function TicketOffers({
  offers,
  selectedId,
  onSelect,
}: Readonly<{ offers: ReadonlyArray<TicketOffer>; selectedId: string | null; onSelect: (id: string) => void }>): ReactElement {
  const { t } = useTranslation();
  return (
    <View className="gap-y-3">
      {offers.map((o) => {
        const on = o.id === selectedId;
        const price = effectivePriceCents(o);
        const soldOut = o.seatsAvailable === 0 || !o.isOnSale;
        const pct = o.salePriceCents != null && o.priceCents > 0 ? Math.round(((o.priceCents - o.salePriceCents) / o.priceCents) * 100) : null;
        const note = [o.description, ...o.benefits].filter(Boolean).join(' · ');
        return (
          <Pressable
            key={o.id}
            onPress={() => onSelect(o.id)}
            disabled={soldOut}
            accessibilityRole="radio"
            accessibilityState={{ checked: on, disabled: soldOut }}
            accessibilityLabel={`${o.name}, ${price === 0 ? t('gs.free') : formatCents(price, o.currency)}`}
            className="flex-row items-center rounded-[24px] bg-white p-4"
            style={[softShadow, { borderWidth: 2, borderColor: on ? gs.violet : 'transparent', opacity: soldOut ? 0.55 : 1 }]}
          >
            <View className="h-6 w-6 items-center justify-center rounded-full" style={{ borderWidth: 2, borderColor: on ? gs.violet : gs.lineStrong }}>
              {on ? <View className="h-3 w-3 rounded-full" style={{ backgroundColor: gs.violet }} /> : null}
            </View>
            <View className="ml-3.5 flex-1 pr-2">
              <Text className="text-[17px] font-extrabold text-ink">{o.name}</Text>
              {soldOut ? (
                <Text className="mt-0.5 text-[13px] font-bold" style={{ color: gs.pinkDark }}>
                  {t('discover.event.soldOut')}
                </Text>
              ) : o.seatsAvailable != null && o.seatsAvailable <= 20 ? (
                <Text className="mt-0.5 text-[13px] font-bold" style={{ color: gs.pink }}>
                  {t('discover.event.onlyLeft', { count: o.seatsAvailable })}
                </Text>
              ) : null}
              {note ? <Text className="mt-0.5 text-[14px] leading-[19px] text-muted">{note}</Text> : null}
              {o.freeForLadies ? <Text className="mt-0.5 text-[13px] font-bold" style={{ color: gs.violet }}>{t('discover.access.free_ladies')}</Text> : null}
            </View>
            <View className="items-end">
              <Text className="text-[22px] font-extrabold text-ink">{price === 0 ? t('gs.free') : formatCents(price, o.currency)}</Text>
              {pct != null ? (
                <View className="mt-1 flex-row items-center">
                  <Text className="text-[13px] text-muted line-through">{formatCents(o.priceCents, o.currency)}</Text>
                  <View className="ml-1.5 rounded-full px-1.5 py-0.5" style={{ backgroundColor: gs.pink }}>
                    <Text className="text-[11px] font-extrabold text-white">−{pct}%</Text>
                  </View>
                </View>
              ) : null}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Line-up (Phase 4)
// ---------------------------------------------------------------------------

export function Lineup({
  items,
  onOpenArtist,
  onToggleFollow,
  following,
}: Readonly<{
  items: ReadonlyArray<LineupItem>;
  onOpenArtist: (l: LineupItem) => void;
  onToggleFollow: (l: LineupItem) => void;
  following: Readonly<Record<string, boolean>>;
}>): ReactElement {
  const { t } = useTranslation();
  const genres = [...new Set(items.flatMap((l) => l.artist.genres))].slice(0, 4);
  return (
    <View>
      {genres.length > 0 ? (
        <View className="mb-3 flex-row flex-wrap gap-2">
          {genres.map((g) => (
            <View key={g} className="flex-row items-center rounded-full bg-white px-3 py-2" style={softShadow}>
              <Music2 size={13} color={gs.violet} />
              <Text className="ml-1.5 text-[14px] font-bold text-ink">{g}</Text>
            </View>
          ))}
        </View>
      ) : null}
      <WhiteCard>
        {items.map((l, i) => {
          const a = l.artist;
          const f = following[a.id] ?? a.isFollowing;
          const s = l.setStartsAt ? new Date(l.setStartsAt) : null;
          const e = l.setEndsAt ? new Date(l.setEndsAt) : null;
          const slot = s && e ? `${hhmm(s)} – ${hhmm(e)}` : null;
          const role = [a.kind ? t(`discover.artistKind.${a.kind}`, { defaultValue: a.kind }) : null, l.role ?? a.genres[0], slot].filter(Boolean).join(' · ');
          return (
            <View key={a.id} className="flex-row items-center py-3" style={i < items.length - 1 ? { borderBottomWidth: 1, borderBottomColor: gs.line } : undefined}>
              <Pressable onPress={() => onOpenArtist(l)} accessibilityRole="button" accessibilityLabel={t('discover.a11y.openArtist', { name: a.name })} className="flex-1 flex-row items-center">
                <Avatar name={a.name} uri={a.avatarUrl} size={56} ring={l.isHeadliner ? gs.pink : gs.lineStrong} />
                <View className="ml-3 flex-1">
                  <View className="flex-row items-center">
                    <Text className="text-[17px] font-extrabold text-ink" numberOfLines={1}>
                      {a.name}
                    </Text>
                    {a.isVerified ? <BadgeCheck size={16} color={gs.white} fill={gs.violet} style={{ marginLeft: 4 }} /> : null}
                  </View>
                  {role ? (
                    <Text className="text-[13px] text-muted" numberOfLines={1}>
                      {role}
                    </Text>
                  ) : null}
                  {l.isHeadliner ? (
                    <View className="mt-1 self-start rounded-full px-2 py-0.5" style={{ backgroundColor: gs.pinkSoft }}>
                      <Text className="text-[11px] font-extrabold" style={{ color: gs.pinkDark }}>
                        {t('discover.lineup.headliner')}
                      </Text>
                    </View>
                  ) : null}
                </View>
              </Pressable>
              <Pressable
                onPress={() => onToggleFollow(l)}
                accessibilityRole="button"
                accessibilityLabel={f ? t('discover.unfollowName', { name: a.name }) : t('discover.followName', { name: a.name })}
                className="h-11 w-11 items-center justify-center rounded-full"
                style={{ backgroundColor: f ? gs.violetSoft : gs.violet }}
              >
                {f ? <UserCheck size={19} color={gs.violet} /> : <UserPlus size={19} color={gs.white} />}
              </Pressable>
            </View>
          );
        })}
      </WhiteCard>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Location
// ---------------------------------------------------------------------------

/** Stylised map tile (no live map inside a scroll view) + directions. */
export function LocationCard({ name, address, onDirections }: Readonly<{ name: string; address?: string | null; onDirections: () => void }>): ReactElement {
  const { t } = useTranslation();
  return (
    <View className="h-[200px] overflow-hidden rounded-[24px]" style={[{ backgroundColor: gs.mapLand }, softShadow]}>
      <View className="absolute left-[-20px] right-[-20px] top-[70px] h-[26px]" style={{ backgroundColor: gs.mapWater, transform: [{ rotate: '-8deg' }] }} />
      <View className="absolute left-[30px] top-[110px] h-[46px] w-[70px] rounded-[10px]" style={{ backgroundColor: gs.mapPark }} />
      <View className="absolute left-0 right-0 top-[40px] h-[10px]" style={{ backgroundColor: gs.mapRoad, transform: [{ rotate: '4deg' }] }} />
      <View className="absolute bottom-0 top-0 left-[120px] w-[12px]" style={{ backgroundColor: gs.mapRoad, transform: [{ rotate: '-10deg' }] }} />
      <View className="absolute bottom-0 top-0 right-[90px] w-[10px]" style={{ backgroundColor: gs.mapRoad, transform: [{ rotate: '14deg' }] }} />
      <View className="absolute left-0 right-0 top-[50px] items-center">
        <View className="h-12 w-12 items-center justify-center rounded-full border-[3px] border-white" style={[{ backgroundColor: gs.violet }, softShadow]}>
          <MapPin size={20} color={gs.white} />
        </View>
      </View>
      <View className="absolute bottom-3 left-3 right-3 flex-row items-center rounded-[18px] bg-white p-3" style={softShadow}>
        <View className="flex-1 pr-2">
          <Text className="text-[15px] font-extrabold text-ink" numberOfLines={1}>
            {name}
          </Text>
          {address ? (
            <Text className="text-[12px] text-muted" numberOfLines={1}>
              {address}
            </Text>
          ) : null}
        </View>
        <GsButton label={t('discover.directions')} size="sm" icon={<Navigation size={14} color={gs.white} />} onPress={onDirections} className="h-11" />
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Rules & refund policy
// ---------------------------------------------------------------------------

export function RulesCard({ rules }: Readonly<{ rules: ReadonlyArray<string> }>): ReactElement {
  return (
    <WhiteCard>
      {rules.map((r, i) => (
        <View key={`${i}-${r}`} className="flex-row items-start py-3.5" style={i < rules.length - 1 ? { borderBottomWidth: 1, borderBottomColor: gs.line } : undefined}>
          <View className="mt-0.5 h-6 w-6 items-center justify-center rounded-full" style={{ backgroundColor: gs.violetSoft }}>
            <Check size={13} color={gs.violet} strokeWidth={3} />
          </View>
          <Text className="ml-3 flex-1 text-[15px] leading-[21px] text-ink">{r}</Text>
        </View>
      ))}
    </WhiteCard>
  );
}

export function PolicyCard({ clauses }: Readonly<{ clauses: ReadonlyArray<{ title: string | null; body: string }> }>): ReactElement {
  return (
    <WhiteCard>
      {clauses.map((c, i) => (
        <View key={i} className="flex-row items-start py-3.5" style={i < clauses.length - 1 ? { borderBottomWidth: 1, borderBottomColor: gs.line } : undefined}>
          <View className="mt-0.5 h-6 w-6 items-center justify-center rounded-full" style={{ backgroundColor: gs.orangeSoft }}>
            <Info size={13} color={gs.orange} />
          </View>
          <View className="ml-3 flex-1">
            {c.title ? <Text className="text-[15px] font-extrabold text-ink">{c.title}</Text> : null}
            <Text className="mt-0.5 text-[14px] leading-[20px] text-muted">{c.body}</Text>
          </View>
        </View>
      ))}
    </WhiteCard>
  );
}

// ---------------------------------------------------------------------------
// Related events
// ---------------------------------------------------------------------------

export type MiniEvent = Readonly<{ id: string; title: string; imageUrl: string | null; startsAtIso: string | null; priceLabel: string | null; venue?: string | null }>;

export function MiniEventRow({ ev, onPress }: Readonly<{ ev: MiniEvent; onPress?: () => void }>): ReactElement {
  const { t, i18n } = useTranslation();
  const d = ev.startsAtIso ? new Date(ev.startsAtIso) : null;
  const ok = d && !Number.isNaN(d.getTime());
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole="button"
      accessibilityLabel={t('discover.a11y.openEvent', { title: ev.title })}
      className="flex-row items-center rounded-[22px] bg-white p-3"
      style={softShadow}
    >
      <View className="h-[62px] w-[56px] items-center justify-center rounded-[16px]" style={{ backgroundColor: gs.violetSoft }}>
        <Text className="text-[11px] font-extrabold uppercase" style={{ color: gs.violet }}>
          {ok ? d.toLocaleDateString(i18n.language, { weekday: 'short' }).replace('.', '') : ''}
        </Text>
        <Text className="text-[22px] font-extrabold leading-[24px] text-ink">{ok ? d.getDate() : '–'}</Text>
        <Text className="text-[11px] font-semibold text-muted">{ok ? d.toLocaleDateString(i18n.language, { month: 'short' }).replace('.', '') : ''}</Text>
      </View>
      <View className="flex-1 px-3">
        <Text className="text-[16px] font-extrabold text-ink" numberOfLines={1}>
          {ev.title}
        </Text>
        <Text className="mt-0.5 text-[13px] text-muted" numberOfLines={1}>
          {[ok ? hhmm(d) : null, ev.venue].filter(Boolean).join(' · ')}
        </Text>
      </View>
      {ev.priceLabel ? <Text className="text-[15px] font-extrabold text-ink">{ev.priceLabel}</Text> : null}
    </Pressable>
  );
}

export function MiniEventCard({ ev, onPress }: Readonly<{ ev: MiniEvent; onPress?: () => void }>): ReactElement {
  const { t, i18n } = useTranslation();
  const d = ev.startsAtIso ? new Date(ev.startsAtIso) : null;
  const ok = d && !Number.isNaN(d.getTime());
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={t('discover.a11y.openEvent', { title: ev.title })}
      className="w-[200px] overflow-hidden rounded-[22px] bg-white"
      style={softShadow}
    >
      <Cover uri={ev.imageUrl} toneKey={ev.id} style={{ height: 110 }} />
      <View className="p-3">
        <Text className="text-[12px] font-bold" style={{ color: gs.violet }} numberOfLines={1}>
          {ok ? `${d.toLocaleDateString(i18n.language, { weekday: 'short', day: 'numeric', month: 'short' })} · ${hhmm(d)}` : ' '}
        </Text>
        <Text className="mt-0.5 text-[15px] font-extrabold text-ink" numberOfLines={1}>
          {ev.title}
        </Text>
        {ev.priceLabel ? <Text className="mt-0.5 text-[13px] font-bold text-subtle">{ev.priceLabel}</Text> : null}
      </View>
    </Pressable>
  );
}

/** Small round avatars stack for the "512 people going" line. */
export function AvatarStack({ people }: Readonly<{ people: ReadonlyArray<{ id: string; initials: string; avatarUrl?: string | null }> }>): ReactElement | null {
  const tones = ['#D9CCFF', '#FFD0DF', '#C9EBD6', '#FFE1B3'];
  if (people.length === 0) return null;
  return (
    <View className="mr-2.5 flex-row">
      {people.slice(0, 4).map((p, i) => (
        <View
          key={p.id}
          className="h-8 w-8 items-center justify-center overflow-hidden rounded-full border-2 border-white"
          style={{ marginLeft: i === 0 ? 0 : -10, backgroundColor: tones[i % tones.length] }}
        >
          {p.avatarUrl ? <Image source={{ uri: p.avatarUrl }} style={{ width: 32, height: 32 }} /> : <Text className="text-[10px] font-extrabold text-ink">{p.initials}</Text>}
        </View>
      ))}
    </View>
  );
}
