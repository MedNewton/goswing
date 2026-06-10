// app/(tabs)/saved.tsx  (SavedPage)
import { useCallback, useEffect, useState, type ReactElement } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Image,
  Alert,
  type ViewProps,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import SearchResultCard, { type SearchResultItem } from '@/components/ui/SearchResultCard';

import { useAuth } from '@clerk/clerk-expo';

import { listFavoriteEvents } from '@/lib/supabase/saved';
import {
  listFollowedOrganizers,
  unfollowOrganizer,
  type FollowedOrganizer,
} from '@/lib/supabase/organizers';

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
  const { t } = useTranslation();
  const [tab, setTab] = useState<SavedTab>('events');
  const insets = useSafeAreaInsets();

  const { userId } = useAuth();

  const [savedEvents, setSavedEvents] = useState<ReadonlyArray<SearchResultItem>>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [errMsg, setErrMsg] = useState<string | null>(null);

  // Organizers tab state
  const [followedOrgs, setFollowedOrgs] = useState<ReadonlyArray<FollowedOrganizer>>([]);
  const [orgsLoading, setOrgsLoading] = useState<boolean>(false);
  const [orgsError, setOrgsError] = useState<string | null>(null);
  const [unfollowingIds, setUnfollowingIds] = useState<Set<string>>(new Set());

  // Fetch saved events
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

        const rows = await listFavoriteEvents({ limit: 100 });

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
        setErrMsg(e?.message ? String(e.message) : t('saved.loadEventsFailed'));
        setSavedEvents([]);
      } finally {
        if (!mounted) return;
        setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [tab, userId, t]);

  // Fetch followed organizers
  useEffect(() => {
    if (tab !== 'organizers') return;

    let mounted = true;

    (async () => {
      try {
        setOrgsLoading(true);
        setOrgsError(null);

        const orgs = await listFollowedOrganizers();

        if (!mounted) return;
        setFollowedOrgs(orgs);
      } catch (e: any) {
        if (!mounted) return;
        setOrgsError(e?.message ? String(e.message) : t('saved.loadOrganizersFailed'));
        setFollowedOrgs([]);
      } finally {
        if (!mounted) return;
        setOrgsLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [tab, t]);

  const handleUnfollow = useCallback(async (orgId: string, orgName: string) => {
    Alert.alert(
      t('saved.unfollowTitle'),
      t('saved.unfollowConfirm', { name: orgName }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('saved.unfollowAction'),
          style: 'destructive',
          onPress: async () => {
            setUnfollowingIds((prev) => new Set(prev).add(orgId));
            try {
              await unfollowOrganizer(orgId);
              setFollowedOrgs((prev) => prev.filter((o) => o.id !== orgId));
            } catch (e: any) {
              Alert.alert(t('common.error'), e?.message ?? t('saved.couldNotUnfollow'));
            } finally {
              setUnfollowingIds((prev) => {
                const next = new Set(prev);
                next.delete(orgId);
                return next;
              });
            }
          },
        },
      ],
    );
  }, [t]);

  const bottomPad = (insets.bottom || 0) + 88;

  const handlePressEvent = (eventId: string): void => {
    if (typeof onOpenEvent === 'function') onOpenEvent(String(eventId));
  };

  return (
    <View {...rest} className={cx('flex-1 w-full', className)}>
      <View className="px-5 pt-4">
        <Text className="text-3xl font-bold text-black">{t('saved.title')}</Text>
        <Text className="text-base text-gray500 mt-2">
          {t('saved.subtitle')}
        </Text>
      </View>

      <View className="px-5 mt-4">
        <View className="flex-row items-center rounded-full bg-gray100 p-1 border border-gray200">
          <SegBtn
            label={t('saved.eventsTab', { count: savedEvents.length })}
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
            label={t('saved.organizersTab', { count: followedOrgs.length })}
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
                <Text className="mt-3 text-gray500">{t('saved.loadingEvents')}</Text>
              </View>
            ) : errMsg ? (
              <View className="rounded-2xl border border-gray200 bg-white p-4">
                <Text className="text-gray800 font-medium">{t('saved.couldNotLoadEvents')}</Text>
                <Text className="text-gray500 mt-2">{errMsg}</Text>
              </View>
            ) : savedEvents.length === 0 ? (
              <View className="rounded-2xl border border-gray200 bg-white p-4">
                <Text className="text-gray800 font-medium">{t('saved.emptyEventsTitle')}</Text>
                <Text className="text-gray500 mt-2">
                  {t('saved.emptyEventsMessage')}
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
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: bottomPad }}
            keyboardShouldPersistTaps="handled"
          >
            {orgsLoading ? (
              <View className="py-8 items-center justify-center">
                <ActivityIndicator />
                <Text className="mt-3 text-gray500">{t('saved.loadingOrganizers')}</Text>
              </View>
            ) : orgsError ? (
              <View className="rounded-2xl border border-gray200 bg-white p-4">
                <Text className="text-gray800 font-medium">{t('saved.couldNotLoadOrganizers')}</Text>
                <Text className="text-gray500 mt-2">{orgsError}</Text>
              </View>
            ) : followedOrgs.length === 0 ? (
              <View className="rounded-2xl border border-gray200 bg-white p-4">
                <Text className="text-gray800 font-medium">{t('saved.emptyOrganizersTitle')}</Text>
                <Text className="text-gray500 mt-2">
                  {t('saved.emptyOrganizersMessage')}
                </Text>
              </View>
            ) : (
              <View className="rounded-2xl border border-gray200 bg-white p-4 gap-y-0">
                {followedOrgs.map((o) => (
                  <View
                    key={o.id}
                    className="flex-row items-center justify-between px-2 py-3 border-b border-gray100"
                  >
                    <View className="flex-row items-center gap-x-3 flex-1">
                      {o.logoUrl ? (
                        <Image
                          source={{ uri: o.logoUrl }}
                          className="h-9 w-9 rounded-full"
                          resizeMode="cover"
                        />
                      ) : (
                        <View className="h-9 w-9 rounded-full bg-gray200 items-center justify-center">
                          <Feather name="user" size={18} color="#6B7280" />
                        </View>
                      )}
                      <Text className="text-gray800 flex-1" numberOfLines={1}>{o.name}</Text>
                    </View>
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => handleUnfollow(o.id, o.name)}
                      disabled={unfollowingIds.has(o.id)}
                      className={cx(
                        'rounded-full px-3 py-1.5 border',
                        unfollowingIds.has(o.id) ? 'bg-gray100 border-gray200 opacity-50' : 'bg-black border-black',
                      )}
                    >
                      <Text className={cx('text-sm', unfollowingIds.has(o.id) ? 'text-gray500' : 'text-white')}>
                        {unfollowingIds.has(o.id) ? t('saved.unfollowing') : t('saved.following')}
                      </Text>
                    </Pressable>
                  </View>
                ))}
              </View>
            )}

            <View style={{ height: (insets.bottom || 0) + 24 }} />
          </ScrollView>
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
