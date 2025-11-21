// pages/NewUserLocationPage.tsx
import React, { useState, type ReactElement } from 'react';
import {
  View,
  Text,
  Pressable,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as Location from 'expo-location';

type Props = Readonly<{
  onDone: () => Promise<void>;
}>;

const cx = (...c: Array<string | false | null | undefined>) =>
  c.filter(Boolean).join(' ');

export default function NewUserLocationPage({ onDone }: Props): ReactElement {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleSkip = async (): Promise<void> => {
    if (loading) return;
    await onDone();
  };

  const handleSomewhereElse = async (): Promise<void> => {
    if (loading) return;
    await onDone();
  };

  const handleCurrentLocation = async (): Promise<void> => {
    if (loading) return;

    setError(null);
    setLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== Location.PermissionStatus.GRANTED) {
        setError(
          Platform.select({
            ios: 'We could not access your location. You can enable it later in Settings.',
            android: 'We could not access your location. You can enable it later in Settings.',
            default: 'We could not access your location.',
          }) as string
        );
        return;
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      // You can send this to your backend or store it later.
      console.log('New user location:', position.coords);

      await onDone();
    } catch (e) {
      console.warn('Location permission / fetch error:', e);
      setError('Something went wrong while getting your location. Please try again or skip.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right']} className="flex-1 bg-white">
      {/* TOP BAR */}
      <View className="px-5 pt-3 items-end">
        <Pressable
          onPress={handleSkip}
          className="px-2 py-1 active:opacity-80"
          disabled={loading}
        >
          <Text className="text-[18px] text-[#0B0B15]">Skip</Text>
        </Pressable>
      </View>

      {/* CONTENT */}
      <View className="flex-1 px-5 pt-4">
        <Text className="text-[28px] font-semibold text-black text-center mt-4">
          Where are you making plans?
        </Text>

        {/* Big “hero” card (replace with Image later if you want) */}
        <View className="mt-8 rounded-3xl bg-gray200 overflow-hidden h-[360px] items-center justify-center">
          <Feather name="map-pin" size={40} color="#0B0B15" />
          <Text className="mt-3 text-base text-gray700">Use your current city</Text>
        </View>

        {error ? (
          <View className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-3 py-2">
            <Text className="text-red-600 text-sm">{error}</Text>
          </View>
        ) : null}
      </View>

      {/* BOTTOM BUTTONS */}
      <View
        className="px-5 gap-y-3"
        style={{ paddingBottom: Math.max(insets.bottom, 20) }}
      >
        <Pressable
          onPress={handleCurrentLocation}
          disabled={loading}
          className={cx(
            'rounded-2xl py-4 items-center justify-center',
            loading ? 'bg-[#050515]/70' : 'bg-[#050515]'
          )}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <View className="flex-row items-center gap-x-2">
              <Feather name="map-pin" size={18} color="#FFFFFF" />
              <Text className="text-white text-[18px] font-semibold">
                Current Location
              </Text>
            </View>
          )}
        </Pressable>

        <Pressable
          onPress={handleSomewhereElse}
          disabled={loading}
          className="rounded-2xl border border-gray300 bg-white py-4 items-center active:opacity-90"
        >
          <Text className="text-[18px] font-semibold text-[#050515]">
            Somewhere Else
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
