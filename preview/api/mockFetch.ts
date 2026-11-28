// preview/api/mockFetch.ts — replaces fetch() with fixtures in the web preview.
// Feature areas add handlers in preview/fixtures/<area>.ts; first match wins,
// so area handlers can override the shared core ones.
import { API_BASE_URL } from '@/lib/api/client';
import { isResult, type MockHandler } from './router';
import { coreHandlers } from '../fixtures/core';
import { mapHandlers, OVERPASS_ELEMENTS } from '../fixtures/map';
import { discoverHandlers } from '../fixtures/discover';
import { bookingsHandlers } from '../fixtures/bookings';
import { profileHandlers } from '../fixtures/profile';

const HANDLERS: MockHandler[] = [...mapHandlers, ...discoverHandlers, ...bookingsHandlers, ...profileHandlers, ...coreHandlers];

const json = (status: number, body: unknown): Response =>
  new Response(body === undefined ? null : JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

export function installMockFetch(): void {
  const realFetch = globalThis.fetch.bind(globalThis);
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url);
    const method = (init?.method ?? 'GET').toUpperCase();

    if (url.href.startsWith(API_BASE_URL)) {
      let body: unknown = undefined;
      if (typeof init?.body === 'string') {
        try { body = JSON.parse(init.body); } catch { body = init.body; }
      }
      for (const h of HANDLERS) {
        if (h.method !== method) continue;
        const m = url.pathname.match(h.path);
        if (!m) continue;
        const out = h.handle({ method, path: url.pathname, query: url.searchParams, params: m.slice(1), body });
        await new Promise((r) => setTimeout(r, 120));
        return isResult(out) ? json(out.status ?? 200, out.json) : json(200, out);
      }
      console.warn(`[preview] no mock for ${method} ${url.pathname}`);
      return json(404, { error: { code: 'not_found', message: `No preview mock for ${method} ${url.pathname}` } });
    }

    // Map area: fake OpenStreetMap places so place pins show in the preview.
    if (/overpass/.test(url.host)) return json(200, { elements: OVERPASS_ELEMENTS });

    // Third-party APIs (Google, Overpass, Deezer…) return empty results offline.
    if (/googleapis\.com|overpass|deezer\.com/.test(url.host)) {
      return json(200, { status: 'ZERO_RESULTS', results: [], elements: [], data: [] });
    }
    return realFetch(input as RequestInfo, init);
  }) as typeof fetch;
}
