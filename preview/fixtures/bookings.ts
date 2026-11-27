// preview/fixtures/bookings.ts — fake API responses for the bookings area (web preview only).
//
// Query flags on the preview URL (http://localhost:8103/?p4=1):
//   p4=1        Phase 4 checkout: reservation holds, pay at venue, door/sale prices.
//   p4=0        strip every Phase 4 field from bookings (today's API shape).
//   offline=1   bookings requests fail like a network error (shows the cache).
//   empty=1     no bookings at all.
// By default bookings include Phase 4 fields on SOME reservations only.
import type { MockHandler } from '../api/router';
import { at, inHours } from './time';
import { EVENTS } from './core';

function flag(name: string): string | null {
  try {
    return new URLSearchParams(globalThis.location?.search ?? '').get(name);
  } catch {
    return null;
  }
}

type Holder = { firstName: string; lastName: string; email: string };
type T = { holder: Holder; price: number; type: string; paid?: boolean | null; checkedInAt?: string | null };

const ME: Holder = { firstName: 'Mehdi', lastName: 'Louijab', email: 'mehdi@example.com' };
const h = (firstName: string, lastName: string): Holder => ({ firstName, lastName, email: `${firstName.toLowerCase()}@example.com` });

function reservation(
  id: string,
  ev: { id: string; title: string; venue: string; city: string; startsAt: string; endsAt: string; address?: string },
  tickets: T[],
  opts: { status?: string; savings?: number; ref?: string; mode?: 'payNow' | 'payAtVenue'; p4?: boolean } = {},
): Record<string, unknown> {
  const total = tickets.reduce((a, t) => a + t.price, 0);
  const paidCount = tickets.filter((t) => t.paid !== false).length;
  const p4 = opts.p4 ?? false;
  const paymentStatus = paidCount === tickets.length ? 'paid' : paidCount === 0 ? 'unpaid' : 'partlyPaid';
  const items = [{ id: `${id}-it1`, ticketTypeId: `${ev.id}-tt1`, ticketTypeName: tickets[0].type, quantity: tickets.length, unitPriceCents: tickets[0].price, lineTotalCents: total, benefits: [] }];
  const base: Record<string, unknown> = {
    id,
    eventId: ev.id,
    eventExternalId: ev.id,
    status: opts.status ?? 'confirmed',
    title: ev.title,
    startsAtIso: ev.startsAt,
    endsAtIso: ev.endsAt,
    venueName: ev.venue,
    venueCity: ev.city,
    currency: 'EUR',
    totalAmountCents: total,
    savingsCents: opts.savings ?? 0,
    orderedAt: inHours(-72),
    totalTickets: tickets.length,
    items,
    tickets: tickets.map((t, i) => ({
      id: `${id}-t${i + 1}`,
      reservationItemId: `${id}-it1`,
      ticketNo: i + 1,
      ticketCode: null,
      ticketTypeName: t.type,
      unitPriceCents: t.price,
      currency: 'EUR',
      holder: t.holder,
      qrValue: `GSV1:${id}:${i + 1}`,
      qrCaption: null,
      checkedInAt: t.checkedInAt ?? null,
      ...(p4 ? { paymentStatus: t.paid === false ? 'unpaid' : 'paid', chargedPriceCents: t.price } : {}),
    })),
  };
  if (p4) {
    Object.assign(base, {
      bookingRef: opts.ref ?? null,
      paymentMode: opts.mode ?? 'payNow',
      paymentStatus,
      paidCents: tickets.filter((t) => t.paid !== false).reduce((a, t) => a + t.price, 0),
      dueCents: tickets.filter((t) => t.paid === false).reduce((a, t) => a + t.price, 0),
      event: { id: ev.id, title: ev.title, imageUrl: null, addressLine1: ev.address ?? null, venueName: ev.venue, venueCity: ev.city },
    });
  }
  return base;
}

function data(): { active: unknown[]; past: unknown[]; summary?: unknown } {
  if (flag('empty') === '1') return { active: [], past: [] };
  const p4 = flag('p4') !== '0';
  const active = [
    ...createdList,
    reservation('r-e1', { id: 'e1', title: 'Deep House Session', venue: 'Studio Neuf', city: 'Paris', startsAt: inHours(-1), endsAt: inHours(4), address: '9 rue Oberkampf, Paris 11e' },
      [{ holder: ME, price: 1300, type: 'GoSwing early entry' }],
      { savings: 700, ref: 'GS-KTQZ22', p4 }),
    reservation('r-e3', { id: 'e3', title: 'Afro Night on the Roof', venue: 'Toit Rouge', city: 'Paris', startsAt: at(1, 19), endsAt: at(2, 1), address: '12 bd Voltaire, Paris 11e' },
      [
        { holder: ME, price: 1900, type: 'Group of 4 · terrace table' },
        { holder: h('Inès', 'R.'), price: 1900, type: 'Group of 4 · terrace table' },
        { holder: h('Omar', 'T.'), price: 1900, type: 'Group of 4 · terrace table', paid: false },
        { holder: h('Léa', 'P.'), price: 1900, type: 'Group of 4 · terrace table' },
      ],
      { savings: 1200, ref: 'GS-AFR4X9', mode: 'payAtVenue', p4 }),
    // No Phase 4 fields here: the UI must look right with today's API shape.
    reservation('r-e4', { id: 'e4', title: 'Winter Open Air Fest', venue: 'Les Berges Est', city: 'Paris', startsAt: at(3, 16), endsAt: at(3, 23, 59) },
      [{ holder: ME, price: 3900, type: 'Early bird' }, { holder: h('Yanis', 'B.'), price: 3900, type: 'Early bird' }],
      { savings: 3200 }),
  ];
  const past = [
    reservation('r-p1', { id: 'p1', title: 'Soirée Jazz Live', venue: 'Le Caveau Bleu', city: 'Paris', startsAt: at(-4, 21), endsAt: at(-3, 1) },
      [{ holder: ME, price: 1000, type: 'Entry + 1 drink', checkedInAt: at(-4, 21, 12) }],
      { savings: 500 }),
    reservation('r-p2', { id: 'p2', title: 'Techno Marathon', venue: 'Hangar Nord', city: 'Saint-Denis', startsAt: at(-12, 23), endsAt: at(-11, 7) },
      [
        { holder: ME, price: 1800, type: 'Standard entry', checkedInAt: at(-12, 23, 48) },
        { holder: h('Karim', 'L.'), price: 1800, type: 'Standard entry', checkedInAt: at(-12, 23, 49) },
        { holder: h('Julie', 'V.'), price: 1800, type: 'Standard entry' },
      ],
      { savings: 2100, ref: 'GS-TCH552', p4 }),
  ];
  return {
    active,
    past,
    ...(p4 ? { summary: { totalSavingsCents: 7700, currency: 'EUR', bookingsCount: 5, ticketsCount: 11, activeCount: 3 } } : {}),
  };
}

function offline(): void {
  if (flag('offline') === '1') throw new TypeError('Network request failed');
}

/** Reservations made in this preview session (POST /v1/reservations). */
const createdList: Array<Record<string, unknown>> = [];

export const bookingsHandlers: MockHandler[] = [
  { method: 'GET', path: /^\/v1\/me\/reservations$/, handle: () => { offline(); return data(); } },
  {
    method: 'GET',
    path: /^\/v1\/reservations\/([^/]+)$/,
    handle: (r) => {
      offline();
      const id = r.params[0];
      const d = data();
      const all = [...d.active, ...d.past] as Array<Record<string, unknown>>;
      const found = all.find((x) => x.id === id);
      if (!found) return { status: 404, json: { error: { code: 'not_found', message: 'Reservation not found' } } };
      const { title, startsAtIso, endsAtIso, venueName, venueCity, eventId, ...rest } = found;
      const ev = (found.event as Record<string, unknown> | undefined) ?? {};
      return { ...rest, event: { ...ev, id: eventId, title, startsAtIso, endsAtIso, venueName, venueCity } };
    },
  },
  {
    method: 'POST',
    path: /^\/v1\/reservations$/,
    handle: (r) => {
      const body = (r.body ?? {}) as {
        eventId?: string;
        quantities?: Record<string, number>;
        paymentMode?: string;
        attendees?: Array<{ firstName: string; lastName: string; email: string }>;
      };
      const qty = Object.values(body.quantities ?? {}).reduce((a, b) => a + b, 0);
      const id = `r-new-${Date.now().toString(36)}`;
      const p4 = flag('p4') === '1';
      const ev = EVENTS.find((e) => e.id === body.eventId);
      const price = p4 ? 1000 : 1500;
      if (ev) {
        createdList.push(
          reservation(
            id,
            { id: ev.id, title: ev.title, venue: String(ev.venue), city: 'Paris', startsAt: String(ev.startsAtIso), endsAt: String(ev.endsAtIso), address: p4 ? '14 rue de la Roquette, Paris 11e' : undefined },
            (body.attendees ?? []).map((a) => ({ holder: a, price, type: 'Entry + 1 drink', paid: p4 && body.paymentMode === 'payAtVenue' ? false : null })),
            { ref: `GS-${id.slice(-6).toUpperCase()}`, mode: body.paymentMode === 'payAtVenue' ? 'payAtVenue' : 'payNow', p4 },
          ),
        );
      }
      return {
        reservationId: id,
        status: p4 && body.paymentMode === 'payNow' ? 'awaitingPayment' : 'confirmed',
        totals: { totalTickets: qty, subtotalCents: qty * 1000, serviceFeeCents: p4 ? 0 : qty * 500, totalCents: qty * price, currency: 'EUR' },
        ...(p4 ? { paymentMode: body.paymentMode ?? 'payNow', paymentStatus: 'unpaid' } : {}),
      };
    },
  },
  {
    method: 'GET',
    path: /^\/v1\/me\/payment-methods$/,
    handle: () => ({
      items: [
        { id: 'pm1', userId: 'user_preview', provider: 'stripe', cardBrand: 'visa', cardLastFour: '4242', cardExpMonth: 8, cardExpYear: 2028, isDefault: true },
      ],
      nextCursor: null,
      hasMore: false,
    }),
  },
  // Phase 4 holds (routes 145–147): only with ?p4=1, otherwise "not available".
  {
    method: 'POST',
    path: /^\/v1\/reservation-holds$/,
    handle: (r) => {
      if (flag('p4') !== '1') return { status: 404, json: { error: { code: 'not_found', message: 'No route' } } };
      return hold((r.body as { quantities?: Record<string, number> })?.quantities ?? {});
    },
  },
  {
    method: 'PATCH',
    path: /^\/v1\/reservation-holds\/([^/]+)$/,
    handle: (r) => {
      if (flag('p4') !== '1') return { status: 404, json: { error: { code: 'not_found', message: 'No route' } } };
      return hold((r.body as { quantities?: Record<string, number> })?.quantities ?? {});
    },
  },
  { method: 'DELETE', path: /^\/v1\/reservation-holds\/([^/]+)$/, handle: () => ({ status: 204, json: undefined }) },
  // Soirée Jazz Live (e2) is the checkout example of the prototype. With ?p4=1 it
  // gets the Phase 4 checkout fields (pay at venue, max per order, address).
  {
    method: 'GET',
    path: /^\/v1\/events\/(e2)$/,
    handle: () => {
      const ev = EVENTS.find((e) => e.id === 'e2');
      return flag('p4') === '1'
        ? { ...ev, payAtVenueEnabled: true, maxTicketsPerOrder: 10, venue: { name: 'Le Caveau Bleu', addressLine1: '14 rue de la Roquette', city: 'Paris' } }
        : ev;
    },
  },
  {
    method: 'GET',
    path: /^\/v1\/events\/(e2)\/ticket-types$/,
    handle: () => {
      const p4 = flag('p4') === '1';
      return [
        { id: 'e2-tt1', name: 'Entry + 1 drink', priceCents: p4 ? 1500 : 1000, currency: 'EUR', isFree: false, freeForLadies: false, benefits: ['1 drink'], seatsMax: 200, seatsAvailable: 12,
          ...(p4 ? { salePriceCents: 1000, doorPriceCents: 1500 } : {}) },
      ];
    },
  },
];

function hold(quantities: Record<string, number>): unknown {
  const qty = Object.values(quantities).reduce((a, b) => a + b, 0);
  return {
    holdId: 'hold-1',
    expiresAt: new Date(Date.now() + 10 * 60_000).toISOString(),
    quantities,
    pricing: { lines: [], subtotalCents: qty * 1000, serviceFeeCents: 0, totalCents: qty * 1000, savingsCents: qty * 500, currency: 'EUR' },
  };
}
