// components/blocks/TicketQuantitySheet.tsx — ticket offer picker opened from the
// event page ("Book"). Pick a quantity per offer, then continue to checkout.
// Exported types are shared with the shell routes and the event page.
import React, { useMemo, type ReactElement } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Minus, Plus } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { GsButton, GsSheet } from '@/components/gs';
import { gs } from '@/theme/colors';
import { formatCents } from '@/lib/format';

export type TicketType = Readonly<{
  id: string;
  name: string;
  priceCents: number;
  currency: string; // "EUR", "USD", ...
  description?: string | null;
  benefits?: ReadonlyArray<string> | null;
  inventory?: number | null;
  /** Phase 4 (spec § C.3): discounted price actually charged. */
  salePriceCents?: number | null;
  /** Phase 4: price of the same entry at the door without GoSwing. */
  doorPriceCents?: number | null;
  /** Seats left, accounting for holds. */
  seatsAvailable?: number | null;
}>;

export type TicketQuantities = Record<string, number>;

export type TicketQuantitySheetProps = Readonly<{
  visible: boolean;
  onClose: () => void;
  ticketTypes: ReadonlyArray<TicketType>;
  quantities: TicketQuantities;
  onChangeQuantities: (next: TicketQuantities) => void;
  onProceed: () => void;
  title?: string;
}>;

/** Max tickets in one booking (spec default `maxTicketsPerOrder`). */
export const MAX_TICKETS_PER_ORDER = 10;

const clamp = (n: number, min: number, max: number): number => (Number.isFinite(n) ? Math.max(min, Math.min(max, Math.trunc(n))) : min);

/** Price charged for one ticket: the sale price when there is one. */
export function effectivePriceCents(tt: Pick<TicketType, 'priceCents' | 'salePriceCents'>): number {
  return typeof tt.salePriceCents === 'number' && tt.salePriceCents < tt.priceCents ? tt.salePriceCents : tt.priceCents;
}

function seatsLeft(tt: TicketType): number | null {
  const n = typeof tt.seatsAvailable === 'number' ? tt.seatsAvailable : typeof tt.inventory === 'number' ? tt.inventory : null;
  return n == null || !Number.isFinite(n) ? null : Math.max(0, Math.trunc(n));
}

export default function TicketQuantitySheet({
  visible,
  onClose,
  ticketTypes,
  quantities,
  onChangeQuantities,
  onProceed,
  title,
}: TicketQuantitySheetProps): ReactElement {
  const { t, i18n } = useTranslation();
  const locale = i18n.language;
  const currency = ticketTypes[0]?.currency ?? 'EUR';

  const totalQty = useMemo(() => ticketTypes.reduce((a, tt) => a + clamp(quantities[tt.id] ?? 0, 0, 999), 0), [ticketTypes, quantities]);
  const totalCents = useMemo(
    () => ticketTypes.reduce((a, tt) => a + clamp(quantities[tt.id] ?? 0, 0, 999) * effectivePriceCents(tt), 0),
    [ticketTypes, quantities],
  );

  const bump = (tt: TicketType, delta: number): void => {
    const cur = clamp(quantities[tt.id] ?? 0, 0, 999);
    const left = seatsLeft(tt);
    const roomInOrder = MAX_TICKETS_PER_ORDER - (totalQty - cur);
    const max = Math.min(left ?? 999, roomInOrder);
    const next = clamp(cur + delta, 0, Math.max(0, max));
    if (next !== cur) onChangeQuantities({ ...quantities, [tt.id]: next });
  };

  const footer =
    totalQty > 0 ? (
      <View>
        <View className="flex-row items-center justify-between mb-3">
          <Text className="text-[16px] font-bold text-subtle">{t('bookings.pick.total', { count: totalQty })}</Text>
          <Text className="text-[20px] font-extrabold text-ink">{formatCents(totalCents, currency, locale)}</Text>
        </View>
        <GsButton label={t('bookings.pick.continue', { price: formatCents(totalCents, currency, locale) })} onPress={onProceed} size="lg" fullWidth />
      </View>
    ) : undefined;

  return (
    <GsSheet visible={visible} onClose={onClose} title={title ?? t('bookings.pick.title')} footer={footer} maxHeight={0.85}>
      <View className="px-5" style={{ gap: 12 }}>
        {ticketTypes.length === 0 ? (
          <View className="rounded-[20px] p-4" style={{ backgroundColor: gs.surface }}>
            <Text className="text-[16px] font-extrabold text-ink">{t('bookings.pick.none')}</Text>
            <Text className="text-[14px] text-muted mt-1">{t('bookings.pick.checkBack')}</Text>
          </View>
        ) : (
          ticketTypes.map((tt) => {
            const qty = clamp(quantities[tt.id] ?? 0, 0, 999);
            const left = seatsLeft(tt);
            const price = effectivePriceCents(tt);
            const discounted = price < tt.priceCents;
            const canAdd = (left == null || qty < left) && totalQty < MAX_TICKETS_PER_ORDER;
            const sub = tt.description?.trim() || (tt.benefits ?? []).filter(Boolean).join(' · ');
            return (
              <View key={tt.id} className="flex-row items-center rounded-[22px] bg-white p-4" style={{ borderWidth: 1.5, borderColor: qty > 0 ? gs.violet : gs.line, gap: 10 }}>
                <View className="flex-1">
                  <Text className="text-[16px] font-extrabold text-ink">{tt.name}</Text>
                  {sub ? (
                    <Text className="text-[13px] text-muted mt-0.5" numberOfLines={2}>
                      {sub}
                    </Text>
                  ) : null}
                  <View className="flex-row items-baseline mt-1" style={{ gap: 6 }}>
                    <Text className="text-[17px] font-extrabold" style={{ color: discounted ? gs.violetDark : gs.ink }}>
                      {price === 0 ? t('gs.free') : formatCents(price, tt.currency, locale)}
                    </Text>
                    {discounted ? (
                      <Text className="text-[14px] text-faint" style={{ textDecorationLine: 'line-through' }}>
                        {formatCents(tt.priceCents, tt.currency, locale)}
                      </Text>
                    ) : null}
                  </View>
                  {left != null && left <= 20 ? (
                    <Text className="text-[12px] font-bold mt-1" style={{ color: gs.pinkDark }}>
                      {t('bookings.pick.left', { count: left })}
                    </Text>
                  ) : null}
                </View>
                <Stepper
                  value={qty}
                  onMinus={() => bump(tt, -1)}
                  onPlus={() => bump(tt, 1)}
                  minusDisabled={qty <= 0}
                  plusDisabled={!canAdd}
                  minusLabel={t('bookings.co.remove', { name: tt.name })}
                  plusLabel={t('bookings.co.add', { name: tt.name })}
                  size={40}
                />
              </View>
            );
          })
        )}
      </View>
    </GsSheet>
  );
}

/** Round −/+ stepper (also used by checkout). */
export function Stepper({
  value,
  onMinus,
  onPlus,
  minusDisabled,
  plusDisabled,
  minusLabel,
  plusLabel,
  size = 48,
}: Readonly<{
  value: number;
  onMinus: () => void;
  onPlus: () => void;
  minusDisabled: boolean;
  plusDisabled: boolean;
  minusLabel: string;
  plusLabel: string;
  size?: number;
}>): ReactElement {
  const box = { width: size, height: size, borderRadius: size / 2 };
  return (
    <View className="flex-row items-center" style={{ gap: 8 }}>
      <Pressable
        onPress={onMinus}
        disabled={minusDisabled}
        accessibilityRole="button"
        accessibilityLabel={minusLabel}
        accessibilityState={{ disabled: minusDisabled }}
        hitSlop={4}
        className="items-center justify-center"
        style={[box, { backgroundColor: gs.surface2, opacity: minusDisabled ? 0.55 : 1 }]}
      >
        <Minus size={18} color={minusDisabled ? gs.faint : gs.ink} strokeWidth={2.8} />
      </Pressable>
      <Text accessibilityLiveRegion="polite" className="text-center font-extrabold text-ink" style={{ minWidth: 28, fontSize: size >= 48 ? 26 : 20 }}>
        {value}
      </Text>
      <Pressable
        onPress={onPlus}
        disabled={plusDisabled}
        accessibilityRole="button"
        accessibilityLabel={plusLabel}
        accessibilityState={{ disabled: plusDisabled }}
        hitSlop={4}
        className="items-center justify-center"
        style={[
          box,
          { backgroundColor: plusDisabled ? gs.surface2 : gs.violet },
          plusDisabled ? null : { shadowColor: gs.violet, shadowOpacity: 0.3, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 4 },
        ]}
      >
        <Plus size={18} color={plusDisabled ? gs.faint : gs.white} strokeWidth={2.8} />
      </Pressable>
    </View>
  );
}
