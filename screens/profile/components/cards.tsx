// screens/profile/components/cards.tsx — payment card label + brand badge.
import React, { type ReactElement } from 'react';
import { Text, View } from 'react-native';
import type { TFunction } from 'i18next';
import type { CardBrand, PaymentMethod } from '@/types/domain';

const BRAND: Readonly<Record<CardBrand, { name: string; short: string; bg: string }>> = {
  visa: { name: 'Visa', short: 'VISA', bg: '#1A1F71' },
  mastercard: { name: 'Mastercard', short: 'MC', bg: '#3A3A3A' },
  amex: { name: 'Amex', short: 'AMEX', bg: '#1F6FB2' },
  discover: { name: 'Discover', short: 'DISC', bg: '#B5541C' },
  other: { name: 'Card', short: 'CARD', bg: '#4F4C63' },
};

export function brandName(brand: CardBrand, t: TFunction): string {
  return brand === 'other' ? t('profile.pay.card') : BRAND[brand].name;
}

/** "Visa •••• 4242". */
export function cardLabel(m: Pick<PaymentMethod, 'cardBrand' | 'cardLastFour'>, t: TFunction): string {
  return `${brandName(m.cardBrand, t)} •••• ${m.cardLastFour}`;
}

export function expiryLabel(m: Pick<PaymentMethod, 'cardExpMonth' | 'cardExpYear'>): string {
  if (!m.cardExpMonth || !m.cardExpYear) return '';
  return `${String(m.cardExpMonth).padStart(2, '0')}/${String(m.cardExpYear).slice(-2)}`;
}

export function isExpired(m: Pick<PaymentMethod, 'cardExpMonth' | 'cardExpYear'>, now = new Date()): boolean {
  if (!m.cardExpMonth || !m.cardExpYear) return false;
  return m.cardExpYear < now.getFullYear() || (m.cardExpYear === now.getFullYear() && m.cardExpMonth < now.getMonth() + 1);
}

export function BrandBadge({ brand, label }: Readonly<{ brand?: CardBrand; label?: string }>): ReactElement {
  const b = BRAND[brand ?? 'other'];
  return (
    <View className="h-10 w-[52px] rounded-lg items-center justify-center" style={{ backgroundColor: label ? '#000000' : b.bg }}>
      <Text className="text-[12px] font-extrabold text-white" numberOfLines={1}>
        {label ?? b.short}
      </Text>
    </View>
  );
}
