import type { Event, Category, UserProfile } from '@/types/domain';

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
  const raw = require('@/data/user.json') as UserProfile;
  return raw;
}
