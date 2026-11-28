// components/reservations/PayTicketSheet.tsx — "Pay X now" for an unpaid ticket.
// Phase 4 bookings go through route 148 first; while that route is missing (and
// for bookings tracked on the device) the test-mode payment layer is used:
// presentPayment → markTicketsPaid → refresh.
import React, { useEffect, useState, type ReactElement } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';
import { CircleCheck, Clock } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { GsButton, GsSheet } from '@/components/gs';
import TestModeBadge from '@/components/payments/TestModeBadge';
import { gs } from '@/theme/colors';
import * as meApi from '@/lib/api/me';
import { markTicketsPaid, presentPayment } from '@/lib/payments';
import { startPayment, type Booking, type BookingTicket, type PaymentMethodKind } from '@/lib/api/bookings';
import { reapplyMockPayments } from '@/screens/bookings/bookingsStore';
import { money } from './bookingFormat';

type Method = Readonly<{ key: string; kind: PaymentMethodKind; id: string | null; badge: string; label: string; sub: string }>;

const capitalize = (s: string): string => (s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : s);

export default function PayTicketSheet({
  booking,
  ticket,
  onClose,
}: Readonly<{ booking: Booking; ticket: BookingTicket | null; onClose: () => void }>): ReactElement {
  const { t, i18n } = useTranslation();
  const [methods, setMethods] = useState<ReadonlyArray<Method>>([]);
  const [methodKey, setMethodKey] = useState<string>('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<'paid' | 'started' | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ticket) return;
    setResult(null);
    setError(null);
    let cancelled = false;
    const wallet: Method =
      Platform.OS === 'android'
        ? { key: 'wallet', kind: 'google_pay', id: null, badge: 'G Pay', label: t('bookings.co.googlePay'), sub: '' }
        : { key: 'wallet', kind: 'apple_pay', id: null, badge: 'Pay', label: t('bookings.co.applePay'), sub: '' };
    setMethods([wallet]);
    setMethodKey(wallet.key);
    meApi
      .listMyPaymentMethods()
      .then((page) => {
        if (cancelled) return;
        const cards = (page.items ?? []).slice().sort((a, b) => Number(!!b.isDefault) - Number(!!a.isDefault));
        const cardMethods: Method[] = cards.map((c) => ({
          key: `card-${c.id}`,
          kind: 'saved_card',
          id: c.id,
          badge: (c.cardBrand ?? 'card').toUpperCase().slice(0, 4),
          label: t('bookings.cardLabel', { brand: capitalize(c.cardBrand ?? 'Card'), last4: c.cardLastFour ?? '••••' }),
          sub: t('bookings.savedCard'),
        }));
        setMethods([...cardMethods, wallet]);
        if (cardMethods[0]) setMethodKey(cardMethods[0].key);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [ticket, t]);

  const method = methods.find((m) => m.key === methodKey) ?? methods[0] ?? null;
  const price = ticket ? money(ticket.priceCents, booking.currency, i18n.language) : '';

  const payMock = async (tk: BookingTicket, m: Method): Promise<void> => {
    const res = await presentPayment({
      amountCents: tk.priceCents,
      currency: booking.currency,
      method: m.kind,
      paymentMethodId: m.id,
      label: `${booking.title} · ${tk.holderName || t('bookings.holderFallback')}`,
    });
    if (res.status !== 'succeeded') {
      setError(res.message ?? t('bookings.payDeclined'));
      return;
    }
    await markTicketsPaid([tk.id]);
    await reapplyMockPayments();
    setResult('paid');
  };

  const confirm = async (): Promise<void> => {
    if (!ticket || !method) return;
    setBusy(true);
    setError(null);
    try {
      if (booking.mockPayment) {
        await payMock(ticket, method);
      } else {
        const res = await startPayment(booking.id, { ticketIds: [ticket.id], method: method.kind, paymentMethodId: method.id });
        if (res.kind === 'unavailable') await payMock(ticket, method);
        else {
          setResult(res.status === 'succeeded' ? 'paid' : 'started');
          void reapplyMockPayments();
        }
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <GsSheet visible={!!ticket} onClose={onClose} title={t('bookings.payTitle')} scroll={false}>
      <View className="px-5 pb-2" style={{ gap: 14 }}>
        <Text className="text-[15px] text-muted -mt-2">
          {t('bookings.payFor', { name: ticket?.holderName || t('bookings.holderFallback'), event: booking.title })}
        </Text>
        <TestModeBadge />
        {result ? (
          <View className="flex-row rounded-[18px] p-4" style={{ backgroundColor: result === 'paid' ? gs.greenSoft : gs.violetSoft, gap: 12 }}>
            {result === 'paid' ? <CircleCheck size={22} color={gs.green} /> : <Clock size={22} color={gs.violetDark} />}
            <Text className="flex-1 text-[15px] font-bold leading-[21px]" style={{ color: result === 'paid' ? gs.green : gs.violetDark }}>
              {result === 'paid' ? t('bookings.payDone', { price }) : t('bookings.payStarted')}
            </Text>
          </View>
        ) : (
          <View style={{ gap: 10 }}>
            {methods.map((m) => {
              const on = m.key === method?.key;
              return (
                <Pressable
                  key={m.key}
                  onPress={() => setMethodKey(m.key)}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: on }}
                  className="flex-row items-center rounded-[18px] p-3.5"
                  style={{ borderWidth: 2, borderColor: on ? gs.violet : gs.line, backgroundColor: on ? '#F6F3FF' : gs.white, gap: 12 }}
                >
                  <View className="w-11 h-[30px] rounded-md items-center justify-center" style={{ backgroundColor: gs.ink }}>
                    <Text className="text-[11px] font-extrabold text-white">{m.badge}</Text>
                  </View>
                  <View className="flex-1">
                    <Text className="text-[15px] font-extrabold text-ink">{m.label}</Text>
                    {m.sub ? <Text className="text-[13px] text-muted">{m.sub}</Text> : null}
                  </View>
                  <View className="h-6 w-6 rounded-full items-center justify-center" style={{ borderWidth: 2, borderColor: on ? gs.violet : gs.lineStrong }}>
                    {on ? <View className="h-3 w-3 rounded-full" style={{ backgroundColor: gs.violet }} /> : null}
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}
        {error ? (
          <View accessibilityRole="alert" className="rounded-2xl px-4 py-3" style={{ backgroundColor: gs.dangerSoft }}>
            <Text className="text-[14px] font-semibold" style={{ color: gs.danger }}>
              {error}
            </Text>
          </View>
        ) : null}
        {result ? (
          <GsButton label={t('gs.close')} onPress={onClose} size="lg" fullWidth />
        ) : (
          <>
            <GsButton label={busy ? t('bookings.co.processing') : t('bookings.confirmPay', { price })} onPress={confirm} loading={busy} size="lg" fullWidth />
            <GsButton label={t('bookings.cancel')} onPress={onClose} variant="secondary" fullWidth />
          </>
        )}
      </View>
    </GsSheet>
  );
}
