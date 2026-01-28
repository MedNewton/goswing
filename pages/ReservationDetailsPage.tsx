// src/pages/ReservationDetailsPage.tsx
import React, { useMemo, useState, type ReactElement } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Modal,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

const cx = (...c: ReadonlyArray<string | null | undefined | false>): string => c.filter(Boolean).join(' ');

/* ---------------------------------------------
   Types
---------------------------------------------- */

export type ReservationTicketDetails = Readonly<{
  id: string;

  ticketLabel: string; // "Ticket #1"
  ticketTypeLabel: string; // "Early Bird", "VIP Experience"
  priceLabel: string; // "$60"

  holderName: string; // "John Doe"
  holderEmail: string; // "john@example.com"

  qrValue: string; // the value to encode
  qrCaption?: string | null; // e.g. "EVT1692742800-EarlyBird-001"

  included?: ReadonlyArray<string>; // benefits list
}>;

export type ReservationDetails = Readonly<{
  id: string;

  statusLabel: string; // "Confirmed"
  ticketsCountLabel: string; // "3 tickets"

  eventTitle: string;
  dateLabel: string; // "Aug 30, 2025"
  timeLabel: string; // "6:00 PM"
  venueLabel: string; // "Central Park, NYC"
  eventStartsAt: string | null; // ISO date string for calendar functionality

  orderDateLabel: string; // "Aug 25, 2025"
  totalTicketsNumber: number; // 3
  totalAmountLabel: string; // "$187"

  tickets: ReadonlyArray<ReservationTicketDetails>;
}>;

export type ReservationDetailsPageProps = Readonly<{
  details: ReservationDetails;
  onBack?: () => void;

  onShareTicket?: (ticketId: string) => void;
  onDownloadTicket?: (ticketId: string) => void;

  onDownloadAll?: (reservationId: string) => void;
  onAddToCalendar?: (reservationId: string) => void;
}>;

/* ---------------------------------------------
   Optional QR dependency
---------------------------------------------- */

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

export default function ReservationDetailsPage({
  details,
  onBack,
  onShareTicket,
  onDownloadTicket,
  onDownloadAll,
  onAddToCalendar,
}: ReservationDetailsPageProps): ReactElement {
  const insets = useSafeAreaInsets();
  const bottomPad = (insets.bottom || 0) + 120;

  const QRCode = useMemo(() => tryGetQrComponent(), []);
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [qrModalValue, setQrModalValue] = useState<string>('');
  const [qrModalCaption, setQrModalCaption] = useState<string>('');

  const openQr = (value: string, caption?: string | null): void => {
    setQrModalValue(value);
    setQrModalCaption(String(caption ?? ''));
    setQrModalOpen(true);
  };

  const closeQr = (): void => setQrModalOpen(false);

  const handleShare = (ticketId: string): void => {
    if (typeof onShareTicket === 'function') onShareTicket(ticketId);
    else Alert.alert('Share', 'Hook up sharing later.');
  };

  const handleDownload = (ticketId: string): void => {
    if (typeof onDownloadTicket === 'function') onDownloadTicket(ticketId);
    else Alert.alert('Download', 'Hook up download later.');
  };

  const handleDownloadAll = (): void => {
    if (typeof onDownloadAll === 'function') onDownloadAll(details.id);
    else Alert.alert('Download All', 'Hook up “Download All Tickets” later.');
  };

  const handleAddToCalendar = (): void => {
    if (typeof onAddToCalendar === 'function') onAddToCalendar(details.id);
    else Alert.alert('Calendar', 'Hook up “Add to Calendar” later.');
  };

  return (
    <SafeAreaView edges={['left', 'right']} className="flex-1 bg-white">
      {/* Header */}
      <View className="px-5 pt-6 pb-3 border-b border-gray100">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-x-3">
            <Pressable
              accessibilityRole="button"
              onPress={onBack}
              hitSlop={12}
              className="h-10 w-10 items-center justify-center -ml-2"
            >
              <Feather name="chevron-left" size={22} color="#111827" />
            </Pressable>

            <View>
              <Text className="text-base font-semibold text-black">Event Reservation</Text>
              <Text className="text-xs text-gray500 mt-0.5">{details.ticketsCountLabel}</Text>
            </View>
          </View>

          <View className="px-3 py-1 rounded-full bg-gray100 border border-gray200">
            <Text className="text-xs font-medium text-gray700">{details.statusLabel}</Text>
          </View>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: bottomPad }}
        contentContainerClassName="pb-10"
      >
        {/* Event card */}
        <View className="px-5 mt-4">
          <View className="rounded-2xl border border-gray200 bg-white p-4">
            <View className="flex-row items-center gap-x-2">
              <Feather name="calendar" size={16} color="#111827" />
              <Text className="text-base font-semibold text-gray900">{details.eventTitle}</Text>
            </View>

            <View className="mt-3 flex-row items-center">
              <View className="flex-row items-center gap-x-2 flex-1">
                <Feather name="calendar" size={14} color="#6B7280" />
                <Text className="text-sm text-gray700">{details.dateLabel}</Text>
              </View>

              <View className="flex-row items-center gap-x-2 flex-1 justify-center">
                <Feather name="clock" size={14} color="#6B7280" />
                <Text className="text-sm text-gray700">{details.timeLabel}</Text>
              </View>

              <View className="flex-1" />
            </View>

            <View className="mt-3 flex-row items-center gap-x-2">
              <Feather name="map-pin" size={14} color="#6B7280" />
              <Text className="text-sm text-gray700">{details.venueLabel}</Text>
            </View>
          </View>
        </View>

        {/* Order summary */}
        <View className="px-5 mt-4">
          <View className="rounded-2xl border border-gray200 bg-white p-4">
            <Text className="text-base font-semibold text-gray900">Order Summary</Text>

            <View className="mt-4 gap-y-3">
              <Row label="Order Date" value={details.orderDateLabel} />

              <View className="flex-row items-center justify-between">
                <Text className="text-sm text-gray700">Total Tickets</Text>
                <View className="h-6 min-w-[28px] px-2 rounded-full bg-gray100 border border-gray200 items-center justify-center">
                  <Text className="text-xs font-semibold text-gray800">{details.totalTicketsNumber}</Text>
                </View>
              </View>

              <View className="flex-row items-center justify-between">
                <Text className="text-sm text-gray700">Total Amount</Text>
                <Text className="text-sm font-semibold text-gray900">{details.totalAmountLabel}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Tickets */}
        <View className="px-5 mt-5">
          <Text className="text-base font-semibold text-gray900">Your Tickets</Text>
        </View>

        <View className="px-5 mt-3 gap-y-4">
          {details.tickets.map((t) => (
            <View key={t.id} className="rounded-2xl border border-gray200 bg-white p-4">
              {/* Ticket header */}
              <View className="flex-row items-start justify-between">
                <View>
                  <Text className="text-sm font-semibold text-gray900">{t.ticketLabel}</Text>
                  <View className="mt-2 self-start px-2 py-1 rounded-full bg-gray100 border border-gray200">
                    <Text className="text-xs font-medium text-gray700">{t.ticketTypeLabel}</Text>
                  </View>
                </View>

                <Text className="text-sm font-semibold text-gray900">{t.priceLabel}</Text>
              </View>

              {/* Holder */}
              <View className="mt-4 rounded-xl bg-gray50 border border-gray100 px-3 py-3 flex-row items-center gap-x-3">
                <View className="h-8 w-8 rounded-full bg-gray100 items-center justify-center">
                  <Feather name="user" size={16} color="#6B7280" />
                </View>
                <View className="flex-1">
                  <Text className="text-sm font-medium text-gray900">{t.holderName}</Text>
                  <Text className="text-xs text-gray500 mt-0.5">{t.holderEmail}</Text>
                </View>
              </View>

              {/* QR */}
              <Pressable
                accessibilityRole="button"
                onPress={() => openQr(t.qrValue, t.qrCaption)}
                className="mt-4 rounded-xl border border-gray200 bg-white p-4 items-center justify-center active:opacity-90"
              >
                <View className="items-center justify-center">
                  {QRCode ? (
                    <QRCode value={t.qrValue} size={92} color="#111827" backgroundColor="#FFFFFF" />
                  ) : (
                    <View className="h-[92px] w-[92px] rounded-xl border border-gray200 bg-gray50 items-center justify-center">
                      <Feather name="grid" size={22} color="#111827" />
                    </View>
                  )}

                  <Text className="text-xs text-gray500 mt-3">
                    {t.qrCaption ? String(t.qrCaption) : t.qrValue}
                  </Text>
                  <Text className="text-xs text-gray500 mt-1">Tap to view full size</Text>
                </View>
              </Pressable>

              {/* Actions */}
              <View className="mt-4 flex-row gap-x-3">
                <ActionButton
                  icon="share-2"
                  label="Share"
                  onPress={() => handleShare(t.id)}
                />
                <ActionButton
                  icon="download"
                  label="Download"
                  onPress={() => handleDownload(t.id)}
                />
              </View>

              {/* Included */}
              <View className="mt-4">
                <Text className="text-xs text-gray500">What’s included:</Text>

                <View className="mt-2 gap-y-2">
                  {(t.included ?? []).map((line) => (
                    <View key={line} className="flex-row items-center gap-x-2">
                      <Feather name="check-circle" size={14} color="#22C55E" />
                      <Text className="text-sm text-gray700">{line}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>
          ))}
        </View>

        {/* Important info */}
        <View className="px-5 mt-5">
          <View className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
            <Text className="text-sm font-semibold text-blue-700">Important Information</Text>

            <View className="mt-3 gap-y-2">
              {[
                'Please arrive 30 minutes before the event starts',
                'Have your QR code ready for scanning at the entrance',
                'Tickets are non-transferable and non-refundable',
                'Valid ID required for entry verification',
              ].map((line) => (
                <View key={line} className="flex-row items-start gap-x-2">
                  <Text className="text-blue-700 mt-[1px]">•</Text>
                  <Text className="text-sm text-blue-700 flex-1">{line}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* Bottom actions */}
        <View className="px-5 mt-5 gap-y-3">
          <BottomActionButton icon="download" label="Download All Tickets" onPress={handleDownloadAll} />
          <BottomActionButton icon="calendar" label="Add to Calendar" onPress={handleAddToCalendar} />
        </View>

        <View style={{ height: (insets.bottom || 0) + 24 }} />
      </ScrollView>

      {/* QR modal */}
      <Modal visible={qrModalOpen} transparent animationType="fade" onRequestClose={closeQr}>
        <View className="flex-1 bg-black/90 items-center justify-center px-6">
          <Pressable
            accessibilityRole="button"
            onPress={closeQr}
            className="absolute top-14 right-6 h-10 w-10 rounded-full bg-white/10 items-center justify-center"
            hitSlop={12}
          >
            <Feather name="x" size={20} color="#FFFFFF" />
          </Pressable>

          <View className="rounded-2xl bg-white p-6 items-center">
            {QRCode ? (
              <QRCode
                value={qrModalValue}
                size={220}
                color="#111827"
                backgroundColor="#FFFFFF"
              />
            ) : (
              <View className="h-[220px] w-[220px] rounded-2xl border border-gray200 bg-gray50 items-center justify-center">
                <Feather name="grid" size={28} color="#111827" />
              </View>
            )}

            <Text className="text-xs text-gray500 mt-4 text-center">
              {qrModalCaption ? qrModalCaption : qrModalValue}
            </Text>
            <Text className="text-xs text-gray500 mt-1 text-center">
              {Platform.OS === 'ios' ? 'Pinch to zoom (if enabled)' : 'Tap outside to close'}
            </Text>

            <Pressable
              onPress={closeQr}
              className="mt-5 px-4 py-2 rounded-full bg-gray100 border border-gray200 active:opacity-90"
            >
              <Text className="text-sm text-gray800 font-medium">Close</Text>
            </Pressable>
          </View>

          <Pressable className="absolute inset-0" onPress={closeQr} />
        </View>
      </Modal>
    </SafeAreaView>
  );
}

/* ---------------------------------------------
   UI bits
---------------------------------------------- */

function Row({ label, value }: { label: string; value: string }): ReactElement {
  return (
    <View className="flex-row items-center justify-between">
      <Text className="text-sm text-gray700">{label}</Text>
      <Text className="text-sm text-gray900">{value}</Text>
    </View>
  );
}

function ActionButton({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  onPress: () => void;
}): ReactElement {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      className="flex-1 rounded-xl border border-gray200 bg-white py-3 flex-row items-center justify-center gap-x-2 active:opacity-90"
    >
      <Feather name={icon} size={16} color="#111827" />
      <Text className="text-sm font-medium text-gray900">{label}</Text>
    </Pressable>
  );
}

function BottomActionButton({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  onPress: () => void;
}): ReactElement {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      className="rounded-xl border border-gray200 bg-white py-3.5 flex-row items-center justify-center gap-x-2 active:opacity-90"
    >
      <Feather name={icon} size={16} color="#111827" />
      <Text className="text-sm font-medium text-gray900">{label}</Text>
    </Pressable>
  );
}
