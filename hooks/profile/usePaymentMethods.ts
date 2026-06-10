// hooks/profile/usePaymentMethods.ts
// Phase 1 stub — payment methods management is disabled until Phase 2.

import { useCallback, useMemo } from 'react';
import type { PaymentMethod, ID } from '@/types/domain';

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

const EMPTY: ReadonlyArray<PaymentMethod> = [];

function stubLog(name: string): void {
  if (__DEV__) {
    // eslint-disable-next-line no-console
    console.log(`[STUB] hooks/profile/usePaymentMethods.${name}()`);
  }
}

export function usePaymentMethods(): UsePaymentMethodsReturn {
  const refetch = useCallback(async () => {
    stubLog('refetch');
  }, []);
  const addPaymentMethod = useCallback(
    async (
      _paymentMethod: Omit<
        PaymentMethod,
        'id' | 'userId' | 'createdAt' | 'updatedAt'
      >,
    ) => {
      stubLog('addPaymentMethod');
    },
    [],
  );
  const removePaymentMethod = useCallback(async (_id: ID) => {
    stubLog('removePaymentMethod');
  }, []);
  const setDefaultPaymentMethod = useCallback(async (_id: ID) => {
    stubLog('setDefaultPaymentMethod');
  }, []);

  return useMemo(
    () => ({
      paymentMethods: EMPTY,
      isLoading: false,
      error: null,
      refetch,
      addPaymentMethod,
      removePaymentMethod,
      setDefaultPaymentMethod,
    }),
    [refetch, addPaymentMethod, removePaymentMethod, setDefaultPaymentMethod],
  );
}
