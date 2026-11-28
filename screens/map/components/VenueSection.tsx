// screens/map/components/VenueSection.tsx — place block of the map pop-ups
// (whole content of a place pop-up, last section of an event pop-up).
//
// Ratings, open-now from the venue, follow and photos need Phase 4 routes
// 129/132–134 (and our Google Places proxy); they render only when present.
import React, { useEffect, useState, type ReactElement } from 'react';
import { Image, Pressable, ScrollView, Text, View, type ImageStyle } from 'react-native';
import { useTranslation } from 'react-i18next';
import { ChevronRight, Clock, MapPin, Share as ShareIcon } from 'lucide-react-native';

import { gs } from '@/theme/colors';
import Cover from '@/components/gs/Cover';
import { formatDistance, hhmm } from '@/lib/format';
import { NavArrow } from './MapHeader';
import { fetchVenueDetails, fetchVenueMedia, setVenueFollow, type VenueDetails, type VenueMedia } from '../api';
import { openStateOf } from '../openingHours';
import { placeKindKey } from '../model';
import { openDirections, sharePlace } from '../actions';

export type VenueInfo = Readonly<{
  name: string;
  kind: string;
  registered: boolean;
  /** "google" when the data came from our Google proxy. */
  source?: 'goswing' | 'osm' | 'google';
  venueId?: string | null;
  lat: number;
  lng: number;
  address?: string | null;
  distanceKm?: number | null;
  openingHours?: string | null;
  coverImageUrl?: string | null;
  toneKey: string;
}>;

const PRICE = ['', '€', '€€', '€€€'];

function RatingCard({ label, value, count, primary }: Readonly<{ label: string; value: number; count: number; primary?: boolean }>): ReactElement {
  const { t } = useTranslation();
  return (
    <View className="flex-1 rounded-[14px] p-3" style={{ backgroundColor: primary ? gs.violetSoft : gs.surface, gap: 2 }}>
      <Text className="text-[12px] font-bold" style={{ color: primary ? gs.violetDark : gs.subtle }}>
        {label}
      </Text>
      <Text className="text-[20px] font-extrabold text-ink">
        <Text style={{ color: '#C98A00', fontSize: 16 }}>★</Text> {value.toFixed(1)}
      </Text>
      <Text className="text-[12px]" style={{ color: gs.subtle }}>
        {count} {t('map.pop.reviews')}
      </Text>
    </View>
  );
}

export default function VenueSection({
  venue,
  heading,
  onSeePlace,
}: Readonly<{ venue: VenueInfo; heading: string; onSeePlace: () => void }>): ReactElement {
  const { t } = useTranslation();
  const [details, setDetails] = useState<VenueDetails | null>(null);
  const [media, setMedia] = useState<ReadonlyArray<VenueMedia>>([]);
  const [following, setFollowing] = useState<boolean | null>(null);

  useEffect(() => {
    let alive = true;
    setDetails(null);
    setMedia([]);
    setFollowing(null);
    if (!venue.registered || !venue.venueId) return;
    void fetchVenueDetails(venue.venueId).then((d) => {
      if (!alive || !d) return;
      setDetails(d);
      if (typeof d.isFollowing === 'boolean') setFollowing(d.isFollowing);
    });
    void fetchVenueMedia(venue.venueId).then((m) => alive && setMedia(m));
    return () => {
      alive = false;
    };
  }, [venue.registered, venue.venueId]);

  const kindKey = placeKindKey(venue.kind);
  const kindLabel = kindKey ? t(kindKey) : venue.kind.charAt(0).toUpperCase() + venue.kind.slice(1);
  const price = details?.priceLevel ? PRICE[details.priceLevel] : null;
  const dist = formatDistance(venue.distanceKm);

  // Open state: venue route (Phase 4) first, else the OSM opening_hours text.
  let openLine: ReactElement | null = null;
  if (details && typeof details.openNow === 'boolean') {
    const closes = details.closesAt ? new Date(details.closesAt) : null;
    const soon = closes ? closes.getTime() - Date.now() < 3600_000 : false;
    openLine = (
      <Text className="text-[14px] text-muted">
        <Text className="font-bold" style={{ color: details.openNow ? (soon ? gs.orange : gs.green) : gs.orange }}>
          {details.openNow ? (soon ? t('map.pop.closingSoon') : t('map.pop.openNow')) : t('map.pop.closed')}
        </Text>
        {details.openNow && closes ? ` · ${t('map.pop.closes', { time: hhmm(closes) })}` : ''}
      </Text>
    );
  } else if (venue.openingHours) {
    const st = openStateOf(venue.openingHours);
    if (st.state !== 'unknown') {
      const color = st.state === 'open' ? (st.closingSoon ? gs.orange : gs.green) : gs.orange;
      openLine = (
        <Text className="text-[14px] text-muted">
          <Text className="font-bold" style={{ color }}>
            {st.state === 'open' ? (st.closingSoon ? t('map.pop.closingSoon') : t('map.pop.openNow')) : t('map.pop.closed')}
          </Text>
          {st.state === 'open' && st.closes ? ` · ${t('map.pop.closes', { time: st.closes })}` : ''}
        </Text>
      );
    }
  }
  const rawHours = venue.openingHours && openStateOf(venue.openingHours).state === 'unknown' ? venue.openingHours : null;

  const ratings: ReactElement[] = [];
  if (venue.registered && details?.rating && details.rating.count > 0) {
    ratings.push(
      <RatingCard key="gs" label={t('map.pop.goswingReviews')} value={details.rating.average} count={details.rating.count} primary />,
    );
  }
  if (details?.googleRating && details.googleRating.count > 0) {
    ratings.push(<RatingCard key="g" label={t('map.pop.googleReviews')} value={details.googleRating.average} count={details.googleRating.count} />);
  }

  const cover = details?.coverImageUrl ?? venue.coverImageUrl ?? null;

  const toggleFollow = (): void => {
    if (following == null || !venue.venueId) return;
    const next = !following;
    setFollowing(next);
    setVenueFollow(venue.venueId, next).catch(() => setFollowing(!next));
  };

  return (
    <View className="px-5 pt-1 pb-6" style={{ gap: 18 }}>
      <Text className="text-[12px] font-extrabold uppercase text-muted" style={{ letterSpacing: 0.7 }}>
        {heading}
      </Text>
      <View className="flex-row items-start" style={{ gap: 14 }}>
        <View
          className="rounded-full"
          style={
            venue.registered
              ? { width: 72, height: 72, padding: 3, borderWidth: 3, borderColor: gs.violet, backgroundColor: gs.white }
              : { width: 72, height: 72 }
          }
        >
          <Cover uri={cover} toneKey={venue.toneKey} radius={40} style={{ flex: 1 }} />
        </View>
        <View className="flex-1" style={{ gap: 4 }}>
          <Pressable
            onPress={onSeePlace}
            accessibilityRole="link"
            accessibilityLabel={`${t('map.pop.seePlace')}: ${venue.name}`}
            className="flex-row items-center"
            hitSlop={6}
          >
            <Text className="text-[24px] leading-[28px] font-extrabold text-ink flex-shrink" style={{ letterSpacing: -0.4 }}>
              {venue.name}
            </Text>
            <ChevronRight size={18} color={gs.muted} style={{ marginLeft: 4 }} />
          </Pressable>
          {!venue.registered ? (
            <View className="self-start rounded-full px-2.5 py-1" style={{ backgroundColor: gs.surface2 }}>
              <Text className="text-[12px] font-bold" style={{ color: gs.subtle }}>
                {venue.source === 'google' ? t('map.pop.notOnGoSwingGoogle') : t('map.pop.notOnGoSwing')}
              </Text>
            </View>
          ) : null}
          <Text className="text-[14px] text-muted">{[kindLabel, price].filter(Boolean).join(' · ')}</Text>
          {openLine}
        </View>
        {following != null ? (
          <Pressable
            onPress={toggleFollow}
            accessibilityRole="button"
            accessibilityState={{ selected: following }}
            className="h-11 px-4 rounded-full items-center justify-center"
            style={{ backgroundColor: following ? gs.white : gs.violet, borderWidth: 1.5, borderColor: following ? gs.lineStrong : gs.violet }}
          >
            <Text className="text-[14px] font-extrabold" style={{ color: following ? gs.ink : gs.white }}>
              {following ? t('map.pop.following') : t('map.pop.follow')}
            </Text>
          </Pressable>
        ) : null}
      </View>

      {venue.address || dist ? (
        <View className="flex-row items-start" style={{ gap: 10 }}>
          <MapPin size={18} color={gs.violet} style={{ marginTop: 1 }} />
          <Text className="flex-1 text-[14px]" style={{ color: '#2B2838' }}>
            {venue.address ?? ''}
            {venue.address && dist ? ' · ' : ''}
            {dist ? <Text className="font-bold">{dist}</Text> : null}
          </Text>
        </View>
      ) : null}

      {rawHours ? (
        <View className="flex-row items-start" style={{ gap: 10 }}>
          <Clock size={18} color={gs.violet} style={{ marginTop: 1 }} />
          <Text className="flex-1 text-[14px]" style={{ color: '#2B2838' }}>
            {rawHours}
          </Text>
        </View>
      ) : null}

      {ratings.length ? <View className="flex-row" style={{ gap: 8 }}>{ratings}</View> : null}

      <View className="flex-row" style={{ gap: 8 }}>
        <Pressable
          onPress={() => void openDirections(venue, t)}
          accessibilityRole="button"
          className="flex-1 h-12 rounded-full flex-row items-center justify-center"
          style={{ backgroundColor: gs.violet, gap: 6 }}
        >
          <NavArrow color={gs.white} />
          <Text className="text-[14px] font-bold text-white">{t('map.pop.directions')}</Text>
        </Pressable>
        <Pressable
          onPress={() => void sharePlace(venue)}
          accessibilityRole="button"
          className="flex-1 h-12 rounded-full flex-row items-center justify-center bg-white"
          style={{ borderWidth: 1.5, borderColor: gs.lineStrong, gap: 6 }}
        >
          <ShareIcon size={16} color={gs.ink} />
          <Text className="text-[14px] font-bold text-ink">{t('map.pop.share')}</Text>
        </Pressable>
      </View>

      {media.length ? (
        <View style={{ gap: 10 }}>
          <Text className="text-[17px] font-extrabold text-ink">{t('map.pop.photos')}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -20 }} contentContainerStyle={{ paddingHorizontal: 20, gap: 10 }}>
            {media.map((m, i) => (
              <Image
                key={m.id ?? `${i}`}
                source={{ uri: m.thumbnailUrl ?? m.url }}
                style={{ width: 132, height: 176, borderRadius: 16, backgroundColor: gs.surface2 } as ImageStyle}
              />
            ))}
          </ScrollView>
        </View>
      ) : null}

      <Pressable
        onPress={onSeePlace}
        accessibilityRole="button"
        className="h-12 rounded-full items-center justify-center bg-white"
        style={{ borderWidth: 1.5, borderColor: gs.lineStrong }}
      >
        <Text className="text-[15px] font-bold text-ink">{t('map.pop.seePlace')}</Text>
      </Pressable>
    </View>
  );
}
