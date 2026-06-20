// hooks/profile/usePaymentMethods.ts
import { useEffect, useState, useCallback } from 'react';
import { useUser } from '@clerk/clerk-expo';
import { supabase } from '@/lib/supabase';
import type { PaymentMethod, ID, CardBrand } from '@/types/domain';

type UsePaymentMethodsReturn = {
  paymentMethods: ReadonlyArray<PaymentMethod>;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  addPaymentMethod: (paymentMethod: Omit<PaymentMethod, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  removePaymentMethod: (id: ID) => Promise<void>;
  setDefaultPaymentMethod: (id: ID) => Promise<void>;
};

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

      const { data, error: fetchError } = await supabase
        .from('user_payment_methods')
        .select('*')
        .eq('user_id', clerkUser.id)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      const mapped: PaymentMethod[] = (data ?? []).map((pm: any) => ({
        id: pm.id as ID,
        userId: pm.user_id as ID,
        provider: pm.provider,
        providerPaymentMethodId: pm.provider_payment_method_id,
        cardBrand: pm.card_brand as CardBrand,
        cardLastFour: pm.card_last_four,
        cardExpMonth: pm.card_exp_month,
        cardExpYear: pm.card_exp_year,
        cardholderName: pm.cardholder_name,
        isDefault: pm.is_default,
        createdAt: pm.created_at,
        updatedAt: pm.updated_at,
      }));

      setPaymentMethods(mapped);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch payment methods'));
    } finally {
      setIsLoading(false);
    }
  }, [clerkUser?.id]);

  useEffect(() => {
    fetchPaymentMethods();
  }, [fetchPaymentMethods]);

  const addPaymentMethod = useCallback(async (
    paymentMethod: Omit<PaymentMethod, 'id' | 'userId' | 'createdAt' | 'updatedAt'>
  ) => {
    if (!clerkUser?.id) throw new Error('Not authenticated');

    const { error: insertError } = await supabase
      .from('user_payment_methods')
      .insert({
        user_id: clerkUser.id,
        provider: paymentMethod.provider,
        provider_payment_method_id: paymentMethod.providerPaymentMethodId,
        card_brand: paymentMethod.cardBrand,
        card_last_four: paymentMethod.cardLastFour,
        card_exp_month: paymentMethod.cardExpMonth,
        card_exp_year: paymentMethod.cardExpYear,
        cardholder_name: paymentMethod.cardholderName,
        is_default: paymentMethod.isDefault,
      });

    if (insertError) throw insertError;

    await fetchPaymentMethods();
  }, [clerkUser?.id, fetchPaymentMethods]);

  const removePaymentMethod = useCallback(async (id: ID) => {
    if (!clerkUser?.id) throw new Error('Not authenticated');

    const { error: deleteError } = await supabase
      .from('user_payment_methods')
      .delete()
      .eq('id', id)
      .eq('user_id', clerkUser.id);

    if (deleteError) throw deleteError;

    // Optimistic update
    setPaymentMethods((prev) => prev.filter((pm) => pm.id !== id));
  }, [clerkUser?.id]);

  const setDefaultPaymentMethod = useCallback(async (id: ID) => {
    if (!clerkUser?.id) throw new Error('Not authenticated');

    const { error: updateError } = await supabase
      .from('user_payment_methods')
      .update({ is_default: true, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', clerkUser.id);

    if (updateError) throw updateError;

    // Optimistic update - the trigger will handle unsetting other defaults
    setPaymentMethods((prev) =>
      prev.map((pm) => ({
        ...pm,
        isDefault: pm.id === id,
      }))
    );
  }, [clerkUser?.id]);

  return {
    paymentMethods,
    isLoading,
    error,
    refetch: fetchPaymentMethods,
    addPaymentMethod,
    removePaymentMethod,
    setDefaultPaymentMethod,
  };
}