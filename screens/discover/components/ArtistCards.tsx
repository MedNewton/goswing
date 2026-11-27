// screens/discover/components/ArtistCards.tsx — artist avatar and cards.
import React, { useState, type ReactElement } from 'react';
import { Alert, Image, Pressable, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { BadgeCheck, UserCheck, UserPlus } from 'lucide-react-native';
import { setArtistFollow, type DiscoverArtist, type ArtistCard } from '@/lib/api/artists';
import { Cover, softShadow, toneFor } from '@/components/gs';
import { gs } from '@/theme/colors';
import { compactCount, shortDate } from '@/lib/format';
import { initials } from '../lib/places';
import { RankBadge } from './PlaceCards';

export function Avatar({
  name,
  uri,
  size = 56,
  ring,
}: Readonly<{
  name: string;
  uri?: string | null;
  size?: number;
  ring?: string;
}>): ReactElement {
  const [a] = toneFor(name);
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: a,
        borderWidth: ring ? 3 : 0,
        borderColor: ring,
        overflow: 'hidden',
      }}
      className="items-center justify-center"
    >
      {uri ? (
        <Image source={{ uri }} style={{ width: size, height: size }} resizeMode="cover" />
      ) : (
        <Text className="font-extrabold text-white" style={{ fontSize: Math.round(size * 0.32) }}>
          {initials(name)}
        </Text>
      )}
    </View>
  );
}

/** "Tonight", "Tomorrow", "Thu 19 Nov". */
export function dayLabel(iso: string | null | undefined, t: TFunction, locale: string): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  const same = (x: Date, y: Date) => x.toDateString() === y.toDateString();
  if (same(d, now)) return t('discover.tonight');
  const tm = new Date(now);
  tm.setDate(now.getDate() + 1);
  if (same(d, tm)) return t('discover.tomorrow');
  return shortDate(d, locale);
}

export function artistRole(a: ArtistCard, t: TFunction): string | null {
  return a.kind ? t(`discover.artistKind.${a.kind}`, { defaultValue: a.kind }) : null;
}

/** "Best artists this month" card. */
export function ArtistRankCard({ item, onPress }: Readonly<{ item: DiscoverArtist; onPress: () => void }>): ReactElement {
  const { t } = useTranslation();
  const a = item.artist;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={t('discover.a11y.openArtist', { name: a.name })}
      className="w-[200px] overflow-hidden rounded-[22px] bg-white"
      style={softShadow}
    >
      <Cover toneKey={`a${a.id}`} style={{ height: 100 }}>
        <View className="absolute right-2.5 top-2.5">
          <RankBadge rank={item.rank} />
        </View>
      </Cover>
      <View className="-mt-9 px-3">
        <Avatar name={a.name} uri={a.avatarUrl} size={64} ring={gs.white} />
      </View>
      <View className="px-3 pb-3 pt-1.5">
        <View className="flex-row items-center">
          <Text className="text-[16px] font-extrabold text-ink" numberOfLines={1}>
            {a.name}
          </Text>
          {a.isVerified ? <BadgeCheck size={17} color={gs.white} fill={gs.violet} style={{ marginLeft: 4 }} /> : null}
        </View>
        <Text className="mt-0.5 text-[12px] text-muted" numberOfLines={1}>
          {a.genres.slice(0, 2).join(' · ') || artistRole(a, t) || ' '}
        </Text>
        <Text className="mt-1 text-[12px] font-extrabold" style={{ color: gs.violet }}>
          {t('discover.gigsThisMonth', { count: item.gigsInPeriod })}
        </Text>
      </View>
    </Pressable>
  );
}

export function FollowRoundButton({
  following,
  onPress,
  label,
}: Readonly<{
  following: boolean;
  onPress: () => void;
  label: string;
}>): ReactElement {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: following }}
      hitSlop={4}
      className="h-11 w-11 items-center justify-center rounded-full"
      style={{ backgroundColor: following ? gs.violetSoft : gs.violet }}
    >
      {following ? <UserCheck size={19} color={gs.violet} /> : <UserPlus size={19} color={gs.white} />}
    </Pressable>
  );
}

/** "All artists this month" row with a follow button. */
export function ArtistRowCard({ item, onPress }: Readonly<{ item: DiscoverArtist; onPress: () => void }>): ReactElement {
  const { t, i18n } = useTranslation();
  const a = item.artist;
  const [following, setFollowing] = useState(a.isFollowing);
  const next = item.nextGig;
  const nextLabel = next ? [dayLabel(next.setStartsAt ?? next.startsAt, t, i18n.language), next.venueName].filter(Boolean).join(' · ') : null;

  const toggle = async (): Promise<void> => {
    const was = following;
    setFollowing(!was);
    try {
      await setArtistFollow(a.id, !was);
    } catch (e: unknown) {
      setFollowing(was);
      Alert.alert(t('gs.errorTitle'), e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <View className="flex-row items-center rounded-[22px] bg-white p-3" style={softShadow}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={t('discover.a11y.openArtist', { name: a.name })}
        className="flex-1 flex-row items-center"
      >
        <Avatar name={a.name} uri={a.avatarUrl} size={58} />
        <View className="flex-1 px-3">
          <View className="flex-row items-center">
            <Text className="text-[16px] font-extrabold text-ink" numberOfLines={1}>
              {a.name}
            </Text>
            {a.isVerified ? <BadgeCheck size={16} color={gs.white} fill={gs.violet} style={{ marginLeft: 4 }} /> : null}
          </View>
          <Text className="mt-0.5 text-[13px] text-muted" numberOfLines={1}>
            {[
              a.genres.slice(0, 2).join(', '),
              a.followerCount != null
                ? t('discover.followersCount', {
                    n: compactCount(a.followerCount),
                  })
                : null,
            ]
              .filter(Boolean)
              .join(' · ')}
          </Text>
          {nextLabel ? (
            <Text className="mt-0.5 text-[13px] font-bold" style={{ color: gs.violet }} numberOfLines={1}>
              {t('discover.nextGig', { label: nextLabel })}
            </Text>
          ) : null}
        </View>
      </Pressable>
      <FollowRoundButton
        following={following}
        onPress={() => void toggle()}
        label={following ? t('discover.unfollowName', { name: a.name }) : t('discover.followName', { name: a.name })}
      />
    </View>
  );
}
