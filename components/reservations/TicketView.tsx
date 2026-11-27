// components/reservations/TicketView.tsx — "My tickets (n)": the violet ticket
// screen with one perforated stub per ticket (holder, payment state, QR, code,
// Download / Share) and the entry rules. Used by the Bookings tab (as a modal)
// and by the `reservationDetails` route (as a pushed screen).
import React, { useState, type ReactElement } from 'react';
import { Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Line } from 'react-native-svg';
import QRCode from 'react-native-qrcode-svg';
import { CalendarPlus, CircleCheck, Clock, Download, IdCard, Info, QrCode, Share, Ticket, X } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Cover, GsButton } from '@/components/gs';
import { gs } from '@/theme/colors';
import { hhmm } from '@/lib/format';
import { unpaidTickets, type Booking, type BookingTicket } from '@/lib/api/bookings';
import { bookingDate, bookingTimeRange, bookingWhen, money, parseIso } from './bookingFormat';
import { addBookingToCalendar, downloadTicket, shareTicket } from './ticketActions';
import PayTicketSheet from './PayTicketSheet';

const BG = gs.violet;
const MONO = Platform.select({ ios: 'Menlo', default: 'monospace' });

export type TicketViewProps = Readonly<{
  booking: Booking;
  /** Cover image from the events list when the booking has none. */
  imageUrl?: string | null;
  onClose: () => void;
  onOpenEvent?: (eventId: string) => void;
  /** Shown above the lead text (e.g. offline banner). */
  notice?: string | null;
}>;

export default function TicketView({ booking: b, imageUrl, onClose, onOpenEvent, notice }: TicketViewProps): ReactElement {
  const { t, i18n } = useTranslation();
  const locale = i18n.language;
  const insets = useSafeAreaInsets();
  const [payTicket, setPayTicket] = useState<BookingTicket | null>(null);

  const n = b.tickets.length || b.ticketsCount;
  const unpaid = unpaidTickets(b).length;
  const cancelled = ['cancelled', 'canceled', 'expired'].includes(b.status);
  const lead = cancelled
    ? t('bookings.leadCancelled')
    : b.isPast
      ? t('bookings.leadPast')
      : b.status === 'pending'
        ? t('bookings.leadPending')
        : unpaid > 0
          ? t('bookings.leadUnpaid', { count: unpaid })
          : n === 1
            ? t('bookings.lead1')
            : t('bookings.leadN');
  const title = n === 1 ? t('bookings.myTicket') : t('bookings.myTickets', { count: n });
  const when = b.isPast ? bookingDate(b.startsAtIso, locale) : bookingWhen(b, t, locale);

  return (
    <View className="flex-1" style={{ backgroundColor: BG }}>
      <View className="flex-row items-center justify-between px-4 pt-2" style={{ height: 60 }}>
        <Pressable
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel={t('bookings.closeTicket')}
          className="h-12 w-12 rounded-full items-center justify-center"
          style={{ backgroundColor: 'rgba(255,255,255,0.18)' }}
        >
          <X size={22} color={gs.white} />
        </Pressable>
        <Text className="text-[20px] font-extrabold text-white" numberOfLines={1}>
          {title}
        </Text>
        {b.isPast || cancelled ? (
          <View className="w-12" />
        ) : (
          <Pressable
            onPress={() => void addBookingToCalendar(b, t)}
            accessibilityRole="button"
            accessibilityLabel={t('bookings.addToCalendar')}
            className="h-12 w-12 rounded-full items-center justify-center"
            style={{ backgroundColor: 'rgba(255,255,255,0.18)' }}
          >
            <CalendarPlus size={21} color={gs.white} />
          </Pressable>
        )}
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 40 }} showsVerticalScrollIndicator={false}>
        {notice ? (
          <View className="self-center mt-2 px-3 py-1.5 rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.18)' }}>
            <Text className="text-[13px] font-bold text-white">{notice}</Text>
          </View>
        ) : null}
        <Text className="text-[17px] leading-[24px] font-bold text-white text-center mx-7 mt-2.5 mb-[18px]">{lead}</Text>

        <View className="mx-5 bg-white rounded-[30px] overflow-hidden">
          <Pressable
            disabled={!onOpenEvent || !b.eventId}
            onPress={() => b.eventId && onOpenEvent?.(b.eventId)}
            accessibilityRole="button"
            accessibilityLabel={t('bookings.viewEvent')}
          >
            <Cover uri={imageUrl ?? b.imageUrl} toneKey={b.eventId ?? b.id} style={{ height: 180 }} />
          </Pressable>
          <View className="px-[22px] pt-5 pb-[22px]">
            {when ? (
              <Text className="text-[14px] font-bold" style={{ color: b.isPast ? gs.muted : gs.violetDark }}>
                {when}
              </Text>
            ) : null}
            <Text className="text-[28px] leading-[32px] font-extrabold text-ink mt-1">{b.title || t('bookings.eventFallback')}</Text>
            <View className="flex-row flex-wrap mt-4" style={{ rowGap: 16 }}>
              <Fact label={t('bookings.date')} value={bookingDate(b.startsAtIso, locale)} />
              <Fact label={t('bookings.time')} value={bookingTimeRange(b)} />
              <Fact label={t('bookings.place')} value={b.venueName ?? '—'} sub={b.addressLine1 ?? b.venueCity} />
              <Fact label={t('bookings.places')} value={String(b.ticketsCount)} sub={t('bookings.booking', { ref: b.bookingRef })} />
            </View>
          </View>

          {b.tickets.map((tk, i) => (
            <TicketStub
              key={tk.id}
              booking={b}
              ticket={tk}
              index={i}
              total={b.tickets.length}
              onPay={() => setPayTicket(tk)}
            />
          ))}
        </View>

        {b.isPast || cancelled ? null : <InfoCard />}
      </ScrollView>

      <PayTicketSheet booking={b} ticket={payTicket} onClose={() => setPayTicket(null)} />
    </View>
  );
}

function Fact({ label, value, sub }: Readonly<{ label: string; value: string; sub?: string | null }>): ReactElement {
  return (
    <View style={{ width: '50%', paddingRight: 12 }}>
      <Text className="text-[13px] text-muted">{label}</Text>
      <Text className="text-[17px] font-extrabold text-ink mt-0.5" numberOfLines={2}>
        {value}
      </Text>
      {sub ? (
        <Text className="text-[12px] text-muted mt-0.5" numberOfLines={2}>
          {sub}
        </Text>
      ) : null}
    </View>
  );
}

function Perforation(): ReactElement {
  return (
    <View style={{ height: 28 }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <View style={{ position: 'absolute', left: -14, top: 0, width: 28, height: 28, borderRadius: 14, backgroundColor: BG }} />
      <View style={{ position: 'absolute', right: -14, top: 0, width: 28, height: 28, borderRadius: 14, backgroundColor: BG }} />
      <View style={{ position: 'absolute', left: 24, right: 24, top: 13, height: 2 }}>
        <Svg height={2} width="100%">
          <Line x1="0" y1="1" x2="100%" y2="1" stroke="#DAD6E8" strokeWidth={2} strokeDasharray="6 5" />
        </Svg>
      </View>
    </View>
  );
}

function TicketStub({
  booking: b,
  ticket: tk,
  index,
  total,
  onPay,
}: Readonly<{ booking: Booking; ticket: BookingTicket; index: number; total: number; onPay: () => void }>): ReactElement {
  const { t, i18n } = useTranslation();
  const locale = i18n.language;
  const name = tk.holderName || t('bookings.holderFallback');
  const price = money(tk.priceCents, b.currency, locale);
  const used = !!tk.checkedInAt;
  const scanned = parseIso(tk.checkedInAt);
  const canPay = !b.isPast && tk.paymentStatus === 'unpaid';

  let chip: { label: string; fg: string; bg: string; icon: 'check' | 'clock' | null };
  if (tk.paymentStatus === 'paid') chip = { label: t('bookings.paidPrice', { price }), fg: gs.green, bg: gs.greenSoft, icon: 'check' };
  else if (tk.paymentStatus === 'free' || (tk.paymentStatus == null && tk.priceCents === 0))
    chip = { label: t('bookings.freeTicket'), fg: gs.green, bg: gs.greenSoft, icon: 'check' };
  else if (tk.paymentStatus === 'unpaid') chip = { label: t('bookings.unpaidPrice', { price }), fg: gs.orange, bg: gs.orangeSoft, icon: 'clock' };
  else if (tk.paymentStatus === 'refunded') chip = { label: t('bookings.status.refunded'), fg: gs.subtle, bg: gs.surface2, icon: null };
  else if (tk.paymentStatus === 'released') chip = { label: t('bookings.status.cancelled'), fg: gs.danger, bg: gs.dangerSoft, icon: null };
  // Today's API has no payment state per ticket: show the price only.
  else chip = { label: price, fg: gs.subtle, bg: gs.surface2, icon: null };

  return (
    <View>
      <Perforation />
      <View className="px-[22px] pt-2 pb-6 items-center" style={{ gap: 12 }}>
        <View className="self-stretch flex-row items-center justify-between" style={{ gap: 10 }}>
          <View className="flex-1">
            <Text className="text-[12px] font-extrabold text-muted uppercase" style={{ letterSpacing: 0.7 }}>
              {t('bookings.ticketOf', { i: index + 1, n: total })}
            </Text>
            <Text className="text-[17px] font-extrabold text-ink" numberOfLines={2}>
              {name}
            </Text>
          </View>
          <View className="flex-row items-center h-[30px] px-3 rounded-full" style={{ backgroundColor: chip.bg, gap: 6, maxWidth: '62%' }}>
            {chip.icon === 'check' ? <CircleCheck size={15} color={chip.fg} /> : chip.icon === 'clock' ? <Clock size={15} color={chip.fg} /> : null}
            <Text className="text-[13px] font-extrabold" style={{ color: chip.fg }} numberOfLines={1}>
              {chip.label}
            </Text>
          </View>
        </View>

        <View
          className="p-3 rounded-[18px] items-center justify-center"
          style={{ borderWidth: 1.5, borderColor: gs.line }}
          accessibilityRole="image"
          accessibilityLabel={t('bookings.qrAria', { name })}
        >
          <View style={{ opacity: used ? 0.35 : 1 }}>
            <QRCode value={tk.qrValue} size={184} color={gs.ink} backgroundColor={gs.white} />
          </View>
          {used ? (
            <View
              className="absolute rounded-xl px-3.5 py-1.5"
              style={{ borderWidth: 3, borderColor: gs.subtle, backgroundColor: 'rgba(255,255,255,0.85)', transform: [{ rotate: '-12deg' }] }}
            >
              <Text className="text-[18px] font-extrabold" style={{ color: gs.subtle, letterSpacing: 1.4 }}>
                {t('bookings.stampUsed')}
              </Text>
            </View>
          ) : null}
        </View>

        <Text className="text-[20px] font-bold text-ink" style={{ fontFamily: MONO, letterSpacing: 2.8 }} selectable>
          {tk.code}
        </Text>
        {scanned ? (
          <Text className="text-[13px] font-bold text-subtle text-center">
            {t('bookings.scanned', { date: bookingDate(tk.checkedInAt, locale), time: hhmm(scanned) })}
          </Text>
        ) : null}
        {tk.typeName ? <Text className="text-[13px] text-muted text-center">{tk.typeName}</Text> : null}

        {canPay ? <GsButton label={t('bookings.payNow', { price })} onPress={onPay} size="md" fullWidth className="h-[50px]" /> : null}

        <View className="self-stretch flex-row" style={{ gap: 10 }}>
          <ActionButton
            icon={<Download size={16} color={gs.ink} />}
            label={t('bookings.download')}
            a11y={t('bookings.downloadFor', { name })}
            onPress={() => void downloadTicket(b, tk, t, locale)}
          />
          <ActionButton
            icon={<Share size={16} color={gs.ink} />}
            label={t('bookings.share')}
            a11y={t('bookings.shareWith', { name })}
            onPress={() => void shareTicket(b, tk, t, locale)}
          />
        </View>
      </View>
    </View>
  );
}

function ActionButton({ icon, label, a11y, onPress }: Readonly<{ icon: ReactElement; label: string; a11y: string; onPress: () => void }>): ReactElement {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={a11y}
      className="flex-1 h-12 rounded-full flex-row items-center justify-center bg-white"
      style={{ borderWidth: 1.5, borderColor: gs.lineStrong, gap: 8 }}
    >
      {icon}
      <Text className="text-[14px] font-bold text-ink">{label}</Text>
    </Pressable>
  );
}

function InfoCard(): ReactElement {
  const { t } = useTranslation();
  const rows: ReadonlyArray<{ icon: ReactElement; text: string }> = [
    { icon: <Clock size={18} color={gs.violetDark} />, text: t('bookings.info1') },
    { icon: <QrCode size={18} color={gs.violetDark} />, text: t('bookings.info2') },
    { icon: <Ticket size={18} color={gs.violetDark} />, text: t('bookings.info3') },
    { icon: <IdCard size={18} color={gs.violetDark} />, text: t('bookings.info4') },
  ];
  return (
    <View className="mx-5 mt-[18px] bg-white rounded-[26px] px-5 pt-5 pb-2">
      <View className="flex-row items-center" style={{ gap: 8 }}>
        <Info size={20} color={gs.violet} />
        <Text className="text-[18px] font-extrabold text-ink">{t('bookings.info')}</Text>
      </View>
      <View className="mt-3">
        {rows.map((r) => (
          <View key={r.text} className="flex-row items-start py-3" style={{ gap: 12, borderTopWidth: 1.5, borderTopColor: gs.surface2 }}>
            <View className="w-[34px] h-[34px] rounded-xl items-center justify-center" style={{ backgroundColor: gs.violetSoft }}>
              {r.icon}
            </View>
            <Text className="flex-1 text-[15px] leading-[21px] text-ink">{r.text}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}
