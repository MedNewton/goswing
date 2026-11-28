// components/reservations/BookingCard.tsx — one booking in the Bookings tab.
import React, { memo, type ReactElement } from 'react';
import { Pressable, Text, View } from 'react-native';
import { QrCode } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Cover, StatusChip, softShadow } from '@/components/gs';
import { gs } from '@/theme/colors';
import { bookingChip, type Booking } from '@/lib/api/bookings';
import { bookingDate, bookingWhen, money } from './bookingFormat';

export type BookingCardProps = Readonly<{
  booking: Booking;
  /** Cover image from the events list when the booking has none. */
  imageUrl?: string | null;
  onOpen: (b: Booking) => void;
}>;

export default memo(function BookingCard({ booking: b, imageUrl, onOpen }: BookingCardProps): ReactElement {
  const { t, i18n } = useTranslation();
  const locale = i18n.language;
  const chip = bookingChip(b);
  const title = b.title || t('bookings.eventFallback');
  const when = b.isPast ? '' : bookingWhen(b, t, locale);
  const sub = [bookingDate(b.startsAtIso, locale), b.venueName].filter(Boolean).join(' · ');

  return (
    <View className="flex-row items-center bg-white rounded-[24px] p-3" style={softShadow}>
      <Pressable
        onPress={() => onOpen(b)}
        accessibilityRole="button"
        accessibilityLabel={t('bookings.openBooking', { title })}
        className="flex-1 flex-row items-center"
      >
      <Cover uri={imageUrl ?? b.imageUrl} toneKey={b.eventId ?? b.id} radius={18} style={{ width: 96, height: 96, opacity: b.isPast ? 0.75 : 1 }} />
      <View className="flex-1 ml-3.5 mr-2">
        {when ? (
          <Text className="text-[14px] font-bold" style={{ color: gs.violetDark }} numberOfLines={1}>
            {when}
          </Text>
        ) : null}
        <Text className="text-[18px] font-extrabold text-ink mt-0.5" numberOfLines={1}>
          {title}
        </Text>
        <Text className="text-[14px] text-muted mt-0.5" numberOfLines={1}>
          {sub}
        </Text>
        <Text className="text-[14px] text-ink mt-0.5" numberOfLines={1}>
          <Text className="font-extrabold">{t('bookings.ticketsCount', { count: b.ticketsCount })}</Text>
          {b.totalCents > 0 ? ` · ${money(b.totalCents, b.currency, locale)}` : ''}
        </Text>
        <StatusChip label={t(`bookings.status.${chip.key}`)} tone={chip.tone} size="xs" className="mt-1.5" />
      </View>
      </Pressable>
      {b.isPast ? null : (
        <Pressable
          onPress={() => onOpen(b)}
          accessibilityRole="button"
          accessibilityLabel={t('bookings.showQr', { title })}
          className="h-12 w-12 rounded-[16px] items-center justify-center"
          style={{ backgroundColor: gs.violetSoft }}
          hitSlop={4}
        >
          <QrCode size={24} color={gs.violetDark} />
        </Pressable>
      )}
    </View>
  );
});
