// pages/OrganizerProfilePage.tsx — organizer page (org-1).
//
// Header (cover, logo, verified, city, followers, events hosted, rating),
// Follow (organizer follow API), tabs Upcoming / Past / Reviews / About.
// Data: GET /v1/organizers/:id, /events?when=upcoming|past, /reviews, /gallery.
// "Write a review" appears only when review eligibility (Phase 4 route 154)
// lists a visit the user has not reviewed.
import React, { useCallback, useEffect, useMemo, useState, type ReactElement } from 'react';
import { ActivityIndicator, Alert, Linking, RefreshControl, ScrollView, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { BadgeCheck, Building2, CalendarX, Globe, AtSign, Lock, Mail, MapPin, PenLine, Phone, ShieldCheck } from 'lucide-react-native';

import { EmptyState, GsButton, StatusChip, Cover } from '@/components/gs';
import { gs } from '@/theme/colors';
import { compactCount, hhmm } from '@/lib/format';
import {
  followOrganizer,
  getOrganizerById,
  getOrganizerEvents,
  getOrganizerGallery,
  getOrganizerReviews,
  unfollowOrganizer,
  type OrganizerEvent,
  type OrganizerGalleryImage,
  type OrganizerReview,
  type OrganizerWithStats,
} from '@/lib/supabase/organizers';
import { getReviewEligibility, postOrganizerReview, type ReviewVisit } from '@/lib/api/discover';
import {
  BlockTitle,
  Card,
  DetailCover,
  InfoRow,
  KindChip,
  RatingSummary,
  ReviewItem,
  RingAvatar,
  StatsLine,
  UnderlineTabs,
} from '@/screens/discover/components/DetailParts';
import { EventDateRow } from '@/screens/discover/components/EventCards';
import WriteReviewSheet from '@/screens/discover/components/WriteReviewSheet';
import { plainText, shareText } from '@/screens/discover/lib/places';

type Tab = 'upcoming' | 'past' | 'reviews' | 'about';

export type OrganizerProfilePageProps = Readonly<{
  organizerId: string;
  organizerName?: string;
  onBack?: () => void;
  /** Open an event's detail page. */
  onOpenEvent?: (eventId: string) => void;
  /** Open another organizer's profile. */
  onOpenOrganizer?: (payload: { organizerId: string; organizerName?: string }) => void;
}>;

type Loadable<T> = Readonly<{ items: ReadonlyArray<T>; loaded: boolean; loading: boolean }>;
const EMPTY = { items: [], loaded: false, loading: false } as const;

const normUrl = (u: string): string => (/^https?:\/\//i.test(u) ? u : `https://${u}`);

export default function OrganizerProfilePage({ organizerId, organizerName, onBack, onOpenEvent }: OrganizerProfilePageProps): ReactElement {
  const { t, i18n } = useTranslation();

  const [tab, setTab] = useState<Tab>('upcoming');
  const [organizer, setOrganizer] = useState<OrganizerWithStats | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followerDelta, setFollowerDelta] = useState(0);
  const [followBusy, setFollowBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const [upcoming, setUpcoming] = useState<Loadable<OrganizerEvent>>(EMPTY);
  const [past, setPast] = useState<Loadable<OrganizerEvent>>(EMPTY);
  const [reviews, setReviews] = useState<Loadable<OrganizerReview>>(EMPTY);
  const [gallery, setGallery] = useState<ReadonlyArray<OrganizerGalleryImage>>([]);
  const [visits, setVisits] = useState<ReadonlyArray<ReviewVisit> | null>(null);
  const [writeOpen, setWriteOpen] = useState(false);

  const loadOrganizer = useCallback(
    async (isRefresh = false) => {
      if (!organizerId) {
        setError(t('discover.organizer.missing'));
        setLoading(false);
        return;
      }
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);
      try {
        const org = await getOrganizerById(organizerId);
        setOrganizer(org);
        setIsFollowing(Boolean(org?.isFollowing));
        setFollowerDelta(0);
        if (!org) setError(t('discover.organizer.notFound'));
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [organizerId, t],
  );

  const loadEvents = useCallback(
    async (when: 'upcoming' | 'past') => {
      const set = when === 'upcoming' ? setUpcoming : setPast;
      set((s) => ({ ...s, loading: true }));
      try {
        const items = await getOrganizerEvents(organizerId, when);
        set({ items, loaded: true, loading: false });
      } catch {
        set((s) => ({ ...s, loaded: true, loading: false }));
      }
    },
    [organizerId],
  );

  const loadReviews = useCallback(async () => {
    setReviews((s) => ({ ...s, loading: true }));
    try {
      const items = await getOrganizerReviews(organizerId);
      setReviews({ items, loaded: true, loading: false });
    } catch {
      setReviews((s) => ({ ...s, loaded: true, loading: false }));
    }
  }, [organizerId]);

  useEffect(() => {
    void loadOrganizer();
    void loadEvents('upcoming');
    getOrganizerGallery(organizerId).then(setGallery, () => setGallery([]));
    getReviewEligibility('organizer', organizerId).then(setVisits, () => setVisits(null));
  }, [organizerId, loadOrganizer, loadEvents]);

  useEffect(() => {
    if (tab === 'past' && !past.loaded && !past.loading) void loadEvents('past');
    if (tab === 'reviews' && !reviews.loaded && !reviews.loading) void loadReviews();
  }, [tab, past.loaded, past.loading, reviews.loaded, reviews.loading, loadEvents, loadReviews]);

  const onRefresh = (): void => {
    void loadOrganizer(true);
    setUpcoming(EMPTY);
    setPast(EMPTY);
    setReviews(EMPTY);
    void loadEvents('upcoming');
    if (tab === 'past') void loadEvents('past');
    if (tab === 'reviews') void loadReviews();
  };

  const toggleFollow = async (): Promise<void> => {
    if (followBusy) return;
    const was = isFollowing;
    setIsFollowing(!was);
    setFollowerDelta((d) => d + (was ? -1 : 1));
    setFollowBusy(true);
    try {
      if (was) await unfollowOrganizer(organizerId);
      else await followOrganizer(organizerId);
    } catch (e: unknown) {
      setIsFollowing(was);
      setFollowerDelta((d) => d + (was ? 1 : -1));
      Alert.alert(t('organizer.followFailed'), e instanceof Error ? e.message : String(e));
    } finally {
      setFollowBusy(false);
    }
  };

  const name = organizer?.name ?? organizerName ?? t('organizer.fallbackName');
  const stats = organizer?.stats;
  const subtitle = [t('discover.organizer.role'), organizer?.city].filter(Boolean).join(' · ');
  const intro = plainText(organizer?.tagline ?? organizer?.about ?? '');

  const reviewSummary = useMemo(() => {
    if (!reviews.items.length) return null;
    const breakdown: Record<string, number> = {};
    for (const r of reviews.items) {
      const k = String(Math.min(5, Math.max(1, Math.round(r.rating))));
      breakdown[k] = (breakdown[k] ?? 0) + 1;
    }
    const avg = stats?.avgRating && stats.avgRating > 0 ? stats.avgRating : reviews.items.reduce((a, r) => a + r.rating, 0) / reviews.items.length;
    return { average: avg, count: Math.max(stats?.reviewCount ?? 0, reviews.items.length), breakdown };
  }, [reviews.items, stats?.avgRating, stats?.reviewCount]);

  const eventRow = (e: OrganizerEvent, isPast: boolean): ReactElement => {
    const d = e.startsAt ? new Date(e.startsAt) : null;
    const ok = d && !Number.isNaN(d.getTime());
    const sameDay = ok && d.toDateString() === new Date().toDateString();
    const when = ok
      ? sameDay && !isPast
        ? t('gs.when.tonight', { time: hhmm(d) })
        : `${d.toLocaleDateString(i18n.language, { weekday: 'short', day: 'numeric', month: 'short' })} · ${hhmm(d)}`
      : null;
    return (
      <EventDateRow
        key={e.id}
        id={e.id}
        title={e.title}
        startsAtIso={e.startsAt}
        highlight={when}
        subtitle={[e.venue, e.priceLabel ? t('gs.from', { price: e.priceLabel }) : null].filter(Boolean).join(' · ')}
        onPress={onOpenEvent ? () => onOpenEvent(e.externalId ?? e.id) : undefined}
      />
    );
  };

  const canWrite = !!visits && visits.some((v) => !v.reviewed);
  const lockedMsg = visits == null ? null : visits.length === 0 ? t('discover.reviews.onlyGuests') : !canWrite ? t('discover.reviews.allDone') : null;

  if (loading && !organizer) {
    return (
      <View className="flex-1 bg-surface">
        <DetailCover toneKey={organizerId} onBack={onBack ?? (() => {})} />
        <View className="items-center py-16">
          <ActivityIndicator color={gs.violet} />
        </View>
      </View>
    );
  }

  if (error && !organizer) {
    return (
      <View className="flex-1 bg-surface">
        <DetailCover toneKey={organizerId} onBack={onBack ?? (() => {})} />
        <EmptyState title={t('gs.errorTitle')} message={error} actionLabel={t('gs.retry')} onAction={() => void loadOrganizer()} />
      </View>
    );
  }

  const tabs: ReadonlyArray<{ key: Tab; label: string }> = [
    { key: 'upcoming', label: t('discover.place.tabUpcoming') },
    { key: 'past', label: t('discover.organizer.tabPast') },
    { key: 'reviews', label: t('discover.place.tabReviews') },
    { key: 'about', label: t('discover.place.tabAbout') },
  ];

  const list = (l: Loadable<OrganizerEvent>, isPast: boolean): ReactElement =>
    l.loading && !l.loaded ? (
      <View className="items-center py-10">
        <ActivityIndicator color={gs.violet} />
      </View>
    ) : l.items.length === 0 ? (
      <EmptyState icon={<CalendarX size={26} color={gs.violet} />} title={isPast ? t('discover.organizer.noPast') : t('discover.place.noUpcoming')} />
    ) : (
      <View className="gap-y-3">{l.items.map((e) => eventRow(e, isPast))}</View>
    );

  return (
    <View className="flex-1 bg-surface">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 48 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={gs.violet} />}
      >
        <DetailCover
          uri={organizer?.coverImageUrl}
          toneKey={`o${organizerId}`}
          onBack={onBack ?? (() => {})}
          onShare={() => void shareText(name, [subtitle, intro ? intro.slice(0, 140) : null])}
        />
        <View className="px-5">
          <View className="-mt-12 flex-row items-end">
            <RingAvatar name={name} uri={organizer?.logoUrl} />
            <View className="mb-2 ml-3">
              <KindChip icon={<Building2 size={13} color={gs.violetDark} />} label={t('discover.organizer.kind')} />
            </View>
          </View>
          <View className="mt-3 flex-row items-center">
            <Text className="shrink text-[28px] font-extrabold leading-[33px] text-ink" accessibilityRole="header">
              {name}
            </Text>
            {organizer?.isVerified ? <BadgeCheck size={22} color={gs.white} fill={gs.violet} style={{ marginLeft: 6 }} /> : null}
          </View>
          <Text className="mt-1 text-[15px] text-subtle">{subtitle}</Text>
          <StatsLine
            items={[
              stats ? { value: compactCount(Math.max(0, stats.followerCount + followerDelta)), label: t('discover.place.followers') } : null,
              stats ? { value: compactCount(stats.eventCount), label: t('discover.organizer.eventsHosted') } : null,
              stats && stats.avgRating > 0 ? { value: stats.avgRating.toFixed(1), label: t('discover.place.rating'), star: true } : null,
            ]}
          />
          {intro ? (
            <Text className="mt-3 text-[15px] leading-[22px] text-subtle" numberOfLines={3}>
              {intro}
            </Text>
          ) : null}
          <View className="mt-4">
            <GsButton
              label={isFollowing ? t('organizer.following') : t('organizer.follow')}
              variant={isFollowing ? 'secondary' : 'primary'}
              fullWidth
              loading={followBusy}
              onPress={() => void toggleFollow()}
            />
          </View>
        </View>

        <UnderlineTabs tabs={tabs} active={tab} onChange={setTab} />

        <View className="px-5 pt-4">
          {tab === 'upcoming' ? list(upcoming, false) : null}
          {tab === 'past' ? list(past, true) : null}
          {tab === 'reviews' ? (
            reviews.loading && !reviews.loaded ? (
              <View className="items-center py-10">
                <ActivityIndicator color={gs.violet} />
              </View>
            ) : (
              <View>
                {reviewSummary ? <RatingSummary average={reviewSummary.average} count={reviewSummary.count} breakdown={reviewSummary.breakdown} /> : null}
                {canWrite ? (
                  <View className="mt-4">
                    <GsButton label={t('discover.reviews.write')} icon={<PenLine size={17} color={gs.white} />} size="lg" fullWidth onPress={() => setWriteOpen(true)} />
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
                          author={r.userName ?? t('discover.reviews.guest')}
                          avatarUrl={r.userAvatarUrl}
                          rating={r.rating}
                          comment={r.comment}
                          meta={[d && !Number.isNaN(d.getTime()) ? d.toLocaleDateString(i18n.language, { day: 'numeric', month: 'short', year: 'numeric' }) : null, r.eventTitle]
                            .filter(Boolean)
                            .join(' · ')}
                        />
                      );
                    })}
                  </View>
                )}
              </View>
            )
          ) : null}
          {tab === 'about' ? <About organizer={organizer} gallery={gallery} /> : null}
        </View>
      </ScrollView>

      {visits ? (
        <WriteReviewSheet
          visible={writeOpen}
          name={name}
          visits={visits}
          onClose={() => setWriteOpen(false)}
          onSubmit={async (p) => {
            try {
              await postOrganizerReview(organizerId, p);
              setWriteOpen(false);
              setVisits((vs) => (vs ?? []).map((v) => (v.reservationId === p.reservationId ? { ...v, reviewed: true } : v)));
              void loadReviews();
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

function About({ organizer, gallery }: Readonly<{ organizer: OrganizerWithStats | null; gallery: ReadonlyArray<OrganizerGalleryImage> }>): ReactElement {
  const { t } = useTranslation();
  if (!organizer) return <View />;
  const about = plainText(organizer.about);
  const rows: Array<{ key: string; icon: ReactElement; label: string; value: string; onPress?: () => void }> = [];
  if (organizer.city) rows.push({ key: 'city', icon: <MapPin size={18} color={gs.violet} />, label: organizer.city, value: t('discover.organizer.basedIn') });
  if (organizer.websiteUrl) {
    const url = normUrl(organizer.websiteUrl);
    rows.push({ key: 'web', icon: <Globe size={18} color={gs.violet} />, label: url.replace(/^https?:\/\//, '').replace(/\/$/, ''), value: t('discover.place.website'), onPress: () => void Linking.openURL(url).catch(() => {}) });
  }
  if (organizer.instagramHandle) {
    const h = organizer.instagramHandle.replace(/^@/, '');
    rows.push({ key: 'ig', icon: <AtSign size={18} color={gs.violet} />, label: `@${h}`, value: 'Instagram', onPress: () => void Linking.openURL(`https://instagram.com/${h}`).catch(() => {}) });
  }
  if (organizer.phone) rows.push({ key: 'phone', icon: <Phone size={18} color={gs.violet} />, label: organizer.phone, value: t('discover.place.call'), onPress: () => void Linking.openURL(`tel:${organizer.phone?.replace(/\s/g, '')}`).catch(() => {}) });
  if (organizer.email) rows.push({ key: 'mail', icon: <Mail size={18} color={gs.violet} />, label: organizer.email, value: t('discover.organizer.email'), onPress: () => void Linking.openURL(`mailto:${organizer.email}`).catch(() => {}) });

  const images = gallery.filter((g) => g.mediaType === 'image' && g.imageUrl);

  return (
    <View>
      {about ? <Text className="text-[16px] leading-[23px] text-subtle">{about}</Text> : null}
      {organizer.establishedYear ? <Text className="mt-2 text-[14px] font-semibold text-muted">{t('organizer.established', { year: organizer.establishedYear })}</Text> : null}

      {organizer.specialties.length > 0 ? (
        <>
          <BlockTitle title={t('discover.organizer.specialties')} />
          <View className="flex-row flex-wrap gap-2">
            {organizer.specialties.map((s) => (
              <StatusChip key={s} label={s} tone="violet" />
            ))}
          </View>
        </>
      ) : null}

      {images.length > 0 ? (
        <>
          <BlockTitle title={t('discover.event.photos')} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="-mx-5" contentContainerStyle={{ paddingHorizontal: 20, gap: 10 }}>
            {images.slice(0, 12).map((g) => (
              <Cover key={g.id} uri={g.imageUrl} toneKey={g.id} radius={18} style={{ width: 140, height: 170 }} />
            ))}
          </ScrollView>
        </>
      ) : null}

      {rows.length > 0 ? (
        <>
          <BlockTitle title={t('discover.place.info')} />
          <Card>
            {rows.map((r, i) => (
              <InfoRow key={r.key} icon={r.icon} label={r.label} value={r.value} onPress={r.onPress} last={i === rows.length - 1} />
            ))}
          </Card>
        </>
      ) : null}

      {organizer.cancellationPolicy || organizer.refundPolicy ? (
        <>
          <BlockTitle title={t('discover.event.refundTitle')} />
          <Card className="py-3">
            {[organizer.cancellationPolicy, organizer.refundPolicy].filter(Boolean).map((p, i) => (
              <View key={i} className="flex-row py-1.5">
                <ShieldCheck size={16} color={gs.violet} style={{ marginTop: 2 }} />
                <Text className="ml-2 flex-1 text-[14px] leading-[20px] text-subtle">{p}</Text>
              </View>
            ))}
          </Card>
        </>
      ) : null}
    </View>
  );
}
