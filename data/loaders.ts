// data/loaders.ts
import type { Event, Category, UserProfile } from '@/types/domain';

/**
 * Typed loaders for local JSON datasets bundled with the app.
 * Uses `require` so Metro (Expo) resolves JSON at runtime without extra config.
 * All exports are readonly to prevent accidental mutation.
 */

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
