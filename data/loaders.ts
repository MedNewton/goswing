// data/loaders.ts
import type { Event, Category, UserProfile, ID } from '@/types/domain';

export function getEvents(): ReadonlyArray<Event> {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const raw = require('@/data/events.json') as ReadonlyArray<any>;

  return raw.map((e) => ({
    id: String(e.id) as ID,
    title: String(e.title ?? ''),
    organizer: String(e.organizer ?? ''),
    imageUrl: String(e.imageUrl ?? ''),
    startsAtIso: String(e.startsAtIso ?? ''),
    venue: String(e.venue ?? ''),
    city: e.city ?? undefined,
    countryCode: e.countryCode ?? undefined,
    priceLabel: e.priceLabel ?? undefined,
    favorite: Boolean(e.favorite ?? false),
    categories: Array.isArray(e.categories) ? [...e.categories] : [],
    attendees: Array.isArray(e.attendees) ? e.attendees.map((a: any) => ({ id: String(a.id) as ID, initials: String(a.initials ?? '') })) : [],
    attendeesExtraCount: typeof e.attendeesExtraCount === 'number' ? e.attendeesExtraCount : undefined,
    location: e.location ? { lat: Number(e.location.lat), lng: Number(e.location.lng) } : undefined,

    // preserve new filter fields
    venueType: e.venueType ?? undefined,
    musicStyles: Array.isArray(e.musicStyles) ? [...e.musicStyles] : [],
    partyTypes: Array.isArray(e.partyTypes) ? [...e.partyTypes] : [],
    access: Array.isArray(e.access) ? [...e.access] as Array<'free' | 'free_ladies'> : [],
    basePrice: typeof e.basePrice === 'number' ? e.basePrice : undefined,
  }));
}

export function getCategories(): ReadonlyArray<Category> {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  return require('@/data/categories.json') as ReadonlyArray<Category>;
}

export function getUser(): UserProfile {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const raw: any = require('@/data/user.json');
  return {
    id: String(raw.id) as ID,
    name: String(raw.name ?? ''),
    email: raw.email ?? null,
    avatarUri: raw.avatarUri ?? null,
    city: raw.city ?? undefined,
    countryCode: raw.countryCode ?? undefined,
    interests: Array.isArray(raw.interests) ? raw.interests.map(String) : [],
    stats: {
      attendedCount: Number(raw?.stats?.attendedCount ?? 0),
      savedCount: Number(raw?.stats?.savedCount ?? 0),
      reviewsCount: Number(raw?.stats?.reviewsCount ?? 0),
    },
    preferences: {
      pushNotifications: Boolean(raw?.preferences?.pushNotifications ?? false),
      locationServices: Boolean(raw?.preferences?.locationServices ?? false),
    },
  };
}
