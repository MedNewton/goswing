// screens/discover/ArtistPage.tsx — artist page (art-1).
// Data: Phase 4 routes 139–144. Until they ship the page shows the artist's
// name and a "coming soon" state.
import React, { useEffect, useState, type ReactElement } from 'react';
import { ActivityIndicator, Alert, Linking, Pressable, ScrollView, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { BadgeCheck, Building2, CalendarX, Globe, AtSign, Mic2, Music2, Play, Store } from 'lucide-react-native';

import { useAppNav } from '@/navigation/AppNav';
import { EmptyState, GsButton, StatusChip } from '@/components/gs';
import { gs } from '@/theme/colors';
import { compactCount, hhmm } from '@/lib/format';
import { getArtist, getArtistGigs, setArtistFollow, type Artist, type GigSummary } from '@/lib/api/artists';

import { BlockTitle, Card, DetailCover, InfoRow, KindChip, RingAvatar, StatsLine, UnderlineTabs } from './components/DetailParts';
import { EventDateRow } from './components/EventCards';
import { artistRole, dayLabel } from './components/ArtistCards';
import { plainText, shareText } from './lib/places';

type Tab = 'gigs' | 'music' | 'about';

const LINKS: ReadonlyArray<{ key: 'spotifyUrl' | 'appleMusicUrl' | 'soundcloudUrl' | 'youtubeUrl'; label: string; color: string }> = [
  { key: 'spotifyUrl', label: 'Spotify', color: '#1DB954' },
  { key: 'appleMusicUrl', label: 'Apple Music', color: '#FA243C' },
  { key: 'soundcloudUrl', label: 'SoundCloud', color: '#FF5500' },
  { key: 'youtubeUrl', label: 'YouTube', color: '#FF0000' },
];

export default function ArtistPage({
  artistId,
  artistName,
  onBack,
}: Readonly<{ artistId: string; artistName?: string; onBack: () => void }>): ReactElement {
  const { t, i18n } = useTranslation();
  const nav = useAppNav();
  const [artist, setArtist] = useState<Artist | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  const [loading, setLoading] = useState(true);
  const [upcoming, setUpcoming] = useState<ReadonlyArray<GigSummary>>([]);
  const [past, setPast] = useState<ReadonlyArray<GigSummary>>([]);
  const [tab, setTab] = useState<Tab>('gigs');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void Promise.allSettled([getArtist(artistId), getArtistGigs(artistId, 'upcoming'), getArtistGigs(artistId, 'past')]).then(([a, up, pa]) => {
      if (cancelled) return;
      const value = a.status === 'fulfilled' ? a.value : null;
      setArtist(value);
      setUnavailable(!value);
      setUpcoming(up.status === 'fulfilled' && up.value ? up.value : []);
      setPast(pa.status === 'fulfilled' && pa.value ? pa.value : []);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [artistId]);

  const name = artist?.name ?? artistName ?? '';
  const role = artist ? [artistRole(artist, t), artist.genres[0]].filter(Boolean).join(' · ') : null;

  const follow = async (notifyGigs?: boolean): Promise<void> => {
    if (!artist || busy) return;
    const next = notifyGigs !== undefined ? true : !artist.isFollowing;
    setBusy(true);
    try {
      const r = await setArtistFollow(artist.id, next, notifyGigs);
      setArtist({ ...artist, isFollowing: r.isFollowing, followerCount: r.followerCount ?? artist.followerCount, notifyGigs: r.notifyGigs ?? notifyGigs ?? artist.notifyGigs });
    } catch (e: unknown) {
      Alert.alert(t('gs.errorTitle'), e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const tabs: Array<{ key: Tab; label: string }> = [{ key: 'gigs', label: t('discover.artist.tabGigs') }];
  if (artist?.topTracks && artist.topTracks.length > 0) tabs.push({ key: 'music', label: t('discover.artist.tabMusic') });
  tabs.push({ key: 'about', label: t('discover.artist.tabAbout') });

  const gigRow = (g: GigSummary): ReactElement => {
    const s = g.setStartsAt ? new Date(g.setStartsAt) : null;
    const e = g.setEndsAt ? new Date(g.setEndsAt) : null;
    const slot = s && e ? `${hhmm(s)} – ${hhmm(e)}` : s ? hhmm(s) : null;
    return (
      <EventDateRow
        key={`${g.eventId}-${g.setStartsAt ?? ''}`}
        id={g.eventId}
        title={g.eventTitle}
        startsAtIso={g.setStartsAt ?? g.startsAt}
        highlight={[dayLabel(g.setStartsAt ?? g.startsAt, t, i18n.language), slot].filter(Boolean).join(' · ')}
        subtitle={[g.venueName, g.isHeadliner ? t('discover.lineup.headliner') : null].filter(Boolean).join(' · ')}
        onPress={() => nav.openEvent(g.eventId)}
      />
    );
  };

  return (
    <View className="flex-1 bg-surface">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 48 }}>
        <DetailCover
          uri={artist?.coverImageUrl}
          toneKey={`a${artistId}`}
          onBack={onBack}
          onShare={() => void shareText(name, [role])}
          bell={
            artist?.isFollowing && artist.notifyGigs !== undefined
              ? {
                  on: artist.notifyGigs,
                  onPress: () => void follow(!artist.notifyGigs),
                  label: artist.notifyGigs ? t('discover.artist.alertsOff') : t('discover.artist.alertsOn'),
                }
              : null
          }
        />
        <View className="px-5">
          <View className="-mt-12 flex-row items-end">
            <RingAvatar name={name || '?'} uri={artist?.avatarUrl} shape="circle" />
            <View className="mb-2 ml-3">
              <KindChip icon={<Mic2 size={13} color={gs.pinkDark} />} label={t('discover.artist.kind')} tone="pink" />
            </View>
          </View>
          <View className="mt-3 flex-row items-center">
            <Text className="text-[28px] font-extrabold leading-[33px] text-ink" accessibilityRole="header">
              {name}
            </Text>
            {artist?.isVerified ? <BadgeCheck size={22} color={gs.white} fill={gs.violet} style={{ marginLeft: 6 }} /> : null}
          </View>
          {role ? <Text className="mt-1 text-[15px] text-subtle">{role}</Text> : null}
          {artist ? (
            <StatsLine
              items={[
                artist.followerCount != null ? { value: compactCount(artist.followerCount), label: t('discover.place.followers') } : null,
                artist.gigsThisMonth != null ? { value: String(artist.gigsThisMonth), label: t('discover.artist.gigsThisMonth') } : null,
              ]}
            />
          ) : null}
          {artist?.bio ? (
            <Text className="mt-3 text-[15px] leading-[22px] text-subtle" numberOfLines={3}>
              {plainText(artist.bio)}
            </Text>
          ) : null}

          {artist ? (
            <>
              {LINKS.some((l) => artist.links[l.key]) ? (
                <View className="mt-4">
                  <Text className="mb-2 text-[13px] font-bold text-muted">{t('discover.artist.listenOn')}</Text>
                  <View className="flex-row flex-wrap gap-2">
                    {LINKS.filter((l) => artist.links[l.key]).map((l) => (
                      <Pressable
                        key={l.key}
                        onPress={() => Linking.openURL(artist.links[l.key] ?? '').catch(() => {})}
                        accessibilityRole="link"
                        accessibilityLabel={t('discover.artist.listenOnA11y', { service: l.label })}
                        className="min-h-[44px] flex-row items-center rounded-full bg-white px-3.5"
                        style={{ borderWidth: 1, borderColor: gs.lineStrong }}
                      >
                        <View className="h-6 w-6 items-center justify-center rounded-full" style={{ backgroundColor: l.color }}>
                          <Play size={11} color={gs.white} fill={gs.white} />
                        </View>
                        <Text className="ml-2 text-[14px] font-bold text-ink">{l.label}</Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              ) : null}
              <View className="mt-4">
                <GsButton
                  label={artist.isFollowing ? t('discover.following') : t('discover.follow')}
                  variant={artist.isFollowing ? 'secondary' : 'primary'}
                  fullWidth
                  loading={busy}
                  onPress={() => void follow()}
                />
              </View>
            </>
          ) : null}
        </View>

        {loading ? (
          <View className="items-center py-12">
            <ActivityIndicator color={gs.violet} />
          </View>
        ) : unavailable ? (
          <EmptyState icon={<Mic2 size={28} color={gs.violet} />} title={t('discover.artist.soonTitle')} message={t('discover.artist.soonMessage')} />
        ) : artist ? (
          <>
            <UnderlineTabs tabs={tabs} active={tab} onChange={setTab} />
            <View className="px-5 pt-4">
              {tab === 'gigs' ? (
                upcoming.length === 0 && past.length === 0 ? (
                  <EmptyState icon={<CalendarX size={26} color={gs.violet} />} title={t('discover.artist.noGigs')} />
                ) : (
                  <View className="gap-y-3">
                    {upcoming.map(gigRow)}
                    {past.length > 0 ? (
                      <>
                        <BlockTitle title={t('discover.artist.pastGigs')} />
                        {past.slice(0, 10).map(gigRow)}
                      </>
                    ) : null}
                  </View>
                )
              ) : tab === 'music' ? (
                <Card>
                  {(artist.topTracks ?? []).map((tr, i, arr) => (
                    <InfoRow
                      key={`${tr.title}-${i}`}
                      icon={<Music2 size={18} color={gs.violet} />}
                      label={tr.title}
                      value={tr.durationSec ? `${Math.floor(tr.durationSec / 60)}:${String(tr.durationSec % 60).padStart(2, '0')}` : null}
                      onPress={tr.url ? () => Linking.openURL(tr.url ?? '').catch(() => {}) : undefined}
                      last={i === arr.length - 1}
                    />
                  ))}
                </Card>
              ) : (
                <View>
                  {artist.bio ? <Text className="text-[16px] leading-[23px] text-subtle">{plainText(artist.bio)}</Text> : null}
                  {artist.genres.length > 0 ? (
                    <>
                      <BlockTitle title={t('discover.artist.genres')} />
                      <View className="flex-row flex-wrap gap-2">
                        {artist.genres.map((g) => (
                          <StatusChip key={g} label={g} tone="violet" />
                        ))}
                      </View>
                    </>
                  ) : null}
                  {artist.playsWith.length > 0 ? (
                    <>
                      <BlockTitle title={t('discover.artist.playsWith')} />
                      <Card>
                        {artist.playsWith.map((p, i, arr) => (
                          <InfoRow
                            key={`${p.type}-${p.id}`}
                            icon={p.type === 'venue' ? <Store size={18} color={gs.violet} /> : <Building2 size={18} color={gs.violet} />}
                            label={p.name}
                            value={p.type === 'venue' ? t('discover.place.kind') : t('discover.organizer.kind')}
                            onPress={() =>
                              p.type === 'venue'
                                ? nav.push({ name: 'place', place: { id: p.id, venueId: p.id, name: p.name, source: 'goswing' } })
                                : nav.push({ name: 'organizerProfile', organizerId: p.id, organizerName: p.name })
                            }
                            last={i === arr.length - 1}
                          />
                        ))}
                      </Card>
                    </>
                  ) : null}
                  {artist.links.instagramHandle || artist.links.websiteUrl ? (
                    <>
                      <BlockTitle title={t('discover.place.info')} />
                      <Card>
                        {artist.links.instagramHandle ? (
                          <InfoRow
                            icon={<AtSign size={18} color={gs.violet} />}
                            label={`@${artist.links.instagramHandle.replace(/^@/, '')}`}
                            value="Instagram"
                            onPress={() => Linking.openURL(`https://instagram.com/${artist.links.instagramHandle?.replace(/^@/, '')}`).catch(() => {})}
                            last={!artist.links.websiteUrl}
                          />
                        ) : null}
                        {artist.links.websiteUrl ? (
                          <InfoRow
                            icon={<Globe size={18} color={gs.violet} />}
                            label={artist.links.websiteUrl.replace(/^https?:\/\//, '')}
                            value={t('discover.place.website')}
                            onPress={() => Linking.openURL(artist.links.websiteUrl ?? '').catch(() => {})}
                            last
                          />
                        ) : null}
                      </Card>
                    </>
                  ) : null}
                </View>
              )}
            </View>
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}
