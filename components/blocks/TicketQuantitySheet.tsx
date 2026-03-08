// src/components/blocks/TicketQuantitySheet.tsx
import React, { useEffect, useMemo, useRef, useState, type ReactElement } from 'react';
import { Animated, Easing, Modal, Pressable, ScrollView, Text, View, Dimensions } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export type TicketType = Readonly<{
  id: string;
  name: string;
  priceCents: number;
  currency: string; // "USD", "EUR", ...
  description?: string | null;
  benefits?: ReadonlyArray<string> | null;
  inventory?: number | null;
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

const cx = (...c: ReadonlyArray<string | null | undefined | false>) => c.filter(Boolean).join(' ');

function clampInt(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, Math.trunc(n)));
}

function formatMoney(priceCents: number, currency: string): string {
  const amount = priceCents / 100;

  // Prefer Intl when available (Hermes supports it on modern RN).
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    if (currency === 'USD') return `$${amount.toFixed(0)}`;
    if (currency === 'EUR') return `€${amount.toFixed(0)}`;
    return `${amount.toFixed(0)} ${currency}`;
  }
}

export default function TicketQuantitySheet({
  visible,
  onClose,
  ticketTypes,
  quantities,
  onChangeQuantities,
  onProceed,
  title = 'Book Your Tickets',
}: TicketQuantitySheetProps): ReactElement | null {
  const insets = useSafeAreaInsets();
  const bottomPad = Math.max(insets.bottom, 12);

  const anim = useRef(new Animated.Value(0)).current;
  const closingRef = useRef(false);

  const [mounted, setMounted] = useState(false);

  const currency = ticketTypes[0]?.currency ?? 'USD';

  const totalQty = useMemo(() => {
    let sum = 0;
    for (const t of ticketTypes) sum += clampInt(quantities[t.id] ?? 0, 0, 999);
    return sum;
  }, [ticketTypes, quantities]);

  const totalPriceCents = useMemo(() => {
    let sum = 0;
    for (const t of ticketTypes) {
      const q = clampInt(quantities[t.id] ?? 0, 0, 999);
      sum += q * (Number.isFinite(t.priceCents) ? t.priceCents : 0);
    }
    return sum;
  }, [ticketTypes, quantities]);

  const hasSelection = totalQty > 0;

  const runTo = (toValue: 0 | 1, cb?: () => void) => {
    Animated.timing(anim, {
      toValue,
      duration: toValue ? 260 : 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) cb?.();
    });
  };

  // Mount/unmount with animation
  useEffect(() => {
    if (visible) {
      setMounted(true);
      requestAnimationFrame(() => runTo(1));
      return;
    }

    if (mounted) {
      runTo(0, () => setMounted(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const close = () => {
    if (closingRef.current) return;
    closingRef.current = true;

    runTo(0, () => {
      closingRef.current = false;
      setMounted(false);
      onClose();
    });
  };

  const translateY = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [60, 0],
  });

  const backdropOpacity = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.45],
  });

  const bump = (id: string, delta: number, maxAllowed?: number) => {
    const cur = clampInt(quantities[id] ?? 0, 0, 999);
    const max = typeof maxAllowed === 'number' && Number.isFinite(maxAllowed) ? clampInt(maxAllowed, 0, 999) : 999;

    const nextVal = clampInt(cur + delta, 0, max);
    if (nextVal === cur) return;

    onChangeQuantities({ ...quantities, [id]: nextVal });
  };

  if (!mounted) return null;

  const { height: H } = Dimensions.get('window');
  const maxBodyHeight = Math.round(H * 0.55);

  return (
    <Modal visible transparent animationType="none" onRequestClose={close}>
      {/* Backdrop */}
      <Animated.View style={{ flex: 1, opacity: backdropOpacity, backgroundColor: '#000' }}>
        <Pressable style={{ flex: 1 }} onPress={close} accessibilityRole="button" />
      </Animated.View>

      {/* Sheet */}
      <Animated.View
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          transform: [{ translateY }],
          backgroundColor: '#fff',
          borderTopLeftRadius: 22,
          borderTopRightRadius: 22,
          paddingBottom: bottomPad,
          shadowColor: '#000',
          shadowOpacity: 0.15,
          shadowRadius: 18,
          shadowOffset: { width: 0, height: -6 },
          elevation: 12,
          overflow: 'hidden',
        }}
      >
        {/* Handle */}
        <View style={{ alignItems: 'center', paddingTop: 10 }}>
          <View style={{ width: 44, height: 5, borderRadius: 999, backgroundColor: '#E5E7EB' }} />
        </View>

        {/* Header */}
        <View className="px-5 pt-4 pb-3">
          <View className="flex-row items-center justify-between">
            <Text className="text-xl font-semibold text-black">{title}</Text>
            <Pressable
              onPress={close}
              accessibilityRole="button"
              accessibilityLabel="Close ticket selector"
              hitSlop={10}
              className="h-9 w-9 items-center justify-center"
            >
              <Feather name="x" size={18} color="#111827" />
            </Pressable>
          </View>
        </View>

        {/* Ticket rows */}
        <View className="px-5 pb-4">
          {ticketTypes.length === 0 ? (
            <View className="rounded-2xl border border-gray200 bg-white px-4 py-4">
              <Text className="text-base font-medium text-black">No tickets available</Text>
              <Text className="text-sm text-gray500 mt-1">Please check back later.</Text>
            </View>
          ) : (
            <ScrollView
              style={{ maxHeight: maxBodyHeight }}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 2 }}
            >
              <View className="gap-y-4">
                {ticketTypes.map((t) => {
                  const qty = clampInt(quantities[t.id] ?? 0, 0, 999);
                  const minusDisabled = qty <= 0;

                  const maxAllowed =
                    typeof t.inventory === 'number' && Number.isFinite(t.inventory) ? clampInt(t.inventory, 0, 999) : undefined;

                  const plusDisabled = typeof maxAllowed === 'number' ? qty >= maxAllowed : false;

                  return (
                    <View
                      key={t.id}
                      className="rounded-2xl border border-gray200 bg-white px-4 py-4 flex-row items-center justify-between"
                    >
                      <View className="flex-1 pr-4">
                        <Text className="text-base font-medium text-black">{t.name}</Text>
                        <Text className="text-sm text-gray500 mt-1">{formatMoney(t.priceCents, t.currency)}</Text>

                        {typeof maxAllowed === 'number' ? (
                          <Text className="text-xs text-gray400 mt-1">{maxAllowed} available</Text>
                        ) : null}
                      </View>

                      <View className="flex-row items-center gap-x-3">
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={`Decrease ${t.name}`}
                          onPress={() => bump(t.id, -1, maxAllowed)}
                          disabled={minusDisabled}
                          className={cx(
                            'h-12 w-12 rounded-xl border border-gray200 items-center justify-center',
                            minusDisabled ? 'opacity-40' : 'opacity-100'
                          )}
                          hitSlop={6}
                        >
                          <Feather name="minus" size={18} color="#111827" />
                        </Pressable>

                        <Text className="text-base text-black w-6 text-center">{qty}</Text>

                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={`Increase ${t.name}`}
                          onPress={() => bump(t.id, +1, maxAllowed)}
                          disabled={plusDisabled}
                          className={cx(
                            'h-12 w-12 rounded-xl border border-gray200 items-center justify-center',
                            plusDisabled ? 'opacity-40' : 'opacity-100'
                          )}
                          hitSlop={6}
                        >
                          <Feather name="plus" size={18} color="#111827" />
                        </Pressable>
                      </View>
                    </View>
                  );
                })}
              </View>
            </ScrollView>
          )}

          {/* State B: only show when user selected at least 1 */}
          {hasSelection ? (
            <>
              <View className="mt-5 h-px bg-gray200" />

              <View className="mt-4 flex-row items-center justify-between">
                <Text className="text-lg text-black">
                  Total:{' '}
                  <Text className="font-medium">
                    {totalQty} ticket{totalQty === 1 ? '' : 's'}
                  </Text>
                </Text>
                <Text className="text-lg font-semibold text-black">{formatMoney(totalPriceCents, currency)}</Text>
              </View>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Proceed to checkout"
                onPress={onProceed}
                className="mt-4 rounded-2xl bg-black py-4 items-center justify-center"
                style={{
                  shadowColor: '#000',
                  shadowOpacity: 0.22,
                  shadowRadius: 14,
                  shadowOffset: { width: 0, height: 6 },
                  elevation: 10,
                }}
              >
                <Text className="text-white text-base font-semibold">Proceed to Checkout</Text>
              </Pressable>
            </>
          ) : null}
        </View>
      </Animated.View>
    </Modal>
  );
}
