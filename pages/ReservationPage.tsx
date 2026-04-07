// pages/ReservationsPage.tsx
import React, { useCallback, useEffect, useMemo, useState, type ReactElement } from 'react';
import { Alert, ScrollView, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { useTranslation } from 'react-i18next';

import SegmentedTabs, { type SegKey } from '@/components/reservations/SegmentedTabs';
import ReservationCard, { type Reservation } from '@/components/reservations/ReservationCard';
import QuickActions from '@/components/reservations/QuickActions';

import { getMyReservations } from '@/lib/supabase/myReservations';

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ');

type ReservationPdfLabels = Readonly<{
  date: string;
  time: string;
  venue: string;
  total: string;
  tickets: string;
  reservationId: string;
  title: string;
  subtitle: string;
}>;

function generateAllReservationsHtml(
  reservations: ReadonlyArray<Reservation>,
  labels: ReservationPdfLabels,
): string {
  const cards = reservations
    .map((r, i) => {
      const ticketRows = r.groups
        .flatMap((g) =>
          g.tickets.map(
            (t) => `
              <div class="ticket-row">
                <span class="ticket-holder">${t.holder}</span>
                <span class="ticket-type">${g.title}</span>
                <span class="ticket-label">${t.qrLabel}</span>
              </div>`,
          ),
        )
        .join('');

      return `
        <div class="reservation" ${i > 0 ? 'style="page-break-before: always;"' : ''}>
          <div class="res-header">
            <h2>${r.title}</h2>
            <span class="badge">${r.ticketsBadge}</span>
          </div>

          <div class="res-body">
            <div class="info-grid">
              <div class="info-item">
                <span class="info-label">${labels.date}</span>
                <span class="info-value">${r.dateLabel}</span>
              </div>
              <div class="info-item">
                <span class="info-label">${labels.time}</span>
                <span class="info-value">${r.timeLabel}</span>
              </div>
              <div class="info-item">
                <span class="info-label">${labels.venue}</span>
                <span class="info-value">${r.venueLabel}</span>
              </div>
              <div class="info-item">
                <span class="info-label">${labels.total}</span>
                <span class="info-value total">${r.totalAmount}</span>
              </div>
            </div>

            ${ticketRows ? `
            <div class="tickets-section">
              <h3>${labels.tickets}</h3>
              ${ticketRows}
            </div>` : ''}

            ${r.savedBadge ? `<div class="saved-badge">${r.savedBadge}</div>` : ''}
          </div>

          <div class="res-footer">${labels.reservationId}: ${r.id}</div>
        </div>`;
    })
    .join('\n');

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${labels.title} - GoSwing</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background: #f5f5f5;
      padding: 20px;
      color: #111827;
    }
    .doc-header {
      text-align: center;
      margin-bottom: 28px;
      padding-bottom: 16px;
      border-bottom: 2px solid #e5e7eb;
    }
    .doc-header h1 { font-size: 22px; font-weight: 700; }
    .doc-header p { font-size: 13px; color: #6b7280; margin-top: 4px; }
    .reservation {
      background: white;
      border-radius: 16px;
      margin-bottom: 24px;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0,0,0,0.08);
    }
    .res-header {
      background: linear-gradient(135deg, #111827 0%, #374151 100%);
      color: white;
      padding: 20px 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .res-header h2 { font-size: 17px; font-weight: 600; }
    .badge {
      background: rgba(255,255,255,0.2);
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 500;
    }
    .res-body { padding: 20px 24px; }
    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 14px;
      margin-bottom: 18px;
    }
    .info-item {}
    .info-label {
      display: block;
      font-size: 11px;
      color: #6b7280;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 2px;
    }
    .info-value {
      font-size: 14px;
      font-weight: 500;
      color: #111827;
    }
    .info-value.total { color: #059669; font-weight: 700; }
    .tickets-section {
      border-top: 1px dashed #e5e7eb;
      padding-top: 14px;
    }
    .tickets-section h3 {
      font-size: 12px;
      color: #6b7280;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 10px;
    }
    .ticket-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 12px;
      background: #f9fafb;
      border-radius: 8px;
      margin-bottom: 6px;
      font-size: 13px;
    }
    .ticket-holder { font-weight: 500; flex: 1; }
    .ticket-type { color: #6b7280; margin: 0 12px; }
    .ticket-label { color: #9ca3af; font-size: 12px; }
    .saved-badge {
      display: inline-block;
      margin-top: 12px;
      background: #ecfdf5;
      color: #059669;
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
    }
    .res-footer {
      text-align: center;
      padding: 12px 24px;
      background: #f9fafb;
      font-size: 11px;
      color: #9ca3af;
    }
    @media print {
      body { background: white; padding: 0; }
      .reservation { box-shadow: none; }
    }
  </style>
</head>
<body>
  <div class="doc-header">
    <h1>GoSwing</h1>
    <p>${labels.subtitle}</p>
  </div>
  ${cards}
</body>
</html>`;
}

export type ReservationsPageProps = Readonly<{
  /**
   * Initial tab to show ('active' or 'past')
   */
  initialTab?: SegKey;
  /**
   * Lifted routing hook (same pattern you used elsewhere).
   */
  route?: (r: { name: 'reservationDetails'; reservationId: string }) => void;
}>;

export default function ReservationsPage({ initialTab = 'active', route }: ReservationsPageProps): ReactElement {
  const { t } = useTranslation();
  const [tab, setTab] = useState<SegKey>(initialTab);
  const insets = useSafeAreaInsets();
  const bottomPad = (insets.bottom || 0) + 96;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [active, setActive] = useState<ReadonlyArray<Reservation>>([]);
  const [past, setPast] = useState<ReadonlyArray<Reservation>>([]);

  // Update tab when initialTab prop changes
  useEffect(() => {
    setTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await getMyReservations();

        const mapToCard = (r: any): Reservation => ({
          id: String(r.id),
          title: String(r.title ?? ''),
          ticketsBadge: String(r.ticketsBadge ?? ''),
          dateLabel: String(r.dateLabel ?? ''),
          timeLabel: String(r.timeLabel ?? ''),
          venueLabel: String(r.venueLabel ?? ''),
          totalAmount: String(r.totalAmount ?? ''),
          groups: Array.isArray(r.groups) ? r.groups : [],
          savedBadge: r.savedBadge ?? null,
        });

        if (!cancelled) {
          setActive((res.active ?? []).map(mapToCard));
          setPast((res.past ?? []).map(mapToCard));
        }
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        if (!cancelled) setError(msg);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const list = useMemo(() => (tab === 'active' ? active : past), [tab, active, past]);

  const openReservationDetails = (reservationId: string): void => {
    if (typeof route === 'function') {
      route({ name: 'reservationDetails', reservationId: String(reservationId) });
      return;
    }

    console.warn(
      '[ReservationsPage] No route() prop provided; cannot navigate to reservationDetails.',
    );
  };

  const handleDownloadAll = useCallback(async () => {
    if (list.length === 0) {
      Alert.alert(t('reservations.noReservationsTitle'), t('reservations.noReservationsMessage'));
      return;
    }

    try {
      const html = generateAllReservationsHtml(list, {
        date: t('reservations.pdf.date'),
        time: t('reservations.pdf.time'),
        venue: t('reservations.pdf.venue'),
        total: t('reservations.pdf.total'),
        tickets: t('reservations.pdf.tickets'),
        reservationId: t('reservations.pdf.reservationId'),
        title: t('reservations.pageTitle'),
        subtitle: t('reservations.pdf.subtitle', { count: list.length }),
      });
      const { uri } = await Print.printToFileAsync({ html, base64: false });

      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: `${t('reservations.pageTitle')} - GoSwing`,
          UTI: 'com.adobe.pdf',
        });
      } else {
        Alert.alert(t('reservations.pdfGenerated'), t('reservations.savedToPath', { uri }));
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      Alert.alert(t('common.error'), msg);
    }
  }, [list, t]);

  return (
    <SafeAreaView edges={['top', 'left', 'right']} className="flex-1 bg-white">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerClassName="pb-24"
        contentContainerStyle={{ paddingBottom: bottomPad }}
      >
        <View className="px-5 pt-2">
          <Text className="text-3xl font-semibold text-black">{t('reservations.pageTitle')}</Text>
          <Text className="text-base text-gray600 mt-1">
            {t('reservations.pageSubtitle')}
          </Text>
        </View>

        <View className="px-5 mt-4">
          <SegmentedTabs
            active={tab}
            onChange={setTab}
            counts={{ active: active.length, past: past.length }}
          />
        </View>

        {loading ? (
          <View className="px-5 mt-6">
            <Text className="text-base text-gray700">{t('reservations.loading')}</Text>
          </View>
        ) : error ? (
          <View className="px-5 mt-6">
            <Text className="text-base font-semibold text-black">{t('reservations.couldNotLoad')}</Text>
            <Text className="text-base text-gray600 mt-2">{error}</Text>
          </View>
        ) : (
          <>
            <View className="mt-4 px-4 gap-y-5">
              {list.length === 0 ? (
                <View className="px-1">
                  <Text className="text-base text-gray700">
                    {tab === 'active'
                      ? t('reservations.noActive')
                      : t('reservations.noPast')}
                  </Text>
                </View>
              ) : (
                list.map((r) => (
                  <ReservationCard
                    key={r.id}
                    reservation={r}
                    onPressReservation={openReservationDetails}
                  />
                ))
              )}
            </View>

            <View className={cx('mt-5', 'px-4')}>
              <QuickActions subtleBackground={tab === 'past'} onDownloadAll={handleDownloadAll} />
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
