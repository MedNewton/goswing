// app/(tabs)/saved.tsx  (SavedPage)
import React, { useEffect, useMemo, useState, type ReactElement } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  type ViewProps,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import SearchResultCard, { type SearchResultItem } from '@/components/ui/SearchResultCard';

import { supabase } from '@/lib/supabase';
import { useAuth } from '@clerk/clerk-expo';

import { listFavoriteEvents } from '@/lib/supabase/saved';

export type SavedPageProps = Readonly<
  {
    className?: string;

    /**
     * Called when user taps a saved event card.
     * Parent should open EventDetailsPage (your HomePage route state).
     */
    onOpenEvent?: (eventId: string) => void;
  } & Omit<ViewProps, 'children'>
>;

type SavedTab = 'events' | 'organizers';

const cx = (...c: ReadonlyArray<string | null | undefined | false>): string =>
  c.filter(Boolean).join(' ');

function mapToResult(e: {
  id: string;
  title: string;
  organizer: string;
  city?: string | null;
  venue: string;
  startsAtIso: string;
  priceLabel?: string | null;
  imageUrl?: string | null;
}): SearchResultItem {
  return {
    id: e.id,
    title: e.title,
    organizer: e.organizer,
    city: e.city ?? null,
    venue: e.venue,
    startsAtIso: e.startsAtIso,
    priceLabel: e.priceLabel ?? null,
    rating: null,
    thumbnailUrl: e.imageUrl ?? '',
  };
}

export default function SavedPage({
  className,
  onOpenEvent,
  ...rest
}: SavedPageProps): ReactElement {
  const [tab, setTab] = useState<SavedTab>('events');
  const insets = useSafeAreaInsets();

  const { userId } = useAuth();

  const [savedEvents, setSavedEvents] = useState<ReadonlyArray<SearchResultItem>>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [errMsg, setErrMsg] = useState<string | null>(null);

  const savedOrganizers: ReadonlyArray<{ id: string; name: string }> = useMemo(
    () => [
      { id: 'org_1', name: 'Blue Note Entertainment' },
      { id: 'org_2', name: 'Photography Academy' },
    ],
    [],
  );

  useEffect(() => {
    if (tab !== 'events') return;

    let mounted = true;

    (async () => {
      if (!userId) {
        if (!mounted) return;
        setSavedEvents([]);
        setErrMsg(null);
        return;
      }

      try {
        setLoading(true);
        setErrMsg(null);

        const rows = await listFavoriteEvents({
          supabase,
          userId,
          limit: 100,
        });

        if (!mounted) return;

        setSavedEvents(
          rows.map((r) =>
            mapToResult({
              id: r.id,
              title: r.title,
              organizer: r.organizer,
              city: r.city ?? null,
              venue: r.venue,
              startsAtIso: r.startsAtIso,
              priceLabel: r.priceLabel ?? null,
              imageUrl: r.imageUrl ?? null,
            }),
          ),
        );
      } catch (e: any) {
        if (!mounted) return;
        setErrMsg(e?.message ? String(e.message) : 'Failed to load saved events.');
        setSavedEvents([]);
      } finally {
        if (!mounted) return;
        setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [tab, userId]);

  const bottomPad = (insets.bottom || 0) + 88;

  const handlePressEvent = (eventId: string): void => {
    if (typeof onOpenEvent === 'function') onOpenEvent(String(eventId));
  };

  return (
    <View {...rest} className={cx('flex-1 w-full', className)}>
      <View className="px-5 pt-4">
        <Text className="text-3xl font-bold text-black">Saved</Text>
        <Text className="text-base text-gray500 mt-2">
          Your saved events and followed organizers
        </Text>
      </View>

      <View className="px-5 mt-4">
        <View className="flex-row items-center rounded-full bg-gray100 p-1 border border-gray200">
          <SegBtn
            label={`Events (${savedEvents.length})`}
            icon={
              <Feather
                name="grid"
                size={18}
                color={tab === 'events' ? '#0EA5E9' : '#374151'}
              />
            }
            selected={tab === 'events'}
            onPress={() => setTab('events')}
          />
          <SegBtn
            label={`Organizers (${savedOrganizers.length})`}
            icon={
              <Feather
                name="users"
                size={18}
                color={tab === 'organizers' ? '#0EA5E9' : '#374151'}
              />
            }
            selected={tab === 'organizers'}
            onPress={() => setTab('organizers')}
          />
        </View>
      </View>

      <View className="mt-4 px-5 flex-1">
        {tab === 'events' ? (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerClassName="gap-y-3"
            contentContainerStyle={{ paddingBottom: bottomPad }}
            keyboardShouldPersistTaps="handled"
          >
            {loading ? (
              <View className="py-8 items-center justify-center">
                <ActivityIndicator />
                <Text className="mt-3 text-gray500">Loading saved events…</Text>
              </View>
            ) : errMsg ? (
              <View className="rounded-2xl border border-gray200 bg-white p-4">
                <Text className="text-gray800 font-medium">Could not load saved events</Text>
                <Text className="text-gray500 mt-2">{errMsg}</Text>
              </View>
            ) : savedEvents.length === 0 ? (
              <View className="rounded-2xl border border-gray200 bg-white p-4">
                <Text className="text-gray800 font-medium">No saved events yet</Text>
                <Text className="text-gray500 mt-2">
                  Tap the heart icon on an event to save it here.
                </Text>
              </View>
            ) : (
              savedEvents.map((it) => (
                <SearchResultCard
                  key={it.id}
                  item={it}
                  onPress={() => handlePressEvent(it.id)}
                />
              ))
            )}

            <View style={{ height: (insets.bottom || 0) + 24 }} />
          </ScrollView>
        ) : (
          <View className="rounded-2xl border border-gray200 bg-white p-4">
            {savedOrganizers.map((o) => (
              <View
                key={o.id}
                className="flex-row items-center justify-between px-2 py-3 border-b border-gray100 last:border-b-0"
              >
                <View className="flex-row items-center gap-x-2">
                  <Feather name="user" size={18} color="#6B7280" />
                  <Text className="text-gray800">{o.name}</Text>
                </View>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => {}}
                  className="rounded-full px-3 py-1 bg-gray100 border border-gray200"
                >
                  <Text className="text-sm text-gray700">Following</Text>
                </Pressable>
              </View>
            ))}
          </View>
        )}
      </View>
    </View>
  );
}

function SegBtn({
  label,
  icon,
  selected,
  onPress,
}: {
  label: string;
  icon: ReactElement;
  selected: boolean;
  onPress: () => void;
}): ReactElement {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      className={cx(
        'flex-1 flex-row items-center justify-center gap-x-2 py-2 rounded-full',
        selected ? 'bg-white border border-gray300' : 'bg-transparent',
      )}
    >
      <View className={selected ? 'opacity-100' : 'opacity-80'}>{icon}</View>
      <Text className={selected ? 'text-brand font-medium' : 'text-gray700 font-medium'}>
        {label}
      </Text>
    </Pressable>
  );
}
