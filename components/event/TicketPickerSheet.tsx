// components/event/TicketPickerSheet.tsx — ticket selection opened by "Book"
// on the event page. It only picks quantities; the page then hands the
// selection to the shell's onBook(...) which opens checkout.
import React, { type ReactElement } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Minus, Plus } from 'lucide-react-native';
import { GsButton, GsSheet } from '@/components/gs';
import { gs } from '@/theme/colors';
import { formatCents } from '@/lib/format';
import { effectivePriceCents, type TicketOffer } from '@/lib/api/discover';

export type Quantities = Record<string, number>;

const MAX_PER_TYPE = 10;

export const maxFor = (o: TicketOffer): number => Math.max(0, Math.min(MAX_PER_TYPE, o.seatsAvailable ?? MAX_PER_TYPE));

export default function TicketPickerSheet({
  visible,
  offers,
  loading,
  error,
  quantities,
  onChange,
  onClose,
  onProceed,
  proceeding,
}: Readonly<{
  visible: boolean;
  offers: ReadonlyArray<TicketOffer>;
  loading: boolean;
  error: string | null;
  quantities: Quantities;
  onChange: (q: Quantities) => void;
  onClose: () => void;
  onProceed: () => void;
  proceeding: boolean;
}>): ReactElement {
  const { t } = useTranslation();
  const total = offers.reduce((sum, o) => sum + (quantities[o.id] ?? 0) * effectivePriceCents(o), 0);
  const count = offers.reduce((sum, o) => sum + (quantities[o.id] ?? 0), 0);
  const currency = offers[0]?.currency ?? 'EUR';

  const bump = (o: TicketOffer, d: number): void => {
    const cur = quantities[o.id] ?? 0;
    const next = Math.max(0, Math.min(maxFor(o), cur + d));
    if (next !== cur) onChange({ ...quantities, [o.id]: next });
  };

  return (
    <GsSheet
      visible={visible}
      onClose={onClose}
      title={t('discover.event.chooseTickets')}
      footer={
        offers.length > 0 ? (
          <View className="flex-row items-center">
            <View className="mr-4">
              <Text className="text-[13px] font-semibold text-muted">{t('tickets.ticketCount', { count })}</Text>
              <Text className="text-[22px] font-extrabold text-ink">{total === 0 && count > 0 ? t('gs.free') : formatCents(total, currency)}</Text>
            </View>
            <View className="flex-1">
              <GsButton label={t('discover.event.continue')} size="lg" fullWidth disabled={count === 0} loading={proceeding} onPress={onProceed} />
            </View>
          </View>
        ) : undefined
      }
    >
      <View className="px-5">
        {loading ? (
          <View className="items-center py-10">
            <ActivityIndicator color={gs.violet} />
          </View>
        ) : error ? (
          <Text className="py-6 text-[15px]" style={{ color: gs.danger }}>
            {t('eventDetails.ticketTypesError', { error })}
          </Text>
        ) : offers.length === 0 ? (
          <Text className="py-6 text-center text-[15px] text-muted">{t('tickets.noneAvailable')}</Text>
        ) : (
          <View className="gap-y-3">
            {offers.map((o) => {
              const q = quantities[o.id] ?? 0;
              const max = maxFor(o);
              const price = effectivePriceCents(o);
              return (
                <View
                  key={o.id}
                  className="flex-row items-center rounded-[20px] p-4"
                  style={{ borderWidth: 1.5, borderColor: q > 0 ? gs.violet : gs.line, backgroundColor: q > 0 ? gs.violetSoft : gs.white, opacity: max === 0 ? 0.5 : 1 }}
                >
                  <View className="flex-1 pr-3">
                    <Text className="text-[16px] font-extrabold text-ink">{o.name}</Text>
                    <View className="mt-0.5 flex-row items-center">
                      <Text className="text-[15px] font-bold text-ink">{price === 0 ? t('gs.free') : formatCents(price, o.currency)}</Text>
                      {o.salePriceCents != null ? (
                        <Text className="ml-2 text-[13px] text-muted line-through">{formatCents(o.priceCents, o.currency)}</Text>
                      ) : null}
                    </View>
                    {o.seatsAvailable != null && o.seatsAvailable <= 20 ? (
                      <Text className="mt-0.5 text-[12px] font-bold" style={{ color: gs.pinkDark }}>
                        {o.seatsAvailable === 0 ? t('discover.event.soldOut') : t('discover.event.onlyLeft', { count: o.seatsAvailable })}
                      </Text>
                    ) : null}
                  </View>
                  <Pressable
                    onPress={() => bump(o, -1)}
                    disabled={q === 0}
                    accessibilityRole="button"
                    accessibilityLabel={t('tickets.decrease', { name: o.name })}
                    className="h-11 w-11 items-center justify-center rounded-full"
                    style={{ backgroundColor: q === 0 ? gs.surface2 : gs.white, opacity: q === 0 ? 0.6 : 1 }}
                  >
                    <Minus size={18} color={gs.ink} />
                  </Pressable>
                  <Text className="w-9 text-center text-[20px] font-extrabold text-ink">{q}</Text>
                  <Pressable
                    onPress={() => bump(o, 1)}
                    disabled={q >= max}
                    accessibilityRole="button"
                    accessibilityLabel={t('tickets.increase', { name: o.name })}
                    className="h-11 w-11 items-center justify-center rounded-full"
                    style={{ backgroundColor: q >= max ? gs.surface2 : gs.violet }}
                  >
                    <Plus size={18} color={q >= max ? gs.muted : gs.white} />
                  </Pressable>
                </View>
              );
            })}
          </View>
        )}
      </View>
    </GsSheet>
  );
}
