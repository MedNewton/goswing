// pages/HomePage.tsx
import '../style/globals.css';
import React, { useEffect, useMemo, useState, type ReactElement } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScrollView, View, Text, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';

import Header from '@/components/sections/Header';
import SearchBar from '@/components/blocks/SearchBar';
import CategoriesSlider, { type CategoryItem } from '@/components/sections/CategoriesSlider';
import HomeTabs, { type HomeTabKey } from '@/components/sections/HomeTabs';
import FeaturedEvents from '@/components/sections/FeaturedEvents';
import WhenSlider, { type WhenKey } from '@/components/sections/WhenSlider';
import BottomTabBar, { type BottomTabKey } from '@/components/navigation/BottomTabBar';
import SearchPage from '@/pages/SearchPage';
import SavedPage from '@/components/sections/SavedPage';
import ReservationsPage from '@/pages/ReservationPage'; // <-- ensure this path matches your actual file

import EventsMap from '@/components/map/EventsMap';
import EventDetailsPage from '@/pages/EventDetailsPage';
import ProfilePage from '@/pages/ProfilePage';
import CheckoutPage from '@/pages/CheckoutPage';
import ReservationDetailsRoutePage from '@/pages/ReservationDetailsRoutePage';
import OrganizerProfilePage from '@/pages/OrganizerProfilePage';
import NotificationsPage from '@/pages/NotificationsPage';

import { getUser } from '@/data/loaders';
import type { Event } from '@/types/domain';
import { useCurrentCity } from '@/hooks/useCurrentCity';
import { applyFiltersToEvents } from '@/components/filters/filters';
import { VENUE_TYPES, type FiltersPayload } from '@/components/filters/FiltersDrawer';

import LocationPicker from '@/components/blocks/LocationPicker';
import { getPublishedEvents, getEventDetailsById } from '@/lib/supabase/events';
import type { TicketQuantities, TicketType } from '@/components/blocks/TicketQuantitySheet';

import { useAuth } from '@/providers/AuthProvider';
import { useProfile } from '@/hooks/profile/useProfile';


import { useEventFavorites } from '@/hooks/useEventFavorites';

const cx = (...classes: ReadonlyArray<string | null | undefined | false>): string =>
  classes.filter(Boolean).join(' ');

type Route =
  | { name: 'root' }
  | { name: 'eventDetails'; event: Event; initialTab?: 'about' | 'offers' | 'upcoming' }
  | { name: 'organizerProfile'; organizerId: string; organizerName?: string }
  | {
    name: 'checkout';
    event: Event;
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
  }
  | { name: 'reservationDetails'; reservationId: string }
  | { name: 'notifications' };

function filterByWhenKey(events: ReadonlyArray<Event>, key: WhenKey): ReadonlyArray<Event> {
  const now = new Date();

  function startOfDay(d: Date): Date {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }
  function endOfDay(d: Date): Date {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
  }
  function startOfWeekMon(d: Date): Date {
    const x = new Date(d);
    const day = x.getDay();
    const diff = (day + 6) % 7;
    x.setDate(x.getDate() - diff);
    return startOfDay(x);
  }

  let rangeStart: Date;
  let rangeEnd: Date;

  switch (key) {
    case 'tonight':
      rangeStart = now;
      rangeEnd = endOfDay(now);
      break;
    case 'tomorrow': {
      const t = new Date(now);
      t.setDate(now.getDate() + 1);
      rangeStart = startOfDay(t);
      rangeEnd = endOfDay(t);
      break;
    }
    case 'this_week': {
      rangeStart = startOfWeekMon(now);
      const end = new Date(rangeStart);
      end.setDate(rangeStart.getDate() + 6);
      rangeEnd = endOfDay(end);
      break;
    }
    case 'this_weekend': {
      const weekStart = startOfWeekMon(now);
      const sat = new Date(weekStart);
      sat.setDate(weekStart.getDate() + 5);
      rangeStart = startOfDay(sat);
      const sun = new Date(sat);
      sun.setDate(sat.getDate() + 1);
      rangeEnd = endOfDay(sun);
      break;
    }
    case 'next_week': {
      const thisWeekStart = startOfWeekMon(now);
      const nextWeekStart = new Date(thisWeekStart);
      nextWeekStart.setDate(thisWeekStart.getDate() + 7);
      rangeStart = startOfDay(nextWeekStart);
      const nextWeekEnd = new Date(nextWeekStart);
      nextWeekEnd.setDate(nextWeekStart.getDate() + 6);
      rangeEnd = endOfDay(nextWeekEnd);
      break;
    }
    case 'next_weekend': {
      const thisWeekStart = startOfWeekMon(now);
      const nextSat = new Date(thisWeekStart);
      nextSat.setDate(thisWeekStart.getDate() + 12);
      rangeStart = startOfDay(nextSat);
      const nextSun = new Date(nextSat);
      nextSun.setDate(nextSat.getDate() + 1);
      rangeEnd = endOfDay(nextSun);
      break;
    }
    case 'this_month': {
      rangeStart = new Date(now.getFullYear(), now.getMonth(), 1);
      rangeEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      break;
    }
    default:
      return events;
  }

  return events.filter((e) => {
    if (!e.startsAtIso) return false;
    const d = new Date(e.startsAtIso);
    if (Number.isNaN(d.getTime())) return false;
    return d >= rangeStart && d <= rangeEnd;
  });
}

export default function HomePage(): ReactElement {
  const { t } = useTranslation();
  const { user: clerkUser } = useAuth();
  const user = getUser();
  const { profile } = useProfile();

  const greetingKey = useMemo(() => {
    const h = new Date().getHours();
    if (h < 12) return 'home.goodMorning';
    if (h < 18) return 'home.goodAfternoon';
    return 'home.goodEvening';
  }, []);

  const displayName = profile?.name || user.name;

  const userId: string = String(clerkUser?.id ?? '');

  if (!userId) {
    return <Text>{t('home.missingAuthSession')}</Text>;
  }

  const { city, region, loading, error, refresh } = useCurrentCity();

  const [locationOverride, setLocationOverride] = useState<string | null>(null);
  const [locationPickerOpen, setLocationPickerOpen] = useState(false);

  const [bottomTab, setBottomTab] = useState<BottomTabKey>('home');
  // Navigation history for screens opened on top of the tabs. "Back" pops one
  // level (e.g. venue -> event -> search) instead of jumping straight home.
  const [routeStack, setRouteStack] = useState<ReadonlyArray<Route>>([]);
  const route: Route = routeStack[routeStack.length - 1] ?? { name: 'root' };
  const pushRoute = (r: Route): void => {
    if (r.name === 'root') {
      setRouteStack([]);
      return;
    }
    setRouteStack((prev) => [...prev, r]);
  };
  const resetRoutes = (): void => setRouteStack([]);

  const [query, setQuery] = useState<string>('');
  const [activeTab, setActiveTab] = useState<HomeTabKey>('map');
  const [whenKey, setWhenKey] = useState<WhenKey | null>(null);

  const handleWhenChange = (key: WhenKey | null): void => {
    setWhenKey(key);
  };

  const [filters, setFilters] = useState<Partial<FiltersPayload>>({
    sortBy: 'best',
    dateQuick: 'any',
    venueTypes: [],
    musicStyles: [],
    partyTypes: [],
    access: [],
  });

  const [pickedEventId, setPickedEventId] = useState<string | null>(null);

  const [allEvents, setAllEvents] = useState<ReadonlyArray<Event>>([]);
  const [eventsLoading, setEventsLoading] = useState<boolean>(true);
  const [eventsError, setEventsError] = useState<string | null>(null);
  const [reservationsInitialTab, setReservationsInitialTab] = useState<'active' | 'past'>('active');

  const fav = useEventFavorites({
    userId,
  });

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setEventsLoading(true);
        setEventsError(null);

        const events = await getPublishedEvents();
        if (!cancelled) setAllEvents(events);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        if (!cancelled) setEventsError(msg);
      } finally {
        if (!cancelled) setEventsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const closeOverlay = (): void => setRouteStack((prev) => prev.slice(0, -1));

  /** Open an event by id; loads it from the API when it isn't in the home list. */
  const openEventDetails = async (
    eventId: string,
    initialTab?: 'about' | 'offers' | 'upcoming',
  ): Promise<void> => {
    const local = allEvents.find((e) => String(e.id) === String(eventId));
    if (local) {
      pushRoute({ name: 'eventDetails', event: local, initialTab });
      return;
    }
    try {
      const ev = await getEventDetailsById(String(eventId));
      pushRoute({ name: 'eventDetails', event: ev, initialTab });
    } catch {
      Alert.alert(t('home.eventAlertTitle'), t('home.eventNotLoaded'));
    }
  };

  const openOrganizer = (payload: { organizerId: string; organizerName?: string }): void => {
    pushRoute({ name: 'organizerProfile', organizerId: payload.organizerId, organizerName: payload.organizerName });
  };

  const toggleCategory = (key: string, next: boolean): void => {
    setFilters((prev) => {
      const current = prev.venueTypes ?? [];
      const exists = current.includes(key);
      if (next && !exists) return { ...prev, venueTypes: [...current, key] };
      if (!next && exists) return { ...prev, venueTypes: current.filter((k) => k !== key) };
      return prev;
    });
  };

  const filteredEvents: ReadonlyArray<Event> = useMemo(() => {
    let result = applyFiltersToEvents(allEvents, query, [], filters);

    if (whenKey) {
      result = filterByWhenKey(result, whenKey);
    }

    return result;
  }, [allEvents, query, filters, whenKey]);

  const catItems: ReadonlyArray<CategoryItem> = useMemo(
    () =>
      VENUE_TYPES.map((label) => ({
        key: label,
        label,
      })),
    [],
  );

  const locationLabel = locationOverride
    ? locationOverride
    : loading
      ? t('home.locating')
      : error
        ? user.city ?? t('common.unknown')
        : city
          ? region
            ? `${city}, ${region}`
            : city
          : user.city ?? t('common.unknown');

  const eventsForUIWithFav: ReadonlyArray<Event> = useMemo(() => {
    return filteredEvents.map((ev) => ({
      ...ev,
      favorite: fav.isFavorite(String(ev.id)),
    }));
  }, [filteredEvents, fav]);

  const handleToggleFavorite = async (eventId: string, next: boolean): Promise<void> => {
    try {
      await fav.toggle(String(eventId), next);
    } catch (e: unknown) {
      Alert.alert(t('home.savedAlertTitle'), e instanceof Error ? e.message : t('common.somethingWentWrong'));
    }
  };

  const renderRoot = (): ReactElement => {
    if (bottomTab === 'search')
      return (
        <SearchPage
          onOpenEvent={(event, initialTab) => pushRoute({ name: 'eventDetails', event, initialTab })}
        />
      );

    if (bottomTab === 'saved')
      return (
        <SavedPage
          onOpenEvent={(eventId) => void openEventDetails(eventId, 'about')}
          onOpenOrganizer={openOrganizer}
        />
      );

    if (bottomTab === 'reservations') {
      return (
        <ReservationsPage
          initialTab={reservationsInitialTab}
          route={(r) => {
            pushRoute(r);
          }}
        />
      );
    }

    if (bottomTab === 'profile') {
      return (
        <ProfilePage
          onNavigateToReservations={(tab) => {
            setReservationsInitialTab(tab);
            setBottomTab('reservations');
          }}
          onNavigateToSaved={() => {
            setBottomTab('saved');
          }}
        />
      );
    }

    if (bottomTab !== 'home') {
      return (
        <View className="flex-1 items-center justify-center">
          <Text className="text-gray600">
            {t('home.tabComingSoon', {
              tab: String(bottomTab ?? '').charAt(0).toUpperCase() + String(bottomTab ?? '').slice(1),
            })}
          </Text>
        </View>
      );
    }

    if (eventsLoading) {
      return (
        <View className="flex-1 items-center justify-center">
          <Text className="text-gray700">{t('home.loadingEvents')}</Text>
        </View>
      );
    }

    if (eventsError) {
      return (
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-gray900 font-semibold">{t('home.couldNotLoadEvents')}</Text>
          <Text className="text-gray600 mt-2 text-center">{eventsError}</Text>
        </View>
      );
    }

    return (
      <ScrollView contentContainerClassName={cx('pb-32')} showsVerticalScrollIndicator={false}>
        <Header
          userName={displayName}
          greeting={t(greetingKey)}
          locationLabel={locationLabel}
          onPressNotifications={() => pushRoute({ name: 'notifications' })}
          onPressLocation={() => setLocationPickerOpen((v) => !v)}
        />

        {locationPickerOpen ? (
          <View className="px-4 mt-2">
            <LocationPicker
              value={locationOverride}
              onChange={(label) => {
                setLocationOverride(label);
                if (label) setLocationPickerOpen(false);
              }}
              events={allEvents}
            />
          </View>
        ) : null}

        <View className="mt-3 px-4">
          <SearchBar
            events={eventsForUIWithFav}
            value={query}
            onChangeText={(t: string) => {
              setQuery(t);
              setPickedEventId(null);
            }}
            onSubmit={() => { }}
            onPressFilter={() => { }}
            initialFilters={filters}
            onApplyFilters={(f: Partial<FiltersPayload>) => {
              setFilters(f);
              setActiveTab('map');
              setPickedEventId(null);
            }}
            onPickEvent={(id: string) => {
              setPickedEventId(id);
              setActiveTab('map');
            }}
          />
        </View>

        <View className="mt-5">
          <WhenSlider activeKey={whenKey} onChange={handleWhenChange} />
        </View>

        <View className="mt-5">
          <CategoriesSlider
            categories={catItems}
            activeKeys={filters.venueTypes ?? []}
            onToggle={toggleCategory}
            singleSelect={false}
          />
        </View>

        <View className="mt-4">
          <HomeTabs
            activeKey={activeTab}
            onChange={(k) => setActiveTab(k)}
            renderPanel={(key) =>
              key === 'events' ? (
                <FeaturedEvents
                  events={
                    pickedEventId
                      ? (() => {
                        const idx = eventsForUIWithFav.findIndex(
                          (e) => String(e.id) === String(pickedEventId),
                        );
                        if (idx <= 0) return eventsForUIWithFav;

                        const picked = eventsForUIWithFav[idx];
                        return [
                          picked,
                          ...eventsForUIWithFav.slice(0, idx),
                          ...eventsForUIWithFav.slice(idx + 1),
                        ];
                      })()
                      : eventsForUIWithFav
                  }
                  onPressEvent={(id: string) => void openEventDetails(id)}
                  onToggleFavorite={handleToggleFavorite}
                  highlightId={pickedEventId ?? undefined}
                />
              ) : (
                <EventsMap
                  events={eventsForUIWithFav}
                  filters={filters as FiltersPayload}
                  searchValue={query}
                  onChangeSearch={setQuery}
                  focusEventId={pickedEventId}
                  onPressEvent={(id: string, tab?: 'about' | 'offers' | 'upcoming') =>
                    void openEventDetails(id, tab)
                  }
                />
              )
            }
          />
        </View>
      </ScrollView>
    );
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right']} className="flex-1 bg-white">
      {/* Tabs stay mounted underneath pushed screens so going back keeps
          their state (search query, filters, scroll position). */}
      <View className="flex-1" style={route.name === 'root' ? undefined : { display: 'none' }}>
        {renderRoot()}
      </View>

      {route.name === 'eventDetails' ? (
        <EventDetailsPage
          key={`event-${routeStack.length}-${String(route.event.id)}`}
          event={route.event}
          initialTab={route.initialTab}
          onBack={closeOverlay}
          isFavorite={fav.isFavorite(String(route.event.id))}
          onToggleFavorite={handleToggleFavorite}
          onOpenOrganizer={openOrganizer}
          onPressEvent={(eventId) => void openEventDetails(eventId)}
          onBook={(payload) => {
            pushRoute({
              name: 'checkout',
              event: route.event,
              eventId: payload.eventId,
              ticketTypes: payload.ticketTypes,
              quantities: payload.quantities,
              eventSnapshot: payload.eventSnapshot,
            });
          }}
        />
      ) : route.name === 'organizerProfile' ? (
        <OrganizerProfilePage
          key={`organizer-${routeStack.length}-${route.organizerId}`}
          organizerId={route.organizerId}
          organizerName={route.organizerName}
          onBack={closeOverlay}
          onOpenEvent={(eventId) => void openEventDetails(eventId)}
          onOpenOrganizer={openOrganizer}
        />
      ) : route.name === 'notifications' ? (
        <NotificationsPage onBack={closeOverlay} />
      ) : route.name === 'reservationDetails' ? (
        <ReservationDetailsRoutePage
          reservationId={route.reservationId}
          onBack={closeOverlay}
        />
      ) : route.name === 'checkout' ? (
        <CheckoutPage
          event={route.event}
          userId={userId}
          ticketTypes={route.ticketTypes}
          quantities={route.quantities}
          onBack={closeOverlay}
          onSeeReservations={() => {
            resetRoutes();
            setBottomTab('reservations');
          }}
        />
      ) : null}

      <BottomTabBar
        activeKey={bottomTab}
        onChange={(key) => {
          setBottomTab(key);
          resetRoutes();
        }}
      />
    </SafeAreaView>
  );
}
