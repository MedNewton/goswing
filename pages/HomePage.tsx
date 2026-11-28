// pages/HomePage.tsx — app shell of the redesign.
//
// Tabs: Map · Discover · Bookings · Social (disabled) · Profile.
// Each tab root lives in screens/<area>/. Screens pushed on top of the tabs are
// described in navigation/routes.ts and rendered below; every tab stays mounted
// so switching back keeps its state (scroll position, filters, search).
import '../style/globals.css';
import React, { useCallback, useState, type ReactElement } from 'react';
import { Alert, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import BottomTabBar from '@/components/navigation/BottomTabBar';
import { AppNavProvider, useAppNav } from '@/navigation/AppNav';
import type { EventTab, Route, TabKey } from '@/navigation/routes';
import { EventsProvider, useEvents } from '@/providers/EventsProvider';
import { useAuth } from '@/providers/AuthProvider';
import { useProfile } from '@/hooks/profile/useProfile';
import { getEventDetailsById } from '@/lib/supabase/events';

import MapTab from '@/screens/map/MapTab';
import DiscoverTab from '@/screens/discover/DiscoverTab';
import BookingsTab from '@/screens/bookings/BookingsTab';
import ProfileTab from '@/screens/profile/ProfileTab';
import { useBookingsBadge } from '@/screens/bookings/useBookingsBadge';
import PlacePage from '@/screens/discover/PlacePage';
import ArtistPage from '@/screens/discover/ArtistPage';
import SavedScreen from '@/screens/profile/SavedScreen';
import ProfileScreen from '@/screens/profile/ProfileScreen';

import EventDetailsPage from '@/pages/EventDetailsPage';
import OrganizerProfilePage from '@/pages/OrganizerProfilePage';
import CheckoutPage from '@/pages/CheckoutPage';
import ReservationDetailsRoutePage from '@/pages/ReservationDetailsRoutePage';
import NotificationsPage from '@/pages/NotificationsPage';

const TAB_ROOTS: ReadonlyArray<Readonly<{ key: TabKey; Root: () => ReactElement }>> = [
  { key: 'map', Root: MapTab },
  { key: 'discover', Root: DiscoverTab },
  { key: 'bookings', Root: BookingsTab },
  { key: 'profile', Root: ProfileTab },
];

export default function HomePage(): ReactElement {
  const { t } = useTranslation();
  const { user: clerkUser } = useAuth();
  const { profile } = useProfile();
  const userId = String(clerkUser?.id ?? '');

  if (!userId) {
    return <Text>{t('home.missingAuthSession')}</Text>;
  }

  return (
    <EventsProvider userId={userId} fallbackCity={profile?.city ?? null}>
      <NavRoot userId={userId} />
    </EventsProvider>
  );
}

function NavRoot({ userId }: Readonly<{ userId: string }>): ReactElement {
  const { t } = useTranslation();
  const { events } = useEvents();

  const resolveEvent = useCallback(
    async (eventId: string, initialTab?: EventTab): Promise<Route | null> => {
      const local = events.find((e) => String(e.id) === String(eventId));
      if (local) return { name: 'eventDetails', event: local, initialTab };
      try {
        const event = await getEventDetailsById(String(eventId));
        return { name: 'eventDetails', event, initialTab };
      } catch {
        Alert.alert(t('home.eventAlertTitle'), t('home.eventNotLoaded'));
        return null;
      }
    },
    [events, t],
  );

  return (
    <AppNavProvider resolveEvent={resolveEvent}>
      <Shell userId={userId} />
    </AppNavProvider>
  );
}

function Shell({ userId }: Readonly<{ userId: string }>): ReactElement {
  const nav = useAppNav();
  const { isSaved, toggleSaved } = useEvents();
  const bookingsBadge = useBookingsBadge();
  const { t } = useTranslation();
  const [visited, setVisited] = useState<ReadonlySet<TabKey>>(() => new Set<TabKey>([nav.tab]));

  if (!visited.has(nav.tab)) setVisited(new Set([...visited, nav.tab]));

  const onToggleFavorite = async (eventId: string, next: boolean): Promise<void> => {
    try {
      await toggleSaved(eventId, next);
    } catch (e: unknown) {
      Alert.alert(t('home.savedAlertTitle'), e instanceof Error ? e.message : t('common.somethingWentWrong'));
    }
  };

  const top = nav.top;

  return (
    <SafeAreaView edges={['top', 'left', 'right']} className="flex-1 bg-surface">
      {/* Tab roots stay mounted (once visited) so their state survives tab switches. */}
      <View className="flex-1" style={top ? { display: 'none' } : undefined}>
        {TAB_ROOTS.map(({ key, Root }) =>
          visited.has(key) ? (
            <View key={key} className="flex-1" style={nav.tab === key ? undefined : { display: 'none' }}>
              <Root />
            </View>
          ) : null,
        )}
      </View>

      {top ? (
        <View className="flex-1 bg-surface">
          <PushedScreen route={top} depth={nav.stack.length} userId={userId} isSaved={isSaved} onToggleFavorite={onToggleFavorite} />
        </View>
      ) : null}

      {top ? null : (
        <BottomTabBar activeKey={nav.tab} onChange={(k) => nav.switchTab(k)} badges={{ bookings: bookingsBadge }} />
      )}
    </SafeAreaView>
  );
}

function PushedScreen({
  route,
  depth,
  userId,
  isSaved,
  onToggleFavorite,
}: Readonly<{
  route: Route;
  depth: number;
  userId: string;
  isSaved: (id: string) => boolean;
  onToggleFavorite: (eventId: string, next: boolean) => Promise<void>;
}>): ReactElement | null {
  const nav = useAppNav();
  const key = `${route.name}-${depth}`;

  switch (route.name) {
    case 'eventDetails':
      return (
        <EventDetailsPage
          key={`${key}-${String(route.event.id)}`}
          event={route.event}
          initialTab={route.initialTab}
          onBack={nav.back}
          isFavorite={isSaved(String(route.event.id))}
          onToggleFavorite={onToggleFavorite}
          onOpenOrganizer={(p) => nav.push({ name: 'organizerProfile', organizerId: p.organizerId, organizerName: p.organizerName })}
          onPressEvent={(eventId) => nav.openEvent(eventId)}
          onBook={(payload) =>
            nav.push({
              name: 'checkout',
              event: route.event,
              eventId: payload.eventId,
              ticketTypes: payload.ticketTypes,
              quantities: payload.quantities,
              eventSnapshot: payload.eventSnapshot,
            })
          }
        />
      );
    case 'organizerProfile':
      return (
        <OrganizerProfilePage
          key={`${key}-${route.organizerId}`}
          organizerId={route.organizerId}
          organizerName={route.organizerName}
          onBack={nav.back}
          onOpenEvent={(eventId) => nav.openEvent(eventId)}
          onOpenOrganizer={(p) => nav.push({ name: 'organizerProfile', organizerId: p.organizerId, organizerName: p.organizerName })}
        />
      );
    case 'place':
      return <PlacePage key={`${key}-${route.place.id}`} place={route.place} onBack={nav.back} />;
    case 'artist':
      return <ArtistPage key={`${key}-${route.artistId}`} artistId={route.artistId} artistName={route.artistName} onBack={nav.back} />;
    case 'checkout':
      return (
        <CheckoutPage
          key={key}
          event={route.event}
          userId={userId}
          ticketTypes={route.ticketTypes}
          quantities={route.quantities}
          onBack={nav.back}
          onSeeReservations={() => nav.switchTab('bookings')}
        />
      );
    case 'reservationDetails':
      return <ReservationDetailsRoutePage key={`${key}-${route.reservationId}`} reservationId={route.reservationId} onBack={nav.back} />;
    case 'saved':
      return <SavedScreen key={key} onBack={nav.back} />;
    case 'notifications':
      return <NotificationsPage key={key} onBack={nav.back} />;
    case 'profileScreen':
      return <ProfileScreen key={`${key}-${route.screen}`} screen={route.screen} onBack={nav.back} />;
    default:
      return null;
  }
}
