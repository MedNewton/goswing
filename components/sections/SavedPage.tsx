import React, { useMemo, useState, type ReactElement } from 'react';
import { View, Text, ScrollView, Pressable, type ViewProps } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import SearchResultCard, { type SearchResultItem } from '@/components/ui/SearchResultCard';
import { getEvents } from '@/data/loaders';

export type SavedPageProps = Readonly<
  {
    className?: string;
  } & Omit<ViewProps, 'children'>
>;

type SavedTab = 'events' | 'organizers';

const cx = (...c: ReadonlyArray<string | null | undefined | false>): string =>
  c.filter(Boolean).join(' ');

function mapToResult(e: ReturnType<typeof getEvents>[number]): SearchResultItem {
  return {
    id: e.id,
    title: e.title,
    organizer: e.organizer,
    city: e.city ?? null,
    venue: e.venue,
    startsAtIso: e.startsAtIso,
    priceLabel: e.priceLabel ?? null,
    rating: null,
    thumbnailUrl: e.imageUrl,
  };
}

export default function SavedPage({ className, ...rest }: SavedPageProps): ReactElement {
  const [tab, setTab] = useState<SavedTab>('events');
  const insets = useSafeAreaInsets();

  const savedEvents: ReadonlyArray<SearchResultItem> = useMemo(
    () => getEvents().slice(0, 6).map(mapToResult),
    []
  );
  const savedOrganizers: ReadonlyArray<{ id: string; name: string }> = useMemo(
    () => [
      { id: 'org_1', name: 'Blue Note Entertainment' },
      { id: 'org_2', name: 'Photography Academy' },
    ],
    []
  );

  const bottomPad = (insets.bottom || 0) + 88;

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
            icon={<Feather name="grid" size={18} color={tab === 'events' ? '#0EA5E9' : '#374151'} />}
            selected={tab === 'events'}
            onPress={() => setTab('events')}
          />
          <SegBtn
            label={`Organizers (${savedOrganizers.length})`}
            icon={<Feather name="users" size={18} color={tab === 'organizers' ? '#0EA5E9' : '#374151'} />}
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
            {savedEvents.map((it) => (
              <SearchResultCard key={it.id} item={it} />
            ))}
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
        selected ? 'bg-white border border-gray300' : 'bg-transparent'
      )}
    >
      <View className={selected ? 'opacity-100' : 'opacity-80'}>{icon}</View>
      <Text className={selected ? 'text-brand font-medium' : 'text-gray700 font-medium'}>{label}</Text>
    </Pressable>
  );
}
