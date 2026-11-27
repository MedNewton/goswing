// components/reservations/TicketSheet.tsx — the ticket view as a full-height modal.
import React, { type ReactElement } from 'react';
import { Modal, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { gs } from '@/theme/colors';
import type { Booking } from '@/lib/api/bookings';
import TicketView from './TicketView';

export default function TicketSheet({
  booking,
  imageUrl,
  onClose,
  onOpenEvent,
  notice,
}: Readonly<{
  booking: Booking | null;
  imageUrl?: string | null;
  onClose: () => void;
  onOpenEvent?: (eventId: string) => void;
  notice?: string | null;
}>): ReactElement {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={!!booking} animationType="slide" onRequestClose={onClose} statusBarTranslucent presentationStyle="fullScreen">
      <View className="flex-1" style={{ backgroundColor: gs.violet, paddingTop: insets.top }}>
        {booking ? <TicketView booking={booking} imageUrl={imageUrl} onClose={onClose} onOpenEvent={onOpenEvent} notice={notice} /> : null}
      </View>
    </Modal>
  );
}
