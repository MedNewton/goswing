import React, { useMemo, useState, type ReactElement } from 'react';
import { View, Text, ScrollView, Pressable, type ViewProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import SearchBar from '@/components/blocks/SearchBar';
import LocationPicker, { DEFAULT_CITIES } from '@/components/blocks/LocationPicker';
import SearchResultCard, { type SearchResultItem } from '@/components/ui/SearchResultCard';
import { getEvents } from '@/data/loaders';

export type SearchPageProps = Readonly<
    {
        className?: string;
    } & Omit<ViewProps, 'children'>
>;

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

type Mode = 'list' | 'map';

export default function SearchPage({ className, ...rest }: SearchPageProps): ReactElement {
    const [query, setQuery] = useState<string>('');
    const [location, setLocation] = useState<string | null>(null);
    const [mode, setMode] = useState<Mode>('list');

    const insets = useSafeAreaInsets();
    const TAB_BAR_HEIGHT = 56;
    const bottomPad = insets.bottom + TAB_BAR_HEIGHT + 16;

    const resultsBase: ReadonlyArray<SearchResultItem> = useMemo(
        () => getEvents().map(mapToResult),
        []
    );

    const filtered: ReadonlyArray<SearchResultItem> = useMemo(() => {
        let rows = resultsBase;

        if (query.trim()) {
            const q = query.trim().toLowerCase();
            rows = rows.filter(
                (r) =>
                    r.title.toLowerCase().includes(q) ||
                    r.organizer.toLowerCase().includes(q) ||
                    (r.venue ? r.venue.toLowerCase().includes(q) : false) ||
                    (r.city ? r.city.toLowerCase().includes(q) : false)
            );
        }

        if (location) {
            const label =
                DEFAULT_CITIES.find((c) => c.key === location)?.label.toLowerCase() ?? '';
            if (label) {
                rows = rows.filter((r) =>
                    (r.city ?? '').toLowerCase().includes(label.split(',')[0] ?? '')
                );
            }
        }

        return rows;
    }, [resultsBase, query, location]);

    return (
        <View {...rest} className={cx('w-full flex-1', className)}>
            <View className="px-4 mt-2">
                <SearchBar
                    value={query}
                    onChangeText={setQuery}
                    onSubmit={() => { }}
                    onPressFilter={() => { }}
                    className=""
                />
            </View>

            <View className="px-4 mt-3">
                <LocationPicker value={location} onChange={setLocation} />
            </View>

            <View className="px-4 mt-3">
                <View className="flex-row items-center rounded-full bg-gray100 p-1 border border-gray200">
                    <SegBtn
                        label="List"
                        icon="list"
                        selected={mode === 'list'}
                        onPress={() => setMode('list')}
                    />
                    <SegBtn
                        label="Map"
                        icon="map"
                        selected={mode === 'map'}
                        onPress={() => setMode('map')}
                    />
                </View>
            </View>

            <View className="px-4 mt-4">
                <View className="flex-row items-center justify-between">
                    <Text className="text-sm text-gray700">
                        {filtered.length} {filtered.length === 1 ? 'event' : 'events'} found
                    </Text>
                    <Pressable className="flex-row items-center gap-x-2 rounded-2xl bg-gray100 border border-gray200 px-3 py-2">
                        <Text className="text-sm text-gray700">Date</Text>
                        <Feather name="chevron-down" size={16} color="#6B7280" />
                    </Pressable>
                </View>
            </View>

            <View className="mt-3 px-4 flex-1">
                {mode === 'list' ? (
                    <ScrollView
                        showsVerticalScrollIndicator={false}
                        contentContainerClassName="gap-y-3"
                        contentContainerStyle={{ paddingBottom: (insets.bottom || 0) + 40 }}
                        keyboardShouldPersistTaps="handled"
                    >
                        {filtered.map((item) => (
                            <SearchResultCard key={item.id} item={item} />
                        ))}
                        <View style={{ height: (insets.bottom || 0) + 24 }} />
                    </ScrollView>
                ) : (
                    <View className="h-72 items-center justify-center rounded-2xl border border-gray200 bg-white">
                        <Text className="text-gray600">Map coming soon…</Text>
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
    icon: keyof typeof Feather.glyphMap;
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
            <Feather name={icon} size={18} color={selected ? '#0EA5E9' : '#374151'} />
            <Text className={selected ? 'text-brand font-medium' : 'text-gray700 font-medium'}>
                {label}
            </Text>
        </Pressable>
    );
}
