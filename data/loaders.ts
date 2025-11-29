import type { Event, Category, UserProfile, ID } from '@/types/domain';

export function getEvents(): ReadonlyArray<Event> {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const raw = require('@/data/events.json') as ReadonlyArray<Event>;
  return raw;
}

export function getCategories(): ReadonlyArray<Category> {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const raw = require('@/data/categories.json') as ReadonlyArray<Category>;
  return raw;
}

export function getUser(): UserProfile {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const raw: any = require('@/data/user.json');

  const user: UserProfile = {
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

  return user;
}
