// pages/EventDetailsPage.tsx
import React, { useEffect, useMemo, useState, type ReactElement } from 'react';
import { Dimensions, Image, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

import TicketQuantitySheet, {
  type TicketQuantities,
  type TicketType,
} from '@/components/blocks/TicketQuantitySheet';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import type { Event } from '@/types/domain';
import * as EventsApi from '@/lib/supabase/events';
import { getEventAccess, type EventAccess } from '@/lib/supabase/eventAccess';

import { Alert } from 'react-native';
import ReviewModal from '@/components/event/ReviewModal';
import { createEventReview, getMyReviewForEvent } from '@/lib/supabase/reviews';

import SuggestSongsModal from "@/components/event/SuggestSongsModal";
import CaptureStoryModal from '@/components/event/CaptureStoryModal';
import { createEventStory, getMyStoryForEvent, getStoriesWithUserInfo, type EventStoryWithUser } from '@/lib/supabase/stories';
import * as ImagePicker from 'expo-image-picker';
import StoriesHeroSlider from '@/components/event/StoriesHeroSlider';
import StoryViewerModal from '@/components/event/StoryViewerModal';



export type EventDetailsPageProps = Readonly<{
  event: Event;
  initialTab?: 'about' | 'offers' | 'upcoming';
  onBack?: () => void;
  onOpenOrganizer?: (payload: { organizerId: string; organizerName?: string }) => void;

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
  onBook,
  route,
  onOpenOrganizer,
}: EventDetailsPageProps): ReactElement {
  const insets = useSafeAreaInsets();

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


  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        // If user isn't eligible, we can skip the check (optional)
        // but leaving it is fine; RLS will still protect.
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


  const dt = useMemo(() => formatDateTime(detailsEvent.startsAtIso), [detailsEvent.startsAtIso]);
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
            <CircleIcon onPress={() => { }}>
              <Feather name="heart" size={18} color="#111827" />
            </CircleIcon>
            <CircleIcon onPress={() => { }}>
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
                    label="Tickets Purchased"
                  />
                  <AccessRow
                    done={Boolean(access?.steps.reservationConfirmed)}
                    label="Reservation confirmed"
                  />
                  <AccessRow
                    done={Boolean(access?.steps.checkedIn)}
                    label="Checked In"
                  />

                  {accessLoading ? (
                    <Text className="text-xs text-gray500 mt-2">Checking your reservation…</Text>
                  ) : null}

                  {accessError ? (
                    <Text className="text-xs text-red-600 mt-2">
                      Could not verify access: {accessError}
                    </Text>
                  ) : null}


                  {detailsLoading ? (
                    <Text className="text-xs text-gray500 mt-2">Loading full event details…</Text>
                  ) : null}
                  {detailsError ? (
                    <Text className="text-xs text-red-600 mt-2">Could not load full details: {detailsError}</Text>
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

          {access?.canUseCheckedInActions ? (
            <View className="px-5 mt-4 flex-row items-center gap-x-1">
              <View className="flex-1">
                <Pressable
                  onPress={() => setSuggestSongsOpen(true)}
                  className="active:opacity-90"
                >
                  <ActionChip bg="bg-black" icon="music" label="Suggest Songs" />
                </Pressable>

              </View>
              <View>
                <Pressable
                  onPress={() => setStoryOpen(true)}
                  className="active:opacity-90"
                >
                  <ActionChip bg="bg-indigo-600" icon="camera" label="Share Story" />
                </Pressable>
              </View>
              <View className="flex-1">
                <Pressable
                  onPress={() => {
                    if (hasReviewed) {
                      Alert.alert('Review already submitted', 'You can only review this event once.');
                      return;
                    }
                    setReviewOpen(true);
                  }}
                  disabled={hasReviewed}
                  className={hasReviewed ? 'opacity-60' : 'active:opacity-90'}
                >
                  <ActionChip bg="bg-amber-400" icon="star" label={hasReviewed ? 'Reviewed' : 'Give a Review'} darkText />
                </Pressable>
              </View>
            </View>
          ) : null}



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
                    <View className="h-10 w-10 rounded-full bg-gray200 items-center justify-center">
                      <Text className="text-gray800 font-medium">
                        {String(detailsEvent.organizer || 'OR').slice(0, 2).toUpperCase()}
                      </Text>
                    </View>
                    <View>
                      <Text className="text-gray900 font-medium">{detailsEvent.organizer}</Text>
                      <View className="flex-row items-center gap-x-1">
                        <Feather name="star" size={14} color="#F59E0B" />
                        <Text className="text-xs text-gray600">4.8 · 1.2k followers</Text>
                      </View>
                    </View>
                  </View>
                  <Pressable className="rounded-full border border-gray300 px-3 py-1.5 bg-white">
                    <Text className="text-sm text-gray800">Follow</Text>
                  </Pressable>
                </View>
              </Card>
            </Pressable>
          </View>

          <View className="px-5 mt-5">
            <View className="flex-row items-center rounded-full bg-gray100 p-1 border border-gray200">
              <TabPill label="About" selected={activeTab === 'about'} onPress={() => setActiveTab('about')} />
              <TabPill label="Offers" selected={activeTab === 'offers'} onPress={() => setActiveTab('offers')} />
              <TabPill label="Upcoming" selected={activeTab === 'upcoming'} onPress={() => setActiveTab('upcoming')} />
            </View>
          </View>

          {activeTab === 'about' && (
            <>
              <View className="px-5 mt-4">
                <Text className="text-base font-semibold text-black">About This Event</Text>
                <Text className="text-gray700 mt-2">
                  Experience the underground techno scene with international DJs in Paris&apos; most iconic
                  club venue.
                </Text>

                <Text className="text-sm font-semibold text-black mt-4">What&apos;s Included</Text>
                <View className="mt-2 gap-y-1">
                  {[
                    'Live performances by 5+ artists',
                    'Food and beverage vendors',
                    'Free WiFi throughout venue',
                    'Professional sound and lighting',
                  ].map((t) => (
                    <Text key={t} className="text-gray700">
                      • {t}
                    </Text>
                  ))}
                </View>
              </View>

              <View className="px-5 mt-6">
                <Text className="text-base font-semibold text-black">Attendees (420)</Text>
                <View className="mt-2 flex-row items-center flex-wrap gap-2">
                  {['U1', 'U2', 'U3', 'U4', 'U5'].map((u) => (
                    <Badge key={u} label={u} variant="soft" tone="gray" size="sm" />
                  ))}
                  <Text className="text-gray600 ml-1">and 415 others</Text>
                </View>
              </View>

              <View className="px-5 mt-6">
                <View className="flex-row items-center gap-x-2">
                  <Feather name="shield" size={16} color="#6B7280" />
                  <Text className="text-base font-semibold text-black">
                    Cancellation & Refund Policy
                  </Text>
                </View>
                <View className="mt-2 gap-y-2">
                  {[
                    'Free cancellation up to 48 hours before the event',
                    '50% refund for cancellations 24–48 hours before',
                    'No refund for cancellations within 24 hours',
                    'Event cancellation by organizer: Full refund guaranteed',
                    'Weather-related cancellations: Reschedule or full refund',
                  ].map((line) => (
                    <Text key={line} className="text-gray700">
                      • {line}
                    </Text>
                  ))}
                </View>
              </View>

              <SectionHeader title={`More from ${event.organizer}`} action="View all" />
              <View className="px-5 mt-2 gap-y-3">
                {[{ t: 'Jazz Night Under Stars', p: '$45' }, { t: 'New Year Concert', p: '$80' }].map(
                  (r) => (
                    <Card
                      key={r.t}
                      variant="outlined"
                      padding="md"
                      className="flex-row items-center justify-between"
                    >
                      <View>
                        <Text className="text-gray900 font-medium">{r.t}</Text>
                        <View className="mt-1 flex-row items-center gap-x-1">
                          <Feather name="calendar" size={12} color="#6B7280" />
                          <Text className="text-xs text-gray600">Dec 28, 2024 · 8:00 PM</Text>
                        </View>
                      </View>
                      <Badge label={r.p} variant="solid" tone="brand" size="sm" className="rounded-full" />
                    </Card>
                  )
                )}
              </View>

              <View className="mt-5 mx-5 border-t border-gray200" />

              <View className="px-5 mt-4">
                <Text className="text-base font-semibold text-black">Similar Events You Might Like</Text>
                <View className="mt-3 gap-y-3">
                  {[
                    { t: 'Blues Festival Downtown', org: 'Blue Note Events', p: '$35' },
                    { t: 'Rock Concert Series', org: 'Rock City Productions', p: '$55' },
                    { t: 'Electronic Music Night', org: 'EDM Collective', p: '$40' },
                  ].map((s) => (
                    <Card
                      key={s.t}
                      variant="outlined"
                      padding="md"
                      className="flex-row items-center justify-between"
                    >
                      <View>
                        <Text className="text-gray900 font-medium">{s.t}</Text>
                        <Text className="text-xs text-gray500 mt-0.5">{s.org}</Text>
                        <View className="mt-1 flex-row items-center gap-x-1">
                          <Feather name="calendar" size={12} color="#6B7280" />
                          <Text className="text-xs text-gray600">Dec 25, 2024</Text>
                        </View>
                      </View>
                      <Badge label={s.p} variant="solid" tone="brand" size="sm" className="rounded-full" />
                    </Card>
                  ))}
                </View>
              </View>
            </>
          )}

          {activeTab === 'offers' && (
            <View className="px-5 mt-5 gap-y-3">
              {[
                { name: 'Early Bird Ticket', price: '$25', desc: 'Limited stock · Ends soon' },
                { name: 'VIP Pass', price: '$60', desc: 'Front row + lounge access' },
                { name: 'Group Pack (4)', price: '$80', desc: 'Save more with friends' },
              ].map((o) => (
                <Card key={o.name} variant="outlined" padding="md" className="flex-row items-center justify-between">
                  <View>
                    <Text className="text-gray900 font-medium">{o.name}</Text>
                    <Text className="text-xs text-gray500 mt-0.5">{o.desc}</Text>
                  </View>
                  <Badge label={o.price} variant="solid" tone="brand" size="sm" className="rounded-full" />
                </Card>
              ))}
            </View>
          )}

          {activeTab === 'upcoming' && (
            <View className="px-5 mt-5 gap-y-3">
              {[{ t: 'Sunset Set Vol. 2' }, { t: 'Afterparty Night' }].map((u) => (
                <Card key={u.t} variant="outlined" padding="md" className="flex-row items-center justify-between">
                  <View>
                    <Text className="text-gray900 font-medium">{u.t}</Text>
                    <View className="mt-1 flex-row items-center gap-x-1">
                      <Feather name="calendar" size={12} color="#6B7280" />
                      <Text className="text-xs text-gray600">Jan 14, 2025 · 9:00 PM</Text>
                    </View>
                  </View>
                  <Badge label="Remind me" variant="soft" tone="gray" size="sm" className="rounded-full" />
                </Card>
              ))}
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
              {proceeding ? 'Preparing checkout…' : 'Book Now'}
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
              <Text className="text-sm text-red-600">Ticket types error: {ticketTypesError}</Text>
            </Card>
          </View>
        ) : null}

        {sheetOpen && ticketTypesLoading ? (
          <View className="absolute left-5 right-5" style={{ bottom: (insets.bottom || 0) + 150 }}>
            <Card variant="outlined" padding="md">
              <Text className="text-sm text-gray700">Loading ticket types…</Text>
            </Card>
          </View>
        ) : null}
      </View>
      <ReviewModal
        visible={reviewOpen}
        title="Rate Your Experience"
        subtitle={`How was your experience at ${detailsEvent.title}?`}
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
              // reservationId: access?.reservationId ?? null, // only if your access object has it
            });

            setHasReviewed(true);
            setReviewOpen(false);
            Alert.alert('Thanks!', 'Your review has been submitted.');
          } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : String(e);
            Alert.alert('Could not submit review', msg);
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
            Alert.alert('Permission required', 'Please allow access to your camera.');
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
            Alert.alert('Permission required', 'Please allow access to your photo library.');
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
            Alert.alert('Story shared!', 'Your story is now visible to event attendees.');
          } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : String(e);
            Alert.alert('Could not share story', msg);
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
