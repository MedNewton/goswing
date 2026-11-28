// pages/CheckoutPage.tsx — "Booking" checkout (prototype co-1/2/3, co2-done).
//
// Event summary → number of tickets (stepper, max per order, scarcity) → ticket
// holders (ticket 1 = you) → how to pay (pay now / pay at the venue, Phase 4) →
// payment method → overview → sticky CTA → confirmation.
//
// Backend today: POST /v1/reservations creates the reservation and nothing is
// charged. Phase 4 (spec § G) adds reservation holds (145–147), pay at the
// venue and payments (148). Those are called through lib/api/bookings.ts and
// only change the UI once they answer: until then the copy says honestly that
// online payment is coming soon.
import React, { useCallback, useEffect, useMemo, useRef, useState, type ReactElement } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { Apple, Check, CreditCard, Info, MapPin, Plus, QrCode, Store, Tag, X } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';

import { Cover, GsButton, GsSheet, softShadow, cx } from '@/components/gs';
import { Stepper, effectivePriceCents, MAX_TICKETS_PER_ORDER, type TicketQuantities, type TicketType } from '@/components/blocks/TicketQuantitySheet';
import { gs } from '@/theme/colors';
import { eventWhenLabel, formatCents, hhmm } from '@/lib/format';
import type { Event } from '@/types/domain';
import { useProfile } from '@/hooks/profile/useProfile';
import { useAppNav } from '@/navigation/AppNav';
import * as meApi from '@/lib/api/me';
import { computeTotals, createReservation } from '@/lib/supabase/checkout';
import {
  createBooking,
  createHold,
  fetchBooking,
  fetchEventCheckoutFields,
  fetchTicketTypesRaw,
  idempotencyKey,
  releaseHold,
  startPayment,
  updateHold,
  type P4EventCheckoutFields,
  type PaymentMethodKind,
  type ReservationHold,
} from '@/lib/api/bookings';
import { currentBookingsUser, refreshBookings } from '@/screens/bookings/bookingsStore';
import { recordMockBooking } from '@/screens/bookings/mockPayments';
import { isTestMode, markTicketsPaid, presentPayment, saveCard, type CardDetails } from '@/lib/payments';
import CardFormSheet from '@/components/payments/CardFormSheet';
import TestModeBadge from '@/components/payments/TestModeBadge';

export type CheckoutPageProps = Readonly<{
  event: Event;
  userId: string;
  /** Selected offers from the event page (TicketQuantitySheet). */
  ticketTypes: ReadonlyArray<TicketType>;
  quantities: TicketQuantities;
  onBack?: () => void;
  onReservationCreated?: (reservationId: string) => void;
  /** Legacy: parent navigation to the Bookings tab. */
  onSeeReservations?: () => void;
}>;

type PayMode = 'payNow' | 'payAtVenue';
type Method = Readonly<{ key: string; kind: PaymentMethodKind; id: string | null; label: string; card?: CardDetails | null }>;
type Holder = Readonly<{ name: string; email: string }>;
type Slot = Readonly<{ key: string; ticketTypeId: string; index: number }>;
type Done = Readonly<{
  reservationId: string;
  count: number;
  totalCents: number;
  savingsCents: number;
  mode: PayMode | null;
  paid: boolean;
  pending: boolean;
}>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const clamp = (n: number, min: number, max: number): number => Math.max(min, Math.min(max, Math.trunc(n)));

function splitName(full: string): { firstName: string; lastName: string } {
  const parts = full.trim().split(/\s+/).filter(Boolean);
  return { firstName: parts[0] ?? '', lastName: parts.slice(1).join(' ') };
}

function holderError(h: Holder | undefined): 'both' | 'name' | 'email' | null {
  const { firstName, lastName } = splitName(h?.name ?? '');
  const nameOk = !!firstName && !!lastName;
  const emailOk = EMAIL_RE.test((h?.email ?? '').trim());
  if (!nameOk && !emailOk) return 'both';
  if (!nameOk) return 'name';
  if (!emailOk) return 'email';
  return null;
}

export default function CheckoutPage({
  event,
  userId,
  ticketTypes: incomingTypes,
  quantities: initialQuantities,
  onBack,
  onReservationCreated,
}: CheckoutPageProps): ReactElement {
  const { t, i18n } = useTranslation();
  const locale = i18n.language;
  const insets = useSafeAreaInsets();
  const nav = useAppNav();
  const { profile } = useProfile();
  const eventId = String(event.id);

  // ── offers (merged with the live ticket-types for seats / Phase 4 prices) ──
  const [types, setTypes] = useState<ReadonlyArray<TicketType>>(incomingTypes);
  const [eventFields, setEventFields] = useState<P4EventCheckoutFields | null>(null);
  const [quantities, setQuantities] = useState<TicketQuantities>(() => {
    const q: TicketQuantities = {};
    for (const tt of incomingTypes) q[tt.id] = clamp(initialQuantities[tt.id] ?? 0, 0, MAX_TICKETS_PER_ORDER);
    if (incomingTypes.length > 0 && Object.values(q).every((v) => v === 0)) q[incomingTypes[0].id] = 1;
    return q;
  });

  useEffect(() => {
    let cancelled = false;
    void fetchTicketTypesRaw(eventId)
      .then((raw) => {
        if (cancelled) return;
        const byId = new Map(raw.map((r) => [String(r.id), r]));
        setTypes((cur) =>
          cur.map((tt) => {
            const r = byId.get(tt.id);
            if (!r) return tt;
            return {
              ...tt,
              priceCents: typeof r.priceCents === 'number' ? r.priceCents : tt.priceCents,
              description: r.description ?? tt.description ?? null,
              salePriceCents: r.salePriceCents ?? null,
              doorPriceCents: r.doorPriceCents ?? null,
              seatsAvailable: r.seatsAvailable ?? null,
            };
          }),
        );
      })
      .catch(() => undefined);
    void fetchEventCheckoutFields(eventId).then((f) => {
      if (!cancelled) setEventFields(f);
    });
    return () => {
      cancelled = true;
    };
  }, [eventId]);

  const maxPerOrder = clamp(eventFields?.maxTicketsPerOrder ?? MAX_TICKETS_PER_ORDER, 1, 99);
  const totalQty = types.reduce((a, tt) => a + (quantities[tt.id] ?? 0), 0);
  const currency = types[0]?.currency ?? 'EUR';
  const fmt = useCallback((cents: number) => formatCents(cents, currency, locale), [currency, locale]);

  // ── reservation hold (Phase 4, routes 145–147): best effort ──
  const [hold, setHold] = useState<ReservationHold | null>(null);
  const holdRef = useRef<ReservationHold | null>(null);
  const holdsOff = useRef(false);
  const consumed = useRef(false);
  const qtyKey = JSON.stringify(quantities);

  useEffect(() => {
    if (holdsOff.current || totalQty === 0) return;
    const timer = setTimeout(() => {
      void (async () => {
        const q = JSON.parse(qtyKey) as TicketQuantities;
        let next = holdRef.current ? await updateHold(holdRef.current.holdId, q) : null;
        if (!next) next = await createHold(eventId, q);
        if (!next && !holdRef.current) holdsOff.current = true; // route not available: stop asking
        holdRef.current = next;
        setHold(next);
      })();
    }, 350);
    return () => clearTimeout(timer);
  }, [qtyKey, totalQty, eventId]);

  useEffect(
    () => () => {
      if (holdRef.current && !consumed.current) releaseHold(holdRef.current.holdId);
    },
    [],
  );

  const paymentsLive = hold != null;
  // The event decides when it says so (Phase 4); in test mode both options are offered.
  const payAtVenueOk = typeof eventFields?.payAtVenueEnabled === 'boolean' ? eventFields.payAtVenueEnabled : isTestMode();
  const [mode, setMode] = useState<PayMode>('payNow');
  useEffect(() => {
    if (!payAtVenueOk && mode === 'payAtVenue') setMode('payNow');
  }, [payAtVenueOk, mode]);

  // ── pricing ──
  const subtotalCents = types.reduce((a, tt) => a + (quantities[tt.id] ?? 0) * effectivePriceCents(tt), 0);
  const localSavings = types.reduce((a, tt) => {
    const charged = effectivePriceCents(tt);
    const ref = tt.doorPriceCents ?? (charged < tt.priceCents ? tt.priceCents : null);
    return a + (ref != null && ref > charged ? (ref - charged) * (quantities[tt.id] ?? 0) : 0);
  }, 0);
  const feeCents =
    hold?.pricing?.serviceFeeCents ??
    (subtotalCents > 0
      ? computeTotals(
          types.map((tt, i) => ({ id: tt.id, eventId, name: tt.name, priceCents: effectivePriceCents(tt), currency: tt.currency, benefits: [], isActive: true, sortOrder: i, inventory: null })),
          quantities,
        ).serviceFeeCents
      : 0);
  const savingsCents = hold?.pricing?.savingsCents ?? localSavings;
  const totalCents = hold?.pricing?.totalCents ?? subtotalCents + feeCents;

  // ── holders ──
  const slots = useMemo<ReadonlyArray<Slot>>(() => {
    const out: Slot[] = [];
    for (const tt of types) for (let i = 1; i <= (quantities[tt.id] ?? 0); i++) out.push({ key: `${tt.id}::${i}`, ticketTypeId: tt.id, index: i });
    return out;
  }, [types, quantities]);
  const [holders, setHolders] = useState<Record<number, Holder>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [submitted, setSubmitted] = useState(false);

  // Ticket 1 is the buyer: prefill from the profile once.
  const prefilled = useRef(false);
  useEffect(() => {
    if (prefilled.current || !profile) return;
    prefilled.current = true;
    setHolders((cur) => (cur[0]?.name || cur[0]?.email ? cur : { ...cur, 0: { name: profile.name ?? '', email: profile.email ?? '' } }));
  }, [profile]);

  const setHolder = (i: number, patch: Partial<Holder>): void =>
    setHolders((cur) => ({ ...cur, [i]: { name: cur[i]?.name ?? '', email: cur[i]?.email ?? '', ...patch } }));
  const errors = slots.map((_, i) => holderError(holders[i]));
  const formValid = slots.length > 0 && errors.every((e) => e == null);

  // ── payment methods ──
  const wallet: Method =
    Platform.OS === 'android'
      ? { key: 'google', kind: 'google_pay', id: null, label: t('bookings.co.googlePay') }
      : { key: 'apple', kind: 'apple_pay', id: null, label: t('bookings.co.applePay') };
  const [cards, setCards] = useState<ReadonlyArray<Method>>([]);
  const [methodKey, setMethodKey] = useState<string>(wallet.key);
  useEffect(() => {
    let cancelled = false;
    meApi
      .listMyPaymentMethods()
      .then((page) => {
        if (cancelled) return;
        const items = (page.items ?? []).slice().sort((a, b) => Number(!!b.isDefault) - Number(!!a.isDefault));
        setCards(items.map((c) => ({ key: `card-${c.id}`, kind: 'saved_card', id: c.id, label: t('bookings.co.card', { last4: c.cardLastFour ?? '••••' }) })));
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [t]);
  // A card typed in the card form (saved or not) for this payment.
  const [newCard, setNewCard] = useState<Method | null>(null);
  const [cardSheet, setCardSheet] = useState(false);
  const methods = [wallet, ...cards.filter((c) => c.id == null || c.id !== newCard?.id), ...(newCard ? [newCard] : [])];
  const method = methods.find((m) => m.key === methodKey) ?? wallet;
  const [payError, setPayError] = useState<string | null>(null);
  useEffect(() => setPayError(null), [methodKey, mode]);

  // ── submit ──
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<Done | null>(null);
  const [legal, setLegal] = useState<'rules' | 'policy' | null>(null);
  const idemKey = useRef(idempotencyKey());
  const created = useRef<{ reservationId: string; status: string | null } | null>(null);

  const submit = async (): Promise<void> => {
    if (busy) return;
    if (totalQty === 0) {
      Alert.alert(t('bookings.co.failed'), t('bookings.co.noTickets'));
      return;
    }
    setSubmitted(true);
    if (!formValid) return;
    setBusy(true);
    try {
      const attendees = slots.map((s, i) => {
        const { firstName, lastName } = splitName(holders[i]?.name ?? '');
        return { ticketTypeId: s.ticketTypeId, index: s.index, firstName, lastName, email: (holders[i]?.email ?? '').trim() };
      });
      const billing = { email: attendees[0].email, firstName: attendees[0].firstName, lastName: attendees[0].lastName };
      const qty: Record<string, number> = {};
      for (const [k, v] of Object.entries(quantities)) if (v > 0) qty[k] = v;

      const charge = mode === 'payNow' && totalCents > 0;
      // Test-mode payment (lib/payments): the only provider for now.
      const payMock = async (): Promise<boolean> => {
        const r = await presentPayment({
          amountCents: totalCents,
          currency,
          method: method.kind,
          paymentMethodId: method.kind === 'saved_card' ? method.id : null,
          card: method.card ?? null,
          label: `${event.title} · ${t('bookings.ticketsCount', { count: totalQty })}`,
        });
        if (r.status === 'succeeded') return true;
        setPayError(t('bookings.co.declined', { message: r.message ?? t('bookings.payDeclined') }));
        return false;
      };

      let reservationId: string;
      let status: string | null = null;
      let paid = false;
      let mockPaid = false;
      if (paymentsLive && hold) {
        // Phase 4: create the reservation once (retries reuse it), then pay via
        // route 148; the test-mode payment stands in while that route is missing.
        if (!created.current) {
          const res = await createBooking({ eventId, quantities: qty, attendees, billing, phase4: { holdId: hold.holdId, paymentMode: mode } }, idemKey.current);
          created.current = { reservationId: res.reservationId, status: res.status };
          consumed.current = true;
        }
        reservationId = created.current.reservationId;
        status = created.current.status;
        if (charge) {
          const pay = await startPayment(reservationId, { method: method.kind, paymentMethodId: method.id }).catch(() => null);
          if (pay?.kind === 'unavailable') {
            if (!(await payMock())) return;
            paid = mockPaid = true;
          } else paid = pay?.kind === 'started' && pay.status === 'succeeded';
        }
      } else {
        // Pay first: a declined payment creates nothing.
        if (charge && !(await payMock())) return;
        const res = await createReservation({ eventId, userId, quantities: qty, attendees, billing, status: 'pending' });
        reservationId = res.reservationId;
        consumed.current = true;
        paid = mockPaid = charge;
        if (totalCents > 0) await recordMockBooking(currentBookingsUser(), reservationId, { mode, paidAll: charge });
      }
      if (mockPaid) {
        // Remember the paid tickets on the device (the API doesn't know about test payments).
        try {
          const b = await fetchBooking(reservationId);
          await markTicketsPaid(b.tickets.map((tk) => tk.id));
        } catch {
          // The reservation record (paidAll) still marks it paid.
        }
      }

      onReservationCreated?.(reservationId);
      void refreshBookings({ force: true });
      setDone({
        reservationId,
        count: totalQty,
        totalCents,
        savingsCents,
        mode: totalCents > 0 ? mode : null,
        paid: paid && totalCents > 0,
        pending: (status ?? '').toLowerCase() === 'pending' && event.approvalMode != null && event.approvalMode !== 'auto',
      });
    } catch (e: unknown) {
      Alert.alert(t('bookings.co.failed'), e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  // ── labels ──
  const end = event.endsAtIso ? new Date(event.endsAtIso) : null;
  const whenBase = eventWhenLabel(event, t, locale);
  const when = whenBase && end && !Number.isNaN(end.getTime()) && !whenBase.includes(hhmm(end)) ? `${whenBase} → ${hhmm(end)}` : whenBase;
  const venueObj = eventFields && typeof eventFields.venue === 'object' ? eventFields.venue : null;
  const address = venueObj?.addressLine1 ?? eventFields?.addressLine1 ?? null;
  const where = [venueObj?.name ?? event.venue, address ?? event.city].filter(Boolean).join(' · ');

  let cta: { label: string; dark: boolean; icon: ReactElement | null };
  if (totalCents === 0) cta = { label: t('bookings.co.btnConfirmFree'), dark: false, icon: null };
  else if (mode === 'payAtVenue') cta = { label: t('bookings.co.btnVenue', { price: fmt(totalCents) }), dark: false, icon: null };
  else if (method.kind === 'apple_pay') cta = { label: t('bookings.co.btnApple', { price: fmt(totalCents) }), dark: true, icon: <Apple size={20} color={gs.white} fill={gs.white} /> };
  else if (method.kind === 'google_pay') cta = { label: t('bookings.co.btnGoogle', { price: fmt(totalCents) }), dark: true, icon: null };
  else cta = { label: t('bookings.co.btnCard', { price: fmt(totalCents) }), dark: false, icon: <CreditCard size={20} color={gs.white} /> };

  if (done) {
    return (
      <DoneView
        done={done}
        event={event}
        when={when}
        fmt={fmt}
        onView={() => {
          nav.switchTab('bookings', { bookingsTab: 'active' });
          nav.push({ name: 'reservationDetails', reservationId: done.reservationId });
        }}
        onBackToEvent={onBack ?? nav.back}
      />
    );
  }

  return (
    <KeyboardAvoidingView className="flex-1" style={{ backgroundColor: gs.surface }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" contentContainerStyle={{ paddingBottom: 170 + insets.bottom }} showsVerticalScrollIndicator={false}>
        <View className="flex-row items-center justify-between px-5 pt-4">
          <Text className="text-[34px] leading-[40px] font-extrabold text-ink" accessibilityRole="header">
            {t('bookings.co.title')}
          </Text>
          <Pressable
            onPress={onBack ?? nav.back}
            accessibilityRole="button"
            accessibilityLabel={t('bookings.co.close')}
            className="h-11 w-11 rounded-full bg-white items-center justify-center"
            style={softShadow}
          >
            <X size={20} color={gs.ink} />
          </Pressable>
        </View>

        <View className="px-5 pt-[18px]" style={{ gap: 26 }}>
          {/* Event summary */}
          <View className="flex-row items-center bg-white rounded-[24px] p-3" style={[softShadow, { gap: 14 }]}>
            <Cover uri={event.imageUrl} toneKey={eventId} radius={18} style={{ width: 84, height: 84 }} />
            <View className="flex-1">
              {when ? (
                <Text className="text-[14px] font-bold" style={{ color: gs.violetDark }} numberOfLines={1}>
                  {when}
                </Text>
              ) : null}
              <Text className="text-[18px] font-extrabold text-ink mt-0.5" numberOfLines={2}>
                {event.title}
              </Text>
              {where ? (
                <View className="flex-row items-start mt-0.5" style={{ gap: 5 }}>
                  <MapPin size={14} color={gs.muted} style={{ marginTop: 3 }} />
                  <Text className="flex-1 text-[14px] text-muted" numberOfLines={2}>
                    {where}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>

          {/* Number of tickets */}
          <Section title={t('bookings.co.tickets')}>
            {types.map((tt) => {
              const q = quantities[tt.id] ?? 0;
              const price = effectivePriceCents(tt);
              const left = typeof tt.seatsAvailable === 'number' ? tt.seatsAvailable : typeof tt.inventory === 'number' ? tt.inventory : null;
              const canAdd = totalQty < maxPerOrder && (left == null || q < left);
              return (
                <View key={tt.id} style={{ gap: 8 }}>
                  <View className="flex-row items-center bg-white rounded-[24px] py-4 pr-4 pl-[18px]" style={[softShadow, { gap: 12 }]}>
                    <View className="flex-1">
                      <Text className="text-[13px] font-bold" style={{ color: gs.violetDark }} numberOfLines={1}>
                        {tt.name}
                      </Text>
                      <View className="flex-row items-baseline flex-wrap" style={{ columnGap: 6 }}>
                        <Text className="text-[20px] font-extrabold text-ink">{price === 0 ? t('gs.free') : t('bookings.co.perTicket', { price: fmt(price) })}</Text>
                        {price < tt.priceCents ? (
                          <Text className="text-[14px] text-faint" style={{ textDecorationLine: 'line-through' }}>
                            {fmt(tt.priceCents)}
                          </Text>
                        ) : null}
                      </View>
                      {typeof tt.doorPriceCents === 'number' && tt.doorPriceCents > price ? (
                        <Text className="text-[12px] text-muted mt-0.5">{t('bookings.co.atDoor', { price: fmt(tt.doorPriceCents) })}</Text>
                      ) : null}
                    </View>
                    <Stepper
                      value={q}
                      onMinus={() => setQuantities((cur) => ({ ...cur, [tt.id]: Math.max(0, q - 1) }))}
                      onPlus={() => setQuantities((cur) => ({ ...cur, [tt.id]: q + 1 }))}
                      minusDisabled={q <= 0 || totalQty <= 1}
                      plusDisabled={!canAdd}
                      minusLabel={t('bookings.co.remove', { name: tt.name })}
                      plusLabel={t('bookings.co.add', { name: tt.name })}
                    />
                  </View>
                  {left != null && left <= 20 ? (
                    <Text className="text-[13px] font-bold pl-1" style={{ color: gs.pinkDark }}>
                      {t('bookings.co.scarcity', { count: left })}
                    </Text>
                  ) : null}
                </View>
              );
            })}
            {totalQty >= maxPerOrder ? <Text className="text-[13px] font-bold text-muted pl-1">{t('bookings.co.maxReached', { count: maxPerOrder })}</Text> : null}
          </Section>

          {/* Ticket holders */}
          <Section title={t('bookings.co.holders')} subtitle={t('bookings.co.holdersSub')}>
            {slots.map((s, i) => {
              const h = holders[i];
              const err = errors[i];
              const showErr = !!err && (submitted || (!!touched[`${i}:name`] && !!touched[`${i}:email`]));
              const nameBad = showErr && (err === 'both' || err === 'name');
              const emailBad = showErr && (err === 'both' || err === 'email');
              return (
                <View key={s.key} className="bg-white rounded-[24px] px-[18px] pt-4 pb-[18px]" style={[softShadow, { gap: 12 }]}>
                  <View className="flex-row items-center" style={{ gap: 10 }}>
                    <View className="h-8 w-8 rounded-[10px] items-center justify-center" style={{ backgroundColor: gs.violetSoft }}>
                      <Text className="text-[14px] font-extrabold" style={{ color: gs.violetDark }}>
                        {i + 1}
                      </Text>
                    </View>
                    <Text className="text-[16px] font-extrabold text-ink">{i === 0 ? t('bookings.co.ticketYou') : t('bookings.co.ticketGuest', { n: i + 1 })}</Text>
                  </View>
                  <Field
                    label={t('bookings.co.fullName')}
                    value={h?.name ?? ''}
                    placeholder={t('bookings.co.namePh')}
                    onChange={(v) => setHolder(i, { name: v })}
                    onBlur={() => setTouched((c) => ({ ...c, [`${i}:name`]: true }))}
                    invalid={nameBad}
                    autoComplete="name"
                  />
                  <Field
                    label={t('bookings.co.email')}
                    value={h?.email ?? ''}
                    placeholder={t('bookings.co.emailPh')}
                    onChange={(v) => setHolder(i, { email: v })}
                    onBlur={() => setTouched((c) => ({ ...c, [`${i}:email`]: true }))}
                    invalid={emailBad}
                    autoComplete="email"
                    keyboardType="email-address"
                  />
                  {showErr ? (
                    <Text accessibilityRole="alert" className="text-[13px] font-bold" style={{ color: gs.danger }}>
                      {t(err === 'both' ? 'bookings.co.errBoth' : err === 'name' ? 'bookings.co.errName' : 'bookings.co.errEmail')}
                    </Text>
                  ) : null}
                </View>
              );
            })}
          </Section>

          {/* How to pay — a real choice only when the event allows paying at the venue (Phase 4). */}
          {payAtVenueOk && totalCents > 0 ? (
            <Section title={t('bookings.co.howPay')}>
              <PayModeCard
                selected={mode === 'payNow'}
                onPress={() => setMode('payNow')}
                icon={<CreditCard size={22} color={mode === 'payNow' ? gs.white : gs.violetDark} />}
                title={t('bookings.co.payNow')}
                sub={t('bookings.co.payNowSub')}
                badge={t('bookings.co.recommended')}
                amount={fmt(totalCents)}
              />
              <PayModeCard
                selected={mode === 'payAtVenue'}
                onPress={() => setMode('payAtVenue')}
                icon={<Store size={22} color={mode === 'payAtVenue' ? gs.white : gs.violetDark} />}
                title={t('bookings.co.payVenue')}
                sub={t('bookings.co.payVenueSub')}
                amount={fmt(totalCents)}
              />
            </Section>
          ) : null}

          {/* Payment method */}
          {mode === 'payNow' && totalCents > 0 ? (
            <Section title={t('bookings.co.method')}>
              <TestModeBadge />
              <View className="flex-row flex-wrap" style={{ gap: 10 }}>
                {methods.map((m) => {
                  const on = m.key === method.key;
                  return (
                    <Pressable
                      key={m.key}
                      onPress={() => setMethodKey(m.key)}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: on }}
                      className="h-[58px] rounded-[18px] bg-white flex-row items-center justify-center"
                      style={{ borderWidth: 2, borderColor: on ? gs.violet : gs.line, flexBasis: '47%', flexGrow: 1, gap: 8 }}
                    >
                      {m.kind === 'apple_pay' ? <Apple size={18} color={gs.ink} fill={gs.ink} /> : <CreditCard size={18} color={gs.ink} />}
                      <Text className="text-[16px] font-extrabold text-ink" numberOfLines={1}>
                        {m.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              <Pressable
                onPress={() => setCardSheet(true)}
                accessibilityRole="button"
                className="self-start h-11 flex-row items-center px-1"
                style={{ gap: 6 }}
              >
                <Plus size={16} color={gs.violetDark} />
                <Text className="text-[14px] font-bold" style={{ color: gs.violetDark }}>
                  {t('bookings.co.addCard')}
                </Text>
              </Pressable>
            </Section>
          ) : null}

          {/* Overview */}
          <Section title={t('bookings.co.overview')}>
            <View className="bg-white rounded-[24px] px-5 py-[18px]" style={[softShadow, { gap: 12 }]}>
              {types
                .filter((tt) => (quantities[tt.id] ?? 0) > 0)
                .map((tt) => (
                  <Row
                    key={tt.id}
                    label={`${types.length > 1 ? `${tt.name} · ` : ''}${t('bookings.co.line', { count: quantities[tt.id], price: fmt(effectivePriceCents(tt)) })}`}
                    value={fmt((quantities[tt.id] ?? 0) * effectivePriceCents(tt))}
                  />
                ))}
              <Row label={t('bookings.co.fee')} value={feeCents === 0 ? t('bookings.co.free') : fmt(feeCents)} valueColor={feeCents === 0 ? gs.green : undefined} />
              {savingsCents > 0 ? (
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center" style={{ gap: 6 }}>
                    <Tag size={14} color={gs.green} />
                    <Text className="text-[14px] font-bold" style={{ color: gs.green }}>
                      {t('bookings.co.savings')}
                    </Text>
                  </View>
                  <Text className="text-[14px] font-extrabold" style={{ color: gs.green }}>
                    −{fmt(savingsCents)}
                  </Text>
                </View>
              ) : null}
              <View className="flex-row items-baseline justify-between pt-3" style={{ borderTopWidth: 1.5, borderTopColor: gs.surface2 }}>
                <Text className="text-[19px] font-extrabold text-ink">
                  {totalCents === 0 ? t('bookings.co.total') : mode === 'payAtVenue' ? t('bookings.co.totalVenue') : t('bookings.co.totalNow')}
                </Text>
                <Text className="text-[24px] font-extrabold text-ink">{fmt(totalCents)}</Text>
              </View>
              <Text className="text-[13px] text-muted leading-[18px]">
                {mode === 'payAtVenue' && totalCents > 0 ? t('bookings.co.noteVenue') : t('bookings.co.noteNow')}
              </Text>
            </View>
            <Text className="text-[12px] leading-[18px] text-muted text-center px-3">
              {t('bookings.co.legalA')}
              <Text onPress={() => setLegal('rules')} accessibilityRole="link" className="font-bold underline" style={{ color: gs.violetDark }}>
                {t('bookings.co.rules')}
              </Text>
              {t('bookings.co.legalB')}
              <Text onPress={() => setLegal('policy')} accessibilityRole="link" className="font-bold underline" style={{ color: gs.violetDark }}>
                {t('bookings.co.policy')}
              </Text>
              {t('bookings.co.legalC')}
            </Text>
          </Section>
        </View>
      </ScrollView>

      {/* Sticky CTA */}
      <View className="absolute left-0 right-0 bottom-0 px-5 pt-3" style={{ paddingBottom: Math.max(insets.bottom, 16) + 8, backgroundColor: gs.surface }}>
        <FadeTop />
        {payError ? (
          <View accessibilityRole="alert" className="rounded-2xl px-4 py-3 mb-2.5" style={{ backgroundColor: gs.dangerSoft }}>
            <Text className="text-[14px] font-semibold text-center" style={{ color: gs.danger }}>
              {payError}
            </Text>
          </View>
        ) : null}
        {submitted && !formValid ? (
          <Text accessibilityRole="alert" className="text-center text-[13px] font-bold mb-2.5" style={{ color: gs.danger }}>
            {t('bookings.co.errSummary')}
          </Text>
        ) : null}
        <Pressable
          onPress={() => void submit()}
          disabled={busy}
          accessibilityRole="button"
          accessibilityState={{ busy, disabled: busy }}
          className="h-[60px] rounded-full flex-row items-center justify-center"
          style={{
            backgroundColor: cta.dark ? gs.ink : gs.violet,
            gap: 10,
            shadowColor: '#14121F',
            shadowOpacity: 0.22,
            shadowRadius: 16,
            shadowOffset: { width: 0, height: 10 },
            elevation: 6,
          }}
        >
          {busy ? <ActivityIndicator color={gs.white} /> : cta.icon}
          <Text className="text-[18px] font-extrabold text-white" numberOfLines={1}>
            {busy ? t('bookings.co.processing') : cta.label}
          </Text>
        </Pressable>
      </View>

      <CardFormSheet
        visible={cardSheet}
        mode="pay"
        defaultName={holders[0]?.name ?? ''}
        onClose={() => setCardSheet(false)}
        onSubmit={async ({ card, save, makeDefault }) => {
          let id: string | null = null;
          if (save) id = (await saveCard(card, makeDefault)).id;
          const m: Method = { key: `new-${card.number.slice(-4)}-${Date.now()}`, kind: 'card', id, label: t('bookings.co.newCard', { last4: card.number.slice(-4) }), card };
          setNewCard(m);
          setMethodKey(m.key);
          setCardSheet(false);
        }}
      />

      <GsSheet visible={legal != null} onClose={() => setLegal(null)} title={legal === 'policy' ? t('bookings.co.policy') : t('bookings.co.rules')}>
        <Text className="px-5 text-[15px] leading-[22px] text-subtle">{legal === 'policy' ? t('bookings.co.policyBody') : t('bookings.co.rulesBody')}</Text>
      </GsSheet>
    </KeyboardAvoidingView>
  );
}

// ───────────────────────── pieces ─────────────────────────

/** Soft fade above the sticky CTA so content scrolls away under it. */
function FadeTop(): ReactElement {
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: -28, height: 28 }}>
      <Svg width="100%" height="100%">
        <Defs>
          <LinearGradient id="co-fade" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={gs.surface} stopOpacity={0} />
            <Stop offset="1" stopColor={gs.surface} stopOpacity={1} />
          </LinearGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#co-fade)" />
      </Svg>
    </View>
  );
}

function Section({ title, subtitle, children }: Readonly<{ title: string; subtitle?: string; children: React.ReactNode }>): ReactElement {
  return (
    <View style={{ gap: 12 }}>
      <View>
        <Text className="text-[22px] font-extrabold text-ink" accessibilityRole="header">
          {title}
        </Text>
        {subtitle ? <Text className="text-[14px] text-muted mt-0.5">{subtitle}</Text> : null}
      </View>
      {children}
    </View>
  );
}

function Field({
  label,
  value,
  placeholder,
  onChange,
  onBlur,
  invalid,
  autoComplete,
  keyboardType,
}: Readonly<{
  label: string;
  value: string;
  placeholder: string;
  onChange: (v: string) => void;
  onBlur: () => void;
  invalid: boolean;
  autoComplete: 'name' | 'email';
  keyboardType?: 'email-address';
}>): ReactElement {
  const [focus, setFocus] = useState(false);
  return (
    <View style={{ gap: 6 }}>
      <Text className="text-[13px] font-bold text-subtle">{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={gs.faint}
        onFocus={() => setFocus(true)}
        onBlur={() => {
          setFocus(false);
          onBlur();
        }}
        autoComplete={autoComplete}
        autoCapitalize={autoComplete === 'email' ? 'none' : 'words'}
        autoCorrect={false}
        keyboardType={keyboardType}
        accessibilityLabel={label}
        className="h-[50px] rounded-[14px] px-3.5 text-[16px] text-ink"
        style={{ backgroundColor: gs.surface, borderWidth: 1.5, borderColor: invalid ? gs.danger : focus ? gs.violet : gs.line }}
      />
    </View>
  );
}

function PayModeCard({
  selected,
  onPress,
  icon,
  title,
  sub,
  badge,
  amount,
}: Readonly<{ selected: boolean; onPress: () => void; icon: ReactElement; title: string; sub: string; badge?: string; amount: string }>): ReactElement {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      className="flex-row items-center bg-white rounded-[24px] p-4"
      style={[softShadow, { borderWidth: 2, borderColor: selected ? gs.violet : 'transparent', gap: 14 }]}
    >
      <View className="h-[52px] w-[52px] rounded-[16px] items-center justify-center" style={{ backgroundColor: selected ? gs.violet : gs.violetSoft }}>
        {icon}
      </View>
      <View className="flex-1" style={{ gap: 4 }}>
        <View className="flex-row items-center flex-wrap" style={{ gap: 8 }}>
          <Text className="text-[17px] font-extrabold text-ink">{title}</Text>
          {badge ? (
            <View className="rounded-full px-2.5 py-0.5" style={{ backgroundColor: gs.greenSoft }}>
              <Text className="text-[12px] font-extrabold" style={{ color: gs.green }}>
                {badge}
              </Text>
            </View>
          ) : null}
        </View>
        <Text className="text-[14px] leading-[19px] text-muted">{sub}</Text>
      </View>
      <View className="items-end" style={{ gap: 10 }}>
        <Text className="text-[17px] font-extrabold text-ink">{amount}</Text>
        <View className="h-6 w-6 rounded-full items-center justify-center" style={{ borderWidth: 2, borderColor: selected ? gs.violet : gs.lineStrong }}>
          {selected ? <View className="h-3 w-3 rounded-full" style={{ backgroundColor: gs.violet }} /> : null}
        </View>
      </View>
    </Pressable>
  );
}

function Row({ label, value, valueColor }: Readonly<{ label: string; value: string; valueColor?: string }>): ReactElement {
  return (
    <View className="flex-row justify-between items-center">
      <Text className="text-[16px] text-muted flex-1 pr-3">{label}</Text>
      <Text className="text-[16px] font-extrabold" style={{ color: valueColor ?? gs.ink }}>
        {value}
      </Text>
    </View>
  );
}

function DoneView({
  done,
  event,
  when,
  fmt,
  onView,
  onBackToEvent,
}: Readonly<{ done: Done; event: Event; when: string; fmt: (c: number) => string; onView: () => void; onBackToEvent: () => void }>): ReactElement {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const venue = done.mode === 'payAtVenue';
  const title = done.pending ? t('bookings.co.donePending') : done.paid ? t('bookings.co.doneNow') : t('bookings.co.doneBooked');
  let sub: string;
  if (done.pending) sub = t('bookings.co.subPending');
  else if (done.paid) sub = done.savingsCents > 0 ? t('bookings.co.subSaved', { count: done.count, saved: fmt(done.savingsCents) }) : t('bookings.co.subReady', { count: done.count });
  else if (venue) sub = t('bookings.co.subVenue', { count: done.count, price: fmt(done.totalCents) });
  else sub = t('bookings.co.subReady', { count: done.count });
  const state = done.paid ? t('bookings.co.statusPaid') : venue ? t('bookings.co.statusVenue') : t('bookings.co.statusReserved');
  const line = [t('bookings.ticketsCount', { count: done.count }), done.totalCents > 0 ? fmt(done.totalCents) : t('gs.free'), state].join(' · ');

  return (
    <View className="flex-1" style={{ backgroundColor: gs.surface }}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 36, paddingBottom: 200 }}>
        <View className="items-center">
          <View className="h-[250px] w-[250px] rounded-full items-center justify-center" style={{ backgroundColor: 'rgba(34,197,94,0.07)' }}>
            <View className="h-[188px] w-[188px] rounded-full items-center justify-center" style={{ backgroundColor: 'rgba(34,197,94,0.12)' }}>
              <View className="h-[132px] w-[132px] rounded-full items-center justify-center" style={{ backgroundColor: '#22C55E' }}>
                <Check size={64} color={gs.white} strokeWidth={3.2} />
              </View>
            </View>
          </View>
          <Text className="text-[32px] leading-[38px] font-extrabold text-ink text-center mt-2" accessibilityRole="header">
            {title}
          </Text>
          <Text className="text-[16px] leading-[24px] text-muted text-center mt-3 px-4">{sub}</Text>
          {done.mode ? (
            <View className="mt-4">
              <TestModeBadge compact />
            </View>
          ) : null}
        </View>
        <View className={cx('flex-row items-center bg-white rounded-[22px] p-3 mt-8')} style={[softShadow, { gap: 12 }]}>
          <Cover uri={event.imageUrl} toneKey={String(event.id)} radius={14} style={{ width: 60, height: 60 }} />
          <View className="flex-1">
            {when ? (
              <Text className="text-[13px] font-bold" style={{ color: gs.violetDark }} numberOfLines={1}>
                {when}
              </Text>
            ) : null}
            <Text className="text-[16px] font-extrabold text-ink" numberOfLines={1}>
              {event.title}
            </Text>
            <Text className="text-[13px] text-muted" numberOfLines={1}>
              {line}
            </Text>
          </View>
        </View>
      </ScrollView>
      <View className="absolute left-0 right-0 bottom-0 px-5" style={{ paddingBottom: Math.max(insets.bottom, 16) + 8, gap: 10 }}>
        <GsButton
          label={t('bookings.co.view', { count: done.count })}
          onPress={onView}
          size="lg"
          fullWidth
          icon={<QrCode size={20} color={gs.white} />}
          className="h-[58px]"
        />
        <GsButton label={t('bookings.co.backEvent')} onPress={onBackToEvent} variant="secondary" size="lg" fullWidth className="h-[52px]" />
      </View>
    </View>
  );
}

