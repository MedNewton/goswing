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
import { useTranslation } from 'react-i18next';

type Props = Readonly<{
  onDone: (location?: string, locationServicesEnabled?: boolean) => Promise<void>;
}>;

const cx = (...c: Array<string | false | null | undefined>) =>
  c.filter(Boolean).join(' ');

export default function NewUserLocationPage({ onDone }: Props): ReactElement {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleSkip = async (): Promise<void> => {
    if (loading) return;
    await onDone(undefined, false);
  };

  const handleSomewhereElse = async (): Promise<void> => {
    if (loading) return;
    // TODO: Could open a city picker here in the future
    await onDone(undefined, false);
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
            ios: t('onboarding.location.permissionDenied'),
            android: t('onboarding.location.permissionDenied'),
            default: t('onboarding.location.permissionDenied'),
          }) as string
        );
        return;
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      // Reverse geocode to get city name
      let locationString: string | undefined;
      try {
        const [address] = await Location.reverseGeocodeAsync({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });

        if (address) {
          const parts = [address.city, address.region].filter(Boolean);
          locationString = parts.join(', ') || undefined;
        }
      } catch (geocodeErr) {
        console.warn('Reverse geocoding failed:', geocodeErr);
        // Still proceed - location services are enabled even without the string
      }

      console.log('New user location:', position.coords, locationString);

      await onDone(locationString, true);
    } catch (e) {
      console.warn('Location permission / fetch error:', e);
      setError(t('onboarding.location.fetchFailed'));
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
          <Text className="text-[18px] text-[#0B0B15]">{t('common.skip')}</Text>
        </Pressable>
      </View>

      {/* CONTENT */}
      <View className="flex-1 px-5 pt-4">
        <Text className="text-[28px] font-semibold text-black text-center mt-4">
          {t('onboarding.location.title')}
        </Text>

        {/* Big "hero" card */}
        <View className="mt-8 rounded-3xl bg-gray200 overflow-hidden h-[360px] items-center justify-center">
          <Feather name="map-pin" size={40} color="#0B0B15" />
          <Text className="mt-3 text-base text-gray700">{t('onboarding.location.hero')}</Text>
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
                {t('onboarding.location.currentButton')}
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
            {t('onboarding.location.somewhereElse')}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
