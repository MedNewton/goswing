// src/pages/ReservationDetailsRoutePage.tsx
import React, { useEffect, useState, useCallback, type ReactElement } from 'react';
import { View, Text, ActivityIndicator, Alert, Platform, Share } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import * as Calendar from 'expo-calendar';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

import ReservationDetailsPage, { type ReservationTicketDetails } from '@/pages/ReservationDetailsPage';
import {
  getReservationDetails,
  type ReservationDetails,
} from '@/lib/supabase/reservationDetails';

export type ReservationDetailsRoutePageProps = Readonly<{
  reservationId: string;
  onBack?: () => void;
}>;

function asMsg(e: unknown): string {
  if (e instanceof Error) return e.message;
  return String(e);
}

function generateTicketHtml(
  ticket: ReservationTicketDetails,
  eventDetails: {
    eventTitle: string;
    dateLabel: string;
    timeLabel: string;
    venueLabel: string;
    reservationId: string;
  }
): string {
  const benefits = (ticket.included ?? [])
    .map((b) => `<li>${b}</li>`)
    .join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>Ticket - ${eventDetails.eventTitle}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          background: #f5f5f5;
          padding: 20px;
        }
        .ticket {
          background: white;
          border-radius: 16px;
          max-width: 400px;
          margin: 0 auto;
          overflow: hidden;
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }
        .ticket-header {
          background: linear-gradient(135deg, #111827 0%, #374151 100%);
          color: white;
          padding: 24px;
          text-align: center;
        }
        .ticket-header h1 {
          font-size: 20px;
          font-weight: 600;
          margin-bottom: 4px;
        }
        .ticket-header p {
          font-size: 13px;
          opacity: 0.8;
        }
        .ticket-body {
          padding: 24px;
        }
        .event-info {
          margin-bottom: 20px;
          padding-bottom: 20px;
          border-bottom: 1px dashed #e5e7eb;
        }
        .event-info h2 {
          font-size: 18px;
          color: #111827;
          margin-bottom: 12px;
        }
        .info-row {
          display: flex;
          align-items: center;
          margin-bottom: 8px;
          font-size: 14px;
          color: #4b5563;
        }
        .info-row span {
          margin-left: 8px;
        }
        .ticket-details {
          margin-bottom: 20px;
          padding-bottom: 20px;
          border-bottom: 1px dashed #e5e7eb;
        }
        .detail-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 8px;
          font-size: 14px;
        }
        .detail-label { color: #6b7280; }
        .detail-value { color: #111827; font-weight: 500; }
        .holder-section {
          background: #f9fafb;
          border-radius: 12px;
          padding: 16px;
          margin-bottom: 20px;
        }
        .holder-section h3 {
          font-size: 12px;
          color: #6b7280;
          text-transform: uppercase;
          margin-bottom: 8px;
        }
        .holder-name {
          font-size: 16px;
          color: #111827;
          font-weight: 500;
        }
        .holder-email {
          font-size: 13px;
          color: #6b7280;
          margin-top: 2px;
        }
        .qr-section {
          text-align: center;
          padding: 20px;
          background: #f9fafb;
          border-radius: 12px;
          margin-bottom: 20px;
        }
        .qr-placeholder {
          width: 150px;
          height: 150px;
          background: white;
          border: 2px solid #e5e7eb;
          border-radius: 12px;
          margin: 0 auto 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          color: #9ca3af;
        }
        .qr-code {
          font-size: 11px;
          color: #6b7280;
          word-break: break-all;
        }
        .benefits {
          margin-bottom: 20px;
        }
        .benefits h3 {
          font-size: 12px;
          color: #6b7280;
          text-transform: uppercase;
          margin-bottom: 12px;
        }
        .benefits ul {
          list-style: none;
        }
        .benefits li {
          font-size: 14px;
          color: #374151;
          padding: 6px 0;
          padding-left: 20px;
          position: relative;
        }
        .benefits li:before {
          content: "✓";
          position: absolute;
          left: 0;
          color: #22c55e;
          font-weight: bold;
        }
        .ticket-footer {
          text-align: center;
          padding: 16px 24px;
          background: #f9fafb;
          font-size: 11px;
          color: #9ca3af;
        }
      </style>
    </head>
    <body>
      <div class="ticket">
        <div class="ticket-header">
          <h1>GoSwing</h1>
          <p>Event Ticket</p>
        </div>

        <div class="ticket-body">
          <div class="event-info">
            <h2>${eventDetails.eventTitle}</h2>
            <div class="info-row">
              <span>📅 ${eventDetails.dateLabel}</span>
            </div>
            <div class="info-row">
              <span>🕐 ${eventDetails.timeLabel}</span>
            </div>
            <div class="info-row">
              <span>📍 ${eventDetails.venueLabel}</span>
            </div>
          </div>

          <div class="ticket-details">
            <div class="detail-row">
              <span class="detail-label">Ticket</span>
              <span class="detail-value">${ticket.ticketLabel}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Type</span>
              <span class="detail-value">${ticket.ticketTypeLabel}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Price</span>
              <span class="detail-value">${ticket.priceLabel}</span>
            </div>
          </div>

          <div class="holder-section">
            <h3>Ticket Holder</h3>
            <div class="holder-name">${ticket.holderName}</div>
            <div class="holder-email">${ticket.holderEmail}</div>
          </div>

          <div class="qr-section">
            <div class="qr-placeholder">
              QR Code<br/>
              (Scan at entry)
            </div>
            <div class="qr-code">${ticket.qrCaption || ticket.qrValue}</div>
          </div>

          ${benefits ? `
          <div class="benefits">
            <h3>What's Included</h3>
            <ul>${benefits}</ul>
          </div>
          ` : ''}
        </div>

        <div class="ticket-footer">
          Reservation ID: ${eventDetails.reservationId}<br/>
          Please arrive 30 minutes before the event starts
        </div>
      </div>
    </body>
    </html>
  `;
}

function generateAllTicketsHtml(
  tickets: ReadonlyArray<ReservationTicketDetails>,
  eventDetails: {
    eventTitle: string;
    dateLabel: string;
    timeLabel: string;
    venueLabel: string;
    reservationId: string;
    totalAmountLabel: string;
  }
): string {
  const ticketCards = tickets
    .map((ticket, index) => {
      const benefits = (ticket.included ?? [])
        .map((b) => `<li>${b}</li>`)
        .join('');

      return `
        <div class="ticket" ${index > 0 ? 'style="page-break-before: always;"' : ''}>
          <div class="ticket-header">
            <h1>GoSwing</h1>
            <p>${ticket.ticketLabel} of ${tickets.length}</p>
          </div>

          <div class="ticket-body">
            <div class="event-info">
              <h2>${eventDetails.eventTitle}</h2>
              <div class="info-row">
                <span>📅 ${eventDetails.dateLabel}</span>
              </div>
              <div class="info-row">
                <span>🕐 ${eventDetails.timeLabel}</span>
              </div>
              <div class="info-row">
                <span>📍 ${eventDetails.venueLabel}</span>
              </div>
            </div>

            <div class="ticket-details">
              <div class="detail-row">
                <span class="detail-label">Ticket</span>
                <span class="detail-value">${ticket.ticketLabel}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Type</span>
                <span class="detail-value">${ticket.ticketTypeLabel}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Price</span>
                <span class="detail-value">${ticket.priceLabel}</span>
              </div>
            </div>

            <div class="holder-section">
              <h3>Ticket Holder</h3>
              <div class="holder-name">${ticket.holderName}</div>
              <div class="holder-email">${ticket.holderEmail}</div>
            </div>

            <div class="qr-section">
              <div class="qr-placeholder">
                QR Code<br/>
                (Scan at entry)
              </div>
              <div class="qr-code">${ticket.qrCaption || ticket.qrValue}</div>
            </div>

            ${benefits ? `
            <div class="benefits">
              <h3>What's Included</h3>
              <ul>${benefits}</ul>
            </div>
            ` : ''}
          </div>

          <div class="ticket-footer">
            Reservation ID: ${eventDetails.reservationId}<br/>
            Please arrive 30 minutes before the event starts
          </div>
        </div>
      `;
    })
    .join('\n');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>All Tickets - ${eventDetails.eventTitle}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          background: #f5f5f5;
          padding: 20px;
        }
        .ticket {
          background: white;
          border-radius: 16px;
          max-width: 400px;
          margin: 0 auto 30px;
          overflow: hidden;
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }
        .ticket-header {
          background: linear-gradient(135deg, #111827 0%, #374151 100%);
          color: white;
          padding: 24px;
          text-align: center;
        }
        .ticket-header h1 {
          font-size: 20px;
          font-weight: 600;
          margin-bottom: 4px;
        }
        .ticket-header p {
          font-size: 13px;
          opacity: 0.8;
        }
        .ticket-body {
          padding: 24px;
        }
        .event-info {
          margin-bottom: 20px;
          padding-bottom: 20px;
          border-bottom: 1px dashed #e5e7eb;
        }
        .event-info h2 {
          font-size: 18px;
          color: #111827;
          margin-bottom: 12px;
        }
        .info-row {
          display: flex;
          align-items: center;
          margin-bottom: 8px;
          font-size: 14px;
          color: #4b5563;
        }
        .info-row span {
          margin-left: 8px;
        }
        .ticket-details {
          margin-bottom: 20px;
          padding-bottom: 20px;
          border-bottom: 1px dashed #e5e7eb;
        }
        .detail-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 8px;
          font-size: 14px;
        }
        .detail-label { color: #6b7280; }
        .detail-value { color: #111827; font-weight: 500; }
        .holder-section {
          background: #f9fafb;
          border-radius: 12px;
          padding: 16px;
          margin-bottom: 20px;
        }
        .holder-section h3 {
          font-size: 12px;
          color: #6b7280;
          text-transform: uppercase;
          margin-bottom: 8px;
        }
        .holder-name {
          font-size: 16px;
          color: #111827;
          font-weight: 500;
        }
        .holder-email {
          font-size: 13px;
          color: #6b7280;
          margin-top: 2px;
        }
        .qr-section {
          text-align: center;
          padding: 20px;
          background: #f9fafb;
          border-radius: 12px;
          margin-bottom: 20px;
        }
        .qr-placeholder {
          width: 150px;
          height: 150px;
          background: white;
          border: 2px solid #e5e7eb;
          border-radius: 12px;
          margin: 0 auto 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          color: #9ca3af;
        }
        .qr-code {
          font-size: 11px;
          color: #6b7280;
          word-break: break-all;
        }
        .benefits {
          margin-bottom: 20px;
        }
        .benefits h3 {
          font-size: 12px;
          color: #6b7280;
          text-transform: uppercase;
          margin-bottom: 12px;
        }
        .benefits ul {
          list-style: none;
        }
        .benefits li {
          font-size: 14px;
          color: #374151;
          padding: 6px 0;
          padding-left: 20px;
          position: relative;
        }
        .benefits li:before {
          content: "✓";
          position: absolute;
          left: 0;
          color: #22c55e;
          font-weight: bold;
        }
        .ticket-footer {
          text-align: center;
          padding: 16px 24px;
          background: #f9fafb;
          font-size: 11px;
          color: #9ca3af;
        }
        @media print {
          body { background: white; padding: 0; }
          .ticket { box-shadow: none; margin-bottom: 0; }
        }
      </style>
    </head>
    <body>
      ${ticketCards}
    </body>
    </html>
  `;
}

async function getDefaultCalendarId(): Promise<string | null> {
  const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);

  // Try to find the default calendar
  const defaultCalendar = calendars.find(
    (cal) => cal.allowsModifications && (cal.isPrimary || cal.source?.name === 'Default')
  );

  if (defaultCalendar) return defaultCalendar.id;

  // Fallback: find any calendar that allows modifications
  const writableCalendar = calendars.find((cal) => cal.allowsModifications);
  if (writableCalendar) return writableCalendar.id;

  // On iOS, create a new calendar if none found
  if (Platform.OS === 'ios') {
    const defaultCalendarSource = calendars.find(
      (cal) => cal.source?.type === Calendar.CalendarType.LOCAL
    )?.source;

    if (defaultCalendarSource) {
      const newCalendarId = await Calendar.createCalendarAsync({
        title: 'GoSwing Events',
        color: '#000000',
        entityType: Calendar.EntityTypes.EVENT,
        sourceId: defaultCalendarSource.id,
        source: defaultCalendarSource,
        name: 'GoSwing Events',
        ownerAccount: 'personal',
        accessLevel: Calendar.CalendarAccessLevel.OWNER,
      });
      return newCalendarId;
    }
  }

  return null;
}

export default function ReservationDetailsRoutePage({
  reservationId,
  onBack,
}: ReservationDetailsRoutePageProps): ReactElement {
  const { t } = useTranslation();
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [details, setDetails] = useState<ReservationDetails | null>(null);

  const handleShareTicket = useCallback(async (ticketId: string) => {
    if (!details) return;

    const ticket = details.tickets.find((t) => t.id === ticketId);
    if (!ticket) {
      Alert.alert(t('common.error'), t('reservationDetailsRoute.ticketNotFound'));
      return;
    }

    try {
      const message = [
        `🎫 ${details.eventTitle}`,
        '',
        `📅 ${details.dateLabel} at ${details.timeLabel}`,
        `📍 ${details.venueLabel}`,
        '',
        `Ticket: ${ticket.ticketTypeLabel}`,
        `Holder: ${ticket.holderName}`,
        '',
        `Ticket Code: ${ticket.qrCaption || ticket.qrValue}`,
        '',
        '— Shared via GoSwing',
      ].join('\n');

      await Share.share({
        message,
        title: t('reservationDetailsRoute.shareTitle', { title: details.eventTitle }),
      });
    } catch (err) {
      // User cancelled sharing - this is not an error
      if ((err as any)?.message !== 'User did not share') {
        Alert.alert(t('common.error'), asMsg(err));
      }
    }
  }, [details, t]);

  const handleDownloadTicket = useCallback(async (ticketId: string) => {
    if (!details) return;

    const ticket = details.tickets.find((t) => t.id === ticketId);
    if (!ticket) {
      Alert.alert(t('common.error'), t('reservationDetailsRoute.ticketNotFound'));
      return;
    }

    try {
      // Generate HTML for the ticket
      const html = generateTicketHtml(ticket, {
        eventTitle: details.eventTitle,
        dateLabel: details.dateLabel,
        timeLabel: details.timeLabel,
        venueLabel: details.venueLabel,
        reservationId: details.id,
      });

      // Generate PDF
      const { uri } = await Print.printToFileAsync({
        html,
        base64: false,
      });

      // Check if sharing is available
      const canShare = await Sharing.isAvailableAsync();

      if (canShare) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: `${ticket.ticketLabel} - ${details.eventTitle}`,
          UTI: 'com.adobe.pdf',
        });
      } else {
        Alert.alert(
          t('reservationDetailsRoute.pdfGenerated'),
          t('reservationDetailsRoute.pdfSavedTicket', { uri }),
        );
      }
    } catch (err) {
      Alert.alert(t('common.error'), asMsg(err));
    }
  }, [details, t]);

  const handleDownloadAll = useCallback(async () => {
    if (!details || details.tickets.length === 0) {
      Alert.alert(t('common.error'), t('reservationDetailsRoute.noTickets'));
      return;
    }

    try {
      // Generate HTML for all tickets
      const html = generateAllTicketsHtml(details.tickets, {
        eventTitle: details.eventTitle,
        dateLabel: details.dateLabel,
        timeLabel: details.timeLabel,
        venueLabel: details.venueLabel,
        reservationId: details.id,
        totalAmountLabel: details.totalAmountLabel,
      });

      // Generate PDF
      const { uri } = await Print.printToFileAsync({
        html,
        base64: false,
      });

      // Check if sharing is available
      const canShare = await Sharing.isAvailableAsync();

      if (canShare) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: `All Tickets - ${details.eventTitle}`,
          UTI: 'com.adobe.pdf',
        });
      } else {
        Alert.alert(
          t('reservationDetailsRoute.pdfGenerated'),
          t('reservationDetailsRoute.pdfSavedTickets', { uri }),
        );
      }
    } catch (err) {
      Alert.alert(t('common.error'), asMsg(err));
    }
  }, [details, t]);

  const handleAddToCalendar = useCallback(async () => {
    if (!details) return;

    try {
      // Request calendar permissions
      const { status } = await Calendar.requestCalendarPermissionsAsync();

      if (status !== 'granted') {
        Alert.alert(
          t('reservationDetailsRoute.permissionRequired'),
          t('reservationDetailsRoute.calendarPermission'),
        );
        return;
      }

      // Get default calendar
      const calendarId = await getDefaultCalendarId();
      if (!calendarId) {
        Alert.alert(t('common.error'), t('reservationDetailsRoute.noWritableCalendar'));
        return;
      }

      // Parse event date
      const startDate = details.eventStartsAt ? new Date(details.eventStartsAt) : null;
      if (!startDate || !Number.isFinite(startDate.getTime())) {
        Alert.alert(t('common.error'), t('reservationDetailsRoute.eventDateUnavailable'));
        return;
      }

      // Create end date (assume 3 hour event duration)
      const endDate = new Date(startDate.getTime() + 3 * 60 * 60 * 1000);

      // Build ticket info for notes
      const ticketInfo = details.tickets
        .map((t) => `${t.ticketLabel} (${t.ticketTypeLabel}) - ${t.holderName}`)
        .join('\n');

      // Create the calendar event
      await Calendar.createEventAsync(calendarId, {
        title: details.eventTitle,
        startDate,
        endDate,
        location: details.venueLabel,
        notes: `Reservation ID: ${details.id}\n\nTickets:\n${ticketInfo}\n\nTotal: ${details.totalAmountLabel}`,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        alarms: [
          { relativeOffset: -60 }, // 1 hour before
          { relativeOffset: -1440 }, // 1 day before
        ],
      });

      Alert.alert(
        t('reservationDetailsRoute.success'),
        t('reservationDetailsRoute.eventAdded', { title: details.eventTitle }),
      );
    } catch (err) {
      Alert.alert(t('common.error'), asMsg(err));
    }
  }, [details, t]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        setError(null);
        setDetails(null);

        const d = await getReservationDetails({ reservationId: String(reservationId) });
        if (!cancelled) setDetails(d);
      } catch (e: unknown) {
        if (!cancelled) setError(asMsg(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [reservationId]);

  if (loading) {
    return (
      <SafeAreaView edges={['top', 'left', 'right']} className="flex-1 bg-white">
        <View className="flex-1 items-center justify-center px-6">
          <ActivityIndicator />
          <Text className="mt-3 text-gray600">{t('reservationDetailsRoute.loading')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !details) {
    return (
      <SafeAreaView edges={['top', 'left', 'right']} className="flex-1 bg-white">
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-gray900 font-semibold">{t('reservationDetailsRoute.couldNotLoad')}</Text>
          <Text className="text-gray600 mt-2 text-center">{error ?? t('reservationDetailsRoute.missingDetails')}</Text>

          {/* Simple back fallback */}
          <Text
            onPress={onBack}
            className="mt-4 text-brand font-medium"
            accessibilityRole="button"
          >
            {t('reservationDetailsRoute.goBack')}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <ReservationDetailsPage
      details={details}
      onBack={onBack}
      onShareTicket={handleShareTicket}
      onDownloadTicket={handleDownloadTicket}
      onDownloadAll={handleDownloadAll}
      onAddToCalendar={handleAddToCalendar}
    />
  );
}
