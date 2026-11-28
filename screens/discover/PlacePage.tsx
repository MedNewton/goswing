// screens/discover/PlacePage.tsx — place (venue) page (plc-1 / plc-rev / plc2-write).
//
// GoSwing venues: header (cover, logo, category · €-level · area, open status,
// distance, rating), actions, tabs Upcoming / Reviews / About.
// Places not on GoSwing (OSM / Google): a limited page with name, category,
// address and directions.
// Phase 4 data (rating, hours, follow, reviews, eligibility) shows only when
// the server sends it.
import React, { useCallback, useEffect, useMemo, useState, type ReactElement } from 'react';
import { ActivityIndicator, Alert, Linking, ScrollView, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { CalendarX, Clock, Globe, AtSign, Lock, MapPin, Navigation, PenLine, Phone, Store } from 'lucide-react-native';

import type { PlaceSeed } from '@/navigation/routes';
import { useAppNav } from '@/navigation/AppNav';
import { useEvents } from '@/providers/EventsProvider';
import { EmptyState, GsButton, StatusChip } from '@/components/gs';
import { gs } from '@/theme/colors';
import { compactCount, eventPriceLabel, eventStart, eventWhenLabel, formatDistance, formatMoney, hhmm, isLiveNow } from '@/lib/format';
import {
  getSimilarVenues,
  getVenue,
  getVenueEvents,
  getVenueReviews,
  postVenueReview,
  setVenueFollow,
  type Venue,
  type VenueEvent,
  type VenueReviews,
} from '@/lib/api/venues';
import { getReviewEligibility, type ReviewVisit } from '@/lib/api/discover';

import { BlockTitle, Card, DetailCover, InfoRow, KindChip, RatingSummary, ReviewItem, RingAvatar, StatsLine, UnderlineTabs } from './components/DetailParts';
import { EventDateRow } from './components/EventCards';
import { PlaceRankCard } from './components/PlaceCards';
import WriteReviewSheet from './components/WriteReviewSheet';
import { hoursForDay, openDirections, openStatus, placeSeedFromVenue, plainText, priceLevelLabel, shareText, todayIndex, venueTypeLabel } from './lib/places';
import { venueDistanceKm } from './lib/filtering';

type Tab = 'upcoming' | 'reviews' | 'about';

function seedVenue(p: PlaceSeed): Venue {
  return {
    id: p.venueId ?? p.id,
    name: p.name,
    venueType: p.category ?? null,
    addressLine1: p.address ?? null,
    city: null,
    lat: p.lat ?? null,
    lng: p.lng ?? null,
    description: null,
    coverImageUrl: null,
    capacity: null,
    freeAccess: false,
    freeForLadies: false,
    organizerId: null,
  };
}

export default function PlacePage({ place, onBack }: Readonly<{ place: PlaceSeed; onBack: () => void }>): ReactElement {
  if (place.source !== 'goswing') return <UnregisteredPlace place={place} onBack={onBack} />;
  return <GoSwingPlace place={place} onBack={onBack} />;
}

// ---------------------------------------------------------------------------
// GoSwing venue
// ---------------------------------------------------------------------------

function GoSwingPlace({ place, onBack }: Readonly<{ place: PlaceSeed; onBack: () => void }>): ReactElement {
  const { t, i18n } = useTranslation();
  const nav = useAppNav();
  const { events, location } = useEvents();
  const venueId = place.venueId ?? null;

  const [venue, setVenue] = useState<Venue>(() => seedVenue(place));
  const [loading, setLoading] = useState(!!venueId);
  const [tab, setTab] = useState<Tab>('upcoming');
  const [apiEvents, setApiEvents] = useState<ReadonlyArray<VenueEvent> | null>(null);
  const [similar, setSimilar] = useState<ReadonlyArray<Venue>>([]);
  const [reviews, setReviews] = useState<VenueReviews | null>(null);
  const [visits, setVisits] = useState<ReadonlyArray<ReviewVisit> | null>(null);
  const [writeOpen, setWriteOpen] = useState(false);
  const [followBusy, setFollowBusy] = useState(false);

  useEffect(() => {
    if (!venueId) return;
    let cancelled = false;
    const o = location.origin;
    void Promise.allSettled([
      getVenue(venueId),
      getVenueEvents(venueId),
      getSimilarVenues(venueId, o ? { lat: o.latitude, lng: o.longitude } : null),
      getVenueReviews(venueId),
      getReviewEligibility('venue', venueId),
    ]).then(([v, ev, sim, rev, el]) => {
      if (cancelled) return;
      if (v.status === 'fulfilled' && v.value.id) setVenue((cur) => ({ ...cur, ...v.value, name: v.value.name || cur.name }));
      setApiEvents(ev.status === 'fulfilled' ? ev.value : null);
      setSimilar(sim.status === 'fulfilled' ? sim.value : []);
      setReviews(rev.status === 'fulfilled' ? rev.value : null);
      setVisits(el.status === 'fulfilled' ? el.value : null);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [venueId]);

  // Upcoming events: venue route, else the loaded events list.
  const upcoming = useMemo(() => {
    const now = Date.now();
    const local = events.filter(
      (e) => (venueId && e.venueId === venueId) || e.venue.trim().toLowerCase() === venue.name.trim().toLowerCase(),
    );
    const rows = (apiEvents ?? []).map((e) => {
      const full = events.find((x) => String(x.id) === e.id);
      return full ?? null;
    });
    const merged = new Map<string, (typeof events)[number]>();
    for (const e of [...rows.filter((x): x is (typeof events)[number] => !!x), ...local]) merged.set(String(e.id), e);
    const list = [...merged.values()].filter((e) => {
      const end = e.endsAtIso ? new Date(e.endsAtIso).getTime() : (eventStart(e)?.getTime() ?? 0) + 4 * 3600_000;
      return end > now;
    });
    // Events the list does not know yet (venue route only).
    const extra = (apiEvents ?? []).filter((e) => !merged.has(e.id) && e.startsAtIso && new Date(e.startsAtIso).getTime() > now - 6 * 3600_000);
    return { list: list.sort((a, b) => (eventStart(a)?.getTime() ?? 0) - (eventStart(b)?.getTime() ?? 0)), extra };
  }, [apiEvents, events, venue.name, venueId]);

  const status = openStatus(venue, t);
  const dist = formatDistance(venueDistanceKm(venue, location.origin));
  const meta = [venueTypeLabel(venue.venueType, t), priceLevelLabel(venue.priceLevel), venue.area ?? venue.city].filter(Boolean).join(' · ');
  const canFollow = typeof venue.isFollowing === 'boolean';
  const followers = venue.followerCount;

  const toggleFollow = useCallback(
    async (notify?: boolean) => {
      if (followBusy || !venueId) return;
      const next = notify !== undefined ? true : !venue.isFollowing;
      setFollowBusy(true);
      try {
        const r = await setVenueFollow(venueId, next, notify);
        setVenue((v) => ({ ...v, isFollowing: r.isFollowing, followerCount: r.followerCount ?? v.followerCount, notifyNewEvents: r.notifyNewEvents ?? (notify ?? v.notifyNewEvents) }));
      } catch (e: unknown) {
        Alert.alert(t('gs.errorTitle'), e instanceof Error ? e.message : String(e));
      } finally {
        setFollowBusy(false);
      }
    },
    [followBusy, venueId, venue.isFollowing, t],
  );

  const share = (): void =>
    void shareText(venue.name, [meta, [venue.addressLine1, venue.city].filter(Boolean).join(', ')]);
  const directions = (): void => openDirections({ lat: venue.lat, lng: venue.lng, label: venue.name, address: venue.addressLine1 });

  const tabs: Array<{ key: Tab; label: string }> = [{ key: 'upcoming', label: t('discover.place.tabUpcoming') }];
  if (reviews) tabs.push({ key: 'reviews', label: t('discover.place.tabReviews') });
  tabs.push({ key: 'about', label: t('discover.place.tabAbout') });

  return (
    <View className="flex-1 bg-surface">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 48 }}>
        <DetailCover
          uri={venue.coverImageUrl}
          toneKey={venue.id || venue.name}
          onBack={onBack}
          onShare={share}
          bell={
            canFollow && venue.isFollowing
              ? {
                  on: venue.notifyNewEvents !== false,
                  onPress: () => void toggleFollow(!(venue.notifyNewEvents !== false)),
                  label: venue.notifyNewEvents !== false ? t('discover.place.alertsOff') : t('discover.place.alertsOn'),
                }
              : null
          }
        />
        <View className="px-5">
          <View className="-mt-12 flex-row items-end">
            <RingAvatar name={venue.name} uri={venue.logoUrl} />
            <View className="mb-2 ml-3">
              <KindChip icon={<Store size={13} color={gs.violetDark} />} label={t('discover.place.kind')} />
            </View>
          </View>
          <Text className="mt-3 text-[28px] font-extrabold leading-[33px] text-ink" accessibilityRole="header">
            {venue.name}
          </Text>
          {meta ? <Text className="mt-1 text-[15px] text-subtle">{meta}</Text> : null}
          {status || dist ? (
            <Text className="mt-1 text-[15px] text-subtle">
              {status ? (
                <Text className="font-extrabold" style={{ color: status.tone === 'green' ? gs.green : status.tone === 'orange' ? gs.orange : gs.muted }}>
                  {status.label}
                </Text>
              ) : null}
              {status && dist ? ' · ' : ''}
              {dist ?? ''}
            </Text>
          ) : null}
          <StatsLine
            items={[
              followers != null ? { value: compactCount(followers), label: t('discover.place.followers') } : null,
              venue.eventsThisMonth != null ? { value: String(venue.eventsThisMonth), label: t('discover.place.eventsThisMonth') } : null,
              venue.rating ? { value: venue.rating.average.toFixed(1), label: t('discover.place.rating'), star: true } : null,
            ]}
          />

          <View className="mt-4 flex-row items-center gap-x-2.5">
            {canFollow ? (
              <View className="flex-1">
                <GsButton
                  label={venue.isFollowing ? t('discover.following') : t('discover.follow')}
                  variant={venue.isFollowing ? 'secondary' : 'primary'}
                  fullWidth
                  loading={followBusy}
                  onPress={() => void toggleFollow()}
                />
              </View>
            ) : null}
            <View className="flex-1">
              <GsButton
                label={t('discover.directions')}
                variant={canFollow ? 'secondary' : 'primary'}
                icon={<Navigation size={16} color={canFollow ? gs.ink : gs.white} />}
                fullWidth
                onPress={directions}
              />
            </View>
          </View>
        </View>

        <UnderlineTabs tabs={tabs} active={tab} onChange={setTab} />

        <View className="px-5 pt-4">
          {loading ? (
            <View className="items-center py-10">
              <ActivityIndicator color={gs.violet} />
            </View>
          ) : tab === 'upcoming' ? (
            upcoming.list.length + upcoming.extra.length === 0 ? (
              <EmptyState icon={<CalendarX size={26} color={gs.violet} />} title={t('discover.place.noUpcoming')} message={t('discover.place.noUpcomingMessage')} />
            ) : (
              <View className="gap-y-3">
                {upcoming.list.map((e) => {
                  const price = eventPriceLabel(e, t);
                  const s = eventStart(e);
                  const today = s && s.toDateString() === new Date().toDateString();
                  return (
                    <EventDateRow
                      key={String(e.id)}
                      id={String(e.id)}
                      title={e.title}
                      startsAtIso={e.startsAtIso}
                      highlight={isLiveNow(e) || today ? eventWhenLabel(e, t, i18n.language) : s ? `${s.toLocaleDateString(i18n.language, { weekday: 'short', day: 'numeric', month: 'short' })} · ${hhmm(s)}` : null}
                      subtitle={price ? (typeof e.basePrice === 'number' && e.basePrice > 0 ? t('gs.from', { price }) : price) : null}
                      onPress={() => nav.push({ name: 'eventDetails', event: e })}
                    />
                  );
                })}
                {upcoming.extra.map((e) => (
                  <EventDateRow
                    key={e.id}
                    id={e.id}
                    title={e.title}
                    startsAtIso={e.startsAtIso}
                    subtitle={e.basePrice != null ? (e.basePrice > 0 ? t('gs.from', { price: formatMoney(e.basePrice) }) : t('gs.free')) : e.priceLabel}
                    onPress={() => nav.openEvent(e.id)}
                  />
                ))}
              </View>
            )
          ) : tab === 'reviews' && reviews ? (
            <ReviewsTab name={venue.name} reviews={reviews} visits={visits} onWrite={() => setWriteOpen(true)} />
          ) : (
            <AboutVenue venue={venue} similar={similar} onOpenPlace={(v) => nav.push({ name: 'place', place: placeSeedFromVenue(v) })} />
          )}
        </View>
      </ScrollView>

      {visits ? (
        <WriteReviewSheet
          visible={writeOpen}
          name={venue.name}
          visits={visits}
          onClose={() => setWriteOpen(false)}
          onSubmit={async (p) => {
            if (!venueId) return;
            try {
              await postVenueReview(venueId, p);
              setWriteOpen(false);
              setVisits((vs) => (vs ?? []).map((v) => (v.reservationId === p.reservationId ? { ...v, reviewed: true } : v)));
              const fresh = await getVenueReviews(venueId).catch(() => null);
              if (fresh) setReviews(fresh);
              Alert.alert(t('eventDetails.thanksTitle'), t('eventDetails.thanksMessage'));
            } catch (e: unknown) {
              Alert.alert(t('eventDetails.couldNotSubmitReview'), e instanceof Error ? e.message : String(e));
            }
          }}
        />
      ) : null}
    </View>
  );
}

function ReviewsTab({
  name,
  reviews,
  visits,
  onWrite,
}: Readonly<{ name: string; reviews: VenueReviews; visits: ReadonlyArray<ReviewVisit> | null; onWrite: () => void }>): ReactElement {
  const { t, i18n } = useTranslation();
  const canWrite = !!visits && visits.some((v) => !v.reviewed);
  const lockedMsg = visits == null ? null : visits.length === 0 ? t('discover.reviews.onlyGuests') : !canWrite ? t('discover.reviews.allDone') : null;
  return (
    <View>
      {reviews.summary && reviews.summary.count > 0 ? (
        <RatingSummary average={reviews.summary.average} count={reviews.summary.count} breakdown={reviews.summary.breakdown} />
      ) : null}
      {canWrite ? (
        <View className="mt-4">
          <GsButton label={t('discover.reviews.write')} icon={<PenLine size={17} color={gs.white} />} size="lg" fullWidth onPress={onWrite} />
        </View>
      ) : lockedMsg ? (
        <View className="mt-4 flex-row items-center rounded-[18px] p-3.5" style={{ backgroundColor: gs.surface2 }}>
          <Lock size={16} color={gs.muted} />
          <Text className="ml-2 flex-1 text-[13px] font-semibold text-subtle">{lockedMsg}</Text>
        </View>
      ) : null}
      {reviews.items.length === 0 ? (
        <EmptyState title={t('discover.reviews.noneTitle')} message={t('discover.reviews.noneMessage', { name })} />
      ) : (
        <View className="mt-4 gap-y-3">
          {reviews.items.map((r) => {
            const d = r.createdAt ? new Date(r.createdAt) : null;
            return (
              <ReviewItem
                key={r.id}
                author={r.authorName}
                avatarUrl={r.authorAvatarUrl}
                rating={r.rating}
                comment={r.comment}
                meta={d && !Number.isNaN(d.getTime()) ? `${d.toLocaleDateString(i18n.language, { day: 'numeric', month: 'short', year: 'numeric' })} · GoSwing` : 'GoSwing'}
                reply={r.adminReply}
              />
            );
          })}
        </View>
      )}
    </View>
  );
}

const DAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;

function AboutVenue({
  venue,
  similar,
  onOpenPlace,
}: Readonly<{ venue: Venue; similar: ReadonlyArray<Venue>; onOpenPlace: (v: Venue) => void }>): ReactElement {
  const { t } = useTranslation();
  const { location } = useEvents();
  const today = todayIndex();
  const hours = venue.openingHours ?? [];
  const desc = plainText(venue.description);
  const address = [venue.addressLine1, [venue.postalCode, venue.city].filter(Boolean).join(' ')].filter(Boolean).join(', ');
  const site = venue.websiteUrl ? (/^https?:\/\//i.test(venue.websiteUrl) ? venue.websiteUrl : `https://${venue.websiteUrl}`) : null;

  return (
    <View>
      {desc ? <Text className="text-[16px] leading-[23px] text-subtle">{desc}</Text> : null}

      {hours.length > 0 ? (
        <>
          <BlockTitle title={t('discover.place.hours')} />
          <Card className="py-2">
            {DAY_KEYS.map((k, day) => {
              const list = hoursForDay(hours, day);
              const on = day === today;
              return (
                <View
                  key={k}
                  className="-mx-2 flex-row items-center justify-between rounded-[12px] px-2 py-2"
                  style={on ? { backgroundColor: gs.violetSoft } : undefined}
                >
                  <Text className={`text-[15px] ${on ? 'font-extrabold' : 'font-semibold'}`} style={{ color: on ? gs.violetDark : gs.ink }}>
                    {t(`discover.day.${k}`)}
                    {on ? ` · ${t('discover.place.today')}` : ''}
                  </Text>
                  <Text className={`text-[15px] ${on ? 'font-extrabold' : ''}`} style={{ color: list.length ? (on ? gs.violetDark : gs.subtle) : gs.muted }}>
                    {list.length ? list.map((h) => `${h.opens} – ${h.closes}`).join(', ') : t('discover.place.closed')}
                  </Text>
                </View>
              );
            })}
            {venue.openingHoursNote ? <Text className="pb-1 pt-2 text-[13px] text-muted">{venue.openingHoursNote}</Text> : null}
          </Card>
        </>
      ) : null}

      <BlockTitle title={t('discover.place.info')} />
      <Card>
        <InfoRow
          icon={<MapPin size={18} color={gs.violet} />}
          label={address || venue.name}
          value={t('discover.directions')}
          onPress={() => openDirections({ lat: venue.lat, lng: venue.lng, label: venue.name, address })}
          last={!venue.phone && !site && !venue.instagramHandle}
        />
        {venue.phone ? (
          <InfoRow
            icon={<Phone size={18} color={gs.violet} />}
            label={venue.phone}
            value={t('discover.place.call')}
            onPress={() => Linking.openURL(`tel:${venue.phone?.replace(/\s/g, '')}`).catch(() => {})}
            last={!site && !venue.instagramHandle}
          />
        ) : null}
        {site ? (
          <InfoRow
            icon={<Globe size={18} color={gs.violet} />}
            label={site.replace(/^https?:\/\//, '').replace(/\/$/, '')}
            value={t('discover.place.website')}
            onPress={() => Linking.openURL(site).catch(() => {})}
            last={!venue.instagramHandle}
          />
        ) : null}
        {venue.instagramHandle ? (
          <InfoRow
            icon={<AtSign size={18} color={gs.violet} />}
            label={`@${venue.instagramHandle.replace(/^@/, '')}`}
            value="Instagram"
            onPress={() => Linking.openURL(`https://instagram.com/${venue.instagramHandle?.replace(/^@/, '')}`).catch(() => {})}
            last
          />
        ) : null}
      </Card>

      {venue.amenities && venue.amenities.length > 0 ? (
        <>
          <BlockTitle title={t('discover.place.amenities')} />
          <View className="flex-row flex-wrap gap-2">
            {venue.amenities.map((a) => (
              <StatusChip key={a} label={t(`discover.amenity.${a}`, { defaultValue: a.replace(/_/g, ' ') })} tone="violet" />
            ))}
          </View>
        </>
      ) : null}

      {venue.musicStyles && venue.musicStyles.length > 0 ? (
        <>
          <BlockTitle title={t('discover.place.music')} />
          <View className="flex-row flex-wrap gap-2">
            {venue.musicStyles.map((m) => (
              <StatusChip key={m} label={m} tone="gray" />
            ))}
          </View>
        </>
      ) : null}

      {similar.length > 0 ? (
        <>
          <BlockTitle title={t('discover.place.similar')} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="-mx-5" contentContainerStyle={{ paddingHorizontal: 20, gap: 14, paddingBottom: 6 }}>
            {similar.map((v, i) => (
              <PlaceRankCard key={v.id} v={v} rank={i + 1} distanceKm={venueDistanceKm(v, location.origin)} onPress={() => onOpenPlace(v)} hideRank />
            ))}
          </ScrollView>
        </>
      ) : null}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Not on GoSwing (OSM / Google)
// ---------------------------------------------------------------------------

function UnregisteredPlace({ place, onBack }: Readonly<{ place: PlaceSeed; onBack: () => void }>): ReactElement {
  const { t } = useTranslation();
  const { location } = useEvents();
  const dist =
    location.origin && place.lat != null && place.lng != null
      ? formatDistance(venueDistanceKm({ ...seedVenue(place) }, location.origin))
      : null;
  const category = venueTypeLabel(place.category, t);
  const directions = (): void => openDirections({ lat: place.lat, lng: place.lng, label: place.name, address: place.address });
  return (
    <View className="flex-1 bg-surface">
      <ScrollView contentContainerStyle={{ paddingBottom: 48 }}>
        <DetailCover toneKey={place.id} onBack={onBack} onShare={() => void shareText(place.name, [category, place.address])} height={150} />
        <View className="px-5">
          <View className="-mt-12">
            <RingAvatar name={place.name} />
          </View>
          <Text className="mt-3 text-[28px] font-extrabold leading-[33px] text-ink" accessibilityRole="header">
            {place.name}
          </Text>
          <View className="mt-2">
            <KindChip icon={<Store size={13} color={gs.subtle} />} label={t('discover.place.notOnGoSwing')} tone="gray" />
          </View>
          {category ? <Text className="mt-2 text-[15px] text-subtle">{category}</Text> : null}

          <View className="mt-5 flex-row gap-x-2.5">
            <View className="flex-1">
              <GsButton label={t('discover.directions')} icon={<Navigation size={16} color={gs.white} />} fullWidth onPress={directions} />
            </View>
          </View>

          <BlockTitle title={t('discover.place.info')} />
          <Card>
            <InfoRow
              icon={<MapPin size={18} color={gs.violet} />}
              label={place.address || place.name}
              value={dist ?? t('discover.directions')}
              onPress={directions}
              last={!place.openingHours}
            />
            {place.openingHours ? <InfoRow icon={<Clock size={18} color={gs.violet} />} label={place.openingHours} value={t('discover.place.hours')} last /> : null}
          </Card>
          <Text className="mt-4 text-[13px] leading-[19px] text-muted">{t('discover.place.notOnGoSwingNote')}</Text>
        </View>
      </ScrollView>
    </View>
  );
}
