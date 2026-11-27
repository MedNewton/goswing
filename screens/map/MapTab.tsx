// screens/map/MapTab.tsx — Map tab root (home screen).
// Foundation placeholder: the existing events map, full screen. The Map area
// PR replaces this with the redesigned map.
import React, { type ReactElement } from 'react';
import { Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import EventsMap from '@/components/map/EventsMap';
import type { FiltersPayload } from '@/components/filters/FiltersDrawer';
import { useEvents } from '@/providers/EventsProvider';
import { useAppNav } from '@/navigation/AppNav';

const NO_FILTERS = { sortBy: 'best', dateQuick: 'any', venueTypes: [], musicStyles: [], partyTypes: [], access: [] } as unknown as FiltersPayload;

export default function MapTab(): ReactElement {
  const { t } = useTranslation();
  const { events, loading } = useEvents();
  const nav = useAppNav();
  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-surface">
        <Text className="text-muted">{t('gs.loading')}</Text>
      </View>
    );
  }
  return (
    <View className="flex-1">
      <EventsMap
        events={events}
        filters={NO_FILTERS}
        searchValue=""
        onChangeSearch={() => undefined}
        focusEventId={null}
        onPressEvent={(id: string, tab?: 'about' | 'offers' | 'upcoming') => nav.openEvent(id, tab)}
      />
    </View>
  );
}
