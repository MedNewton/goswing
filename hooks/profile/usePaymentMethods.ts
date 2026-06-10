// hooks/profile/usePaymentMethods.ts
// Payment methods — backed by the Gooswing REST API (routes F.1–F.4).
// Display info only; the PCI data lives with the payment provider.

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useUser } from '@clerk/clerk-expo';
import * as meApi from '@/lib/api/me';
import type { ApiPaymentMethod } from '@/lib/api/types';
import type { PaymentMethod, CardBrand, ID } from '@/types/domain';

type UsePaymentMethodsReturn = {
  paymentMethods: ReadonlyArray<PaymentMethod>;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  addPaymentMethod: (
    paymentMethod: Omit<PaymentMethod, 'id' | 'userId' | 'createdAt' | 'updatedAt'>,
  ) => Promise<void>;
  removePaymentMethod: (id: ID) => Promise<void>;
  setDefaultPaymentMethod: (id: ID) => Promise<void>;
};

const CARD_BRANDS: ReadonlySet<CardBrand> = new Set([
  'visa',
  'mastercard',
  'amex',
  'discover',
  'other',
]);

function toCardBrand(v: unknown): CardBrand {
  const s = typeof v === 'string' ? v.toLowerCase() : '';
  return CARD_BRANDS.has(s as CardBrand) ? (s as CardBrand) : 'other';
}

function mapPaymentMethod(raw: ApiPaymentMethod): PaymentMethod {
  return {
    id: String(raw.id) as ID,
    userId: String(raw.userId) as ID,
    provider: raw.provider === 'stripe' ? 'stripe' : 'other',
    providerPaymentMethodId: String(raw.providerPaymentMethodId ?? ''),
    cardBrand: toCardBrand(raw.cardBrand),
    cardLastFour: String(raw.cardLastFour ?? ''),
    cardExpMonth: typeof raw.cardExpMonth === 'number' ? raw.cardExpMonth : 0,
    cardExpYear: typeof raw.cardExpYear === 'number' ? raw.cardExpYear : 0,
    cardholderName: raw.cardholderName ?? undefined,
    isDefault: Boolean(raw.isDefault),
    createdAt: raw.createdAt ?? undefined,
    updatedAt: raw.updatedAt ?? undefined,
  };
}

export function usePaymentMethods(): UsePaymentMethodsReturn {
  const { user: clerkUser } = useUser();
  const [paymentMethods, setPaymentMethods] = useState<ReadonlyArray<PaymentMethod>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchPaymentMethods = useCallback(async () => {
    if (!clerkUser?.id) {
      setPaymentMethods([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const page = await meApi.listMyPaymentMethods();
      setPaymentMethods((page.items ?? []).map(mapPaymentMethod));
    } catch (err) {
      setError(
        err instanceof Error ? err : new Error('Failed to fetch payment methods'),
      );
    } finally {
      setIsLoading(false);
    }
  }, [clerkUser?.id]);

  useEffect(() => {
    void fetchPaymentMethods();
  }, [fetchPaymentMethods]);

  const addPaymentMethod = useCallback(
    async (
      paymentMethod: Omit<PaymentMethod, 'id' | 'userId' | 'createdAt' | 'updatedAt'>,
    ) => {
      if (!clerkUser?.id) throw new Error('Not authenticated');

      await meApi.addMyPaymentMethod({
        provider: paymentMethod.provider,
        providerPaymentMethodId: paymentMethod.providerPaymentMethodId,
        cardBrand: paymentMethod.cardBrand,
        cardLastFour: paymentMethod.cardLastFour,
        cardExpMonth: paymentMethod.cardExpMonth,
        cardExpYear: paymentMethod.cardExpYear,
        cardholderName: paymentMethod.cardholderName ?? null,
        isDefault: paymentMethod.isDefault,
      });
      await fetchPaymentMethods();
    },
    [clerkUser?.id, fetchPaymentMethods],
  );

  const removePaymentMethod = useCallback(
    async (id: ID) => {
      if (!clerkUser?.id) throw new Error('Not authenticated');
      await meApi.deleteMyPaymentMethod(String(id));
      await fetchPaymentMethods();
    },
    [clerkUser?.id, fetchPaymentMethods],
  );

  const setDefaultPaymentMethod = useCallback(
    async (id: ID) => {
      if (!clerkUser?.id) throw new Error('Not authenticated');
      await meApi.setDefaultPaymentMethod(String(id));
      await fetchPaymentMethods();
    },
    [clerkUser?.id, fetchPaymentMethods],
  );

  return useMemo(
    () => ({
      paymentMethods,
      isLoading,
      error,
      refetch: fetchPaymentMethods,
      addPaymentMethod,
      removePaymentMethod,
      setDefaultPaymentMethod,
    }),
    [
      paymentMethods,
      isLoading,
      error,
      fetchPaymentMethods,
      addPaymentMethod,
      removePaymentMethod,
      setDefaultPaymentMethod,
    ],
  );
}
