import React, { useEffect, useRef, useState, type ReactElement } from 'react';
import {
  Animated,
  Modal,
  Pressable,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

export type BookTicketsSheetProps = Readonly<{
  visible: boolean;
  onClose: () => void;
  onProceed?: (payload: { qty: number; price: number }) => void;
  title?: string;
  price?: number;
}>;

export default function BookTicketsSheet({
  visible,
  onClose,
  onProceed,
  title = 'Free Entry',
  price = 0,
}: BookTicketsSheetProps): ReactElement {
  const insets = useSafeAreaInsets();
  const [qty, setQty] = useState<number>(0);
  const canCheckout = qty > 0;

  const translateY = useRef(new Animated.Value(300)).current;
  useEffect(() => {
    if (visible) {
      Animated.spring(translateY, { toValue: 0, useNativeDriver: true, bounciness: 6, speed: 12 }).start();
    } else {
      Animated.spring(translateY, { toValue: 300, useNativeDriver: true, bounciness: 0, speed: 20 }).start();
    }
  }, [visible]);

  const total = qty * price;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable className="flex-1 bg-black/40" onPress={onClose} />

      <Animated.View
        className="absolute left-0 right-0 rounded-t-3xl bg-white"
        style={{
          bottom: 0,
          paddingBottom: insets.bottom || 0,
          transform: [{ translateY }],
          shadowColor: '#000',
          shadowOpacity: 0.15,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: -6 },
          elevation: 10,
        }}
      >
        <View className="px-5 pt-5 pb-3">
          <View className="flex-row items-center justify-between">
            <Text className="text-xl font-semibold text-black">Book Your Tickets</Text>
            <Pressable
              accessibilityRole="button"
              onPress={onClose}
              className="h-8 w-8 rounded-full items-center justify-center active:opacity-80"
            >
              <Feather name="x" size={18} color="#111827" />
            </Pressable>
          </View>
        </View>

        <View className="px-5">
          <View className="rounded-3xl border border-gray200 bg-white px-4 py-4">
            <View className="flex-row items-center justify-between">
              <View>
                <Text className="text-lg font-medium text-black">{title}</Text>
                <Text className="text-gray500 mt-1">${price}</Text>
              </View>

              <View className="flex-row items-center gap-x-3">
                <StepBtn
                  label="-"
                  disabled={qty === 0}
                  onPress={() => setQty((n) => Math.max(0, n - 1))}
                />
                <Text className="text-lg text-gray900 w-6 text-center">{qty}</Text>
                <StepBtn label="+" onPress={() => setQty((n) => n + 1)} />
              </View>
            </View>
          </View>
        </View>

        {canCheckout ? (
          <>
            <View className="h-px bg-gray200 my-4 mx-5" />
            <View className="px-5 pb-4 flex-row items-center justify-between">
              <Text className="text-lg text-gray900">
                Total: {qty} {qty === 1 ? 'ticket' : 'tickets'}
              </Text>
              <Text className="text-lg text-gray900">${total}</Text>
            </View>

            <View className="px-5 pb-5">
              <Pressable
                onPress={() => onProceed?.({ qty, price })}
                className="rounded-2xl bg-black px-6 py-4 items-center justify-center active:opacity-90"
              >
                <Text className="text-white text-base font-semibold">Proceed to Checkout</Text>
              </Pressable>
            </View>
          </>
        ) : null}
      </Animated.View>
    </Modal>
  );
}

function StepBtn({
  label,
  onPress,
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}): ReactElement {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      className={`h-10 w-10 rounded-2xl items-center justify-center ${
        disabled ? 'bg-gray100 border border-gray200' : 'bg-white border border-gray300 active:opacity-85'
      }`}
    >
      <Text className="text-lg text-gray800">{label}</Text>
    </Pressable>
  );
}
