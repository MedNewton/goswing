// lib/payments/index.ts — payment layer used by checkout, tickets and payment methods.
//
// Only a MOCK provider exists for now (product decision, 2026-11-28): nothing is
// charged and no card data leaves the device. The mock keeps the real flow's
// shape (a payment sheet, a short wait, success or decline) so the screens can be
// built and tested. When a real provider (e.g. Stripe) is chosen, implement
// `presentPayment` / `saveCard` for it and switch EXPO_PUBLIC_PAYMENTS_MODE.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { addMyPaymentMethod } from '@/lib/api/me';
import type { ApiPaymentMethod } from '@/lib/api/types';

export type PaymentsMode = 'mock';

export const PAYMENTS_MODE: PaymentsMode = 'mock';

/** True while payments are simulated; screens show a "Test mode" label. */
export const isTestMode = (): boolean => PAYMENTS_MODE === 'mock';

export type PayMethod = 'apple_pay' | 'google_pay' | 'card' | 'saved_card';

export type PaymentRequest = Readonly<{
  amountCents: number;
  currency: string;
  method: PayMethod;
  /** Saved card id when method is 'saved_card'. */
  paymentMethodId?: string | null;
  /** Card typed in the card form when method is 'card'. */
  card?: CardDetails | null;
  /** What is being paid, e.g. "Deep House Session · 2 tickets". */
  label: string;
}>;

export type PaymentResult = Readonly<{
  status: 'succeeded' | 'failed';
  paymentId: string;
  /** Shown to the user when status is 'failed'. */
  message?: string;
}>;

export type CardDetails = Readonly<{
  number: string; // digits only
  brand: CardBrand;
  expMonth: number;
  expYear: number; // 4 digits
  cvc: string;
  holderName: string;
}>;

export type CardBrand = 'visa' | 'mastercard' | 'amex' | 'discover' | 'other';

/** Card number that always declines in test mode. */
export const MOCK_DECLINE_CARD = '4000000000000002';

const wait = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));
const mockId = (prefix: string): string => `${prefix}_mock_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

/**
 * Runs a payment. In test mode it waits ~1.5 s and succeeds, except for the
 * decline test card. Never charges anything.
 */
export async function presentPayment(req: PaymentRequest): Promise<PaymentResult> {
  await wait(1500);
  if (req.method === 'card' && req.card?.number === MOCK_DECLINE_CARD) {
    return { status: 'failed', paymentId: mockId('pay'), message: 'Your card was declined.' };
  }
  return { status: 'succeeded', paymentId: mockId('pay') };
}

/**
 * Saves a card to the user's payment methods. In test mode only display data
 * (brand, last 4, expiry, name) is sent, as a real provider would after
 * tokenizing; the full number and CVC never leave the device.
 */
export async function saveCard(card: CardDetails, isDefault: boolean): Promise<ApiPaymentMethod> {
  await wait(800);
  return addMyPaymentMethod({
    provider: 'other',
    providerPaymentMethodId: mockId('pm'),
    cardBrand: card.brand,
    cardLastFour: card.number.slice(-4),
    cardExpMonth: card.expMonth,
    cardExpYear: card.expYear,
    cardholderName: card.holderName || null,
    isDefault,
  });
}

// ---- Card helpers --------------------------------------------------------

export function cardBrand(digits: string): CardBrand {
  if (/^4/.test(digits)) return 'visa';
  if (/^(5[1-5]|2[2-7])/.test(digits)) return 'mastercard';
  if (/^3[47]/.test(digits)) return 'amex';
  if (/^6(011|5)/.test(digits)) return 'discover';
  return 'other';
}

export function luhnValid(digits: string): boolean {
  if (!/^\d{12,19}$/.test(digits)) return false;
  let sum = 0;
  for (let i = 0; i < digits.length; i++) {
    let d = Number(digits[digits.length - 1 - i]);
    if (i % 2 === 1) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
  }
  return sum % 10 === 0;
}

/** "4242424242424242" → "4242 4242 4242 4242" (Amex: 4-6-5). */
export function formatCardNumber(digits: string): string {
  const d = digits.replace(/\D/g, '').slice(0, 19);
  if (cardBrand(d) === 'amex') return [d.slice(0, 4), d.slice(4, 10), d.slice(10, 15)].filter(Boolean).join(' ');
  return d.replace(/(.{4})/g, '$1 ').trim();
}

// ---- Tickets paid in test mode ---------------------------------------------
// The API doesn't know about mock payments, so tickets paid with "Pay X now"
// are remembered on the device until a real provider replaces this.

const PAID_KEY = '@gs:mockPaidTickets';

export async function getMockPaidTickets(): Promise<ReadonlySet<string>> {
  try {
    const raw = await AsyncStorage.getItem(PAID_KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

export async function markTicketsPaid(ticketIds: ReadonlyArray<string>): Promise<void> {
  const current = await getMockPaidTickets();
  const next = [...new Set([...current, ...ticketIds])];
  try {
    await AsyncStorage.setItem(PAID_KEY, JSON.stringify(next));
  } catch {
    // Best effort: the next load shows the tickets as unpaid again.
  }
}
