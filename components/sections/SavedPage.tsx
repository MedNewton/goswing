// components/sections/SavedPage.tsx — Saved: events, followed organizers and
// saved songs (Phase 4 route 165). Saved posts belong to Social (deferred).
import React, { useCallback, useEffect, useMemo, useState, type ReactElement } from 'react';
import { ActivityIndicator, Alert, Linking, Pressable, ScrollView, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Heart, Music, Store, UserCheck, X } from 'lucide-react-native';

import { gs } from '@/theme/colors';
import { Cover, EmptyState, GsButton, softShadow } from '@/components/gs';
import { useEvents } from '@/providers/EventsProvider';
import { listFavoriteEvents, type SavedEvent } from '@/lib/supabase/saved';
import { listFollowedOrganizers, unfollowOrganizer, type FollowedOrganizer } from '@/lib/supabase/organizers';
import { deleteSavedSong, listSavedSongs, type ApiSavedSong } from '@/lib/api/profile';
import { eventEnd, formatMoney, hhmm, shortDate } from '@/lib/format';
import { Segmented } from '@/screens/profile/components/ui';
import type { Event } from '@/types/domain';

export type SavedPageProps = Readonly<{
  onOpenEvent?: (eventId: string) => void;
  onOpenOrganizer?: (payload: { organizerId: string; organizerName?: string }) => void;
  bottomInset?: number;
}>;

type SavedTab = 'events' | 'organizers' | 'songs';
type Load<T> = Readonly<{
  loading: boolean;
  error: string | null;
  items: ReadonlyArray<T>;
}>;

const START: Load<never> = { loading: true, error: null, items: [] };

/** A saved event with its display state resolved. */
type SavedRow = SavedEvent & Readonly<{ start: Date | null; ended: boolean; price: string | null }>;

function resolveRow(e: SavedEvent, known: Event | undefined, now: Date): SavedRow {
  const start = e.startsAtIso ? new Date(e.startsAtIso) : null;
  const validStart = start && !Number.isNaN(start.getTime()) ? start : null;
  const end = known ? eventEnd(known) : validStart ? new Date(validStart.getTime() + 4 * 3600_000) : null;
  let price = e.priceLabel?.trim() || null;
  if (!price && known && typeof known.basePrice === 'number') price = known.basePrice <= 0 ? null : formatMoney(known.basePrice);
  return { ...e, start: validStart, ended: !!end && end <= now, price };
}

export default function SavedPage({ onOpenEvent, onOpenOrganizer, bottomInset = 24 }: SavedPageProps): ReactElement {
  const { t, i18n } = useTranslation();
  const { events, toggleSaved } = useEvents();
  const [tab, setTab] = useState<SavedTab>('events');

  const [saved, setSaved] = useState<Load<SavedEvent>>(START);
  const [orgs, setOrgs] = useState<Load<FollowedOrganizer>>(START);
  // null items = the saved-songs route is not deployed yet.
  const [songs, setSongs] = useState<Load<ApiSavedSong> & { available: boolean }>({ ...START, available: true });

  const loadEvents = useCallback(async () => {
    setSaved((s) => ({ ...s, loading: true, error: null }));
    try {
      setSaved({
        loading: false,
        error: null,
        items: await listFavoriteEvents({ limit: 100 }),
      });
    } catch (e: unknown) {
      setSaved({
        loading: false,
        error: e instanceof Error ? e.message : t('saved.loadEventsFailed'),
        items: [],
      });
    }
  }, [t]);

  const loadOrgs = useCallback(async () => {
    setOrgs((s) => ({ ...s, loading: true, error: null }));
    try {
      setOrgs({
        loading: false,
        error: null,
        items: await listFollowedOrganizers(),
      });
    } catch (e: unknown) {
      setOrgs({
        loading: false,
        error: e instanceof Error ? e.message : t('saved.loadOrganizersFailed'),
        items: [],
      });
    }
  }, [t]);

  const loadSongs = useCallback(async () => {
    setSongs((s) => ({ ...s, loading: true, error: null }));
    try {
      const items = await listSavedSongs();
      setSongs({
        loading: false,
        error: null,
        items: items ?? [],
        available: items !== null,
      });
    } catch (e: unknown) {
      setSongs({
        loading: false,
        error: e instanceof Error ? e.message : t('profile.saved.songsError'),
        items: [],
        available: true,
      });
    }
  }, [t]);

  useEffect(() => {
    void loadEvents();
    void loadOrgs();
    void loadSongs();
  }, [loadEvents, loadOrgs, loadSongs]);

  const rows = useMemo<ReadonlyArray<SavedRow>>(() => {
    const now = new Date();
    const byId = new Map(events.map((e) => [String(e.id), e]));
    const all = saved.items.map((e) => resolveRow(e, byId.get(String(e.id)), now));
    const upcoming = all.filter((r) => !r.ended).sort((a, b) => (a.start?.getTime() ?? 0) - (b.start?.getTime() ?? 0));
    const ended = all.filter((r) => r.ended).sort((a, b) => (b.start?.getTime() ?? 0) - (a.start?.getTime() ?? 0));
    return [...upcoming, ...ended];
  }, [saved.items, events]);

  const unsave = async (id: string): Promise<void> => {
    const prev = saved.items;
    setSaved((s) => ({
      ...s,
      items: s.items.filter((e) => String(e.id) !== id),
    }));
    try {
      await toggleSaved(id, false);
    } catch (e: unknown) {
      setSaved((s) => ({ ...s, items: prev }));
      Alert.alert(t('common.error'), e instanceof Error ? e.message : t('profile.tryAgain'));
    }
  };

  const unfollow = async (o: FollowedOrganizer): Promise<void> => {
    const prev = orgs.items;
    setOrgs((s) => ({ ...s, items: s.items.filter((x) => x.id !== o.id) }));
    try {
      await unfollowOrganizer(o.id);
    } catch (e: unknown) {
      setOrgs((s) => ({ ...s, items: prev }));
      Alert.alert(t('common.error'), e instanceof Error ? e.message : t('saved.couldNotUnfollow'));
    }
  };

  const removeSong = async (s: ApiSavedSong): Promise<void> => {
    const prev = songs.items;
    setSongs((x) => ({ ...x, items: x.items.filter((y) => y.id !== s.id) }));
    try {
      await deleteSavedSong(s.id);
    } catch (e: unknown) {
      setSongs((x) => ({ ...x, items: prev }));
      Alert.alert(t('common.error'), e instanceof Error ? e.message : t('profile.tryAgain'));
    }
  };

  const count = (l: Load<unknown>): string => (l.loading ? '' : ` (${l.items.length})`);
  const options: ReadonlyArray<{ key: SavedTab; label: string }> = [
    { key: 'events', label: `${t('profile.saved.events')}${count(saved)}` },
    {
      key: 'organizers',
      label: `${t('profile.saved.organizers')}${count(orgs)}`,
    },
    {
      key: 'songs',
      label: `${t('profile.saved.songs')}${songs.available ? count(songs) : ''}`,
    },
  ];

  const locale = i18n.language;

  const body = (): ReactElement => {
    if (tab === 'events') {
      if (saved.loading && saved.items.length === 0) return <Spinner />;
      if (saved.error) return <ErrorState message={saved.error} onRetry={loadEvents} />;
      if (rows.length === 0)
        return (
          <EmptyState
            icon={<Heart size={28} color={gs.violet} />}
            title={t('saved.emptyEventsTitle')}
            message={t('saved.emptyEventsMessage')}
          />
        );
      return (
        <View className="gap-y-3">
          {rows.map((r) => (
            <View
              key={r.id}
              className="mx-5 flex-row items-center rounded-[24px] bg-white p-3"
              style={[softShadow, r.ended ? { opacity: 0.62 } : null]}
            >
              <Pressable
                onPress={() => onOpenEvent?.(String(r.id))}
                accessibilityRole="button"
                accessibilityLabel={r.title}
                className="flex-1 flex-row items-center"
              >
                <Cover uri={r.imageUrl} toneKey={String(r.id)} radius={18} style={{ width: 84, height: 84 }} />
                <View className="flex-1 ml-3.5 pr-2">
                  <Text className="text-[13px] font-bold" style={{ color: r.ended ? gs.muted : gs.violet }} numberOfLines={1}>
                    {r.ended
                      ? `${t('profile.saved.ended')}${r.start ? ` · ${shortDate(r.start, locale)}` : ''}`
                      : r.start
                        ? `${shortDate(r.start, locale)} · ${hhmm(r.start)}`
                        : ''}
                  </Text>
                  <Text className="text-[17px] font-extrabold text-ink" numberOfLines={1}>
                    {r.title}
                  </Text>
                  <Text className="text-[14px] text-subtle" numberOfLines={1}>
                    {[r.organizer, r.venue].filter(Boolean).join(' · ')}
                  </Text>
                  {r.price ? <Text className="text-[16px] font-extrabold text-ink mt-0.5">{r.price}</Text> : null}
                </View>
              </Pressable>
              <Pressable
                onPress={() => void unsave(String(r.id))}
                accessibilityRole="button"
                accessibilityLabel={t('profile.saved.unsave', {
                  title: r.title,
                })}
                className="h-12 w-12 rounded-full items-center justify-center"
                style={{ backgroundColor: gs.pinkSoft }}
              >
                <Heart size={22} color={gs.pink} fill={gs.pink} />
              </Pressable>
            </View>
          ))}
        </View>
      );
    }

    if (tab === 'organizers') {
      if (orgs.loading && orgs.items.length === 0) return <Spinner />;
      if (orgs.error) return <ErrorState message={orgs.error} onRetry={loadOrgs} />;
      if (orgs.items.length === 0)
        return (
          <EmptyState
            icon={<Store size={28} color={gs.violet} />}
            title={t('saved.emptyOrganizersTitle')}
            message={t('saved.emptyOrganizersMessage')}
          />
        );
      return (
        <View className="gap-y-3">
          {orgs.items.map((o) => (
            <View key={o.id} className="mx-5 flex-row items-center rounded-[24px] bg-white p-3" style={softShadow}>
              <Pressable
                onPress={() =>
                  onOpenOrganizer?.({
                    organizerId: o.id,
                    organizerName: o.name,
                  })
                }
                accessibilityRole="button"
                accessibilityLabel={o.name}
                className="flex-1 flex-row items-center"
              >
                <Cover uri={o.logoUrl} toneKey={o.id} radius={28} style={{ width: 56, height: 56 }} />
                <View className="flex-1 ml-3.5 pr-2">
                  <Text className="text-[17px] font-extrabold text-ink" numberOfLines={1}>
                    {o.name}
                  </Text>
                  <Text className="text-[13px] text-subtle" numberOfLines={1}>
                    {o.followedAt
                      ? t('profile.saved.followingSince', {
                          date: new Date(o.followedAt).toLocaleDateString(locale, { month: 'short', year: 'numeric' }),
                        })
                      : t('saved.following')}
                  </Text>
                </View>
              </Pressable>
              <Pressable
                onPress={() => void unfollow(o)}
                accessibilityRole="button"
                accessibilityLabel={t('profile.saved.unfollow', {
                  name: o.name,
                })}
                className="h-10 px-4 rounded-full flex-row items-center"
                style={{ backgroundColor: gs.violetSoft }}
              >
                <UserCheck size={16} color={gs.violet} />
                <Text className="ml-1.5 text-[14px] font-bold" style={{ color: gs.violetDark }}>
                  {t('saved.following')}
                </Text>
              </Pressable>
            </View>
          ))}
        </View>
      );
    }

    // Songs
    if (songs.loading && songs.items.length === 0) return <Spinner />;
    if (!songs.available)
      return (
        <EmptyState
          icon={<Music size={28} color={gs.violet} />}
          title={t('profile.saved.songsSoonTitle')}
          message={t('profile.saved.songsSoonMessage')}
        />
      );
    if (songs.error) return <ErrorState message={songs.error} onRetry={loadSongs} />;
    if (songs.items.length === 0)
      return (
        <EmptyState
          icon={<Music size={28} color={gs.violet} />}
          title={t('profile.saved.songsEmptyTitle')}
          message={t('profile.saved.songsEmptyMessage')}
        />
      );
    return (
      <View className="gap-y-3">
        {songs.items.map((s) => (
          <View key={s.id} className="mx-5 flex-row items-center rounded-[24px] bg-white p-3" style={softShadow}>
            <Pressable
              onPress={s.externalUrl ? () => void Linking.openURL(String(s.externalUrl)) : undefined}
              disabled={!s.externalUrl}
              accessibilityRole={s.externalUrl ? 'link' : undefined}
              accessibilityLabel={`${s.title}, ${s.artistName ?? ''}`}
              className="flex-1 flex-row items-center"
            >
              <Cover uri={s.artworkUrl} toneKey={s.id} radius={14} style={{ width: 56, height: 56 }}>
                {s.artworkUrl ? null : (
                  <View className="flex-1 items-center justify-center">
                    <Music size={22} color="rgba(255,255,255,0.85)" />
                  </View>
                )}
              </Cover>
              <View className="flex-1 ml-3.5 pr-2">
                <Text className="text-[16px] font-extrabold text-ink" numberOfLines={1}>
                  {s.title}
                </Text>
                <Text className="text-[14px] text-subtle" numberOfLines={1}>
                  {[s.artistName, s.durationSec ? `${Math.floor(s.durationSec / 60)}:${String(s.durationSec % 60).padStart(2, '0')}` : null]
                    .filter(Boolean)
                    .join(' · ')}
                </Text>
                {s.fromEvent?.title ? (
                  <Text className="text-[12px] font-bold mt-0.5" style={{ color: gs.violet }} numberOfLines={1}>
                    {t('profile.saved.fromEvent', { title: s.fromEvent.title })}
                  </Text>
                ) : null}
              </View>
            </Pressable>
            <Pressable
              onPress={() => void removeSong(s)}
              accessibilityRole="button"
              accessibilityLabel={t('profile.saved.removeSong', {
                title: s.title,
              })}
              className="h-11 w-11 rounded-full items-center justify-center"
              style={{ backgroundColor: gs.surface2 }}
            >
              <X size={18} color={gs.subtle} />
            </Pressable>
          </View>
        ))}
      </View>
    );
  };

  return (
    <View className="flex-1">
      <Segmented options={options} value={tab} onChange={setTab} />
      <ScrollView
        className="flex-1 mt-4"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: 4, paddingBottom: bottomInset }}
      >
        {body()}
      </ScrollView>
    </View>
  );
}

function Spinner(): ReactElement {
  return (
    <View className="py-16 items-center">
      <ActivityIndicator color={gs.violet} />
    </View>
  );
}

function ErrorState({ message, onRetry }: Readonly<{ message: string; onRetry: () => void }>): ReactElement {
  const { t } = useTranslation();
  return (
    <View className="items-center px-8 py-12">
      <Text className="text-[17px] font-extrabold text-ink text-center">{t('gs.errorTitle')}</Text>
      <Text className="mt-1 text-[14px] text-muted text-center">{message}</Text>
      <GsButton label={t('gs.retry')} variant="secondary" onPress={onRetry} className="mt-4" />
    </View>
  );
}
