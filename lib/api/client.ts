// lib/api/client.ts
// Thin fetch wrapper for the Gooswing REST API (https://web.gooswing.com).
//
// Two entry points:
//   • useGooswingApi()  — React hook; uses Clerk's useAuth().getToken() directly.
//   • getBoundApiCall() — non-hook; reads a token getter installed by <ApiClerkBridge>
//                          (analogous to the SupabaseClerkBridge pattern).

import { useCallback, useMemo } from 'react';
import Constants from 'expo-constants';
import { useAuth } from '@clerk/clerk-expo';

const extra =
  (Constants.expoConfig?.extra as Record<string, unknown> | undefined) ?? {};

const DEFAULT_BASE_URL = 'https://web.gooswing.com';

export const API_BASE_URL: string =
  (process.env.EXPO_PUBLIC_API_BASE_URL as string | undefined) ??
  (extra.EXPO_PUBLIC_API_BASE_URL as string | undefined) ??
  DEFAULT_BASE_URL;

export type TokenGetter = () => Promise<string | null>;

let tokenGetter: TokenGetter | null = null;

export function setGooswingApiTokenGetter(getter: TokenGetter | null): void {
  tokenGetter = getter;
}

export function hasGooswingApiTokenGetter(): boolean {
  return tokenGetter != null;
}

export type ApiCallOptions = Readonly<{
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  query?: Record<string, string | number | boolean | undefined | null>;
  body?: unknown;
  signal?: AbortSignal;
}>;

type ApiErrorBody = Readonly<{
  error?: Readonly<{
    code?: string;
    message?: string;
    details?: unknown;
  }>;
}>;

export class ApiError extends Error {
  readonly code: string;
  readonly details: unknown;
  readonly status: number;

  constructor(code: string, message: string, details: unknown = null, status = 0) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.details = details;
    this.status = status;
  }
}

export type BoundApiCall = <T>(path: string, opts?: ApiCallOptions) => Promise<T>;

function buildUrl(path: string, query?: ApiCallOptions['query']): string {
  const base = API_BASE_URL.replace(/\/+$/, '');
  const cleanPath = path.startsWith('/') ? path : `/${path}`;

  if (!query) return `${base}${cleanPath}`;

  const params: string[] = [];
  for (const [k, v] of Object.entries(query)) {
    if (v === undefined || v === null) continue;
    params.push(`${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
  }
  if (params.length === 0) return `${base}${cleanPath}`;
  return `${base}${cleanPath}?${params.join('&')}`;
}

async function parseErrorBody(res: Response): Promise<ApiErrorBody | null> {
  try {
    return (await res.json()) as ApiErrorBody;
  } catch {
    return null;
  }
}

export async function apiCall<T>(
  getToken: TokenGetter,
  path: string,
  opts: ApiCallOptions = {},
): Promise<T> {
  const token = await getToken();
  if (!token) {
    throw new ApiError(
      'unauthenticated',
      'No Clerk session token available.',
      null,
      401,
    );
  }

  const url = buildUrl(path, opts.query);

  const headers: Record<string, string> = {
    Accept: 'application/json',
    Authorization: `Bearer ${token}`,
  };
  if (opts.body !== undefined) headers['Content-Type'] = 'application/json';

  const init: RequestInit = {
    method: opts.method ?? 'GET',
    headers,
    signal: opts.signal,
  };
  if (opts.body !== undefined) init.body = JSON.stringify(opts.body);

  let res: Response;
  try {
    res = await fetch(url, init);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new ApiError('network_error', msg, null, 0);
  }

  if (!res.ok) {
    const body = await parseErrorBody(res);
    const errBlock = body?.error ?? {};
    throw new ApiError(
      typeof errBlock.code === 'string' ? errBlock.code : `http_${res.status}`,
      typeof errBlock.message === 'string'
        ? errBlock.message
        : res.statusText || 'Request failed',
      errBlock.details ?? null,
      res.status,
    );
  }

  if (res.status === 204) return undefined as unknown as T;

  return (await res.json()) as T;
}

export function makeBoundApiCall(getToken: TokenGetter): BoundApiCall {
  return <T>(path: string, opts?: ApiCallOptions) => apiCall<T>(getToken, path, opts);
}

/** Non-hook bound caller for use inside lib/supabase/*.ts (non-React modules). */
export function getBoundApiCall(): BoundApiCall {
  return async <T>(path: string, opts?: ApiCallOptions): Promise<T> => {
    const getter = tokenGetter;
    if (!getter) {
      throw new ApiError(
        'unauthenticated',
        'Gooswing API token getter is not initialized. Make sure <ApiClerkBridge> is mounted.',
        null,
        401,
      );
    }
    return apiCall<T>(getter, path, opts);
  };
}

/** React hook variant that pulls the token straight from Clerk. */
export function useGooswingApi(): BoundApiCall {
  const { isSignedIn, getToken } = useAuth();
  const tokenFn = useCallback<TokenGetter>(async () => {
    if (!isSignedIn) return null;
    return (await getToken()) ?? null;
  }, [isSignedIn, getToken]);
  return useMemo(() => makeBoundApiCall(tokenFn), [tokenFn]);
}
