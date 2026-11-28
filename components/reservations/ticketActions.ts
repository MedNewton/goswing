// components/reservations/ticketActions.ts — Download (PDF with the QR code),
// Share and Add to calendar for a ticket. Uses only modules already in the app
// (expo-print, expo-sharing, expo-calendar): no screenshot/media-library dep.
import { Alert, Platform, Share } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as Calendar from 'expo-calendar';
import type { TFunction } from 'i18next';
import type { Booking, BookingTicket } from '@/lib/api/bookings';
import { qrSvgString } from '@/lib/qr/qrSvg';
import { bookingDate, bookingTimeRange, placeLine } from './bookingFormat';

const esc = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function ticketHtml(b: Booking, tk: BookingTicket, t: TFunction, locale: string): string {
  const holder = tk.holderName || t('bookings.holderFallback');
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(b.title)} · ${esc(tk.code)}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;background:#5B36F2;padding:28px;color:#14121F}
.card{max-width:420px;margin:0 auto;background:#fff;border-radius:28px;overflow:hidden}
.top{padding:24px 24px 18px}
.brand{font-size:13px;font-weight:800;color:#5B36F2;letter-spacing:.06em;text-transform:uppercase}
h1{font-size:26px;line-height:1.15;margin-top:6px}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:16px}
.l{font-size:12px;color:#6B6880}.v{font-size:16px;font-weight:800}
.cut{border-top:2px dashed #DAD6E8;margin:0 24px}
.bottom{padding:18px 24px 26px;text-align:center}
.who{font-size:12px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:#6B6880}
.name{font-size:18px;font-weight:800;margin-top:2px}
.qr{display:inline-block;margin-top:14px;padding:10px;border:1.5px solid #ECEAF3;border-radius:18px}
.code{font-family:ui-monospace,Menlo,monospace;font-size:20px;font-weight:700;letter-spacing:.14em;margin-top:10px}
.type{font-size:13px;color:#6B6880;margin-top:4px}
</style></head><body><div class="card">
<div class="top"><div class="brand">GoSwing</div><h1>${esc(b.title)}</h1>
<div class="grid">
<div><div class="l">${esc(t('bookings.date'))}</div><div class="v">${esc(bookingDate(b.startsAtIso, locale))}</div></div>
<div><div class="l">${esc(t('bookings.time'))}</div><div class="v">${esc(bookingTimeRange(b))}</div></div>
<div><div class="l">${esc(t('bookings.place'))}</div><div class="v">${esc(b.venueName ?? '—')}</div><div class="l">${esc(b.addressLine1 ?? b.venueCity ?? '')}</div></div>
<div><div class="l">${esc(t('bookings.places'))}</div><div class="v">${b.ticketsCount}</div><div class="l">${esc(t('bookings.booking', { ref: b.bookingRef }))}</div></div>
</div></div>
<div class="cut"></div>
<div class="bottom"><div class="who">${esc(t('bookings.ticketOf', { i: tk.no, n: b.tickets.length }))}</div><div class="name">${esc(holder)}</div>
<div class="qr">${qrSvgString(tk.qrValue, 220)}</div>
<div class="code">${esc(tk.code)}</div>${tk.typeName ? `<div class="type">${esc(tk.typeName)}</div>` : ''}
</div></div></body></html>`;
}

export async function downloadTicket(b: Booking, tk: BookingTicket, t: TFunction, locale: string): Promise<void> {
  try {
    const html = ticketHtml(b, tk, t, locale);
    if (Platform.OS === 'web') {
      await Print.printAsync({ html });
      return;
    }
    const { uri } = await Print.printToFileAsync({ html, base64: false });
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf', dialogTitle: `${b.title} · ${tk.code}` });
    } else {
      Alert.alert(t('bookings.download'), uri);
    }
  } catch (e: unknown) {
    Alert.alert(t('bookings.downloadFailed'), e instanceof Error ? e.message : String(e));
  }
}

export async function shareTicket(b: Booking, tk: BookingTicket, t: TFunction, locale: string): Promise<void> {
  const message = t('bookings.shareMessage', {
    title: b.title,
    when: `${bookingDate(b.startsAtIso, locale)} · ${bookingTimeRange(b)}`,
    place: [b.venueName, b.addressLine1 ?? b.venueCity].filter(Boolean).join(' · '),
    type: tk.typeName || '—',
    name: tk.holderName || t('bookings.holderFallback'),
    code: tk.code,
  });
  try {
    await Share.share({ message, title: b.title });
  } catch {
    // Cancelled or unsupported: nothing to do.
  }
}

async function writableCalendarId(): Promise<string | null> {
  const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
  const preferred = calendars.find((c) => c.allowsModifications && (c.isPrimary || c.source?.name === 'Default'));
  if (preferred) return preferred.id;
  const any = calendars.find((c) => c.allowsModifications);
  if (any) return any.id;
  if (Platform.OS === 'ios') {
    const source = calendars.find((c) => c.source?.type === Calendar.CalendarType.LOCAL)?.source;
    if (source) {
      return Calendar.createCalendarAsync({
        title: 'GoSwing Events',
        color: '#5B36F2',
        entityType: Calendar.EntityTypes.EVENT,
        sourceId: source.id,
        source,
        name: 'GoSwing Events',
        ownerAccount: 'personal',
        accessLevel: Calendar.CalendarAccessLevel.OWNER,
      });
    }
  }
  return null;
}

export async function addBookingToCalendar(b: Booking, t: TFunction): Promise<void> {
  try {
    const { status } = await Calendar.requestCalendarPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(t('bookings.addToCalendar'), t('bookings.calendarPermission'));
      return;
    }
    const calendarId = await writableCalendarId();
    if (!calendarId) {
      Alert.alert(t('bookings.addToCalendar'), t('bookings.calendarUnavailable'));
      return;
    }
    const start = b.startsAtIso ? new Date(b.startsAtIso) : null;
    if (!start || Number.isNaN(start.getTime())) return;
    const end = b.endsAtIso ? new Date(b.endsAtIso) : new Date(start.getTime() + 3 * 3600_000);
    await Calendar.createEventAsync(calendarId, {
      title: b.title,
      startDate: start,
      endDate: end,
      location: [b.venueName, b.addressLine1 ?? placeLine(b)].filter(Boolean).join(', '),
      notes: `${t('bookings.booking', { ref: b.bookingRef })}\n${t('bookings.ticketsCount', { count: b.ticketsCount })}`,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      alarms: [{ relativeOffset: -60 }, { relativeOffset: -1440 }],
    });
    Alert.alert(t('bookings.addToCalendar'), t('bookings.calendarAdded', { title: b.title }));
  } catch (e: unknown) {
    Alert.alert(t('gs.errorTitle'), e instanceof Error ? e.message : String(e));
  }
}
