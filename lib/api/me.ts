// lib/api/me.ts
// Typed wrappers for the /v1/me/* routes (profile, settings, notification
// preferences, payment methods, login history, interests) plus the tag catalog.
// Raw shapes only — mapping to UI types lives at the call sites.

import { getBoundApiCall, type BoundApiCall } from './client';
import type {
  ApiLoginHistoryEntry,
  ApiNotificationPreferences,
  ApiPage,
  ApiPaymentMethod,
  ApiProfile,
  ApiTag,
  ApiUserInterest,
  ApiUserSettings,
} from './types';

function call(): BoundApiCall {
  return getBoundApiCall();
}

// § C — Profile

export function getMyProfile(): Promise<ApiProfile> {
  return call()<ApiProfile>('/v1/me/profile');
}

export function initMyProfile(body: {
  displayName?: string | null;
  email?: string | null;
  avatarUrl?: string | null;
  phone?: string | null;
  location?: string | null;
}): Promise<ApiProfile> {
  return call()<ApiProfile>('/v1/me/profile/init', { method: 'POST', body });
}

export function patchMyProfile(
  body: Partial<{
    displayName: string;
    avatarUrl: string | null;
    email: string | null;
    phone: string | null;
    phoneVerified: boolean;
    city: string | null;
    countryCode: string | null;
    occupation: string | null;
    profileVisibility: 'public' | 'private';
  }>,
): Promise<ApiProfile> {
  return call()<ApiProfile>('/v1/me/profile', { method: 'PATCH', body });
}

export function completeOnboarding(body: {
  phone?: string | null;
  location?: string | null;
  pushNotificationsEnabled?: boolean;
  locationServicesEnabled?: boolean;
}): Promise<{ profile: ApiProfile; settings: ApiUserSettings }> {
  return call()<{ profile: ApiProfile; settings: ApiUserSettings }>(
    '/v1/me/profile/onboarding-complete',
    { method: 'POST', body },
  );
}

export function deactivateMyAccount(): Promise<{
  accountStatus: string;
  deactivatedAt: string;
}> {
  return call()<{ accountStatus: string; deactivatedAt: string }>(
    '/v1/me/profile/deactivate',
    { method: 'POST' },
  );
}

export function deleteMyAccount(): Promise<{
  accountStatus: string;
  deletedAt: string;
}> {
  return call()<{ accountStatus: string; deletedAt: string }>(
    '/v1/me/profile/delete',
    { method: 'POST' },
  );
}

// § D — Settings

export function getMySettings(): Promise<ApiUserSettings> {
  return call()<ApiUserSettings>('/v1/me/settings');
}

export function patchMySettings(
  body: Partial<Omit<ApiUserSettings, 'userId' | 'createdAt' | 'updatedAt'>>,
): Promise<ApiUserSettings> {
  return call()<ApiUserSettings>('/v1/me/settings', { method: 'PATCH', body });
}

// § E — Notification preferences

export function getMyNotificationPreferences(): Promise<ApiNotificationPreferences> {
  return call()<ApiNotificationPreferences>('/v1/me/notification-preferences');
}

export function patchMyNotificationPreferences(
  body: Partial<
    Omit<ApiNotificationPreferences, 'userId' | 'createdAt' | 'updatedAt'>
  >,
): Promise<ApiNotificationPreferences> {
  return call()<ApiNotificationPreferences>('/v1/me/notification-preferences', {
    method: 'PATCH',
    body,
  });
}

// § F — Payment methods

export function listMyPaymentMethods(): Promise<ApiPage<ApiPaymentMethod>> {
  return call()<ApiPage<ApiPaymentMethod>>('/v1/me/payment-methods');
}

export function addMyPaymentMethod(body: {
  provider: string;
  providerPaymentMethodId: string;
  cardBrand: string;
  cardLastFour: string;
  cardExpMonth: number;
  cardExpYear: number;
  cardholderName?: string | null;
  isDefault?: boolean;
}): Promise<ApiPaymentMethod> {
  return call()<ApiPaymentMethod>('/v1/me/payment-methods', {
    method: 'POST',
    body,
  });
}

export function setDefaultPaymentMethod(id: string): Promise<ApiPaymentMethod> {
  return call()<ApiPaymentMethod>(
    `/v1/me/payment-methods/${encodeURIComponent(id)}/default`,
    { method: 'POST' },
  );
}

export function deleteMyPaymentMethod(id: string): Promise<void> {
  return call()<void>(`/v1/me/payment-methods/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}

// § G — Login history

export function getMyLoginHistory(params?: {
  limit?: number;
  cursor?: string;
}): Promise<ApiPage<ApiLoginHistoryEntry>> {
  return call()<ApiPage<ApiLoginHistoryEntry>>('/v1/me/login-history', {
    query: { limit: params?.limit, cursor: params?.cursor },
  });
}

// § H — Interests

export function getMyInterests(): Promise<ApiPage<ApiUserInterest>> {
  return call()<ApiPage<ApiUserInterest>>('/v1/me/interests');
}

export function replaceMyInterests(
  tagIds: ReadonlyArray<string>,
): Promise<ApiPage<ApiUserInterest>> {
  return call()<ApiPage<ApiUserInterest>>('/v1/me/interests', {
    method: 'PUT',
    body: { tagIds },
  });
}

export function addMyInterest(tagId: string): Promise<ApiPage<ApiUserInterest>> {
  return call()<ApiPage<ApiUserInterest>>(
    `/v1/me/interests/${encodeURIComponent(tagId)}`,
    { method: 'POST' },
  );
}

export function removeMyInterest(tagId: string): Promise<void> {
  return call()<void>(`/v1/me/interests/${encodeURIComponent(tagId)}`, {
    method: 'DELETE',
  });
}

// § H' — Tags catalog

export function listTags(params?: { type?: string }): Promise<ApiPage<ApiTag>> {
  return call()<ApiPage<ApiTag>>('/v1/tags', { query: { type: params?.type } });
}
