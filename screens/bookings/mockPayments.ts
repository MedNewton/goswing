// screens/bookings/mockPayments.ts
// Test-mode payments for bookings (payments are MOCK-only for now; see
// lib/payments). The API has no payment state yet, so the device remembers:
//   • which reservations were booked "pay now" (paid) or "pay at the venue",
//   • which tickets were paid later with "Pay X now" (lib/payments markTicketsPaid).
// The bookings list overlays this on reservations WITHOUT Phase 4 payment
// fields; as soon as the API sends `paymentStatus`, the server wins.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getMockPaidTickets } from '@/lib/payments';
import type { Booking, BookingsData, BookingTicket, P4PaymentStatus } from '@/lib/api/bookings';

export type MockBookingRecord = Readonly<{
  mode: 'payNow' | 'payAtVenue';
  /** Paid in full at checkout (used when the ticket ids were not known yet). */
  paidAll?: boolean;
  at: string;
}>;

type Records = Readonly<Record<string, MockBookingRecord>>;

const key = (userId: string): string => `@gs:mockBookings.${userId || 'anon'}`;

export async function loadMockRecords(userId: string): Promise<Records> {
  try {
    const raw = await AsyncStorage.getItem(key(userId));
    return raw ? (JSON.parse(raw) as Records) : {};
  } catch {
    return {};
  }
}

export async function recordMockBooking(userId: string, reservationId: string, rec: Omit<MockBookingRecord, 'at'>): Promise<void> {
  const cur = await loadMockRecords(userId);
  try {
    await AsyncStorage.setItem(key(userId), JSON.stringify({ ...cur, [reservationId]: { ...rec, at: new Date().toISOString() } }));
  } catch {
    // Best effort.
  }
}

export type MockState = Readonly<{ records: Records; paidTickets: ReadonlySet<string> }>;

export async function loadMockState(userId: string): Promise<MockState> {
  const [records, paidTickets] = await Promise.all([loadMockRecords(userId), getMockPaidTickets()]);
  return { records, paidTickets };
}

function overlayBooking(b: Booking, m: MockState): Booking {
  // Server payment data (Phase 4) wins; test-mode payments can only mark its
  // unpaid tickets as paid (fallback while the payments route is missing).
  if (b.paymentStatus != null && !b.mockPayment) {
    if (!b.tickets.some((tk) => tk.paymentStatus === 'unpaid' && m.paidTickets.has(tk.id))) return b;
    const tks = b.tickets.map((tk) => (tk.paymentStatus === 'unpaid' && m.paidTickets.has(tk.id) ? { ...tk, paymentStatus: 'paid' as const } : tk));
    const unpaid = tks.filter((tk) => tk.paymentStatus === 'unpaid');
    return {
      ...b,
      tickets: tks,
      paymentStatus: unpaid.length === 0 ? 'paid' : unpaid.length < tks.length ? 'partlyPaid' : 'unpaid',
      dueCents: unpaid.reduce((a, tk) => a + tk.priceCents, 0),
    };
  }
  const rec = m.records[b.id];
  const tickets: BookingTicket[] = b.tickets.map((tk) => {
    let ps: BookingTicket['paymentStatus'] = null;
    if (m.paidTickets.has(tk.id) || rec?.paidAll) ps = 'paid';
    else if (rec?.mode === 'payAtVenue') ps = tk.priceCents === 0 ? 'free' : 'unpaid';
    return { ...tk, paymentStatus: ps };
  });
  const known = tickets.filter((tk) => tk.paymentStatus != null);
  if (!rec && known.length === 0) return { ...b, tickets, paymentStatus: null, paymentMode: null, mockPayment: false };
  const paid = known.filter((tk) => tk.paymentStatus === 'paid' || tk.paymentStatus === 'free').length;
  const status: P4PaymentStatus | null =
    known.length === 0 ? null : paid === tickets.length ? (known.every((tk) => tk.paymentStatus === 'free') ? 'free' : 'paid') : paid > 0 ? 'partlyPaid' : 'unpaid';
  const dueCents = tickets.filter((tk) => tk.paymentStatus === 'unpaid').reduce((a, tk) => a + tk.priceCents, 0);
  return { ...b, tickets, paymentStatus: status, paymentMode: rec?.mode ?? b.paymentMode, dueCents, mockPayment: true };
}

/** Applies the test-mode payment records to bookings that have no server payment data. */
export function applyMockPayments(d: BookingsData, m: MockState): BookingsData {
  return { ...d, active: d.active.map((b) => overlayBooking(b, m)), past: d.past.map((b) => overlayBooking(b, m)) };
}
