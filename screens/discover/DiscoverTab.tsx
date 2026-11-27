// screens/discover/DiscoverTab.tsx — Discover tab root (art/tab-Discover.png).
//
// Header ("Ready to go out? / Find your night", city pill), search + filters,
// segments (All / Events / Places / Artists) and type chips, then ranked and
// full sections. "See all" swaps the sections for a full list (with a back
// row) inside the tab. Search and filters run on the device.
import React, { useCallback, useMemo, useState, type ReactElement } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { ChevronDown, ChevronLeft, Flame, Mic2, Navigation, Search, SearchX, SlidersHorizontal, X } from 'lucide-react-native';

import type { Event } from '@/types/domain';
import type { Venue } from '@/lib/api/venues';
import type { DiscoverArtist } from '@/lib/api/artists';
import { EmptyState, Pill, softShadow } from '@/components/gs';
import { useTabBarSpace } from '@/components/navigation/BottomTabBar';
import { useAppNav } from '@/navigation/AppNav';
import { useEvents } from '@/providers/EventsProvider';
import { eventDistanceKm, eventStart, isLiveNow } from '@/lib/format';
import { gs } from '@/theme/colors';

import {
  DEFAULT_FILTERS,
  TYPE_CHIPS,
  activeFilterCount,
  artistMatches,
  eventMatches,
  isThisWeekEvent,
  isTodayEvent,
  venueDistanceKm,
  venueMatches,
  type DiscoverFilters,
  type MatchContext,
  type TypeChip,
} from './lib/filtering';
import { placeSeedFromVenue } from './lib/places';
import { cityFromLabel, useDiscoverData } from './useDiscoverData';
import { EventHeroCard, EventRowCard } from './components/EventCards';
import { PlaceRankCard, PlaceRowCard } from './components/PlaceCards';
import { ArtistRankCard, ArtistRowCard } from './components/ArtistCards';
import FilterSheet from './components/FilterSheet';
import CitySheet from './components/CitySheet';
import SectionTitle from './components/SectionTitle';

type Segment = 'all' | 'events' | 'places' | 'artists';
type SectionKey = 'today' | 'todayAll' | 'topWeek' | 'weekAll' | 'later' | 'bestPlaces' | 'allPlaces' | 'bestArtists' | 'allArtists';

type Section =
  | { key: SectionKey; kind: 'events'; layout: 'hero' | 'rows'; items: ReadonlyArray<Event> }
  | { key: SectionKey; kind: 'places'; layout: 'rank' | 'rows'; items: ReadonlyArray<{ v: Venue; rank: number }> }
  | { key: SectionKey; kind: 'artists'; layout: 'rank' | 'rows'; items: ReadonlyArray<DiscoverArtist> };

const ROWS_PREVIEW = 4;
const RANK_PREVIEW = 10;

const byStart = (a: Event, b: Event): number => (eventStart(a)?.getTime() ?? 0) - (eventStart(b)?.getTime() ?? 0);

export default function DiscoverTab(): ReactElement {
  const { t } = useTranslation();
  const nav = useAppNav();
  const { events, loading, error, reload, location } = useEvents();
  const tabSpace = useTabBarSpace();

  const city = location.choice?.label ?? cityFromLabel(location.label);
  const data = useDiscoverData(city, location.origin);

  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<DiscoverFilters>(DEFAULT_FILTERS);
  const [segment, setSegment] = useState<Segment>('all');
  const [chipKey, setChipKey] = useState<string | null>(null);
  const [seeAll, setSeeAll] = useState<SectionKey | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [cityOpen, setCityOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const chip: TypeChip | null = TYPE_CHIPS.find((c) => c.key === chipKey) ?? null;
  const origin = location.origin;
  const filterCount = activeFilterCount(filters);
  const searching = query.trim().length > 0 || filterCount > 0 || chip != null;

  const ctxFor = useCallback(
    (f: DiscoverFilters): MatchContext => ({ query, filters: f, chip, origin }),
    [query, chip, origin],
  );

  // ---- Matching --------------------------------------------------------------
  const compute = useCallback(
    (f: DiscoverFilters) => {
      const ctx = ctxFor(f);
      const evs = events.filter((e) => eventMatches(e, ctx));
      const places = (data.venues ?? []).filter((v) => venueMatches(v, ctx));
      const artists = (data.artists ?? []).filter((a) => artistMatches(a, ctx));
      return { evs, places, artists };
    },
    [ctxFor, events, data.venues, data.artists],
  );

  const matched = useMemo(() => compute(filters), [compute, filters]);

  const countIn = useCallback(
    (m: ReturnType<typeof compute>, seg: Segment): number =>
      (seg === 'all' || seg === 'events' ? m.evs.length : 0) +
      (seg === 'all' || seg === 'places' ? m.places.length : 0) +
      (seg === 'all' || seg === 'artists' ? m.artists.length : 0),
    [],
  );

  // ---- Sections -------------------------------------------------------------
  const sections = useMemo((): ReadonlyArray<Section> => {
    const now = new Date();
    const today = matched.evs.filter((e) => isTodayEvent(e, now)).sort((a, b) => Number(isLiveNow(b, now)) - Number(isLiveNow(a, now)) || byStart(a, b));
    const week = matched.evs.filter((e) => isThisWeekEvent(e, now)).sort(byStart);
    const top = [...week].sort((a, b) => (b.attendeeCount ?? 0) - (a.attendeeCount ?? 0));
    const later = matched.evs.filter((e) => !isThisWeekEvent(e, now)).sort(byStart);

    const dist = (v: Venue): number => venueDistanceKm(v, origin) ?? Number.POSITIVE_INFINITY;
    const allPlaces = [...matched.places].sort((a, b) => dist(a) - dist(b) || a.name.localeCompare(b.name));

    // Server ranking when available, else events this week + rating.
    let best: ReadonlyArray<{ v: Venue; rank: number }>;
    if (data.rankedVenues) {
      const ok = new Set(matched.places.map((p) => p.id));
      best = data.rankedVenues.filter((r) => ok.has(r.venue.id) || !data.venues).map((r) => ({ v: r.venue, rank: r.rank }));
    } else {
      const score = (v: Venue): number => {
        const n = week.filter((e) => (e.venueId && e.venueId === v.id) || e.venue.trim().toLowerCase() === v.name.trim().toLowerCase()).length;
        const r = v.rating ? v.rating.average * Math.log10(10 + v.rating.count) : 0;
        return n * 10 + r;
      };
      best = matched.places
        .map((v) => ({ v, s: score(v) }))
        .filter((x) => x.s > 0)
        .sort((a, b) => b.s - a.s)
        .map((x, i) => ({ v: x.v, rank: i + 1 }));
    }

    const rankedArtists = [...matched.artists].sort((a, b) => a.rank - b.rank);
    const artistsByGigs = [...matched.artists].sort((a, b) => b.gigsInPeriod - a.gigsInPeriod || a.artist.name.localeCompare(b.artist.name));

    const out: Section[] = [];
    if (segment === 'all' || segment === 'events') {
      out.push({ key: 'today', kind: 'events', layout: 'hero', items: today });
      out.push({ key: 'todayAll', kind: 'events', layout: 'rows', items: today });
      out.push({ key: 'topWeek', kind: 'events', layout: 'hero', items: top });
      out.push({ key: 'weekAll', kind: 'events', layout: 'rows', items: week });
      if (searching) out.push({ key: 'later', kind: 'events', layout: 'rows', items: later });
    }
    if ((segment === 'all' || segment === 'places') && data.venues) {
      out.push({ key: 'bestPlaces', kind: 'places', layout: 'rank', items: best });
      out.push({ key: 'allPlaces', kind: 'places', layout: 'rows', items: allPlaces.map((v, i) => ({ v, rank: i + 1 })) });
    }
    if ((segment === 'all' || segment === 'artists') && data.artists) {
      out.push({ key: 'bestArtists', kind: 'artists', layout: 'rank', items: rankedArtists });
      out.push({ key: 'allArtists', kind: 'artists', layout: 'rows', items: artistsByGigs });
    }
    return out.filter((s) => s.items.length > 0);
  }, [matched, segment, searching, origin, data.rankedVenues, data.venues]);

  const resultCount = countIn(matched, segment);

  // ---- Actions --------------------------------------------------------------
  const clearAll = (): void => {
    setQuery('');
    setFilters(DEFAULT_FILTERS);
    setChipKey(null);
  };

  const onRefresh = async (): Promise<void> => {
    setRefreshing(true);
    data.reload();
    await reload();
    setRefreshing(false);
  };

  const openEvent = (ev: Event): void => nav.push({ name: 'eventDetails', event: ev });
  const openPlace = (v: Venue): void => nav.push({ name: 'place', place: placeSeedFromVenue(v) });
  const openArtist = (a: DiscoverArtist): void => nav.push({ name: 'artist', artistId: a.artist.id, artistName: a.artist.name });

  const titleOf = (k: SectionKey): string => t(`discover.section.${k}`);
  const countOf = (s: Section): string | null => {
    if (s.layout === 'hero' || s.layout === 'rank') return null;
    return t(`discover.count.${s.kind}`, { count: s.items.length });
  };

  // ---- Rendering helpers ----------------------------------------------------
  const renderSection = (s: Section, full: boolean): ReactElement => {
    if (s.kind === 'events') {
      if (s.layout === 'hero' && !full) {
        return (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 6, gap: 14 }}>
            {s.items.slice(0, RANK_PREVIEW).map((ev) => (
              <EventHeroCard key={String(ev.id)} ev={ev} distanceKm={eventDistanceKm(ev, origin)} onPress={() => openEvent(ev)} />
            ))}
          </ScrollView>
        );
      }
      return (
        <View className="gap-y-3 px-5">
          {(full ? s.items : s.items.slice(0, ROWS_PREVIEW)).map((ev) => (
            <EventRowCard key={String(ev.id)} ev={ev} distanceKm={eventDistanceKm(ev, origin)} onPress={() => openEvent(ev)} />
          ))}
        </View>
      );
    }
    if (s.kind === 'places') {
      if (s.layout === 'rank' && !full) {
        return (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 6, gap: 14 }}>
            {s.items.slice(0, RANK_PREVIEW).map(({ v, rank }) => (
              <PlaceRankCard key={v.id} v={v} rank={rank} distanceKm={venueDistanceKm(v, origin)} onPress={() => openPlace(v)} />
            ))}
          </ScrollView>
        );
      }
      return (
        <View className="gap-y-3 px-5">
          {(full ? s.items : s.items.slice(0, ROWS_PREVIEW)).map(({ v }) => (
            <PlaceRowCard key={v.id} v={v} distanceKm={venueDistanceKm(v, origin)} onPress={() => openPlace(v)} />
          ))}
        </View>
      );
    }
    if (s.layout === 'rank' && !full) {
      return (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 6, gap: 14 }}>
          {s.items.slice(0, RANK_PREVIEW).map((a) => (
            <ArtistRankCard key={a.artist.id} item={a} onPress={() => openArtist(a)} />
          ))}
        </ScrollView>
      );
    }
    return (
      <View className="gap-y-3 px-5">
        {(full ? s.items : s.items.slice(0, ROWS_PREVIEW)).map((a) => (
          <ArtistRowCard key={a.artist.id} item={a} onPress={() => openArtist(a)} />
        ))}
      </View>
    );
  };

  const fullSection = seeAll ? sections.find((s) => s.key === seeAll) ?? null : null;

  const segmentEmpty = (): ReactElement | null => {
    if (segment === 'artists' && !data.artists && !data.loading) {
      return (
        <EmptyState
          icon={<Mic2 size={28} color={gs.violet} />}
          title={t('discover.empty.artistsSoonTitle')}
          message={t('discover.empty.artistsSoonMessage')}
        />
      );
    }
    if (segment === 'places' && !data.venues && !data.loading) {
      return (
        <EmptyState
          icon={<SearchX size={28} color={gs.violet} />}
          title={t('discover.empty.placesErrorTitle')}
          message={t('discover.empty.placesErrorMessage')}
          actionLabel={t('gs.retry')}
          onAction={data.reload}
        />
      );
    }
    return null;
  };

  // ---- Render ---------------------------------------------------------------
  return (
    <View className="flex-1 bg-surface">
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: tabSpace + 16 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} tintColor={gs.violet} />}
      >
        {/* Header */}
        <View className="flex-row items-start justify-between px-5 pt-3">
          <View className="flex-1 pr-3">
            <Text className="text-[16px] font-extrabold" style={{ color: gs.violet }}>
              {t('discover.kicker')}
            </Text>
            <Text className="mt-0.5 text-[34px] font-extrabold leading-[38px] text-ink" style={{ letterSpacing: -0.8, maxWidth: 220 }} accessibilityRole="header">
              {t('discover.title')}
            </Text>
          </View>
          <Pressable
            onPress={() => setCityOpen(true)}
            accessibilityRole="button"
            accessibilityLabel={t('discover.city.change', { city: location.label || '…' })}
            className="mt-1 h-12 flex-row items-center rounded-full bg-white px-4"
            style={softShadow}
          >
            <Navigation size={15} color={gs.violet} fill={gs.violet} />
            <Text className="mx-2 max-w-[120px] text-[15px] font-extrabold text-ink" numberOfLines={1}>
              {location.label || '…'}
            </Text>
            <ChevronDown size={16} color={gs.ink} />
          </Pressable>
        </View>

        {/* Search + filters */}
        <View className="mt-5 flex-row items-center gap-x-3 px-5">
          <View className="h-14 flex-1 flex-row items-center rounded-[20px] bg-white px-4" style={softShadow}>
            <View style={{ flexShrink: 0 }}>
              <Search size={20} color={gs.subtle} />
            </View>
            <TextInput
              value={query}
              onChangeText={(v) => {
                setQuery(v);
              }}
              placeholder={t('discover.searchPlaceholder')}
              placeholderTextColor={gs.faint}
              returnKeyType="search"
              accessibilityLabel={t('discover.searchPlaceholder')}
              className="ml-3 flex-1 text-[16px] text-ink"
              style={{ paddingVertical: 0, minWidth: 0, outlineStyle: 'none' } as object}
            />
            {query ? (
              <Pressable onPress={() => setQuery('')} accessibilityRole="button" accessibilityLabel={t('discover.clearSearch')} hitSlop={10}>
                <X size={18} color={gs.muted} />
              </Pressable>
            ) : null}
          </View>
          <Pressable
            onPress={() => setFilterOpen(true)}
            accessibilityRole="button"
            accessibilityLabel={t('discover.filters.a11y', { count: filterCount })}
            className="h-14 w-14 items-center justify-center rounded-[20px]"
            style={[softShadow, { backgroundColor: filterCount > 0 ? gs.violet : gs.white }]}
          >
            <SlidersHorizontal size={21} color={filterCount > 0 ? gs.white : gs.ink} />
            {filterCount > 0 ? (
              <View className="absolute -right-1 -top-1 h-5 min-w-[20px] items-center justify-center rounded-full border-2 border-white px-1" style={{ backgroundColor: gs.pink }}>
                <Text className="text-[11px] font-bold text-white">{filterCount}</Text>
              </View>
            ) : null}
          </Pressable>
        </View>

        {fullSection ? (
          // ---------- "See all" list ----------
          <View>
            <View className="mt-5 flex-row items-center px-5">
              <Pressable
                onPress={() => setSeeAll(null)}
                accessibilityRole="button"
                accessibilityLabel={t('gs.back')}
                className="h-11 w-11 items-center justify-center rounded-full bg-white"
                style={softShadow}
              >
                <ChevronLeft size={22} color={gs.ink} />
              </Pressable>
              <View className="ml-3 flex-1">
                <Text className="text-[22px] font-extrabold text-ink" numberOfLines={1} accessibilityRole="header">
                  {titleOf(fullSection.key)}
                </Text>
                <Text className="text-[13px] font-semibold text-muted">{t(`discover.count.${fullSection.kind}`, { count: fullSection.items.length })}</Text>
              </View>
            </View>
            <View className="mt-5">{renderSection(fullSection, true)}</View>
          </View>
        ) : (
          <>
            {/* Segments + type chips */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-4" contentContainerStyle={{ paddingHorizontal: 20, gap: 8, alignItems: 'center' }}>
              {(['all', 'events', 'places', 'artists'] as const).map((s) => (
                <Pill key={s} label={t(`discover.segment.${s}`)} active={segment === s} onPress={() => setSegment(s)} />
              ))}
              <View className="mx-1 h-7 w-px" style={{ backgroundColor: gs.lineStrong }} />
              {TYPE_CHIPS.map((c) => (
                <Pill key={c.key} label={t(`discover.chip.${c.key}`)} active={chipKey === c.key} onPress={() => setChipKey(chipKey === c.key ? null : c.key)} />
              ))}
            </ScrollView>

            {searching ? (
              <View className="mt-4 flex-row items-center px-5">
                <Text className="text-[14px] font-bold text-subtle">{t('discover.results', { count: resultCount })}</Text>
                <Pressable onPress={clearAll} accessibilityRole="button" hitSlop={8} className="ml-4 min-h-[32px] justify-center">
                  <Text className="text-[14px] font-bold text-subtle underline">{t('discover.clearAll')}</Text>
                </Pressable>
              </View>
            ) : null}

            {loading && events.length === 0 ? (
              <View className="items-center py-16">
                <ActivityIndicator color={gs.violet} />
              </View>
            ) : error && events.length === 0 && (segment === 'all' || segment === 'events') ? (
              <EmptyState
                icon={<SearchX size={28} color={gs.violet} />}
                title={t('gs.errorTitle')}
                message={t('discover.empty.eventsError')}
                actionLabel={t('gs.retry')}
                onAction={() => void reload()}
              />
            ) : (
              segmentEmpty() ??
              (sections.length === 0 ? (
                data.loading ? (
                  <View className="items-center py-16">
                    <ActivityIndicator color={gs.violet} />
                  </View>
                ) : (
                  <EmptyState
                    icon={<SearchX size={28} color={gs.violet} />}
                    title={searching ? t('discover.empty.noResultsTitle') : t('discover.empty.nothingTitle')}
                    message={searching ? t('discover.empty.noResultsMessage') : t('discover.empty.nothingMessage')}
                    actionLabel={searching ? t('discover.empty.reset') : undefined}
                    onAction={searching ? clearAll : undefined}
                  />
                )
              ) : (
                sections.map((s) => {
                  const canSeeAll = s.layout === 'rows' ? s.items.length > ROWS_PREVIEW || s.key === 'todayAll' || s.key === 'weekAll' : s.items.length > 1;
                  return (
                    <View key={s.key} className="mt-7">
                      <SectionTitle
                        title={titleOf(s.key)}
                        icon={s.key === 'today' ? <Flame size={20} color="#F2542D" fill="#F2542D" /> : undefined}
                        count={countOf(s)}
                        onSeeAll={canSeeAll ? () => setSeeAll(s.key) : undefined}
                        className="mb-3"
                      />
                      {renderSection(s, false)}
                    </View>
                  );
                })
              ))
            )}
            {segment === 'all' && !data.artists && !data.loading && sections.length > 0 && !searching ? (
              <View className="mx-5 mt-8 flex-row items-center rounded-[22px] bg-white p-4" style={softShadow}>
                <View className="h-11 w-11 items-center justify-center rounded-full" style={{ backgroundColor: gs.violetSoft }}>
                  <Mic2 size={20} color={gs.violet} />
                </View>
                <View className="ml-3 flex-1">
                  <Text className="text-[15px] font-extrabold text-ink">{t('discover.empty.artistsSoonTitle')}</Text>
                  <Text className="text-[13px] text-muted">{t('discover.empty.artistsSoonShort')}</Text>
                </View>
              </View>
            ) : null}
          </>
        )}
      </ScrollView>

      <FilterSheet
        visible={filterOpen}
        value={filters}
        onClose={() => setFilterOpen(false)}
        onApply={setFilters}
        countFor={(draft) => countIn(compute(draft), segment)}
      />
      <CitySheet visible={cityOpen} onClose={() => setCityOpen(false)} />
    </View>
  );
}
