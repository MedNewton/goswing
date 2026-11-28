// pages/EventDetailsPage.tsx — event page (ev-a / ev-b / ev-c).
//
// Hero cover (back / share / save), tags, title, going count, description,
// date & time, booking status + music actions, ticket offers, photos & videos,
// line-up (Phase 4), music requests, organizer, place, location, rules,
// refund policy, more from the organizer and similar events. A sticky bar
// shows the selected offer's price and "Book" (or "Booked · view ticket").
//
// Booking contract (unchanged): "Book" opens the ticket picker, then calls
// onBook({ eventId, ticketTypes, quantities, eventSnapshot }); the shell
// pushes the checkout route.
import React, { useCallback, useEffect, useMemo, useState, type ReactElement } from 'react';
import { ActivityIndicator, Alert, Dimensions, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from 'react-i18next';
import * as ImagePicker from 'expo-image-picker';
import {
  BadgeCheck,
  CalendarDays,
  Camera,
  ChevronLeft,
  Clock,
  Eye,
  Heart,
  Lock,
  MapPin,
  Music2,
  Play,
  Share2,
  Star,
  Ticket,
  TriangleAlert,
  UserCheck,
  UserPlus,
} from 'lucide-react-native';

import type { TicketQuantities, TicketType } from '@/components/blocks/TicketQuantitySheet';
import type { Event } from '@/types/domain';
import * as EventsApi from '@/lib/supabase/events';
import type { MiniEventRow } from '@/lib/supabase/events';
import { getEventAccess, type EventAccess } from '@/lib/supabase/eventAccess';
import { followOrganizer, getOrganizerSummaryForEvent, unfollowOrganizer, type OrganizerSummary } from '@/lib/supabase/organizers';
import { createEventReview, getMyReviewForEvent } from '@/lib/supabase/reviews';
import { createEventStory, getMyStoryForEvent, getStoriesWithUserInfo, type EventStoryWithUser } from '@/lib/supabase/stories';
import { effectivePriceCents, getEventGallery, getEventWithExtras, getTicketOffers, NO_EXTRAS, type EventExtras, type MediaItem, type TicketOffer } from '@/lib/api/discover';
import { getVenue, type Venue } from '@/lib/api/venues';
import { getEventLineup, setArtistFollow, type LineupItem } from '@/lib/api/artists';
import { useAppNav } from '@/navigation/AppNav';
import { useEvents } from '@/providers/EventsProvider';
import { Cover, GsButton, RoundButton, StatusChip, softShadow, floatShadow } from '@/components/gs';
import { gs } from '@/theme/colors';
import { compactCount, eventDistanceKm, eventEnd, eventStart, formatCents, formatDistance, hhmm, isPast } from '@/lib/format';

import ReviewModal from '@/components/event/ReviewModal';
import SuggestSongsModal from '@/components/event/SuggestSongsModal';
import CaptureStoryModal from '@/components/event/CaptureStoryModal';
import StoriesHeroSlider from '@/components/event/StoriesHeroSlider';
import StoryViewerModal from '@/components/event/StoryViewerModal';
import EventCalendar, { dateKeyOf } from '@/components/event/EventCalendar';
import TicketPickerSheet, { maxFor, type Quantities } from '@/components/event/TicketPickerSheet';
import {
  AvatarStack,
  FactRow,
  LocationCard,
  Lineup,
  MiniEventCard,
  MiniEventRow as MiniRow,
  PolicyCard,
  RulesCard,
  SectionTitle,
  TicketOffers,
  WhiteCard,
} from '@/components/event/EventSections';
import { RingAvatar } from '@/screens/discover/components/DetailParts';
import { eventTypeLabel } from '@/screens/discover/lib/filtering';
import { openDirections, placeSeedFromEvent, plainText, priceLevelLabel, shareText, venueTypeLabel } from '@/screens/discover/lib/places';

type EventSnapshot = {
  title: string;
  imageUrl?: string | null;
  startsAtIso?: string | null;
  venue?: string | null;
  city?: string | null;
};

/** Ticket type handed to checkout; Phase 4 fields ride along when present. */
type CheckoutTicketType = TicketType &
  Readonly<{ salePriceCents?: number | null; doorPriceCents?: number | null; seatsAvailable?: number | null }>;

export type EventDetailsPageProps = Readonly<{
  event: Event;
  initialTab?: 'about' | 'offers' | 'upcoming';
  onBack?: () => void;
  onPressEvent?: (eventId: string) => void;
  onOpenOrganizer?: (payload: { organizerId: string; organizerName?: string }) => void;
  isFavorite?: boolean;
  onToggleFavorite?: (eventId: string, next: boolean) => void;

  /** Parent routes to checkout with this payload. */
  onBook?: (payload: {
    eventId: string;
    ticketTypes: ReadonlyArray<TicketType>;
    quantities: TicketQuantities;
    eventSnapshot?: EventSnapshot;
  }) => void;

  /** Fallback routing hook when onBook is not provided. */
  route?: (r: { name: 'checkout'; eventId: string; ticketTypes: ReadonlyArray<TicketType>; quantities: TicketQuantities; eventSnapshot?: EventSnapshot }) => void;
}>;

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const HERO_HEIGHT = Math.max(320, Math.min(420, Math.round(SCREEN_WIDTH * 1.0)));
const CHECKOUT_DRAFT_KEY = '@gs:checkoutDraft';

/** Event `policies` are free-form; keep the strings / titled objects. */
function policyStrings(policies: ReadonlyArray<unknown> | undefined): ReadonlyArray<string> {
  return (policies ?? [])
    .map((p) => {
      if (typeof p === 'string') return p;
      if (p && typeof p === 'object') {
        const o = p as Record<string, unknown>;
        const v = o.text ?? o.description ?? o.body ?? o.label ?? o.title ?? o.name;
        return typeof v === 'string' ? v : '';
      }
      return '';
    })
    .map((s) => plainText(s))
    .filter(Boolean);
}

async function persistCheckoutDraft(draft: unknown): Promise<void> {
  try {
    await AsyncStorage.setItem(CHECKOUT_DRAFT_KEY, JSON.stringify(draft));
  } catch {
    // non-fatal: routing still works without persistence
  }
}

export default function EventDetailsPage({
  event,
  onBack,
  onPressEvent,
  onBook,
  route,
  onOpenOrganizer,
  isFavorite = false,
  onToggleFavorite,
}: EventDetailsPageProps): ReactElement {
  const insets = useSafeAreaInsets();
  const { t, i18n } = useTranslation();
  const nav = useAppNav();
  const { location } = useEvents();

  const [ev, setEv] = useState<Event>(event);
  const [extras, setExtras] = useState<EventExtras>(NO_EXTRAS);
  const [descOpen, setDescOpen] = useState(false);

  const [offers, setOffers] = useState<ReadonlyArray<TicketOffer>>([]);
  const [offersLoading, setOffersLoading] = useState(true);
  const [offersError, setOffersError] = useState<string | null>(null);
  const [selectedOffer, setSelectedOffer] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [quantities, setQuantities] = useState<Quantities>({});
  const [proceeding, setProceeding] = useState(false);

  const [access, setAccess] = useState<EventAccess | null>(null);
  const [gallery, setGallery] = useState<ReadonlyArray<MediaItem>>([]);
  const [lineup, setLineup] = useState<ReadonlyArray<LineupItem> | null>(null);
  const [lineupFollow, setLineupFollow] = useState<Record<string, boolean>>({});
  const [venue, setVenue] = useState<Venue | null>(null);

  const [orgSummary, setOrgSummary] = useState<OrganizerSummary | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

  const [attendees, setAttendees] = useState<ReadonlyArray<EventsApi.EventAttendee>>([]);
  const [attendeesTotal, setAttendeesTotal] = useState(0);
  const [orgEvents, setOrgEvents] = useState<ReadonlyArray<MiniEventRow>>([]);
  const [similar, setSimilar] = useState<ReadonlyArray<MiniEventRow>>([]);
  const [upcoming, setUpcoming] = useState<ReadonlyArray<MiniEventRow & { venue?: string | null }>>([]);
  const [upcomingMode, setUpcomingMode] = useState<'list' | 'calendar'>('list');
  const [calendarDate, setCalendarDate] = useState<string | null>(null);

  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [hasReviewed, setHasReviewed] = useState(false);
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [storyOpen, setStoryOpen] = useState(false);
  const [storySubmitting, setStorySubmitting] = useState(false);
  const [hasStory, setHasStory] = useState(false);
  const [stories, setStories] = useState<ReadonlyArray<EventStoryWithUser>>([]);
  const [storyViewerOpen, setStoryViewerOpen] = useState(false);

  const id = String(ev.id);

  useEffect(() => {
    setEv(event);
  }, [event]);

  // ---- Loading --------------------------------------------------------------
  useEffect(() => {
    let off = false;
    getEventWithExtras(String(event.id)).then(
      (r) => {
        if (off) return;
        setEv(r.event);
        setExtras(r.extras);
      },
      () => {},
    );
    return () => {
      off = true;
    };
  }, [event.id]);

  useEffect(() => {
    let off = false;
    setOffersLoading(true);
    setOffersError(null);
    getTicketOffers(id).then(
      (list) => {
        if (off) return;
        setOffers(list);
        setSelectedOffer((cur) => cur ?? list.find((o) => o.isOnSale && o.seatsAvailable !== 0)?.id ?? list[0]?.id ?? null);
        setOffersLoading(false);
      },
      (e: unknown) => {
        if (off) return;
        setOffersError(e instanceof Error ? e.message : String(e));
        setOffersLoading(false);
      },
    );
    getEventAccess({ eventId: id }).then((a) => !off && setAccess(a), () => {});
    getEventGallery(id).then((g) => !off && setGallery(g), () => {});
    getEventLineup(id).then((l) => !off && setLineup(l), () => !off && setLineup(null));
    getMyReviewForEvent(id).then((r) => !off && setHasReviewed(!!r), () => {});
    getMyStoryForEvent(id).then((s) => !off && setHasStory(!!s), () => {});
    EventsApi.getEventAttendees(id).then(
      (r) => {
        if (off) return;
        setAttendees(r.attendees);
        setAttendeesTotal(r.totalCount);
      },
      () => {},
    );
    EventsApi.getSimilarEvents(id, ev.category, 8).then((r) => !off && setSimilar(r.filter((e) => e.id !== id)), () => {});
    return () => {
      off = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    let off = false;
    getStoriesWithUserInfo(id).then((s) => !off && setStories(s), () => !off && setStories([]));
    return () => {
      off = true;
    };
  }, [id, hasStory]);

  useEffect(() => {
    let off = false;
    const orgId = ev.organizerId;
    if (orgId) {
      getOrganizerSummaryForEvent(orgId).then(
        (s) => {
          if (off || !s) return;
          setOrgSummary(s);
          setIsFollowing(s.isFollowing);
        },
        () => {},
      );
      EventsApi.getEventsByOrganizer(orgId, id, 6).then((r) => !off && setOrgEvents(r), () => {});
    }
    EventsApi.getUpcomingEventsByVenueOrOrganizer(ev.venueId, ev.organizerId, id).then((r) => !off && setUpcoming(r), () => {});
    if (ev.venueId) getVenue(ev.venueId).then((v) => !off && setVenue(v), () => {});
    return () => {
      off = true;
    };
  }, [ev.organizerId, ev.venueId, id]);

  // ---- Derived --------------------------------------------------------------
  const start = eventStart(ev);
  const end = ev.endsAtIso ? eventEnd(ev) : null;
  const ended = isPast(ev);
  const cancelled = extras.status === 'cancelled';
  const offer = offers.find((o) => o.id === selectedOffer) ?? null;
  const booked = !!access?.hasReservation && access.status !== 'cancelled' && access.status !== 'refunded';
  const canSuggestAndShare = Boolean(
    access && (access.canUseCheckedInActions || access.steps.reservationConfirmed || access.steps.checkedIn || access.status === 'confirmed' || access.status === 'checkedIn'),
  );
  const description = plainText(ev.description);
  const typeLabel = eventTypeLabel(ev);
  const genres = (ev.musicStyles ?? []).filter((g) => g && g !== typeLabel).slice(0, 2);
  const going = attendeesTotal || ev.attendeeCount || 0;
  const address = extras.venueAddress ?? venue?.addressLine1 ?? null;
  const dist = formatDistance(eventDistanceKm(ev, location.origin));
  const rules = policyStrings(ev.policies);

  const dateLabel = start ? start.toLocaleDateString(i18n.language, { weekday: 'short', day: 'numeric', month: 'short' }).replace(/\./g, '') : '';
  const timeLabel = start ? (end ? `${hhmm(start)} → ${hhmm(end)}` : hhmm(start)) : '';
  const doorsNote = [
    extras.doorsOpenAt ? t('discover.event.doorsOpen', { time: hhmm(new Date(extras.doorsOpenAt)) }) : null,
    extras.lastEntryAt ? t('discover.event.lastEntry', { time: hhmm(new Date(extras.lastEntryAt)) }) : null,
  ]
    .filter(Boolean)
    .join(' · ');

  const policyClauses = useMemo(() => {
    const own = [orgSummary?.cancellationPolicy, orgSummary?.refundPolicy].filter((x): x is string => !!x && x.trim() !== '');
    if (own.length > 0) return own.map((body) => ({ title: null, body }));
    return (['nonRefundable', 'cancelled', 'postponed', 'unpaid'] as const).map((k) => ({
      title: t(`discover.event.policy.${k}Title`),
      body: t(`discover.event.policy.${k}Body`),
    }));
  }, [orgSummary?.cancellationPolicy, orgSummary?.refundPolicy, t]);

  const upcomingShown = useMemo(() => {
    const list = (upcoming.length > 0 ? upcoming : orgEvents).filter((e) => e.id !== id);
    if (upcomingMode === 'calendar' && calendarDate) return list.filter((e) => dateKeyOf(e.startsAtIso) === calendarDate);
    return list;
  }, [upcoming, orgEvents, upcomingMode, calendarDate, id]);
  const upcomingAll = (upcoming.length > 0 ? upcoming : orgEvents).filter((e) => e.id !== id);

  // ---- Actions --------------------------------------------------------------
  const share = (): void =>
    void shareText(ev.title, [start ? `${dateLabel} · ${timeLabel}` : null, [ev.venue, ev.city].filter(Boolean).join(', '), ev.priceLabel ?? null]);

  const toggleFollowOrg = useCallback(async () => {
    const orgId = ev.organizerId;
    if (!orgId || followLoading) return;
    setFollowLoading(true);
    const was = isFollowing;
    setIsFollowing(!was);
    try {
      if (was) await unfollowOrganizer(orgId);
      else await followOrganizer(orgId);
      setOrgSummary((p) => (p ? { ...p, followerCount: p.followerCount + (was ? -1 : 1), isFollowing: !was } : p));
    } catch {
      setIsFollowing(was);
    } finally {
      setFollowLoading(false);
    }
  }, [ev.organizerId, followLoading, isFollowing]);

  const toggleFollowArtist = async (l: LineupItem): Promise<void> => {
    const was = lineupFollow[l.artist.id] ?? l.artist.isFollowing;
    setLineupFollow((m) => ({ ...m, [l.artist.id]: !was }));
    try {
      await setArtistFollow(l.artist.id, !was);
    } catch (e: unknown) {
      setLineupFollow((m) => ({ ...m, [l.artist.id]: was }));
      Alert.alert(t('gs.errorTitle'), e instanceof Error ? e.message : String(e));
    }
  };

  const openPicker = (): void => {
    const q: Quantities = {};
    for (const o of offers) q[o.id] = 0;
    if (offer && maxFor(offer) > 0) q[offer.id] = 1;
    setQuantities(q);
    setPickerOpen(true);
  };

  const proceed = (): void => {
    const chosen = offers.filter((o) => (quantities[o.id] ?? 0) > 0);
    if (chosen.length === 0 || proceeding) return;
    setProceeding(true);
    const ticketTypes: ReadonlyArray<CheckoutTicketType> = chosen.map((o) => ({
      id: o.id,
      name: o.name,
      priceCents: o.priceCents,
      currency: o.currency,
      description: o.description,
      benefits: o.benefits,
      inventory: o.seatsMax,
      salePriceCents: o.salePriceCents,
      doorPriceCents: o.doorPriceCents,
      seatsAvailable: o.seatsAvailable,
    }));
    const selectedQuantities: TicketQuantities = {};
    for (const o of chosen) selectedQuantities[o.id] = quantities[o.id] ?? 0;
    const payload = {
      eventId: id,
      ticketTypes,
      quantities: selectedQuantities,
      eventSnapshot: { title: ev.title, imageUrl: ev.imageUrl ?? null, startsAtIso: ev.startsAtIso ?? null, venue: ev.venue ?? null, city: ev.city ?? null },
    };
    void persistCheckoutDraft({ ...payload, createdAt: Date.now() }).finally(() => {
      setPickerOpen(false);
      setProceeding(false);
      if (onBook) onBook(payload);
      else route?.({ name: 'checkout', ...payload });
    });
  };

  const openPlace = (): void => nav.push({ name: 'place', place: placeSeedFromEvent(ev, [address, ev.city].filter(Boolean).join(', ') || null) });
  const directions = (): void => openDirections({ lat: ev.location?.lat, lng: ev.location?.lng, label: ev.venue, address: [address, ev.city].filter(Boolean).join(', ') });
  const openEventId = (eventId: string): void => (onPressEvent ? onPressEvent(eventId) : nav.openEvent(eventId));

  // ---- Bottom bar -----------------------------------------------------------
  const barPrice = offer ? effectivePriceCents(offer) : null;
  const barLabel =
    barPrice != null ? (barPrice === 0 ? t('gs.free') : formatCents(barPrice, offer?.currency)) : typeof ev.basePrice === 'number' ? (ev.basePrice > 0 ? `${ev.basePrice} €` : t('gs.free')) : ev.priceLabel ?? '';

  return (
    <View className="flex-1 bg-surface">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: (insets.bottom || 0) + 130 }}>
        {/* Hero */}
        <View style={{ height: HERO_HEIGHT }}>
          {stories.length > 0 ? (
            <StoriesHeroSlider heroImageUrl={ev.imageUrl} stories={stories} height={HERO_HEIGHT} />
          ) : (
            <Cover uri={ev.imageUrl} toneKey={id} style={{ height: HERO_HEIGHT }} />
          )}
          <View className="absolute left-4 right-4 top-3 flex-row items-center justify-between">
            <RoundButton icon={<ChevronLeft size={24} color={gs.ink} />} onPress={onBack} accessibilityLabel={t('gs.back')} size={48} />
            <View className="flex-row items-center gap-x-2.5">
              {stories.length > 0 ? (
                <Pressable
                  onPress={() => setStoryViewerOpen(true)}
                  accessibilityRole="button"
                  accessibilityLabel={t('discover.event.viewStories', { count: stories.length })}
                  className="h-12 flex-row items-center rounded-full bg-white px-4"
                  style={softShadow}
                >
                  <Eye size={18} color={gs.ink} />
                  <Text className="ml-1.5 text-[14px] font-extrabold text-ink">{stories.length}</Text>
                </Pressable>
              ) : null}
              <RoundButton icon={<Share2 size={20} color={gs.ink} />} onPress={share} accessibilityLabel={t('gs.share')} size={48} />
              <RoundButton
                icon={<Heart size={21} color={isFavorite ? gs.pink : gs.ink} fill={isFavorite ? gs.pink : 'transparent'} />}
                onPress={() => onToggleFavorite?.(id, !isFavorite)}
                accessibilityLabel={isFavorite ? t('gs.saved') : t('gs.save')}
                size={48}
              />
            </View>
          </View>
        </View>

        {/* Sheet */}
        <View className="-mt-10 rounded-t-[32px] bg-surface px-5 pt-6">
          <View className="flex-row flex-wrap gap-2">
            {typeLabel ? <StatusChip label={typeLabel} tone="violet" className="px-3.5 py-1.5" /> : null}
            {genres.map((g) => (
              <View key={g} className="rounded-full bg-white px-3.5 py-1.5" style={{ borderWidth: 1, borderColor: gs.line }}>
                <Text className="text-[12px] font-bold text-ink">{g}</Text>
              </View>
            ))}
            {extras.minAge ? (
              <View className="rounded-full bg-white px-3.5 py-1.5" style={{ borderWidth: 1, borderColor: gs.line }}>
                <Text className="text-[12px] font-bold text-ink">{extras.minAge}+</Text>
              </View>
            ) : null}
          </View>
          <Text className="mt-3 text-[32px] font-extrabold leading-[37px] text-ink" style={{ letterSpacing: -0.6 }} accessibilityRole="header">
            {ev.title}
          </Text>
          {going > 0 ? (
            <View className="mt-3 flex-row items-center">
              <AvatarStack
                people={
                  attendees.length > 0
                    ? attendees.map((a) => ({ id: a.userId, initials: a.initials, avatarUrl: a.avatarUrl }))
                    : (ev.attendees ?? []).map((a) => ({ id: String(a.id), initials: a.initials }))
                }
              />
              <Text className="text-[16px] text-muted">
                <Text className="font-extrabold text-ink">{compactCount(going)}</Text> {t('discover.event.peopleGoing')}
              </Text>
            </View>
          ) : null}

          {cancelled ? (
            <View className="mt-4 flex-row items-center rounded-[18px] p-3.5" style={{ backgroundColor: gs.dangerSoft }}>
              <TriangleAlert size={18} color={gs.danger} />
              <Text className="ml-2 flex-1 text-[14px] font-bold" style={{ color: gs.danger }}>
                {t('discover.event.cancelledBanner')}
              </Text>
            </View>
          ) : null}

          {description ? (
            <Pressable onPress={() => setDescOpen((o) => !o)} accessibilityRole="button" disabled={description.length < 220}>
              <Text className="mt-4 text-[16px] leading-[24px] text-subtle" numberOfLines={descOpen ? undefined : 5}>
                {description}
              </Text>
              {description.length >= 220 ? (
                <Text className="mt-1 text-[14px] font-extrabold" style={{ color: gs.violet }}>
                  {descOpen ? t('discover.event.readLess') : t('discover.event.readMore')}
                </Text>
              ) : null}
            </Pressable>
          ) : null}

          {/* Booking status + actions for ticket holders */}
          {booked && access ? (
            <View className="mt-5 rounded-[24px] p-4" style={{ backgroundColor: gs.greenSoft }}>
              <View className="flex-row items-center">
                <Ticket size={18} color={gs.green} />
                <Text className="ml-2 flex-1 text-[16px] font-extrabold" style={{ color: gs.green }}>
                  {access.steps.checkedIn ? t('discover.event.checkedIn') : t('discover.event.youreGoing')}
                </Text>
              </View>
              <View className="mt-3 flex-row flex-wrap gap-2">
                {canSuggestAndShare ? (
                  <ActionPill icon={<Music2 size={15} color={gs.ink} />} label={t('eventDetails.suggestSongs')} onPress={() => setSuggestOpen(true)} />
                ) : null}
                {canSuggestAndShare ? <ActionPill icon={<Camera size={15} color={gs.ink} />} label={t('eventDetails.shareStory')} onPress={() => setStoryOpen(true)} /> : null}
                {access.canUseCheckedInActions ? (
                  <ActionPill
                    icon={<Star size={15} color={gs.ink} />}
                    label={hasReviewed ? t('eventDetails.reviewed') : t('eventDetails.giveReview')}
                    disabled={hasReviewed}
                    onPress={() => setReviewOpen(true)}
                  />
                ) : null}
              </View>
            </View>
          ) : null}

          {/* Date & time */}
          <WhiteCard className="mt-5">
            <FactRow icon={<CalendarDays size={20} color={gs.violet} />} title={dateLabel || '—'} subtitle={t('discover.event.date')} />
            <FactRow icon={<Clock size={20} color={gs.violet} />} title={timeLabel || '—'} subtitle={doorsNote || null} />
            <FactRow
              icon={<MapPin size={20} color={gs.violet} />}
              title={ev.venue || '—'}
              subtitle={[address ?? ev.city, dist].filter(Boolean).join(' · ') || null}
              onPress={ev.venue ? openPlace : undefined}
              last
            />
          </WhiteCard>

          {/* Ticket offers */}
          {offersLoading ? (
            <View className="items-center py-8">
              <ActivityIndicator color={gs.violet} />
            </View>
          ) : offers.length > 0 ? (
            <>
              <SectionTitle title={t('discover.event.offers')} />
              <TicketOffers offers={offers} selectedId={selectedOffer} onSelect={setSelectedOffer} />
            </>
          ) : null}

          {/* Photos & videos */}
          {gallery.length > 0 ? (
            <>
              <SectionTitle title={t('discover.event.photos')} />
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="-mx-5" contentContainerStyle={{ paddingHorizontal: 20, gap: 10 }}>
                {gallery.map((m) => (
                  <Cover key={m.id} uri={m.thumbnailUrl ?? (m.mediaType === 'image' ? m.url : null)} toneKey={`${id}${m.id}`} radius={20} style={{ width: 140, height: 170 }}>
                    {m.mediaType === 'video' ? (
                      <View className="absolute bottom-2.5 left-2.5 h-8 w-8 items-center justify-center rounded-full bg-white">
                        <Play size={14} color={gs.ink} fill={gs.ink} />
                      </View>
                    ) : null}
                  </Cover>
                ))}
              </ScrollView>
            </>
          ) : null}

          {/* Line-up (Phase 4) */}
          {lineup && lineup.length > 0 ? (
            <>
              <SectionTitle
                title={t('discover.lineup.title')}
                right={<Text className="text-[13px] font-semibold text-muted">{t('discover.lineup.acts', { count: lineup.length })}</Text>}
              />
              <Lineup
                items={lineup}
                following={lineupFollow}
                onOpenArtist={(l) => nav.push({ name: 'artist', artistId: l.artist.id, artistName: l.artist.name })}
                onToggleFollow={(l) => void toggleFollowArtist(l)}
              />
            </>
          ) : null}

          {/* Music requests */}
          {!ended ? (
            <>
              <SectionTitle title={t('discover.event.music')} />
              <WhiteCard className="py-4">
                <View className="flex-row items-center">
                  <View className="h-11 w-11 items-center justify-center rounded-[14px]" style={{ backgroundColor: gs.violetSoft }}>
                    <Music2 size={20} color={gs.violet} />
                  </View>
                  <View className="ml-3 flex-1">
                    <Text className="text-[16px] font-extrabold text-ink">{t('discover.event.suggestTitle')}</Text>
                    <Text className="text-[13px] text-muted">{t('discover.event.suggestBody')}</Text>
                  </View>
                </View>
                {canSuggestAndShare ? (
                  <GsButton label={t('eventDetails.suggestSongs')} variant="soft" fullWidth className="mt-3" onPress={() => setSuggestOpen(true)} />
                ) : (
                  <View className="mt-3 flex-row items-center rounded-[14px] p-3" style={{ backgroundColor: gs.surface2 }}>
                    <Lock size={15} color={gs.muted} />
                    <Text className="ml-2 flex-1 text-[13px] font-semibold text-subtle">{t('discover.event.suggestLocked')}</Text>
                  </View>
                )}
              </WhiteCard>
            </>
          ) : null}

          {/* Organizer */}
          {ev.organizer ? (
            <>
              <SectionTitle title={t('discover.event.organizer')} />
              <View className="flex-row items-center rounded-[24px] bg-white p-4" style={softShadow}>
              <Pressable
                onPress={() => ev.organizerId && onOpenOrganizer?.({ organizerId: ev.organizerId, organizerName: ev.organizer })}
                disabled={!ev.organizerId || !onOpenOrganizer}
                accessibilityRole="button"
                accessibilityLabel={ev.organizer}
                className="flex-1 flex-row items-center"
              >
                <RingAvatar name={ev.organizer} uri={orgSummary?.logoUrl} shape="circle" size={60} />
                <View className="ml-3 flex-1">
                  <View className="flex-row items-center">
                    <Text className="shrink text-[17px] font-extrabold text-ink" numberOfLines={2}>
                      {ev.organizer}
                    </Text>
                  </View>
                  {orgSummary && orgSummary.followerCount > 0 ? (
                    <Text className="mt-0.5 text-[13px] text-muted">{t('discover.followersCount', { n: compactCount(orgSummary.followerCount) })}</Text>
                  ) : null}
                  {orgSummary && orgSummary.avgRating > 0 ? (
                    <View className="mt-0.5 flex-row items-center">
                      <Star size={13} color="#E8A317" fill="#E8A317" />
                      <Text className="ml-1 text-[13px] font-extrabold text-ink">{orgSummary.avgRating.toFixed(1)}</Text>
                    </View>
                  ) : null}
                </View>
              </Pressable>
                {ev.organizerId ? (
                  <Pressable
                    onPress={() => void toggleFollowOrg()}
                    disabled={followLoading}
                    accessibilityRole="button"
                    accessibilityLabel={isFollowing ? t('discover.unfollowName', { name: ev.organizer }) : t('discover.followName', { name: ev.organizer })}
                    className="h-11 w-11 items-center justify-center rounded-full"
                    style={{ backgroundColor: isFollowing ? gs.violetSoft : gs.violet }}
                  >
                    {isFollowing ? <UserCheck size={19} color={gs.violet} /> : <UserPlus size={19} color={gs.white} />}
                  </Pressable>
                ) : null}
              </View>
            </>
          ) : null}

          {/* Place */}
          {ev.venue ? (
            <>
              <SectionTitle title={t('discover.event.place')} />
              <Pressable onPress={openPlace} accessibilityRole="button" accessibilityLabel={t('discover.a11y.openPlace', { name: ev.venue })} className="flex-row items-center rounded-[24px] bg-white p-4" style={softShadow}>
                <Cover uri={venue?.coverImageUrl} toneKey={ev.venueId ?? ev.venue} radius={18} style={{ width: 72, height: 72 }} />
                <View className="ml-3.5 flex-1">
                  <Text className="text-[17px] font-extrabold text-ink" numberOfLines={1}>
                    {ev.venue}
                  </Text>
                  <Text className="mt-0.5 text-[13px] text-muted" numberOfLines={1}>
                    {[venueTypeLabel(venue?.venueType ?? extras.venueType ?? ev.venueType, t), priceLevelLabel(venue?.priceLevel ?? null)].filter(Boolean).join(' · ') || ev.city}
                  </Text>
                  {venue?.rating ? (
                    <View className="mt-0.5 flex-row items-center">
                      <Star size={13} color="#E8A317" fill="#E8A317" />
                      <Text className="ml-1 text-[13px] text-muted">
                        <Text className="font-extrabold text-ink">{venue.rating.average.toFixed(1)}</Text> · {t('discover.event.reviewsOnGoSwing', { count: venue.rating.count })}
                      </Text>
                    </View>
                  ) : null}
                  <View className="mt-1.5 flex-row items-center self-start rounded-full px-2 py-0.5" style={{ backgroundColor: gs.violetSoft }}>
                    <BadgeCheck size={12} color={gs.violet} />
                    <Text className="ml-1 text-[11px] font-extrabold" style={{ color: gs.violetDark }}>
                      {t('discover.event.viewPlace')}
                    </Text>
                  </View>
                </View>
              </Pressable>
            </>
          ) : null}

          {/* Location */}
          {ev.location || address ? (
            <>
              <SectionTitle title={t('discover.event.location')} />
              <LocationCard name={ev.venue} address={[address, ev.city].filter(Boolean).join(', ')} onDirections={directions} />
            </>
          ) : null}

          {/* Rules */}
          {rules.length > 0 ? (
            <>
              <SectionTitle title={t('discover.event.rules')} />
              <RulesCard rules={rules} />
            </>
          ) : null}

          <SectionTitle title={t('discover.event.refundTitle')} />
          <PolicyCard clauses={policyClauses} />

          {/* More from the organizer / venue */}
          {upcomingAll.length > 0 ? (
            <>
              <View className="mb-3 mt-8">
                <Text className="text-[22px] font-extrabold text-ink" accessibilityRole="header">
                  {t('discover.event.upcoming')}
                </Text>
                {ev.organizer ? <Text className="text-[14px] text-muted">{t('eventDetails.moreFromOrganizer', { name: ev.organizer })}</Text> : null}
              </View>
              <View className="mb-3 flex-row rounded-full p-1" style={{ backgroundColor: gs.surface2 }}>
                {(['list', 'calendar'] as const).map((m) => (
                  <Pressable
                    key={m}
                    onPress={() => {
                      setUpcomingMode(m);
                      if (m === 'list') setCalendarDate(null);
                    }}
                    accessibilityRole="tab"
                    accessibilityState={{ selected: upcomingMode === m }}
                    className="h-11 flex-1 items-center justify-center rounded-full"
                    style={upcomingMode === m ? [{ backgroundColor: gs.white }, softShadow] : undefined}
                  >
                    <Text className="text-[15px] font-extrabold" style={{ color: upcomingMode === m ? gs.ink : gs.muted }}>
                      {m === 'list' ? t('eventDetails.list') : t('eventDetails.calendar')}
                    </Text>
                  </Pressable>
                ))}
              </View>
              {upcomingMode === 'calendar' ? (
                <View className="mb-3">
                  <EventCalendar eventDates={upcomingAll.map((e) => e.startsAtIso)} selectedDate={calendarDate} onSelectDate={setCalendarDate} />
                </View>
              ) : null}
              <View className="gap-y-3">
                {upcomingShown.length === 0 ? (
                  <Text className="py-3 text-[14px] text-muted">{t('eventDetails.noEventsOnDate')}</Text>
                ) : (
                  upcomingShown.map((e) => <MiniRow key={e.id} ev={e} onPress={() => openEventId(e.id)} />)
                )}
              </View>
            </>
          ) : null}

          {/* Similar events nearby */}
          {similar.length > 0 ? (
            <>
              <SectionTitle title={t('discover.event.similar')} />
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="-mx-5" contentContainerStyle={{ paddingHorizontal: 20, gap: 12, paddingBottom: 8 }}>
                {similar.map((e) => (
                  <MiniEventCard key={e.id} ev={e} onPress={() => openEventId(e.id)} />
                ))}
              </ScrollView>
            </>
          ) : null}
        </View>
      </ScrollView>

      {/* Sticky bottom bar */}
      <View
        className="absolute bottom-0 left-0 right-0 flex-row items-center rounded-t-[28px] bg-white px-5 pt-4"
        style={[floatShadow, { paddingBottom: Math.max(insets.bottom, 14) }]}
      >
        <View className="mr-4 flex-1">
          <View className="flex-row items-end">
            <Text className="text-[26px] font-extrabold text-ink">{barLabel}</Text>
            {offer?.salePriceCents != null ? (
              <Text className="mb-1 ml-1.5 text-[15px] text-muted line-through">{formatCents(offer.priceCents, offer.currency)}</Text>
            ) : null}
          </View>
          {offer ? (
            <Text className="text-[13px] text-muted" numberOfLines={1}>
              {offer.name}
            </Text>
          ) : null}
        </View>
        {booked && access?.reservationId ? (
          <Pressable
            onPress={() => nav.push({ name: 'reservationDetails', reservationId: String(access.reservationId) })}
            accessibilityRole="button"
            className="h-14 flex-row items-center justify-center rounded-full px-5"
            style={{ backgroundColor: gs.green, maxWidth: 230 }}
          >
            <Ticket size={18} color={gs.white} />
            <Text className="ml-2 text-[16px] font-extrabold text-white" numberOfLines={2}>
              {t('discover.event.bookedView')}
            </Text>
          </Pressable>
        ) : ended || cancelled ? (
          <GsButton label={cancelled ? t('discover.event.cancelled') : t('discover.event.ended')} size="lg" disabled />
        ) : (
          <GsButton label={t('discover.event.book')} size="lg" className="min-w-[150px]" disabled={!offersLoading && offers.length === 0 && !offersError} onPress={openPicker} />
        )}
      </View>

      <TicketPickerSheet
        visible={pickerOpen}
        offers={offers}
        loading={offersLoading}
        error={offersError}
        quantities={quantities}
        onChange={setQuantities}
        onClose={() => setPickerOpen(false)}
        onProceed={proceed}
        proceeding={proceeding}
      />

      <ReviewModal
        visible={reviewOpen}
        title={t('eventDetails.rateExperience')}
        subtitle={t('eventDetails.rateSubtitle', { title: ev.title })}
        onClose={() => setReviewOpen(false)}
        submitting={reviewSubmitting}
        accentColor={gs.violet}
        starColor="#E8A317"
        onSubmit={async ({ rating, comment }) => {
          if (reviewSubmitting) return;
          try {
            setReviewSubmitting(true);
            await createEventReview({ eventId: id, rating, comment });
            setHasReviewed(true);
            setReviewOpen(false);
            Alert.alert(t('eventDetails.thanksTitle'), t('eventDetails.thanksMessage'));
          } catch (e: unknown) {
            Alert.alert(t('eventDetails.couldNotSubmitReview'), e instanceof Error ? e.message : String(e));
          } finally {
            setReviewSubmitting(false);
          }
        }}
      />
      <SuggestSongsModal visible={suggestOpen} eventId={id} eventTitle={ev.title} onClose={() => setSuggestOpen(false)} />
      <CaptureStoryModal
        visible={storyOpen}
        eventTitle={ev.title}
        onClose={() => setStoryOpen(false)}
        onTakePhoto={async () => {
          const permission = await ImagePicker.requestCameraPermissionsAsync();
          if (!permission.granted) {
            Alert.alert(t('eventDetails.cameraPermissionTitle'), t('eventDetails.cameraPermissionMessage'));
            return null;
          }
          const result = await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [4, 3], quality: 0.8 });
          return result.canceled || !result.assets?.[0]?.uri ? null : result.assets[0].uri;
        }}
        onPickPhoto={async () => {
          const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (!permission.granted) {
            Alert.alert(t('eventDetails.cameraPermissionTitle'), t('eventDetails.libraryPermissionMessage'));
            return null;
          }
          const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [4, 3], quality: 0.8 });
          return result.canceled || !result.assets?.[0]?.uri ? null : result.assets[0].uri;
        }}
        onShare={async ({ photoUri, caption }) => {
          if (storySubmitting) return;
          try {
            setStorySubmitting(true);
            await createEventStory({ eventId: id, photoUri, caption });
            setHasStory(true);
            setStoryOpen(false);
            Alert.alert(t('eventDetails.storySharedTitle'), t('eventDetails.storySharedMessage'));
          } catch (e: unknown) {
            Alert.alert(t('eventDetails.couldNotShareStory'), e instanceof Error ? e.message : String(e));
          } finally {
            setStorySubmitting(false);
          }
        }}
        accentColor={gs.violet}
      />
      <StoryViewerModal visible={storyViewerOpen} eventId={id} eventTitle={ev.title} onClose={() => setStoryViewerOpen(false)} />
    </View>
  );
}

function ActionPill({ icon, label, onPress, disabled }: Readonly<{ icon: ReactElement; label: string; onPress: () => void; disabled?: boolean }>): ReactElement {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      className="min-h-[44px] flex-row items-center rounded-full bg-white px-4"
      style={{ opacity: disabled ? 0.55 : 1 }}
    >
      {icon}
      <Text className="ml-1.5 text-[14px] font-bold text-ink">{label}</Text>
    </Pressable>
  );
}
