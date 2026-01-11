// src/components/reservations/ReservationCard.tsx
import React, { useMemo, useCallback, type ReactElement } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import Card from '@/components/ui/Card';

const cx = (...c: ReadonlyArray<string | null | undefined | false>): string => c.filter(Boolean).join(' ');

type QRComp = React.ComponentType<{ value: string; size: number; color?: string; backgroundColor?: string }>;
function tryGetQrComponent(): QRComp | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require('react-native-qrcode-svg');
    return (mod?.default ?? mod) as QRComp;
  } catch {
    return null;
  }
}

export type Ticket = Readonly<{
  id: string;
  holder: string;
  qrLabel: string;

  // NEW: stable QR payload
  qrValue: string;
  qrCaption?: string | null;
}>;

export type TicketGroup = Readonly<{
  id: string;
  title: string;
  subtitle: string;
  tickets: ReadonlyArray<Ticket>;
}>;

export type Reservation = Readonly<{
  id: string;
  title: string;
  ticketsBadge: string;
  dateLabel: string;
  timeLabel: string;
  venueLabel: string;
  totalAmount: string;
  groups: ReadonlyArray<TicketGroup>;
  savedBadge: string | null;
}>;

export type ReservationCardProps = Readonly<{
  reservation: Reservation;
  onPressReservation?: (reservationId: string) => void;
  onPressSuggestSongs?: (reservationId: string) => void;
  onPressAddToWallet?: (reservationId: string) => void;
}>;

export default function ReservationCard({
  reservation,
  onPressReservation,
  onPressSuggestSongs,
  onPressAddToWallet,
}: ReservationCardProps): ReactElement {
  const QRCode = useMemo(() => tryGetQrComponent(), []);

  const handleOpenDetails = useCallback(() => {
    onPressReservation?.(String(reservation.id));
  }, [onPressReservation, reservation.id]);

  const handleSuggestSongs = useCallback(() => {
    onPressSuggestSongs?.(String(reservation.id));
  }, [onPressSuggestSongs, reservation.id]);

  const handleAddToWallet = useCallback(() => {
    onPressAddToWallet?.(String(reservation.id));
  }, [onPressAddToWallet, reservation.id]);

  const Row = ({
    icon,
    children,
    className,
  }: {
    icon: keyof typeof Feather.glyphMap;
    children: string;
    className?: string;
  }) => (
    <View className={cx('flex-row items-center gap-x-2', className)}>
      <Feather name={icon} size={16} color="#6B7280" />
      <Text className="text-gray700">{children}</Text>
    </View>
  );

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Open reservation details for ${reservation.title}`}
      onPress={handleOpenDetails}
      className="active:opacity-95"
    >
      <Card variant="outlined" padding="lg" className="rounded-3xl border-gray200">
        <View className="flex-row items-start justify-between">
          <View className="flex-1 pr-3">
            <Text className="text-2xl font-semibold text-black">{reservation.title}</Text>

            <View className="mt-2 flex-row items-center gap-x-2">
              <View className="px-2 py-1 rounded-full bg-gray100 border border-gray200">
                <Text className="text-gray700 text-xs">{reservation.ticketsBadge}</Text>
              </View>

              {reservation.savedBadge ? (
                <View className="px-2 py-1 rounded-full bg-green-50 border border-green-200">
                  <Text className="text-green-600 text-xs">{reservation.savedBadge}</Text>
                </View>
              ) : null}
            </View>
          </View>

          <View className="mt-2">
            <Feather name="more-horizontal" size={20} color="#6B7280" />
          </View>
        </View>

        <View className="mt-4 gap-y-4 flex-row items-center justify-between flex-wrap">
          <Row icon="calendar" className="w-1/2">
            {reservation.dateLabel}
          </Row>
          <Row icon="clock" className="w-1/2">
            {reservation.timeLabel}
          </Row>
          <Row icon="map-pin" className="w-1/2">
            {reservation.venueLabel}
          </Row>
        </View>

        <View className="mt-4 border-b border-gray200 pt-3 flex-row items-center justify-between pb-3">
          <Text className="text-gray700 font-medium">Total Amount</Text>
          <Text className="text-gray900 mt-1">{reservation.totalAmount}</Text>
        </View>

        {reservation.groups.length > 0 ? (
          <>
            <Text className="mt-5 text-gray700 font-medium">Your Tickets</Text>
            <View className="mt-3 gap-y-4">
              {reservation.groups.map((g) => (
                <TicketGroupBlock key={g.id} group={g} QRCode={QRCode} />
              ))}
            </View>
          </>
        ) : null}

        <View className="mt-4 gap-y-3">
          <Pressable
            accessibilityRole="button"
            onPress={(e) => {
              e.stopPropagation?.();
              handleSuggestSongs();
            }}
            className="h-11 rounded-2xl border border-gray300 px-3 flex-row items-center justify-center gap-x-2 active:opacity-90"
          >
            <Feather name="music" size={16} color="#111827" />
            <Text className="text-gray900">Suggest Songs for Event</Text>
          </Pressable>

          <View className="flex-row gap-x-3">
            <GhostIconBtn
              icon="download"
              label="Add to Wallet"
              onPress={(e) => {
                e.stopPropagation?.();
                handleAddToWallet();
              }}
            />
            <GhostIconBtn
              icon="external-link"
              label="View Details"
              onPress={(e) => {
                e.stopPropagation?.();
                handleOpenDetails();
              }}
            />
          </View>
        </View>
      </Card>
    </Pressable>
  );
}

function TicketGroupBlock({
  group,
  QRCode,
}: {
  group: TicketGroup;
  QRCode: QRComp | null;
}): ReactElement {
  return (
    <View className="rounded-3xl border border-gray200 p-4">
      <Text className="text-lg font-semibold text-black">{group.title}</Text>
      <Text className="text-gray600 mt-1">{group.subtitle}</Text>

      <View className="mt-3 px-2 flex-row gap-x-2 items-start justify-between">
        {group.tickets.map((t) => (
          <View key={t.id} className="items-center w-1/2">
            <View className="h-36 w-40 rounded-2xl bg-white border border-gray200 items-center justify-center">
              {QRCode ? (
                <QRCode value={t.qrValue} size={88} color="#111827" backgroundColor="#FFFFFF" />
              ) : (
                <View className="h-[88px] w-[88px] rounded-xl border border-gray200 bg-gray50 items-center justify-center">
                  <Feather name="grid" size={22} color="#111827" />
                </View>
              )}
            </View>

            <Text className="text-xs text-gray500 mt-1">{t.qrLabel}</Text>

            <View className="mt-2 flex-row items-center gap-x-2">
              <Feather name="user" size={14} color="#6B7280" />
              <Text className="text-gray700">{t.holder}</Text>
            </View>

            <View className="mt-2 flex-row items-center gap-x-6">
              <MiniIcon action="share" label="Share" />
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

function MiniIcon({ action, label }: { action: keyof typeof Feather.glyphMap; label?: string }) {
  return (
    <View className="flex-row items-center gap-x-1">
      <Feather name={action} size={14} color="#6B7280" />
      {label ? <Text className="text-gray600 text-sm">{label}</Text> : null}
    </View>
  );
}

function GhostIconBtn({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  onPress?: (e: any) => void;
}): ReactElement {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      className="flex-1 h-11 rounded-2xl border border-gray300 px-3 flex-row items-center justify-center gap-x-2 active:opacity-90"
    >
      <Feather name={icon} size={16} color="#111827" />
      <Text className="text-gray900">{label}</Text>
    </Pressable>
  );
}
