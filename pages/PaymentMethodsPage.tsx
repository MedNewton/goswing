// pages/PaymentMethodsPage.tsx
import React, { useState, type ReactElement } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

import { usePaymentMethods, useSettings } from '@/hooks/profile';
import type { PaymentMethod, CardBrand, ID } from '@/types/domain';

const cx = (...c: ReadonlyArray<string | null | undefined | false>) =>
  c.filter(Boolean).join(' ');

type PaymentMethodsPageProps = Readonly<{
  onBack: () => void;
}>;

function getCardIcon(brand: CardBrand): keyof typeof Feather.glyphMap {
  // In a real app, you'd use specific card brand icons
  return 'credit-card';
}

function formatCardBrand(brand: CardBrand): string {
  const brands: Record<CardBrand, string> = {
    visa: 'Visa',
    mastercard: 'Mastercard',
    amex: 'American Express',
    discover: 'Discover',
    other: 'Card',
  };
  return brands[brand] ?? 'Card';
}

export default function PaymentMethodsPage({ onBack }: PaymentMethodsPageProps): ReactElement {
  const insets = useSafeAreaInsets();

  const {
    paymentMethods,
    isLoading: methodsLoading,
    removePaymentMethod,
    setDefaultPaymentMethod,
  } = usePaymentMethods();

  const { settings, updateSettings, isLoading: settingsLoading } = useSettings();

  const [removingId, setRemovingId] = useState<string | null>(null);
  const [settingDefaultId, setSettingDefaultId] = useState<string | null>(null);

  const isLoading = methodsLoading || settingsLoading;

  const handleAddPaymentMethod = (): void => {
    // In a real app, this would open a Stripe payment sheet
    Alert.alert('Add Payment Method', 'This would open the Stripe payment sheet to add a new card.');
  };

  const handleRemovePaymentMethod = (pm: PaymentMethod): void => {
    Alert.alert(
      'Remove Payment Method',
      `Are you sure you want to remove ${formatCardBrand(pm.cardBrand)} ending in ${pm.cardLastFour}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              setRemovingId(pm.id);
              await removePaymentMethod(pm.id);
            } catch (err: any) {
              Alert.alert('Error', err?.message ?? 'Could not remove payment method.');
            } finally {
              setRemovingId(null);
            }
          },
        },
      ]
    );
  };

  const handleSetDefault = async (pm: PaymentMethod): Promise<void> => {
    if (pm.isDefault) return;

    try {
      setSettingDefaultId(pm.id);
      await setDefaultPaymentMethod(pm.id);
    } catch (err: any) {
      Alert.alert('Error', err?.message ?? 'Could not set default payment method.');
    } finally {
      setSettingDefaultId(null);
    }
  };

  const handleToggleSetting = async (
    key: 'savePaymentInfo' | 'autoReloadWallet' | 'emailReceipts',
    value: boolean
  ): Promise<void> => {
    try {
      await updateSettings({ [key]: value });
    } catch (err: any) {
      Alert.alert('Error', err?.message ?? 'Could not update setting.');
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView edges={['top', 'left', 'right']} className="flex-1 bg-white items-center justify-center">
        <ActivityIndicator size="large" color="#6B7280" />
        <Text className="text-gray600 mt-3">Loading payment methods…</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['left', 'right']} className="flex-1 bg-white">
      {/* Header */}
      <View className="flex-row items-center px-5 py-4 border-b border-gray200">
        <Pressable onPress={onBack} className="mr-4 active:opacity-70">
          <Feather name="arrow-left" size={24} color="#111827" />
        </Pressable>
        <Text className="text-lg font-semibold text-black">Payment Methods</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 16) + 40 }}
      >
        {/* Add Payment Method Button */}
        <Pressable
          className="mx-5 mt-5 bg-gray900 rounded-2xl py-4 flex-row items-center justify-center active:opacity-90"
          onPress={handleAddPaymentMethod}
        >
          <Feather name="plus" size={20} color="#FFFFFF" />
          <Text className="text-white font-medium ml-2">Add Payment Method</Text>
        </Pressable>

        {/* Your Payment Methods */}
        <View className="mx-5 mt-5">
          <Text className="text-base font-semibold text-black mb-3">Your Payment Methods</Text>

          {paymentMethods.length === 0 ? (
            <View className="rounded-2xl border border-gray200 bg-white p-5 items-center">
              <Feather name="credit-card" size={32} color="#9CA3AF" />
              <Text className="text-gray600 mt-3">No payment methods added yet</Text>
            </View>
          ) : (
            <View className="gap-y-3">
              {paymentMethods.map((pm) => (
                <View
                  key={pm.id}
                  className="rounded-2xl border border-gray200 bg-white p-4"
                >
                  <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center gap-x-3">
                      <Feather name={getCardIcon(pm.cardBrand)} size={24} color="#111827" />
                      <View>
                        <View className="flex-row items-center gap-x-2">
                          <Text className="text-gray900 font-medium">
                            {formatCardBrand(pm.cardBrand)} •••• {pm.cardLastFour}
                          </Text>
                          {pm.isDefault && (
                            <View className="bg-gray900 px-2 py-0.5 rounded">
                              <Text className="text-white text-xs">Default</Text>
                            </View>
                          )}
                        </View>
                        <Text className="text-xs text-gray500 mt-0.5">
                          {pm.cardholderName} • Expires {String(pm.cardExpMonth).padStart(2, '0')}/{String(pm.cardExpYear).slice(-2)}
                        </Text>
                      </View>
                    </View>

                    <View className="flex-row items-center gap-x-2">
                      <Pressable
                        className="p-2 active:opacity-70"
                        onPress={() => Alert.alert('Edit', 'Edit payment method')}
                      >
                        <Feather name="edit-2" size={18} color="#6B7280" />
                      </Pressable>
                      <Pressable
                        className="p-2 active:opacity-70"
                        onPress={() => handleRemovePaymentMethod(pm)}
                        disabled={removingId === pm.id}
                      >
                        {removingId === pm.id ? (
                          <ActivityIndicator size="small" color="#6B7280" />
                        ) : (
                          <Feather name="trash-2" size={18} color="#6B7280" />
                        )}
                      </Pressable>
                    </View>
                  </View>

                  {!pm.isDefault && (
                    <Pressable
                      className={cx(
                        'mt-3 border border-gray300 rounded-xl py-2 items-center active:opacity-70',
                        settingDefaultId === pm.id && 'opacity-70'
                      )}
                      onPress={() => handleSetDefault(pm)}
                      disabled={settingDefaultId === pm.id}
                    >
                      {settingDefaultId === pm.id ? (
                        <ActivityIndicator size="small" color="#6B7280" />
                      ) : (
                        <Text className="text-sm text-gray900">Set as Default</Text>
                      )}
                    </Pressable>
                  )}
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Payment Settings */}
        <View className="mx-5 mt-5 rounded-2xl border border-gray200 bg-white p-5">
          <Text className="text-base font-semibold text-black mb-4">Payment Settings</Text>

          <View className="flex-row items-center justify-between pb-4 border-b border-gray200">
            <View className="flex-1 mr-4">
              <Text className="text-gray900 font-medium">Save Payment Information</Text>
              <Text className="text-xs text-gray500 mt-1">Securely save payment details for faster checkout</Text>
            </View>
            <Pressable
              className={cx(
                'w-12 h-7 rounded-full justify-center',
                settings?.savePaymentInfo ? 'bg-green-500' : 'bg-gray300'
              )}
              onPress={() => handleToggleSetting('savePaymentInfo', !settings?.savePaymentInfo)}
            >
              <View
                className={cx(
                  'w-5 h-5 rounded-full bg-white mx-1',
                  settings?.savePaymentInfo && 'self-end'
                )}
              />
            </Pressable>
          </View>

          <View className="flex-row items-center justify-between py-4 border-b border-gray200">
            <View className="flex-1 mr-4">
              <Text className="text-gray900 font-medium">Auto-reload Wallet</Text>
              <Text className="text-xs text-gray500 mt-1">Automatically add funds when balance is low</Text>
            </View>
            <Pressable
              className={cx(
                'w-12 h-7 rounded-full justify-center',
                settings?.autoReloadWallet ? 'bg-green-500' : 'bg-gray300'
              )}
              onPress={() => handleToggleSetting('autoReloadWallet', !settings?.autoReloadWallet)}
            >
              <View
                className={cx(
                  'w-5 h-5 rounded-full bg-white mx-1',
                  settings?.autoReloadWallet && 'self-end'
                )}
              />
            </Pressable>
          </View>

          <View className="flex-row items-center justify-between pt-4">
            <View className="flex-1 mr-4">
              <Text className="text-gray900 font-medium">Email Receipts</Text>
              <Text className="text-xs text-gray500 mt-1">Receive purchase receipts via email</Text>
            </View>
            <Pressable
              className={cx(
                'w-12 h-7 rounded-full justify-center',
                settings?.emailReceipts ? 'bg-green-500' : 'bg-gray300'
              )}
              onPress={() => handleToggleSetting('emailReceipts', !settings?.emailReceipts)}
            >
              <View
                className={cx(
                  'w-5 h-5 rounded-full bg-white mx-1',
                  settings?.emailReceipts && 'self-end'
                )}
              />
            </Pressable>
          </View>
        </View>

        {/* Security Notice */}
        <View className="mx-5 mt-5 rounded-2xl border border-green-200 bg-green-50 p-4 flex-row">
          <Feather name="shield" size={20} color="#22C55E" />
          <View className="flex-1 ml-3">
            <Text className="text-green-800 font-medium">Your payments are secure</Text>
            <Text className="text-xs text-green-700 mt-1">
              We use industry-standard encryption and never store your full card details. All transactions are processed securely through our payment partners.
            </Text>
          </View>
        </View>

        {/* Recent Transactions */}
        <View className="mx-5 mt-5 mb-10 rounded-2xl border border-gray200 bg-white p-5">
          <Text className="text-base font-semibold text-black mb-4">Recent Transactions</Text>

          <Pressable
            className="border border-gray300 rounded-xl py-3 items-center active:opacity-70"
            onPress={() => Alert.alert('Transactions', 'This would show your transaction history.')}
          >
            <Text className="text-gray900 font-medium">View Transaction History</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  ); 
}