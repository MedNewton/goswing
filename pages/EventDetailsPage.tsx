// pages/EventDetailsPage.tsx
import React, { useCallback, useEffect, useMemo, useState, type ReactElement } from 'react';
import { ActivityIndicator, Dimensions, Image, Linking, Platform, Pressable, ScrollView, Share, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from 'react-i18next';

import TicketQuantitySheet, {
  type TicketQuantities,
  type TicketType,
} from '@/components/blocks/TicketQuantitySheet';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import type { Event } from '@/types/domain';
import * as EventsApi from '@/lib/supabase/events';
import { getEventAccess, type EventAccess } from '@/lib/supabase/eventAccess';
import {
  getOrganizerSummaryForEvent,
  followOrganizer,
  unfollowOrganizer,
  type OrganizerSummary,
} from '@/lib/supabase/organizers';
import type { MiniEventRow } from '@/lib/supabase/events';

import { Alert } from 'react-native';
import ReviewModal from '@/components/event/ReviewModal';
import { createEventReview, getMyReviewForEvent } from '@/lib/supabase/reviews';

import SuggestSongsModal from "@/components/event/SuggestSongsModal";
import CaptureStoryModal from '@/components/event/CaptureStoryModal';
import { createEventStory, getMyStoryForEvent, getStoriesWithUserInfo, type EventStoryWithUser } from '@/lib/supabase/stories';
import * as ImagePicker from 'expo-image-picker';
import StoriesHeroSlider from '@/components/event/StoriesHeroSlider';
import StoryViewerModal from '@/components/event/StoryViewerModal';
import EventCalendar, { dateKeyOf } from '@/components/event/EventCalendar';



export type EventDetailsPageProps = Readonly<{
  event: Event;
  initialTab?: 'about' | 'offers' | 'upcoming';
  onBack?: () => void;
  onPressEvent?: (eventId: string) => void;
  onOpenOrganizer?: (payload: { organizerId: string; organizerName?: string }) => void;
  isFavorite?: boolean;
  onToggleFavorite?: (eventId: string, next: boolean) => void;

  // Preferred: parent routes using this payload
  onBook?: (payload: {
    eventId: string;
    ticketTypes: ReadonlyArray<TicketType>;
    quantities: TicketQuantities;
    eventSnapshot?: {
      title: string;
      imageUrl?: string | null;
      startsAtIso?: string | null;
      venue?: string | null;
      city?: string | null;
    };
  }) => void;

  /**
   * Fallback routing hook (matches your "route({ name: 'checkout', ... })" pattern)
   * Use this when you want EventDetailsPage to be able to redirect by itself.
   */
  route?: (r: {
    name: 'checkout';
    eventId: string;
    ticketTypes: ReadonlyArray<TicketType>;
    quantities: TicketQuantities;
    eventSnapshot?: {
      title: string;
      imageUrl?: string | null;
      startsAtIso?: string | null;
      venue?: string | null;
      city?: string | null;
    };
  }) => void;
}>;

const cx = (...c: ReadonlyArray<string | null | undefined | false>): string => c.filter(Boolean).join(' ');

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const HERO_HEIGHT = Math.max(260, Math.min(340, Math.round(SCREEN_WIDTH * 0.62)));

const CHECKOUT_DRAFT_KEY = '@gs:checkoutDraft';

function formatDateTime(iso?: string | null): { date: string; time: string } | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const date = d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
  const time = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  return { date, time };
}

function formatDateShort(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const date = d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
  const time = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  return `${date} · ${time}`;
}

function formatPriceCents(cents: number, currency: string): string {
  if (cents === 0) return 'Free';
  const symbol = currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : '$';
  return `${symbol}${(cents / 100).toFixed(cents % 100 === 0 ? 0 : 2)}`;
}

function pickDetailsFetcher(): ((id: string) => Promise<Event>) | null {
  const api: any = EventsApi as any;
  if (typeof api.getEventDetailsById === 'function') return api.getEventDetailsById;
  if (typeof api.getEventById === 'function') return api.getEventById;
  if (typeof api.getEventDetails === 'function') return api.getEventDetails;
  return null;
}

function sumSelected(quantities: TicketQuantities, ticketTypes: ReadonlyArray<TicketType>): number {
  let sum = 0;
  for (const t of ticketTypes) sum += Math.max(0, quantities[t.id] ?? 0);
  return sum;
}

function buildTrimmedSelection(
  ticketTypes: ReadonlyArray<TicketType>,
  quantities: TicketQuantities,
): { selectedTypes: ReadonlyArray<TicketType>; selectedQuantities: TicketQuantities } {
  const selectedQuantities: TicketQuantities = {};
  const selectedIds = new Set<string>();

  for (const t of ticketTypes) {
    const q = Math.max(0, quantities[t.id] ?? 0);
    if (q > 0) {
      selectedQuantities[t.id] = q;
      selectedIds.add(t.id);
    }
  }

  const selectedTypes = ticketTypes.filter((t) => selectedIds.has(t.id));
  return { selectedTypes, selectedQuantities };
}

async function persistCheckoutDraft(draft: unknown): Promise<void> {
  try {
    await AsyncStorage.setItem(CHECKOUT_DRAFT_KEY, JSON.stringify(draft));
  } catch (e) {
    // non-fatal: routing still works without persistence
    console.warn('[checkoutDraft] Failed to persist draft', e);
  }
}

function formatFollowerCount(count: number): string {
  if (count >= 1000) return `${(count / 1000).toFixed(1)}k`;
  return String(count);
}

function AccessRow({
  done,
  label,
}: {
  done: boolean;
  label: string;
}): ReactElement {
  return (
    <View className="flex-row items-center mt-1">
      <Feather
        name={done ? 'check-circle' : 'clock'}
        size={16}
        color={done ? '#16A34A' : '#6B7280'}
        style={{ marginRight: 8 }}
      />
      <Text className="text-gray700">{label}</Text>
    </View>
  );
}


export default function EventDetailsPage({
  event,
  initialTab = 'about',
  onBack,
  onPressEvent,
  onBook,
  route,
  onOpenOrganizer,
  isFavorite: isFavedProp = false,
  onToggleFavorite,
}: EventDetailsPageProps): ReactElement {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  const [activeTab, setActiveTab] = useState<'about' | 'offers' | 'upcoming'>(initialTab);

  const [detailsEvent, setDetailsEvent] = useState<Event>(event);
  const [detailsLoading, setDetailsLoading] = useState<boolean>(false);
  const [detailsError, setDetailsError] = useState<string | null>(null);

  const [sheetOpen, setSheetOpen] = useState(false);
  const [ticketTypes, setTicketTypes] = useState<ReadonlyArray<TicketType>>([]);
  const [ticketTypesLoading, setTicketTypesLoading] = useState(false);
  const [ticketTypesError, setTicketTypesError] = useState<string | null>(null);

  const [quantities, setQuantities] = useState<TicketQuantities>({});
  const [proceeding, setProceeding] = useState(false);

  const [access, setAccess] = useState<EventAccess | null>(null);
  const [accessLoading, setAccessLoading] = useState<boolean>(false);
  // Song suggestions and stories need a confirmed reservation (the API's own
  // eligibility rule: confirmed or completed), not a check-in at the door.
  const canSuggestAndShare = Boolean(
    access &&
      (access.canUseCheckedInActions ||
        access.steps.reservationConfirmed ||
        access.steps.checkedIn ||
        access.status === 'confirmed' ||
        access.status === 'checkedIn'),
  );
  const [accessError, setAccessError] = useState<string | null>(null);

  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [hasReviewed, setHasReviewed] = useState(false);

  const [suggestSongsOpen, setSuggestSongsOpen] = useState(false);

  const [storyOpen, setStoryOpen] = useState(false);
  const [storySubmitting, setStorySubmitting] = useState(false);
  const [hasStory, setHasStory] = useState(false);
  const [eventStories, setEventStories] = useState<ReadonlyArray<EventStoryWithUser>>([]);
  const [storyViewerOpen, setStoryViewerOpen] = useState(false);
  const canOpenOrganizer = Boolean(onOpenOrganizer && detailsEvent.organizerId);

  // Organizer summary (logo, follower count, follow state, policies)
  const [orgSummary, setOrgSummary] = useState<OrganizerSummary | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

  // Real attendees from DB
  const [dbAttendees, setDbAttendees] = useState<EventsApi.EventAttendee[]>([]);
  const [dbAttendeesTotal, setDbAttendeesTotal] = useState(0);

  // "More from organizer" events
  const [orgEvents, setOrgEvents] = useState<ReadonlyArray<MiniEventRow>>([]);

  // Similar events
  const [similarEvents, setSimilarEvents] = useState<ReadonlyArray<MiniEventRow>>([]);

  // Upcoming events (for Upcoming tab)
  const [upcomingEvents, setUpcomingEvents] = useState<ReadonlyArray<MiniEventRow & { venue?: string | null }>>([]);
  const [upcomingViewMode, setUpcomingViewMode] = useState<'list' | 'calendar'>('list');
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string | null>(null);

  // Fetch ticket types eagerly (for Offers tab)
  const [offersTicketTypes, setOffersTicketTypes] = useState<ReadonlyArray<TicketType>>([]);
  const [offersLoading, setOffersLoading] = useState(false);


  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const existing = await getMyReviewForEvent(String(detailsEvent.id));
        if (!cancelled) setHasReviewed(!!existing);
      } catch {
        if (!cancelled) setHasReviewed(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [detailsEvent.id]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const existing = await getMyStoryForEvent(String(detailsEvent.id));
        if (!cancelled) setHasStory(!!existing);
      } catch {
        if (!cancelled) setHasStory(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [detailsEvent.id]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const stories = await getStoriesWithUserInfo(String(detailsEvent.id));
        if (!cancelled) setEventStories(stories);
      } catch {
        if (!cancelled) setEventStories([]);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [detailsEvent.id, hasStory]);

  useEffect(() => {
    setDetailsEvent(event);
    setDetailsError(null);
  }, [event]);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  // Fetch full event details (now works with getEventDetailsById)
  useEffect(() => {
    let cancelled = false;

    (async () => {
      const fetcher = pickDetailsFetcher();
      if (!fetcher) return;

      try {
        setDetailsLoading(true);
        setDetailsError(null);

        const full = await fetcher(String(event.id));
        if (!cancelled && full) setDetailsEvent(full);
      } catch (e: any) {
        if (!cancelled) setDetailsError(String(e?.message ?? e));
      } finally {
        if (!cancelled) setDetailsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [event.id]);

  useEffect(() => {
    setTicketTypes([]);
    setTicketTypesError(null);
    setTicketTypesLoading(false);
    setQuantities({});
    setSheetOpen(false);
    setProceeding(false);
  }, [detailsEvent.id]);

  useEffect(() => {
    let cancelled = false;
    if (!sheetOpen) return;

    (async () => {
      try {
        setTicketTypesLoading(true);
        setTicketTypesError(null);

        const fn = (EventsApi as any)?.getTicketTypesForEvent as
          | ((id: string) => Promise<ReadonlyArray<TicketType>>)
          | undefined;

        if (!fn) {
          setTicketTypes([]);
          setTicketTypesError('Missing getTicketTypesForEvent() in src/lib/supabase/events.ts');
          return;
        }

        const types = await fn(String(detailsEvent.id));
        if (cancelled) return;

        setTicketTypes(types);

        setQuantities((cur) => {
          const next: TicketQuantities = { ...cur };

          for (const t of types) {
            if (typeof next[t.id] !== 'number') next[t.id] = 0;
          }
          for (const k of Object.keys(next)) {
            if (!types.some((t) => t.id === k)) delete next[k];
          }
          return next;
        });
      } catch (e: any) {
        if (!cancelled) setTicketTypesError(String(e?.message ?? e));
      } finally {
        if (!cancelled) setTicketTypesLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [sheetOpen, detailsEvent.id]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setAccessLoading(true);
        setAccessError(null);

        const a = await getEventAccess({ eventId: String(detailsEvent.id) });
        if (!cancelled) setAccess(a);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        if (!cancelled) setAccessError(msg);
      } finally {
        if (!cancelled) setAccessLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [detailsEvent.id]);

  // Fetch organizer summary
  useEffect(() => {
    let cancelled = false;
    const orgId = detailsEvent.organizerId;
    if (!orgId) return;

    (async () => {
      try {
        const summary = await getOrganizerSummaryForEvent(orgId);
        if (!cancelled && summary) {
          setOrgSummary(summary);
          setIsFollowing(summary.isFollowing);
        }
      } catch {
        // non-critical
      }
    })();

    return () => { cancelled = true; };
  }, [detailsEvent.organizerId]);

  // Fetch "More from organizer" events
  useEffect(() => {
    let cancelled = false;
    const orgId = detailsEvent.organizerId;
    if (!orgId) return;

    (async () => {
      try {
        const events = await EventsApi.getEventsByOrganizer(orgId, String(detailsEvent.id));
        if (!cancelled) setOrgEvents(events);
      } catch {
        if (!cancelled) setOrgEvents([]);
      }
    })();

    return () => { cancelled = true; };
  }, [detailsEvent.organizerId, detailsEvent.id]);

  // Fetch similar events
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const events = await EventsApi.getSimilarEvents(
          String(detailsEvent.id),
          detailsEvent.category,
        );
        if (!cancelled) setSimilarEvents(events);
      } catch {
        if (!cancelled) setSimilarEvents([]);
      }
    })();

    return () => { cancelled = true; };
  }, [detailsEvent.id, detailsEvent.category]);

  // Fetch attendees from DB
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const { attendees, totalCount } = await EventsApi.getEventAttendees(String(detailsEvent.id));
        if (!cancelled) {
          setDbAttendees(attendees);
          setDbAttendeesTotal(totalCount);
        }
      } catch {
        if (!cancelled) {
          setDbAttendees([]);
          setDbAttendeesTotal(0);
        }
      }
    })();

    return () => { cancelled = true; };
  }, [detailsEvent.id]);

  // Fetch upcoming events (for Upcoming tab)
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const events = await EventsApi.getUpcomingEventsByVenueOrOrganizer(
          detailsEvent.venueId,
          detailsEvent.organizerId,
          String(detailsEvent.id),
        );
        if (!cancelled) setUpcomingEvents(events);
      } catch {
        if (!cancelled) setUpcomingEvents([]);
      }
    })();

    return () => { cancelled = true; };
  }, [detailsEvent.venueId, detailsEvent.organizerId, detailsEvent.id]);

  // Fetch ticket types eagerly for Offers tab
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setOffersLoading(true);
        const types = await EventsApi.getTicketTypesForEvent(String(detailsEvent.id));
        if (!cancelled) setOffersTicketTypes(types);
      } catch {
        if (!cancelled) setOffersTicketTypes([]);
      } finally {
        if (!cancelled) setOffersLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [detailsEvent.id]);

  // Follow / Unfollow handler
  const handleFollowToggle = useCallback(async () => {
    const orgId = detailsEvent.organizerId;
    if (!orgId || followLoading) return;

    setFollowLoading(true);
    const wasFollowing = isFollowing;
    setIsFollowing(!wasFollowing); // optimistic

    try {
      if (wasFollowing) {
        await unfollowOrganizer(orgId);
      } else {
        await followOrganizer(orgId);
      }
      // Update summary follower count
      setOrgSummary((prev) =>
        prev
          ? { ...prev, followerCount: prev.followerCount + (wasFollowing ? -1 : 1), isFollowing: !wasFollowing }
          : prev,
      );
    } catch {
      setIsFollowing(wasFollowing); // revert
    } finally {
      setFollowLoading(false);
    }
  }, [detailsEvent.organizerId, isFollowing, followLoading]);

  const dt = useMemo(() => formatDateTime(detailsEvent.startsAtIso), [detailsEvent.startsAtIso]);

  // Favorite toggle
  const handleFavoriteToggle = useCallback(() => {
    onToggleFavorite?.(String(detailsEvent.id), !isFavedProp);
  }, [onToggleFavorite, detailsEvent.id, isFavedProp]);

  // Share handler
  const handleShare = useCallback(async () => {
    const title = detailsEvent.title;
    const venue = detailsEvent.venue;
    const city = detailsEvent.city;
    const dateStr = dt ? `${dt.date} at ${dt.time}` : '';
    const location = [venue, city].filter(Boolean).join(', ');

    const message = [
      title,
      dateStr ? `Date: ${dateStr}` : null,
      location ? `Location: ${location}` : null,
      detailsEvent.priceLabel ? `Price: ${detailsEvent.priceLabel}` : null,
    ]
      .filter(Boolean)
      .join('\n');

    try {
      await Share.share({ message, title });
    } catch {
      // user cancelled or share failed
    }
  }, [detailsEvent, dt]);
  const bottomPad = (insets.bottom || 0) + 140;

  const selectedCount = useMemo(() => sumSelected(quantities, ticketTypes), [quantities, ticketTypes]);
  const canProceed =
    !proceeding &&
    !ticketTypesLoading &&
    !ticketTypesError &&
    ticketTypes.length > 0 &&
    selectedCount > 0;

  const redirectToCheckout = (payload: {
    eventId: string;
    ticketTypes: ReadonlyArray<TicketType>;
    quantities: TicketQuantities;
    eventSnapshot?: {
      title: string;
      imageUrl?: string | null;
      startsAtIso?: string | null;
      venue?: string | null;
      city?: string | null;
    };
  }): void => {
    if (typeof onBook === 'function') {
      onBook(payload);
      return;
    }
    if (typeof route === 'function') {
      route({ name: 'checkout', ...payload });
      return;
    }

    console.warn(
      '[EventDetailsPage] No onBook() and no route() were provided; cannot redirect to checkout.',
    );
  };

  const handleProceed = (): void => {
    if (!canProceed) return;

    setProceeding(true);

    const { selectedTypes, selectedQuantities } = buildTrimmedSelection(ticketTypes, quantities);

    const payload = {
      eventId: String(detailsEvent.id),
      ticketTypes: selectedTypes,
      quantities: selectedQuantities,
      eventSnapshot: {
        title: String(detailsEvent.title ?? ''),
        imageUrl: detailsEvent.imageUrl ?? null,
        startsAtIso: detailsEvent.startsAtIso ?? null,
        venue: detailsEvent.venue ?? null,
        city: detailsEvent.city ?? null,
      },
    } as const;

    (async () => {
      await persistCheckoutDraft({
        ...payload,
        createdAt: Date.now(),
      });

      setSheetOpen(false);
      setProceeding(false);

      redirectToCheckout(payload);
    })().catch((e) => {
      console.warn('[checkoutDraft] proceed error', e);

      setProceeding(false);
      setSheetOpen(false);

      redirectToCheckout(payload);
    });
  };

  // Calendar helpers

  const filteredUpcomingEvents = useMemo(() => {
    if (!selectedCalendarDate) return upcomingEvents;
    return upcomingEvents.filter((ev) => {
      return dateKeyOf(ev.startsAtIso) === selectedCalendarDate;
    });
  }, [upcomingEvents, selectedCalendarDate]);

  return (
    <SafeAreaView edges={['left', 'right']} className="flex-1 bg-white">
      <View className="flex-1">
        <View className="relative" style={{ width: SCREEN_WIDTH, height: HERO_HEIGHT }}>
          <StoriesHeroSlider
            heroImageUrl={detailsEvent.imageUrl}
            stories={eventStories}
            height={HERO_HEIGHT}
          />

          <View className="absolute left-3 flex-row items-center z-30" style={{ top: insets.top - 14 }}>
            <CircleIcon onPress={onBack}>
              <Feather name="chevron-left" size={20} color="#111827" />
            </CircleIcon>
          </View>

          <View className="absolute right-3 flex-row items-center gap-x-2 z-30" style={{ top: insets.top - 14 }}>
            {eventStories.length > 0 && (
              <Pressable
                onPress={() => setStoryViewerOpen(true)}
                className="h-9 px-3 rounded-full bg-white/95 flex-row items-center justify-center border border-gray200 gap-x-1.5"
                hitSlop={10}
              >
                <Feather name="eye" size={16} color="#111827" />
                <Text className="text-sm font-semibold text-gray900">{eventStories.length}</Text>
              </Pressable>
            )}
            <CircleIcon onPress={handleFavoriteToggle}>
              {isFavedProp ? (
                <Text style={{ fontSize: 18, color: '#EF4444' }}>♥</Text>
              ) : (
                <Feather name="heart" size={18} color="#111827" />
              )}
            </CircleIcon>
            <CircleIcon onPress={handleShare}>
              <Feather name="share-2" size={18} color="#111827" />
            </CircleIcon>
          </View>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerClassName="pb-40"
          contentContainerStyle={{ paddingBottom: bottomPad }}
        >
          <View className="px-5 mt-4">
            <Card variant="outlined" padding="md">
              <View className="flex-row items-start gap-x-2">
                <View className="flex-1">
                  <AccessRow
                    done={Boolean(access?.steps.ticketsPurchased)}
                    label={t('eventDetails.ticketsPurchased')}
                  />
                  <AccessRow
                    done={Boolean(access?.steps.reservationConfirmed)}
                    label={t('eventDetails.reservationConfirmed')}
                  />
                  <AccessRow
                    done={Boolean(access?.steps.checkedIn)}
                    label={t('eventDetails.checkedIn')}
                  />

                  {accessLoading ? (
                    <Text className="text-xs text-gray500 mt-2">{t('eventDetails.checkingReservation')}</Text>
                  ) : null}

                  {accessError ? (
                    <Text className="text-xs text-red-600 mt-2">
                      {t('eventDetails.couldNotVerify', { error: accessError })}
                    </Text>
                  ) : null}


                  {detailsLoading ? (
                    <Text className="text-xs text-gray500 mt-2">{t('eventDetails.loadingDetails')}</Text>
                  ) : null}
                  {detailsError ? (
                    <Text className="text-xs text-red-600 mt-2">{t('eventDetails.couldNotLoadDetails', { error: detailsError })}</Text>
                  ) : null}
                </View>
              </View>
            </Card>
          </View>

          <View className="px-5 mt-4">
            <Text className="text-xl font-semibold text-black">{detailsEvent.title}</Text>

            <View className="mt-3 flex-row items-center gap-x-3">
              {dt ? (
                <>
                  <View className="flex-row items-center gap-x-1">
                    <Feather name="calendar" size={16} color="#6B7280" />
                    <Text className="text-sm text-gray700">{dt.date}</Text>
                  </View>
                  <View className="flex-row items-center gap-x-1">
                    <Feather name="clock" size={16} color="#6B7280" />
                    <Text className="text-sm text-gray700">{dt.time}</Text>
                  </View>
                </>
              ) : null}
            </View>

            <View className="mt-2 flex-row items-center gap-x-1">
              <Feather name="map-pin" size={16} color="#6B7280" />
              <Text className="text-sm text-gray700">
                {detailsEvent.venue}
                {detailsEvent.city ? `, ${detailsEvent.city}` : ''}
              </Text>
            </View>
          </View>

          {canSuggestAndShare ? (
            <View className="px-5 mt-4 flex-row items-center gap-x-1">
              <View className="flex-1">
                <Pressable
                  onPress={() => setSuggestSongsOpen(true)}
                  className="active:opacity-90"
                >
                  <ActionChip bg="bg-black" icon="music" label={t('eventDetails.suggestSongs')} />
                </Pressable>

              </View>
              <View>
                <Pressable
                  onPress={() => setStoryOpen(true)}
                  className="active:opacity-90"
                >
                  <ActionChip bg="bg-indigo-600" icon="camera" label={t('eventDetails.shareStory')} />
                </Pressable>
              </View>
              {/* Reviews make sense once the user has actually attended. */}
              {access?.canUseCheckedInActions ? (
              <View className="flex-1">
                <Pressable
                  onPress={() => {
                    if (hasReviewed) {
                      Alert.alert(t('eventDetails.alreadyReviewedTitle'), t('eventDetails.alreadyReviewedMessage'));
                      return;
                    }
                    setReviewOpen(true);
                  }}
                  disabled={hasReviewed}
                  className={hasReviewed ? 'opacity-60' : 'active:opacity-90'}
                >
                  <ActionChip bg="bg-amber-400" icon="star" label={hasReviewed ? t('eventDetails.reviewed') : t('eventDetails.giveReview')} darkText />
                </Pressable>
              </View>
              ) : null}
            </View>
          ) : null}



          {/* ===== ORGANIZER CARD ===== */}
          <View className="px-5 mt-4">
            <Pressable
              accessibilityRole="button"
              disabled={!canOpenOrganizer}
              onPress={() => {
                if (!detailsEvent.organizerId || !onOpenOrganizer) return;
                onOpenOrganizer({
                  organizerId: detailsEvent.organizerId,
                  organizerName: detailsEvent.organizer,
                });
              }}
              className={canOpenOrganizer ? 'active:opacity-90' : 'opacity-80'}
            >
              <Card variant="outlined" padding="md">
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center gap-x-3">
                    {orgSummary?.logoUrl ? (
                      <Image
                        source={{ uri: orgSummary.logoUrl }}
                        className="h-10 w-10 rounded-full"
                        resizeMode="cover"
                      />
                    ) : (
                      <View className="h-10 w-10 rounded-full bg-gray200 items-center justify-center">
                        <Text className="text-gray800 font-medium">
                          {String(detailsEvent.organizer || 'OR').slice(0, 2).toUpperCase()}
                        </Text>
                      </View>
                    )}
                    <View>
                      <Text className="text-gray900 font-medium">{detailsEvent.organizer}</Text>
                      <View className="flex-row items-center gap-x-1">
                        <Feather name="star" size={14} color="#F59E0B" />
                        <Text className="text-xs text-gray600">
                          {orgSummary
                            ? t('eventDetails.followers', { rating: orgSummary.avgRating > 0 ? orgSummary.avgRating.toFixed(1) : '–', count: formatFollowerCount(orgSummary.followerCount) })
                            : '–'}
                        </Text>
                      </View>
                    </View>
                  </View>
                  <Pressable
                    onPress={(e) => {
                      e.stopPropagation();
                      handleFollowToggle();
                    }}
                    disabled={followLoading}
                    className={cx(
                      'rounded-full border px-3 py-1.5',
                      isFollowing ? 'bg-black border-black' : 'bg-white border-gray300',
                    )}
                  >
                    <Text className={cx('text-sm', isFollowing ? 'text-white' : 'text-gray800')}>
                      {isFollowing ? t('organizer.following') : t('organizer.follow')}
                    </Text>
                  </Pressable>
                </View>
              </Card>
            </Pressable>
          </View>

          {/* ===== TABS ===== */}
          <View className="px-5 mt-5">
            <View className="flex-row items-center rounded-full bg-gray100 p-1 border border-gray200">
              <TabPill label={t('event.tabs.about')} selected={activeTab === 'about'} onPress={() => setActiveTab('about')} />
              <TabPill label={t('event.tabs.offers')} selected={activeTab === 'offers'} onPress={() => setActiveTab('offers')} />
              <TabPill label={t('event.tabs.upcoming')} selected={activeTab === 'upcoming'} onPress={() => setActiveTab('upcoming')} />
            </View>
          </View>

          {/* ===== ABOUT TAB ===== */}
          {activeTab === 'about' && (
            <>
              <View className="px-5 mt-4">
                <Text className="text-base font-semibold text-black">{t('eventDetails.aboutTitle')}</Text>
                <Text className="text-gray700 mt-2">
                  {detailsEvent.description || t('eventDetails.noDescription')}
                </Text>
              </View>

              {/* Get Directions */}
              {detailsEvent.location ? (
                <View className="px-5 mt-5">
                  <Pressable
                    onPress={() => {
                      const { lat, lng } = detailsEvent.location!;
                      const label = encodeURIComponent(
                        `${detailsEvent.venue}${detailsEvent.city ? `, ${detailsEvent.city}` : ''}`,
                      );
                      const url = Platform.select({
                        ios: `maps:0,0?q=${label}@${lat},${lng}`,
                        default: `geo:${lat},${lng}?q=${lat},${lng}(${label})`,
                      });
                      Linking.openURL(url).catch(() => {});
                    }}
                    className="active:opacity-80"
                    accessibilityRole="button"
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 10,
                      paddingVertical: 14,
                      borderRadius: 16,
                      borderWidth: 1,
                      borderColor: '#E5E7EB',
                      backgroundColor: '#F9FAFB',
                    }}
                  >
                    <Feather name="navigation" size={18} color="#0EA5E9" />
                    <Text style={{ fontSize: 15, fontWeight: '600', color: '#0B1220' }}>
                      {t('eventDetails.getDirections')}
                    </Text>
                    <Text style={{ fontSize: 13, color: '#6B7280' }}>
                      {detailsEvent.venue}{detailsEvent.city ? `, ${detailsEvent.city}` : ''}
                    </Text>
                  </Pressable>
                </View>
              ) : null}

              <View className="px-5 mt-6">
                <Text className="text-base font-semibold text-black">{t('eventDetails.attendees', { count: dbAttendeesTotal })}</Text>
                <View className="mt-2 flex-row items-center flex-wrap gap-2">
                  {dbAttendees.slice(0, 8).map((u) => (
                    <View
                      key={u.userId}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        backgroundColor: '#F3F4F6',
                        borderRadius: 20,
                        paddingRight: 10,
                        gap: 6,
                      }}
                    >
                      {u.avatarUrl ? (
                        <Image
                          source={{ uri: u.avatarUrl }}
                          style={{ width: 28, height: 28, borderRadius: 14 }}
                        />
                      ) : (
                        <View
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: 14,
                            backgroundColor: '#D1D5DB',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Text style={{ fontSize: 11, fontWeight: '600', color: '#374151' }}>
                            {u.initials}
                          </Text>
                        </View>
                      )}
                      <Text style={{ fontSize: 12, color: '#374151', fontWeight: '500' }} numberOfLines={1}>
                        {u.displayName}
                      </Text>
                    </View>
                  ))}
                  {dbAttendeesTotal > 8 && (
                    <Text className="text-gray600 ml-1">{t('eventDetails.othersSuffix', { count: dbAttendeesTotal - 8 })}</Text>
                  )}
                  {dbAttendeesTotal === 0 && (
                    <Text className="text-gray500">{t('eventDetails.noAttendees')}</Text>
                  )}
                </View>
              </View>

              {/* Cancellation & Refund Policy from organizer */}
              <View className="px-5 mt-6">
                <View className="flex-row items-center gap-x-2">
                  <Feather name="shield" size={16} color="#6B7280" />
                  <Text className="text-base font-semibold text-black">
                    {t('eventDetails.policiesTitle')}
                  </Text>
                </View>
                <View className="mt-2 gap-y-2">
                  {orgSummary?.cancellationPolicy ? (
                    <>
                      <Text className="text-sm font-medium text-gray800 mt-1">{t('eventDetails.cancellationPolicy')}</Text>
                      <Text className="text-gray700">{orgSummary.cancellationPolicy}</Text>
                    </>
                  ) : null}
                  {orgSummary?.refundPolicy ? (
                    <>
                      <Text className="text-sm font-medium text-gray800 mt-2">{t('eventDetails.refundPolicy')}</Text>
                      <Text className="text-gray700">{orgSummary.refundPolicy}</Text>
                    </>
                  ) : null}
                  {!orgSummary?.cancellationPolicy && !orgSummary?.refundPolicy ? (
                    <Text className="text-gray500">{t('eventDetails.noPolicies')}</Text>
                  ) : null}
                </View>
              </View>

              {/* More from organizer */}
              {orgEvents.length > 0 && (
                <>
                  <SectionHeader title={t('eventDetails.moreFromOrganizer', { name: detailsEvent.organizer })} />
                  <View className="px-5 mt-2 gap-y-3">
                    {orgEvents.map((ev) => (
                      <Pressable
                        key={ev.id}
                        onPress={() => onPressEvent?.(ev.id)}
                        className="active:opacity-80"
                      >
                        <Card variant="outlined" padding="none" className="overflow-hidden rounded-2xl">
                          <View style={{ flexDirection: 'row' }}>
                            {ev.imageUrl ? (
                              <Image
                                source={{ uri: ev.imageUrl }}
                                style={{ width: 80, height: 80 }}
                                resizeMode="cover"
                              />
                            ) : (
                              <View style={{ width: 80, height: 80, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' }}>
                                <Feather name="calendar" size={24} color="#D1D5DB" />
                              </View>
                            )}
                            <View style={{ flex: 1, padding: 12, justifyContent: 'center' }}>
                              <Text className="text-gray900 font-semibold" numberOfLines={1}>{ev.title}</Text>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
                                <Feather name="calendar" size={12} color="#6B7280" />
                                <Text className="text-xs text-gray600">{formatDateShort(ev.startsAtIso)}</Text>
                              </View>
                              {ev.priceLabel ? (
                                <Text style={{ fontSize: 12, fontWeight: '600', color: '#0EA5E9', marginTop: 4 }}>
                                  {ev.priceLabel}
                                </Text>
                              ) : null}
                            </View>
                            <View style={{ justifyContent: 'center', paddingRight: 12 }}>
                              <Feather name="chevron-right" size={18} color="#D1D5DB" />
                            </View>
                          </View>
                        </Card>
                      </Pressable>
                    ))}
                  </View>
                </>
              )}

              <View className="mt-5 mx-5 border-t border-gray200" />

              {/* Similar events */}
              {similarEvents.length > 0 && (
                <View className="px-5 mt-4">
                  <Text className="text-base font-semibold text-black">{t('eventDetails.similarTitle')}</Text>
                  <View className="mt-3 gap-y-3">
                    {similarEvents.map((s) => (
                      <Pressable
                        key={s.id}
                        onPress={() => onPressEvent?.(s.id)}
                        className="active:opacity-80"
                      >
                        <Card variant="outlined" padding="none" className="overflow-hidden rounded-2xl">
                          <View style={{ flexDirection: 'row' }}>
                            {s.imageUrl ? (
                              <Image
                                source={{ uri: s.imageUrl }}
                                style={{ width: 80, height: 80 }}
                                resizeMode="cover"
                              />
                            ) : (
                              <View style={{ width: 80, height: 80, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' }}>
                                <Feather name="calendar" size={24} color="#D1D5DB" />
                              </View>
                            )}
                            <View style={{ flex: 1, padding: 12, justifyContent: 'center' }}>
                              <Text className="text-gray900 font-semibold" numberOfLines={1}>{s.title}</Text>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
                                <Feather name="calendar" size={12} color="#6B7280" />
                                <Text className="text-xs text-gray600">{formatDateShort(s.startsAtIso)}</Text>
                              </View>
                              {s.priceLabel ? (
                                <Text style={{ fontSize: 12, fontWeight: '600', color: '#0EA5E9', marginTop: 4 }}>
                                  {s.priceLabel}
                                </Text>
                              ) : null}
                            </View>
                            <View style={{ justifyContent: 'center', paddingRight: 12 }}>
                              <Feather name="chevron-right" size={18} color="#D1D5DB" />
                            </View>
                          </View>
                        </Card>
                      </Pressable>
                    ))}
                  </View>
                </View>
              )}
              {similarEvents.length === 0 && orgEvents.length === 0 && (
                <View className="px-5 mt-4">
                  <Text className="text-gray500">{t('eventDetails.noSimilar')}</Text>
                </View>
              )}
            </>
          )}

          {/* ===== OFFERS TAB ===== */}
          {activeTab === 'offers' && (
            <View className="px-5 mt-5 gap-y-3">
              {offersLoading ? (
                <View className="items-center py-8">
                  <ActivityIndicator size="small" color="#6B7280" />
                  <Text className="text-gray500 mt-2">{t('eventDetails.loadingTicketTypes')}</Text>
                </View>
              ) : offersTicketTypes.length === 0 ? (
                <View className="items-center py-8">
                  <Text className="text-gray500">{t('eventDetails.noTicketTypes')}</Text>
                </View>
              ) : (
                offersTicketTypes.map((tt) => (
                  <Card key={tt.id} variant="outlined" padding="md">
                    <View className="flex-row items-start justify-between">
                      <View className="flex-1 pr-3">
                        <Text className="text-gray900 font-semibold text-base">{tt.name}</Text>
                        {tt.description ? (
                          <Text className="text-gray600 text-sm mt-1">{tt.description}</Text>
                        ) : null}
                        {tt.benefits && tt.benefits.length > 0 && (
                          <View className="mt-2 gap-y-1">
                            {tt.benefits.map((b) => (
                              <Text key={b} className="text-gray700 text-sm">• {b}</Text>
                            ))}
                          </View>
                        )}
                        {tt.inventory != null && (
                          <Text className="text-xs text-gray500 mt-2">{t('eventDetails.remaining', { count: tt.inventory })}</Text>
                        )}
                      </View>
                      <View className="items-end">
                        <Badge
                          label={formatPriceCents(tt.priceCents, tt.currency)}
                          variant="solid"
                          tone="brand"
                          size="sm"
                          className="rounded-full"
                        />
                      </View>
                    </View>
                  </Card>
                ))
              )}
            </View>
          )}

          {/* ===== UPCOMING TAB ===== */}
          {activeTab === 'upcoming' && (
            <View className="px-5 mt-5">
              <Text className="text-base font-semibold text-black">
                {t('eventDetails.upcomingEvents')}
              </Text>

              {/* View mode toggle */}
              <View className="flex-row items-center gap-x-2 mt-3">
                <Pressable
                  onPress={() => {
                    setUpcomingViewMode('list');
                    setSelectedCalendarDate(null);
                  }}
                  className={cx(
                    'flex-row items-center gap-x-1 rounded-full px-3 py-1.5 border',
                    upcomingViewMode === 'list' ? 'bg-black border-black' : 'bg-white border-gray300',
                  )}
                >
                  <Feather name="list" size={14} color={upcomingViewMode === 'list' ? '#FFFFFF' : '#6B7280'} />
                  <Text className={upcomingViewMode === 'list' ? 'text-white text-sm' : 'text-gray700 text-sm'}>{t('eventDetails.list')}</Text>
                </Pressable>
                <Pressable
                  onPress={() => setUpcomingViewMode('calendar')}
                  className={cx(
                    'flex-row items-center gap-x-1 rounded-full px-3 py-1.5 border',
                    upcomingViewMode === 'calendar' ? 'bg-black border-black' : 'bg-white border-gray300',
                  )}
                >
                  <Feather name="calendar" size={14} color={upcomingViewMode === 'calendar' ? '#FFFFFF' : '#6B7280'} />
                  <Text className={upcomingViewMode === 'calendar' ? 'text-white text-sm' : 'text-gray700 text-sm'}>{t('eventDetails.calendar')}</Text>
                </Pressable>
              </View>

              {/* Calendar view */}
              {upcomingViewMode === 'calendar' && (
                <View className="mt-3">
                  <EventCalendar
                    eventDates={upcomingEvents.map((ev) => ev.startsAtIso)}
                    selectedDate={selectedCalendarDate}
                    onSelectDate={setSelectedCalendarDate}
                  />
                </View>
              )}

              {/* Event list */}
              <View className="mt-3 gap-y-3">
                {(upcomingViewMode === 'calendar' ? filteredUpcomingEvents : upcomingEvents).length === 0 ? (
                  <Text className="text-gray500 py-4">
                    {selectedCalendarDate ? t('eventDetails.noEventsOnDate') : t('eventDetails.noUpcoming')}
                  </Text>
                ) : (
                  (upcomingViewMode === 'calendar' ? filteredUpcomingEvents : upcomingEvents).map((u) => (
                    <Pressable
                      key={u.id}
                      accessibilityRole="button"
                      disabled={!onPressEvent}
                      onPress={() => onPressEvent?.(String(u.id))}
                      className="active:opacity-80"
                    >
                    <Card variant="outlined" padding="md" className="flex-row items-center justify-between">
                      <View className="flex-1 pr-3">
                        <Text className="text-gray900 font-medium" numberOfLines={1}>{u.title}</Text>
                        <View className="mt-1 flex-row items-center gap-x-1">
                          <Feather name="calendar" size={12} color="#6B7280" />
                          <Text className="text-xs text-gray600">{formatDateShort(u.startsAtIso)}</Text>
                        </View>
                        {u.venue ? (
                          <View className="mt-1 flex-row items-center gap-x-1">
                            <Feather name="map-pin" size={12} color="#6B7280" />
                            <Text className="text-xs text-gray600">{u.venue}</Text>
                          </View>
                        ) : null}
                      </View>
                      {u.priceLabel ? (
                        <Badge label={u.priceLabel} variant="solid" tone="brand" size="sm" className="rounded-full" />
                      ) : (
                        <Badge label={t('eventDetails.remindMe')} variant="soft" tone="gray" size="sm" className="rounded-full" />
                      )}
                    </Card>
                    </Pressable>
                  ))
                )}
              </View>
            </View>
          )}
        </ScrollView>

        <View className="absolute inset-x-5" style={{ bottom: (insets.bottom || 0) + 72 }}>
          <Pressable
            onPress={() => setSheetOpen(true)}
            className={cx(
              'rounded-2xl px-6 py-4 items-center justify-center',
              proceeding ? 'bg-gray700' : 'bg-black',
            )}
            disabled={proceeding}
            style={{
              shadowColor: '#000',
              shadowOpacity: 0.25,
              shadowRadius: 12,
              shadowOffset: { width: 0, height: 6 },
              elevation: 8,
            }}
          >
            <Text className="text-white text-base font-semibold">
              {proceeding ? t('eventDetails.preparingCheckout') : t('eventDetails.bookNow')}
            </Text>
          </Pressable>
        </View>

        <TicketQuantitySheet
          visible={sheetOpen}
          onClose={() => setSheetOpen(false)}
          ticketTypes={ticketTypes}
          quantities={quantities}
          onChangeQuantities={setQuantities}
          onProceed={handleProceed}
        />

        {sheetOpen && ticketTypesError ? (
          <View className="absolute left-5 right-5" style={{ bottom: (insets.bottom || 0) + 150 }}>
            <Card variant="outlined" padding="md">
              <Text className="text-sm text-red-600">{t('eventDetails.ticketTypesError', { error: ticketTypesError })}</Text>
            </Card>
          </View>
        ) : null}

        {sheetOpen && ticketTypesLoading ? (
          <View className="absolute left-5 right-5" style={{ bottom: (insets.bottom || 0) + 150 }}>
            <Card variant="outlined" padding="md">
              <Text className="text-sm text-gray700">{t('eventDetails.loadingTicketTypes')}</Text>
            </Card>
          </View>
        ) : null}
      </View>
      <ReviewModal
        visible={reviewOpen}
        title={t('eventDetails.rateExperience')}
        subtitle={t('eventDetails.rateSubtitle', { title: detailsEvent.title })}
        onClose={() => setReviewOpen(false)}
        submitting={reviewSubmitting}
        accentColor="#6B7280"
        onSubmit={async ({ rating, comment }) => {
          if (reviewSubmitting) return;

          try {
            setReviewSubmitting(true);

            await createEventReview({
              eventId: String(detailsEvent.id),
              rating,
              comment,
            });

            setHasReviewed(true);
            setReviewOpen(false);
            Alert.alert(t('eventDetails.thanksTitle'), t('eventDetails.thanksMessage'));
          } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : String(e);
            Alert.alert(t('eventDetails.couldNotSubmitReview'), msg);
          } finally {
            setReviewSubmitting(false);
          }
        }}
      />
      <SuggestSongsModal
        visible={suggestSongsOpen}
        eventId={String(detailsEvent.id)}
        eventTitle={String(detailsEvent.title ?? "")}
        onClose={() => setSuggestSongsOpen(false)}
      />
      <CaptureStoryModal
        visible={storyOpen}
        eventTitle={String(detailsEvent.title ?? "")}
        onClose={() => setStoryOpen(false)}
        onTakePhoto={async () => {
          const permission = await ImagePicker.requestCameraPermissionsAsync();
          if (!permission.granted) {
            Alert.alert(t('eventDetails.cameraPermissionTitle'), t('eventDetails.cameraPermissionMessage'));
            return null;
          }

          const result = await ImagePicker.launchCameraAsync({
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.8,
          });

          if (result.canceled || !result.assets?.[0]?.uri) {
            return null;
          }

          return result.assets[0].uri;
        }}
        onPickPhoto={async () => {
          const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (!permission.granted) {
            Alert.alert(t('eventDetails.cameraPermissionTitle'), t('eventDetails.libraryPermissionMessage'));
            return null;
          }

          const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.8,
          });

          if (result.canceled || !result.assets?.[0]?.uri) {
            return null;
          }

          return result.assets[0].uri;
        }}
        onShare={async ({ photoUri, caption }) => {
          if (storySubmitting) return;

          try {
            setStorySubmitting(true);

            await createEventStory({
              eventId: String(detailsEvent.id),
              photoUri,
              caption,
            });

            setHasStory(true);
            setStoryOpen(false);
            Alert.alert(t('eventDetails.storySharedTitle'), t('eventDetails.storySharedMessage'));
          } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : String(e);
            Alert.alert(t('eventDetails.couldNotShareStory'), msg);
          } finally {
            setStorySubmitting(false);
          }
        }}
        accentColor="#4F46E5"
      />

      <StoryViewerModal
        visible={storyViewerOpen}
        eventId={String(detailsEvent.id)}
        eventTitle={detailsEvent.title}
        onClose={() => setStoryViewerOpen(false)}
      />
    </SafeAreaView>
  );
}

function SectionHeader({ title, action }: { title: string; action?: string }): ReactElement {
  return (
    <View className="px-5 mt-6 flex-row items-center justify-between">
      <Text className="text-base font-semibold text-black">{title}</Text>
      {action ? (
        <View className="flex-row items-center">
          <Text className="text-sm text-gray600 mr-1">{action}</Text>
          <Feather name="chevron-right" size={16} color="#6B7280" />
        </View>
      ) : null}
    </View>
  );
}

function CircleIcon({ children, onPress }: { children: ReactElement; onPress?: () => void }): ReactElement {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      className="h-9 w-9 rounded-full bg-white/95 items-center justify-center border border-gray200"
      hitSlop={10}
    >
      {children}
    </Pressable>
  );
}

function ActionChip({
  bg,
  icon,
  label,
  darkText,
  darkIcon,
  className,
}: {
  bg: 'bg-black' | 'bg-indigo-600' | 'bg-amber-400';
  icon: keyof typeof Feather.glyphMap;
  label: string;
  darkText?: boolean;
  darkIcon?: boolean;
  className?: string;
}): ReactElement {
  return (
    <View
      className={cx(
        'flex-row items-center gap-x-2 rounded-xl px-3 py-2',
        bg,
        className,
      )}
    >
      <Feather name={icon} size={14} color={darkIcon ? '#111827' : '#FFFFFF'} />
      <Text className={cx('text-sm', darkText ? 'text-black' : 'text-white')}>{label}</Text>
    </View>
  );
}


function TabPill({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}): ReactElement {
  return (
    <Pressable
      onPress={onPress}
      className={cx(
        'px-0 py-1.5 rounded-full flex-1 items-center',
        selected ? 'bg-white border border-gray300' : '',
      )}
    >
      <Text className={selected ? 'text-brand font-medium' : 'text-gray700 font-medium'}>{label}</Text>
    </Pressable>
  );
}

