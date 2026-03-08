// pages/CheckoutPage.tsx
import React, { useEffect, useMemo, useState, type ReactElement } from 'react';
import { Pressable, ScrollView, Text, TextInput, View, ActivityIndicator, Modal } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import type { Event } from '@/types/domain';

import {
  type TicketType as CheckoutTicketType,
  type TicketQuantities,
  type AttendeeInput,
  type BillingInput,
  computeTotals,
  summarizeSelection,
  buildAttendeeSlots,
  createReservation,
} from '@/lib/supabase/checkout';

import { supabase } from '@/lib/supabase';
import { useProfile } from '@/hooks/profile/useProfile';

type IncomingTicketType = Readonly<{
  id: string;
  name: string;
  priceCents: number;
  currency: string;
}>;

export type CheckoutPageProps = Readonly<{
  event: Event;
  userId: string;

  // From TicketQuantitySheet / EventDetailsPage
  ticketTypes: ReadonlyArray<IncomingTicketType>;
  quantities: TicketQuantities;

  onBack?: () => void;
  onReservationCreated?: (reservationId: string) => void;

  // Optional: parent can navigate to Reservations tab/screen
  onSeeReservations?: () => void;
}>;

type TabKey = 'summary' | 'attendees' | 'payment';

const cx = (...c: ReadonlyArray<string | null | undefined | false>): string => c.filter(Boolean).join(' ');

/**
 * IMPORTANT:
 * Your HomePage renders BottomTabBar even on checkout route, and it overlays the screen.
 * This height is used to lift the CTA and add scroll padding so the CTA is fully visible.
 * If your BottomTabBar is taller/shorter, adjust this one number once.
 */
const BOTTOM_TAB_BAR_HEIGHT = 78;

function normalizeTicketTypes(
    eventId: string,
    incoming: ReadonlyArray<IncomingTicketType>
  ): ReadonlyArray<CheckoutTicketType> {
    return incoming.map((t, i) => ({
      id: t.id,
      eventId,
      name: t.name,
      priceCents: t.priceCents,
      currency: t.currency ?? 'USD',
  
      // NEW: required by the TicketType type we use for snapshots
      benefits: (t as any).benefits ?? [],
  
      isActive: true,
      sortOrder: i,
      inventory: null,
    }));
  }
  

function formatMoneyCents(cents: number, currency: string): string {
  const amount = cents / 100;
  if (currency === 'EUR') return `€${amount.toFixed(0)}`;
  if (currency === 'USD') return `$${amount.toFixed(0)}`;
  return `${amount.toFixed(0)} ${currency}`;
}

function formatDateTime(iso?: string | null): { date: string; time: string } | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const date = d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
  const time = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  return { date, time };
}

function clampInt(n: unknown, min: number, max: number): number {
  const x = typeof n === 'number' ? n : Number(n);
  if (!Number.isFinite(x)) return min;
  return Math.max(min, Math.min(max, Math.trunc(x)));
}

function hasNonEmpty(v: unknown): boolean {
  return typeof v === 'string' && v.trim().length > 0;
}

function validateEmailLoose(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

type AttendeeDraft = Readonly<{
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string;
  dietaryRestrictions?: string;
  emergencyContact?: string;
}>;

type AttendeeDraftMap = Record<string, AttendeeDraft>;

export default function CheckoutPage({
  event,
  userId,
  ticketTypes: incomingTicketTypes,
  quantities: initialQuantities,
  onBack,
  onReservationCreated,
  onSeeReservations,
}: CheckoutPageProps): ReactElement {
  const insets = useSafeAreaInsets();
  const { profile } = useProfile();

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const { data, error } = await supabase.rpc('debug_auth_context');
      console.log('debug_auth_context', { data, error });
      console.log("log")
    })();
  }, []);

  const [tab, setTab] = useState<TabKey>('summary');
  const [ctaHeight, setCtaHeight] = useState(0);

  const [quantities, setQuantities] = useState<TicketQuantities>(initialQuantities ?? {});
  const normalizedTicketTypes = useMemo(
    () => normalizeTicketTypes(String(event.id), incomingTicketTypes),
    [event.id, incomingTicketTypes],
  );

  const currency = normalizedTicketTypes[0]?.currency ?? 'USD';
  const totals = useMemo(() => computeTotals(normalizedTicketTypes, quantities), [normalizedTicketTypes, quantities]);

  const selection = useMemo(() => summarizeSelection(normalizedTicketTypes, quantities), [normalizedTicketTypes, quantities]);
  const attendeeSlots = useMemo(() => buildAttendeeSlots(normalizedTicketTypes, quantities), [normalizedTicketTypes, quantities]);

  const [attendeesByKey, setAttendeesByKey] = useState<AttendeeDraftMap>({});

  const [billing, setBilling] = useState<BillingInput>({
    email: '',
    firstName: '',
    lastName: '',
  });

  const [useSameAsBilling, setUseSameAsBilling] = useState(false);

  // Sync billing from first attendee when checkbox is on
  useEffect(() => {
    if (!useSameAsBilling) return;
    if (attendeeSlots.length === 0) return;
    const first = attendeesByKey[attendeeSlots[0].key];
    if (!first) return;
    setBilling({
      email: first.email,
      firstName: first.firstName,
      lastName: first.lastName,
    });
  }, [useSameAsBilling, attendeesByKey, attendeeSlots]);

  const [paymentMethod, setPaymentMethod] = useState<'card' | 'apple' | 'google'>('card');

  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [zip, setZip] = useState('');

  const [agreed, setAgreed] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Success modal
  const [successOpen, setSuccessOpen] = useState(false);
  const [successReservationId, setSuccessReservationId] = useState<string | null>(null);


  useEffect(() => {
    setAttendeesByKey((cur) => {
      const next: AttendeeDraftMap = { ...cur };

      for (const s of attendeeSlots) {
        if (!next[s.key]) {
          next[s.key] = {
            firstName: '',
            lastName: '',
            email: '',
            phoneNumber: '',
            dietaryRestrictions: '',
            emergencyContact: '',
          };
        }
      }

      for (const k of Object.keys(next)) {
        if (!attendeeSlots.some((s) => s.key === k)) delete next[k];
      }

      return next;
    });
  }, [attendeeSlots]);

  // Auto-fill first attendee with user profile data
  const profileFilledRef = React.useRef(false);
  useEffect(() => {
    if (profileFilledRef.current) return;
    if (!profile) return;
    if (attendeeSlots.length === 0) return;

    const firstKey = attendeeSlots[0].key;
    const cur = attendeesByKey[firstKey];
    if (!cur) return;

    // Only auto-fill if first attendee fields are all empty
    const allEmpty = !cur.firstName && !cur.lastName && !cur.email && !cur.phoneNumber;
    if (!allEmpty) return;

    const nameParts = (profile.name ?? '').trim().split(/\s+/);
    const firstName = nameParts[0] ?? '';
    const lastName = nameParts.slice(1).join(' ') ?? '';
    const email = profile.email ?? '';
    const phone = profile.phone ?? '';

    if (!firstName && !email) return;

    profileFilledRef.current = true;
    setAttendeesByKey((prev) => ({
      ...prev,
      [firstKey]: {
        ...(prev[firstKey] ?? emptyAttendee()),
        firstName: firstName || prev[firstKey]?.firstName || '',
        lastName: lastName || prev[firstKey]?.lastName || '',
        email: email || prev[firstKey]?.email || '',
        phoneNumber: phone || prev[firstKey]?.phoneNumber || '',
      },
    }));
  }, [profile, attendeeSlots, attendeesByKey]);

  const bumpQty = (ticketTypeId: string, delta: number) => {
    setQuantities((cur) => {
      const q = clampInt(cur[ticketTypeId] ?? 0, 0, 999);
      const nextQ = Math.max(0, Math.min(999, q + delta));
      return { ...cur, [ticketTypeId]: nextQ };
    });
  };

  const setQty = (ticketTypeId: string, qty: number) => {
    setQuantities((cur) => ({ ...cur, [ticketTypeId]: Math.max(0, Math.min(999, Math.trunc(qty))) }));
  };

  const dt = useMemo(() => formatDateTime(event.startsAtIso), [event.startsAtIso]);

  // padding for the CTA itself
  const bottomCtaPad = Math.max(insets.bottom, 12) + 14;

  /**
   * Scroll padding must account for:
   * - CTA overlay height
   * - BottomTabBar overlay height (global)
   * - extra spacing
   */
  const scrollBottomPad = Math.max(ctaHeight, 0) + BOTTOM_TAB_BAR_HEIGHT + 20;

  const attendeesValid = useMemo(() => {
    if (attendeeSlots.length <= 0) return false;

    for (const s of attendeeSlots) {
      const v = attendeesByKey[s.key];
      if (!v) return false;
      if (!hasNonEmpty(v.firstName)) return false;
      if (!hasNonEmpty(v.lastName)) return false;
      if (!hasNonEmpty(v.email)) return false;
      if (!validateEmailLoose(v.email)) return false;
    }
    return true;
  }, [attendeeSlots, attendeesByKey]);

  const billingValid = useMemo(() => {
    if (!hasNonEmpty(billing.email) || !validateEmailLoose(billing.email)) return false;
    if (!hasNonEmpty(billing.firstName)) return false;
    if (!hasNonEmpty(billing.lastName)) return false;
    return true;
  }, [billing]);

  const canComplete = totals.totalTickets > 0 && attendeesValid && billingValid && agreed && !submitting;

  const buildAttendeeInputs = (): ReadonlyArray<AttendeeInput> => {
    return attendeeSlots.map((s) => {
      const v = attendeesByKey[s.key];
      return {
        ticketTypeId: s.ticketTypeId,
        index: s.index,
        firstName: (v?.firstName ?? '').trim(),
        lastName: (v?.lastName ?? '').trim(),
        email: (v?.email ?? '').trim(),
        phoneNumber: (v?.phoneNumber ?? '').trim() || null,
        dietaryRestrictions: (v?.dietaryRestrictions ?? '').trim() || null,
        emergencyContact: (v?.emergencyContact ?? '').trim() || null,
      };
    });
  };

  const handleComplete = async () => {
    if (!canComplete) return;

    try {
      setSubmitting(true);
      setSubmitError(null);

      const res = await createReservation({
        eventId: String(event.id),
        userId,
        quantities,
        attendees: buildAttendeeInputs(),
        billing,
        status: 'pending',
      });

      setSuccessReservationId(res.reservationId);
      setSuccessOpen(true);

      onReservationCreated?.(res.reservationId);
    } catch (e: any) {
      setSubmitError(String(e?.message ?? e));
    } finally {
      setSubmitting(false);
    }
  };

  const closeSuccess = () => {
    setSuccessOpen(false);
  };

  const handleSeeReservations = () => {
    setSuccessOpen(false);
    onSeeReservations?.();
  };

  return (
    <SafeAreaView edges={['left', 'right', 'bottom']} className="flex-1 bg-white">
      {/* Success Modal */}
      <Modal
        visible={successOpen}
        transparent
        animationType="fade"
        onRequestClose={closeSuccess}
      >
        <View className="flex-1 items-center justify-center px-6">
          {/* Backdrop */}
          <Pressable
            className="absolute inset-0"
            onPress={closeSuccess}
            style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}
          />
          {/* Card */}
          <View className="w-full max-w-[420px] rounded-3xl bg-white px-6 py-6 border border-gray200">
            <View className="items-center">
              <Feather name="check-circle" size={72} color="#16A34A" />
              <Text className="mt-4 text-xl font-semibold text-black text-center">Congratulations</Text>
              <Text className="mt-2 text-base text-gray700 text-center">
                You have made a reservation for{'\n'}
                <Text className="font-semibold text-black">{event.title}</Text>
              </Text>
            </View>

            <Pressable
              accessibilityRole="button"
              onPress={handleSeeReservations}
              className="mt-6 rounded-2xl py-4 items-center justify-center bg-black"
            >
              <Text className="text-base font-semibold text-white">See my reservations</Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              onPress={closeSuccess}
              className="mt-3 py-3 items-center justify-center"
            >
              <Text className="text-base font-semibold text-gray700">Close</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Header */}
      <View className="px-5 py-3 flex-row items-center">
        <Pressable accessibilityRole="button" onPress={onBack} hitSlop={10} className="h-10 w-10 items-center justify-center">
          <Feather name="arrow-left" size={20} color="#111827" />
        </Pressable>
        <Text className="ml-2 text-lg font-semibold text-black">Checkout</Text>
      </View>

      <View className="h-px bg-gray200" />

      {/* Tabs */}
      <View className="px-5 pt-3">
        <View className="flex-row items-center rounded-full bg-gray100 p-1 border border-gray200">
          <TabPill label="Summary" selected={tab === 'summary'} onPress={() => setTab('summary')} />
          <TabPill label="Attendees" selected={tab === 'attendees'} onPress={() => setTab('attendees')} />
          <TabPill label="Payment" selected={tab === 'payment'} onPress={() => setTab('payment')} />
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        className="flex-1"
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={{ paddingBottom: scrollBottomPad }}
        contentInset={{ bottom: scrollBottomPad }}
        scrollIndicatorInsets={{ bottom: scrollBottomPad }}
      >
        {tab === 'summary' ? (
          <View className="px-5 pt-4 gap-y-4">
            {/* Event details card */}
            <Card variant="outlined" padding="md">
              <View className="flex-row items-center gap-x-2">
                <Feather name="calendar" size={18} color="#111827" />
                <Text className="text-base font-semibold text-black">Event Details</Text>
              </View>

              <Text className="mt-3 text-base text-black">{event.title}</Text>

              <View className="mt-2 flex-row items-center gap-x-4">
                {dt ? (
                  <>
                    <View className="flex-row items-center gap-x-1">
                      <Feather name="calendar" size={14} color="#6B7280" />
                      <Text className="text-sm text-gray600">{dt.date}</Text>
                    </View>
                    <View className="flex-row items-center gap-x-1">
                      <Feather name="clock" size={14} color="#6B7280" />
                      <Text className="text-sm text-gray600">{dt.time}</Text>
                    </View>
                  </>
                ) : null}
              </View>

              <View className="mt-2 flex-row items-center gap-x-1">
                <Feather name="map-pin" size={14} color="#6B7280" />
                <Text className="text-sm text-gray600">
                  {event.venue}
                  {event.city ? `, ${event.city}` : ''}
                </Text>
              </View>
            </Card>

            {/* Ticket summary card */}
            <Card variant="outlined" padding="md">
              <View className="flex-row items-center justify-between">
                <Text className="text-base font-semibold text-black">Ticket Summary</Text>
                <Badge
                  label={`${totals.totalTickets} ${totals.totalTickets === 1 ? 'ticket' : 'tickets'}`}
                  variant="soft"
                  tone="gray"
                  size="sm"
                  className="rounded-full"
                />
              </View>

              <View className="mt-4 gap-y-3">
                {selection.length === 0 ? (
                  <Text className="text-sm text-gray600">No tickets selected.</Text>
                ) : (
                  selection.map((line) => {
                    const qty = clampInt(quantities[line.ticketTypeId] ?? 0, 0, 999);
                    return (
                      <View key={line.ticketTypeId} className="rounded-2xl border border-gray200 bg-white p-4">
                        <View className="flex-row items-start justify-between">
                          <View className="flex-1 pr-3">
                            <Text className="text-base font-medium text-black">{line.name}</Text>
                            <Text className="text-sm text-gray500 mt-1">{formatMoneyCents(line.unitPriceCents, currency)} per ticket</Text>
                          </View>

                          <Pressable
                            accessibilityRole="button"
                            onPress={() => setQty(line.ticketTypeId, 0)}
                            hitSlop={8}
                            className="h-9 w-9 items-center justify-center"
                          >
                            <Feather name="trash-2" size={18} color="#E11D48" />
                          </Pressable>
                        </View>

                        <View className="mt-4 flex-row items-center justify-between">
                          <View className="flex-row items-center gap-x-3">
                            <QtyButton icon="minus" disabled={qty <= 1} onPress={() => bumpQty(line.ticketTypeId, -1)} />
                            <Text className="text-base font-medium text-black w-6 text-center">{qty}</Text>
                            <QtyButton icon="plus" onPress={() => bumpQty(line.ticketTypeId, +1)} />
                          </View>

                          <Text className="text-lg font-semibold text-black">{formatMoneyCents(line.lineTotalCents, currency)}</Text>
                        </View>
                      </View>
                    );
                  })
                )}
              </View>

              <View className="mt-5 h-px bg-gray200" />

              <Row label="Subtotal" value={formatMoneyCents(totals.subtotalCents, currency)} bold={false} />
              <Row label="Service fees" value={formatMoneyCents(totals.serviceFeeCents, currency)} bold={false} subtle />

              <View className="mt-2" />
              <Row label="Total" value={formatMoneyCents(totals.totalCents, currency)} bold />

              <Pressable
                accessibilityRole="button"
                onPress={() => setTab('attendees')}
                disabled={totals.totalTickets <= 0}
                className={cx('mt-4 rounded-2xl py-4 items-center justify-center', totals.totalTickets > 0 ? 'bg-black' : 'bg-gray300')}
              >
                <Text className={cx('text-base font-semibold', totals.totalTickets > 0 ? 'text-white' : 'text-gray700')}>Continue</Text>
              </Pressable>
            </Card>
          </View>
        ) : null}

        {tab === 'attendees' ? (
          <View className="px-5 pt-4 gap-y-4">
            <Card variant="outlined" padding="md">
              <View className="flex-row items-center gap-x-2">
                <Feather name="user" size={18} color="#111827" />
                <Text className="text-base font-semibold text-black">Attendee Information</Text>
              </View>
              <Text className="text-sm text-gray600 mt-1">Please provide information for each ticket holder</Text>
            </Card>

            {attendeeSlots.length === 0 ? (
              <Card variant="outlined" padding="md">
                <Text className="text-sm text-gray600">No tickets selected. Go back to Summary and add tickets.</Text>
              </Card>
            ) : (
              attendeeSlots.map((slot) => {
                const v = attendeesByKey[slot.key];
                const title = `${slot.ticketTypeName} #${slot.index}`;

                return (
                  <Card key={slot.key} variant="outlined" padding="md">
                    <View className="flex-row items-center gap-x-2">
                      <Feather name="edit-3" size={16} color="#111827" />
                      <Text className="text-base font-semibold text-black">{title}</Text>
                    </View>

                    <View className="mt-4 gap-y-3">
                      <View className="flex-row gap-x-3">
                        <Field
                          label="First Name *"
                          value={v?.firstName ?? ''}
                          onChangeText={(t) =>
                            setAttendeesByKey((cur) => ({
                              ...cur,
                              [slot.key]: { ...(cur[slot.key] ?? emptyAttendee()), firstName: t },
                            }))
                          }
                          className="flex-1"
                        />
                        <Field
                          label="Last Name *"
                          value={v?.lastName ?? ''}
                          onChangeText={(t) =>
                            setAttendeesByKey((cur) => ({
                              ...cur,
                              [slot.key]: { ...(cur[slot.key] ?? emptyAttendee()), lastName: t },
                            }))
                          }
                          className="flex-1"
                        />
                      </View>

                      <Field
                        label="Email *"
                        value={v?.email ?? ''}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        onChangeText={(t) =>
                          setAttendeesByKey((cur) => ({
                            ...cur,
                            [slot.key]: { ...(cur[slot.key] ?? emptyAttendee()), email: t },
                          }))
                        }
                      />

                      <Field
                        label="Phone Number"
                        value={v?.phoneNumber ?? ''}
                        keyboardType="phone-pad"
                        onChangeText={(t) =>
                          setAttendeesByKey((cur) => ({
                            ...cur,
                            [slot.key]: { ...(cur[slot.key] ?? emptyAttendee()), phoneNumber: t },
                          }))
                        }
                      />

                      <Field
                        label="Dietary Restrictions"
                        value={v?.dietaryRestrictions ?? ''}
                        onChangeText={(t) =>
                          setAttendeesByKey((cur) => ({
                            ...cur,
                            [slot.key]: { ...(cur[slot.key] ?? emptyAttendee()), dietaryRestrictions: t },
                          }))
                        }
                      />

                      <Field
                        label="Emergency Contact"
                        value={v?.emergencyContact ?? ''}
                        onChangeText={(t) =>
                          setAttendeesByKey((cur) => ({
                            ...cur,
                            [slot.key]: { ...(cur[slot.key] ?? emptyAttendee()), emergencyContact: t },
                          }))
                        }
                      />
                    </View>
                  </Card>
                );
              })
            )}

            <Pressable
              accessibilityRole="button"
              onPress={() => setTab('payment')}
              disabled={!attendeesValid}
              className={cx('rounded-2xl py-4 items-center justify-center', attendeesValid ? 'bg-black' : 'bg-gray300')}
            >
              <Text className={cx('text-base font-semibold', attendeesValid ? 'text-white' : 'text-gray700')}>Continue to Payment</Text>
            </Pressable>
          </View>
        ) : null}

        {tab === 'payment' ? (
          <View className="px-5 pt-4 gap-y-4">
            {/* Use same info as first attendee */}
            {attendeeSlots.length > 0 ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => setUseSameAsBilling((v) => !v)}
                className="flex-row items-center gap-x-3"
                hitSlop={10}
              >
                <View
                  className={cx(
                    'h-6 w-6 rounded-md border items-center justify-center',
                    useSameAsBilling ? 'bg-black border-black' : 'bg-white border-gray300',
                  )}
                >
                  {useSameAsBilling ? <Feather name="check" size={16} color="#fff" /> : null}
                </View>
                <Text className="text-sm text-gray800 flex-1">Use same info as first attendee for billing</Text>
              </Pressable>
            ) : null}

            {/* Billing */}
            <Card variant="outlined" padding="md">
              <Text className="text-base font-semibold text-black">Billing Information</Text>

              <View className="mt-4 gap-y-3">
                <Field
                  label="Email *"
                  value={billing.email}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  onChangeText={(t) => setBilling((cur) => ({ ...cur, email: t }))}
                />
                <View className="flex-row gap-x-3">
                  <Field
                    label="First Name *"
                    value={billing.firstName}
                    onChangeText={(t) => setBilling((cur) => ({ ...cur, firstName: t }))}
                    className="flex-1"
                  />
                  <Field
                    label="Last Name *"
                    value={billing.lastName}
                    onChangeText={(t) => setBilling((cur) => ({ ...cur, lastName: t }))}
                    className="flex-1"
                  />
                </View>
              </View>
            </Card>

            {/* Payment method */}
            <Card variant="outlined" padding="md">
              <Text className="text-base font-semibold text-black">Payment Method</Text>

              <View className="mt-4">
                <RadioRow selected={paymentMethod === 'card'} label="Credit/Debit Card" icon="credit-card" onPress={() => setPaymentMethod('card')} />
                <RadioRow selected={paymentMethod === 'apple'} label="Apple Pay" icon="smartphone" onPress={() => setPaymentMethod('apple')} />
                <RadioRow selected={paymentMethod === 'google'} label="Google Pay" icon="smartphone" onPress={() => setPaymentMethod('google')} />
              </View>

              <View className="mt-4 gap-y-3">
                <Field label="Card Number *" value={cardNumber} onChangeText={setCardNumber} keyboardType="number-pad" />
                <View className="flex-row gap-x-3">
                  <Field label="Expiry Date *" value={expiry} onChangeText={setExpiry} placeholder="MM/YY" className="flex-1" />
                  <Field label="CVV *" value={cvv} onChangeText={setCvv} keyboardType="number-pad" className="flex-1" />
                </View>
                <Field label="ZIP Code *" value={zip} onChangeText={setZip} keyboardType="number-pad" />
              </View>
            </Card>

            {/* Order summary */}
            <Card variant="outlined" padding="md">
              <Text className="text-base font-semibold text-black">Order Summary</Text>

              <View className="mt-4">
                <Row
                  label={`Subtotal (${totals.totalTickets} ${totals.totalTickets === 1 ? 'ticket' : 'tickets'})`}
                  value={formatMoneyCents(totals.subtotalCents, currency)}
                />
                <Row label="Service fees" value={formatMoneyCents(totals.serviceFeeCents, currency)} subtle />
                <View className="mt-2" />
                <Row label="Total" value={formatMoneyCents(totals.totalCents, currency)} bold />
              </View>
            </Card>

            {/* Secure checkout note */}
            <Card variant="outlined" padding="md">
              <View className="flex-row items-center gap-x-3">
                <Feather name="shield" size={18} color="#16A34A" />
                <View className="flex-1">
                  <Text className="text-base font-semibold text-black">Secure Checkout</Text>
                  <Text className="text-sm text-gray600 mt-0.5">Your payment information is encrypted and secure</Text>
                </View>
              </View>
            </Card>

            {/* Terms */}
            <Pressable accessibilityRole="button" onPress={() => setAgreed((v) => !v)} className="flex-row items-center gap-x-3" hitSlop={10}>
              <View
                className={cx(
                  'h-6 w-6 rounded-md border items-center justify-center',
                  agreed ? 'bg-black border-black' : 'bg-white border-gray300',
                )}
              >
                {agreed ? <Feather name="check" size={16} color="#fff" /> : null}
              </View>
              <Text className="text-sm text-gray800 flex-1">I agree to the Terms of Service and Privacy Policy</Text>
            </Pressable>

            {submitError ? (
              <Card variant="outlined" padding="md">
                <Text className="text-sm text-red-600">{submitError}</Text>
              </Card>
            ) : null}
          </View>
        ) : null}
      </ScrollView>

      {/* Bottom CTA (lifted above BottomTabBar) */}
      <View
        onLayout={(e) => setCtaHeight(e.nativeEvent.layout.height)}
        className="absolute left-0 right-0 bg-white"
        style={{
          bottom: BOTTOM_TAB_BAR_HEIGHT,
          paddingBottom: bottomCtaPad,
          paddingTop: 10,
          borderTopWidth: 1,
          borderTopColor: '#E5E7EB',
        }}
      >
        <View className="px-5">
          <Pressable
            accessibilityRole="button"
            onPress={handleComplete}
            disabled={!canComplete}
            className={cx('rounded-2xl py-4 items-center justify-center', canComplete ? 'bg-black' : 'bg-gray300')}
            style={{
              shadowColor: '#000',
              shadowOpacity: canComplete ? 0.18 : 0,
              shadowRadius: 12,
              shadowOffset: { width: 0, height: 6 },
              elevation: canComplete ? 8 : 0,
            }}
          >
            {submitting ? (
              <View className="flex-row items-center gap-x-2">
                <ActivityIndicator color="#fff" />
                <Text className="text-white text-base font-semibold">Creating reservation…</Text>
              </View>
            ) : (
              <Text className={cx('text-base font-semibold', canComplete ? 'text-white' : 'text-gray700')}>
                Complete Payment - {formatMoneyCents(totals.totalCents, currency)}
              </Text>
            )}
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

function emptyAttendee(): AttendeeDraft {
  return {
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    dietaryRestrictions: '',
    emergencyContact: '',
  };
}

function TabPill({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}): ReactElement {
  return (
    <Pressable
      onPress={onPress}
      className={cx('px-0 py-1.5 rounded-full flex-1 items-center', selected ? 'bg-white border border-gray300' : '')}
    >
      <Text className={selected ? 'text-brand font-medium' : 'text-gray700 font-medium'}>{label}</Text>
    </Pressable>
  );
}

function QtyButton({
  icon,
  disabled,
  onPress,
}: {
  icon: 'minus' | 'plus';
  disabled?: boolean;
  onPress: () => void;
}): ReactElement {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled}
      className={cx('h-12 w-12 rounded-xl border border-gray200 items-center justify-center', disabled ? 'opacity-40' : 'opacity-100')}
      hitSlop={6}
    >
      <Feather name={icon} size={18} color="#111827" />
    </Pressable>
  );
}

function Row({
  label,
  value,
  bold,
  subtle,
}: {
  label: string;
  value: string;
  bold?: boolean;
  subtle?: boolean;
}): ReactElement {
  return (
    <View className="flex-row items-center justify-between mt-2">
      <Text className={cx('text-base', bold ? 'font-semibold text-black' : 'text-gray800', subtle ? 'text-gray500' : '')}>{label}</Text>
      <Text className={cx('text-base', bold ? 'font-semibold text-black' : 'text-gray800', subtle ? 'text-gray500' : '')}>{value}</Text>
    </View>
  );
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  autoCapitalize,
  className,
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'email-address' | 'number-pad' | 'phone-pad';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  className?: string;
}): ReactElement {
  return (
    <View className={className}>
      <Text className="text-sm text-gray700 mb-2">{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        className="rounded-xl bg-gray100 px-4 py-3 text-base text-black border border-gray200"
        placeholderTextColor="#9CA3AF"
      />
    </View>
  );
}

function RadioRow({
  selected,
  label,
  icon,
  onPress,
}: {
  selected: boolean;
  label: string;
  icon: keyof typeof Feather.glyphMap;
  onPress: () => void;
}): ReactElement {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} className="flex-row items-center py-3">
      <View className={cx('h-5 w-5 rounded-full border items-center justify-center mr-3', selected ? 'border-black' : 'border-gray300')}>
        {selected ? <View className="h-2.5 w-2.5 rounded-full bg-black" /> : null}
      </View>
      <Feather name={icon} size={18} color="#111827" />
      <Text className="ml-3 text-base text-black">{label}</Text>
    </Pressable>
  );
}
