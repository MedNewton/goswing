// lib/api/artists.ts
// Artists & line-ups (Phase 4 § E.2 and § F, routes 137–144). None of these
// routes is live yet: every reader returns null when the server answers
// 404 / 405 / 501, so the UI can show "Artists are coming soon" and hide the
// event line-up until the backend ships.
import { getBoundApiCall } from './client';
import { isUnavailable, listOf } from './venues';

export type ArtistKind = 'dj' | 'band' | 'live_act' | 'singer' | 'other';

export type ArtistCard = Readonly<{
  id: string;
  slug: string | null;
  name: string;
  kind: ArtistKind | string | null;
  avatarUrl: string | null;
  genres: ReadonlyArray<string>;
  city: string | null;
  followerCount: number | null;
  isVerified: boolean;
  isFollowing: boolean;
}>;

export type ArtistLinks = Readonly<{
  spotifyUrl: string | null;
  appleMusicUrl: string | null;
  soundcloudUrl: string | null;
  youtubeUrl: string | null;
  instagramHandle: string | null;
  websiteUrl: string | null;
}>;

export type Artist = ArtistCard &
  Readonly<{
    bio: string | null;
    coverImageUrl: string | null;
    gigsThisMonth: number | null;
    links: ArtistLinks;
    playsWith: ReadonlyArray<Readonly<{ type: 'venue' | 'organizer'; id: string; name: string }>>;
    /** Optional: top tracks for a Music tab (not in the Odoo spec yet). */
    topTracks?: ReadonlyArray<Readonly<{ title: string; durationSec: number | null; url: string | null }>>;
    notifyGigs?: boolean;
  }>;

export type GigSummary = Readonly<{
  eventId: string;
  eventTitle: string;
  venueName: string | null;
  startsAt: string | null;
  setStartsAt: string | null;
  setEndsAt: string | null;
  isHeadliner: boolean;
}>;

export type DiscoverArtist = Readonly<{
  rank: number;
  artist: ArtistCard;
  gigsInPeriod: number;
  nextGig: GigSummary | null;
}>;

export type LineupItem = Readonly<{
  artist: ArtistCard;
  role: string | null;
  setStartsAt: string | null;
  setEndsAt: string | null;
  isHeadliner: boolean;
}>;

type Raw = Record<string, unknown>;
const str = (v: unknown): string | null => (typeof v === 'string' && v.trim() !== '' ? v : null);
const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);

function mapCard(r: Raw): ArtistCard {
  return {
    id: String(r.id ?? ''),
    slug: str(r.slug),
    name: str(r.name) ?? '',
    kind: str(r.kind),
    avatarUrl: str(r.avatarUrl),
    genres: Array.isArray(r.genres) ? (r.genres as unknown[]).filter((g): g is string => typeof g === 'string') : [],
    city: str(r.city),
    followerCount: num(r.followerCount),
    isVerified: Boolean(r.isVerified),
    isFollowing: Boolean(r.isFollowing),
  };
}

function mapGig(r: Raw | null | undefined): GigSummary | null {
  if (!r || typeof r !== 'object') return null;
  return {
    eventId: String(r.eventId ?? ''),
    eventTitle: str(r.eventTitle) ?? '',
    venueName: str(r.venueName),
    startsAt: str(r.startsAt),
    setStartsAt: str(r.setStartsAt),
    setEndsAt: str(r.setEndsAt),
    isHeadliner: Boolean(r.isHeadliner),
  };
}

async function orNull<T>(fn: () => Promise<T>): Promise<T | null> {
  try {
    return await fn();
  } catch (e) {
    if (isUnavailable(e)) return null;
    throw e;
  }
}

/** Route 137 — "Best artists this month" / "All artists this month". */
export function getDiscoverArtists(params: { city?: string | null; lat?: number; lng?: number; limit?: number }): Promise<ReadonlyArray<DiscoverArtist> | null> {
  return orNull(async () => {
    const raw = await getBoundApiCall()<unknown>('/v1/discover/artists', {
      query: { city: params.city || undefined, lat: params.lat, lng: params.lng, period: 'month', limit: params.limit ?? 30 },
    });
    return listOf(raw)
      .map((r, i) => ({
        rank: num(r.rank) ?? i + 1,
        artist: mapCard((r.artist ?? r) as Raw),
        gigsInPeriod: num(r.gigsInPeriod) ?? 0,
        nextGig: mapGig(r.nextGig as Raw | null),
      }))
      .filter((a) => a.artist.id && a.artist.name);
  });
}

/** Route 139. */
export function getArtist(idOrSlug: string): Promise<Artist | null> {
  return orNull(async () => {
    const r = await getBoundApiCall()<Raw>(`/v1/artists/${encodeURIComponent(idOrSlug)}`);
    const links = (r.links ?? {}) as Raw;
    return {
      ...mapCard(r),
      bio: str(r.bio),
      coverImageUrl: str(r.coverImageUrl),
      gigsThisMonth: num(r.gigsThisMonth),
      links: {
        spotifyUrl: str(links.spotifyUrl),
        appleMusicUrl: str(links.appleMusicUrl),
        soundcloudUrl: str(links.soundcloudUrl),
        youtubeUrl: str(links.youtubeUrl),
        instagramHandle: str(links.instagramHandle),
        websiteUrl: str(links.websiteUrl),
      },
      playsWith: Array.isArray(r.playsWith)
        ? (r.playsWith as Raw[])
            .map((p) => ({ type: p.type === 'organizer' ? ('organizer' as const) : ('venue' as const), id: String(p.id ?? ''), name: str(p.name) ?? '' }))
            .filter((p) => p.id && p.name)
        : [],
      topTracks: Array.isArray(r.topTracks)
        ? (r.topTracks as Raw[]).map((x) => ({ title: str(x.title) ?? '', durationSec: num(x.durationSec), url: str(x.url) })).filter((x) => x.title)
        : undefined,
      notifyGigs: typeof r.notifyGigs === 'boolean' ? r.notifyGigs : undefined,
    };
  });
}

/** Route 140. */
export function getArtistGigs(idOrSlug: string, when: 'upcoming' | 'past' = 'upcoming'): Promise<ReadonlyArray<GigSummary> | null> {
  return orNull(async () => {
    const raw = await getBoundApiCall()<unknown>(`/v1/artists/${encodeURIComponent(idOrSlug)}/gigs`, { query: { when, limit: 50 } });
    return listOf(raw).map((g) => mapGig(g)).filter((g): g is GigSummary => !!g && !!g.eventId);
  });
}

/** Route 141 — event line-up. null = not available (section hidden). */
export function getEventLineup(eventId: string): Promise<ReadonlyArray<LineupItem> | null> {
  return orNull(async () => {
    const raw = await getBoundApiCall()<unknown>(`/v1/events/${encodeURIComponent(eventId)}/lineup`);
    return listOf(raw)
      .map((r) => ({
        artist: mapCard((r.artist ?? {}) as Raw),
        role: str(r.role),
        setStartsAt: str(r.setStartsAt),
        setEndsAt: str(r.setEndsAt),
        isHeadliner: Boolean(r.isHeadliner),
      }))
      .filter((l) => l.artist.id && l.artist.name);
  });
}

/** Routes 142–143. */
export async function setArtistFollow(
  artistId: string,
  follow: boolean,
  notifyGigs?: boolean,
): Promise<{ isFollowing: boolean; followerCount: number | null; notifyGigs?: boolean }> {
  const r = await getBoundApiCall()<Raw>(`/v1/me/followed-artists/${encodeURIComponent(artistId)}`, {
    method: follow ? 'PUT' : 'DELETE',
    body: follow && notifyGigs !== undefined ? { notifyGigs } : undefined,
  });
  return {
    isFollowing: typeof r?.isFollowing === 'boolean' ? r.isFollowing : follow,
    followerCount: num(r?.followerCount),
    notifyGigs: typeof r?.notifyGigs === 'boolean' ? r.notifyGigs : undefined,
  };
}
