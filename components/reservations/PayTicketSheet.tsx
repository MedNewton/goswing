// components/reservations/PayTicketSheet.tsx — "Pay X now" for an unpaid ticket
// (Phase 4, route 148). Shown only when the booking carries payment fields.
import React, { useEffect, useState, type ReactElement } from 'react';
import { Platform, Text, View } from 'react-native';
import { Clock } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { GsButton, GsSheet } from '@/components/gs';
import { gs } from '@/theme/colors';
import * as meApi from '@/lib/api/me';
import { startPayment, type Booking, type BookingTicket, type PaymentMethodKind } from '@/lib/api/bookings';
import { refreshBookings } from '@/screens/bookings/bookingsStore';
import { money } from './bookingFormat';

type Method = Readonly<{ kind: PaymentMethodKind; id: string | null; badge: string; label: string; sub: string }>;

export default function PayTicketSheet({
  booking,
  ticket,
  onClose,
}: Readonly<{ booking: Booking; ticket: BookingTicket | null; onClose: () => void }>): ReactElement {
  const { t, i18n } = useTranslation();
  const [method, setMethod] = useState<Method | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<'soon' | 'started' | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ticket) return;
    setResult(null);
    setError(null);
    let cancelled = false;
    const wallet: Method =
      Platform.OS === 'android'
        ? { kind: 'google_pay', id: null, badge: 'G Pay', label: t('bookings.co.googlePay'), sub: '' }
        : { kind: 'apple_pay', id: null, badge: 'Pay', label: t('bookings.co.applePay'), sub: '' };
    setMethod(wallet);
    meApi
      .listMyPaymentMethods()
      .then((page) => {
        const cards = page.items ?? [];
        const card = cards.find((c) => c.isDefault) ?? cards[0];
        if (!cancelled && card) {
          setMethod({
            kind: 'saved_card',
            id: card.id,
            badge: (card.cardBrand ?? 'card').toUpperCase().slice(0, 4),
            label: t('bookings.cardLabel', { brand: capitalize(card.cardBrand ?? 'Card'), last4: card.cardLastFour ?? '••••' }),
            sub: t('bookings.savedCard'),
          });
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [ticket, t]);

  const price = ticket ? money(ticket.priceCents, booking.currency, i18n.language) : '';

  const confirm = async (): Promise<void> => {
    if (!ticket || !method) return;
    setBusy(true);
    setError(null);
    try {
      const res = await startPayment(booking.id, { ticketIds: [ticket.id], method: method.kind, paymentMethodId: method.id });
      setResult(res.kind === 'unavailable' ? 'soon' : 'started');
      if (res.kind === 'started') void refreshBookings({ force: true });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <GsSheet visible={!!ticket} onClose={onClose} title={t('bookings.payTitle')} scroll={false}>
      <View className="px-5 pb-2" style={{ gap: 16 }}>
        <Text className="text-[15px] text-muted -mt-2">
          {t('bookings.payFor', { name: ticket?.holderName || t('bookings.holderFallback'), event: booking.title })}
        </Text>
        {result === 'soon' || result === 'started' ? (
          <View className="flex-row rounded-[18px] p-4" style={{ backgroundColor: gs.violetSoft, gap: 12 }}>
            <Clock size={22} color={gs.violetDark} />
            <View className="flex-1">
              {result === 'soon' ? <Text className="text-[16px] font-extrabold text-ink">{t('bookings.paySoonTitle')}</Text> : null}
              <Text className="text-[14px] text-subtle mt-1 leading-[20px]">
                {result === 'soon' ? t('bookings.paySoonBody') : t('bookings.payStarted')}
              </Text>
            </View>
          </View>
        ) : method ? (
          <View className="flex-row items-center rounded-[18px] p-3.5" style={{ borderWidth: 2, borderColor: gs.violet, backgroundColor: '#F6F3FF', gap: 12 }}>
            <View className="w-11 h-[30px] rounded-md items-center justify-center" style={{ backgroundColor: gs.ink }}>
              <Text className="text-[11px] font-extrabold text-white">{method.badge}</Text>
            </View>
            <View className="flex-1">
              <Text className="text-[15px] font-extrabold text-ink">{method.label}</Text>
              {method.sub ? <Text className="text-[13px] text-muted">{method.sub}</Text> : null}
            </View>
          </View>
        ) : null}
        {error ? <Text className="text-[13px] font-bold" style={{ color: gs.danger }}>{error}</Text> : null}
        {result ? (
          <GsButton label={t('gs.close')} onPress={onClose} size="lg" fullWidth />
        ) : (
          <>
            <GsButton label={t('bookings.confirmPay', { price })} onPress={confirm} loading={busy} size="lg" fullWidth />
            <GsButton label={t('bookings.cancel')} onPress={onClose} variant="secondary" fullWidth />
          </>
        )}
      </View>
    </GsSheet>
  );
}

const capitalize = (s: string): string => (s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : s);
