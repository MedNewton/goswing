// src/pages/ReservationDetailsRoutePage.tsx
import React, { useEffect, useState, type ReactElement } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import ReservationDetailsPage from '@/pages/ReservationDetailsPage';
import {
  getReservationDetails,
  type ReservationDetails,
} from '@/lib/supabase/reservationDetails';

export type ReservationDetailsRoutePageProps = Readonly<{
  reservationId: string;
  onBack?: () => void;
}>;

function asMsg(e: unknown): string {
  if (e instanceof Error) return e.message;
  return String(e);
}

export default function ReservationDetailsRoutePage({
  reservationId,
  onBack,
}: ReservationDetailsRoutePageProps): ReactElement {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [details, setDetails] = useState<ReservationDetails | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        setError(null);
        setDetails(null);

        const d = await getReservationDetails({ reservationId: String(reservationId) });
        if (!cancelled) setDetails(d);
      } catch (e: unknown) {
        if (!cancelled) setError(asMsg(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [reservationId]);

  if (loading) {
    return (
      <SafeAreaView edges={['top', 'left', 'right']} className="flex-1 bg-white">
        <View className="flex-1 items-center justify-center px-6">
          <ActivityIndicator />
          <Text className="mt-3 text-gray600">Loading reservation…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !details) {
    return (
      <SafeAreaView edges={['top', 'left', 'right']} className="flex-1 bg-white">
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-gray900 font-semibold">Could not load reservation</Text>
          <Text className="text-gray600 mt-2 text-center">{error ?? 'Missing details.'}</Text>

          {/* Simple back fallback */}
          <Text
            onPress={onBack}
            className="mt-4 text-brand font-medium"
            accessibilityRole="button"
          >
            Go back
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return <ReservationDetailsPage details={details} onBack={onBack} />;
}
