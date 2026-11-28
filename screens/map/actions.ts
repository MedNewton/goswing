// screens/map/actions.ts — Directions and Share from the map pop-ups.
import { Alert, Linking, Platform, Share } from 'react-native';
import type { TFunction } from 'i18next';

export async function openDirections(
  p: Readonly<{ name: string; lat: number; lng: number }>,
  t: TFunction,
): Promise<void> {
  const label = encodeURIComponent(p.name);
  const ll = `${p.lat},${p.lng}`;
  const web = `https://www.google.com/maps/dir/?api=1&destination=${ll}`;
  const native =
    Platform.OS === 'ios'
      ? `http://maps.apple.com/?daddr=${ll}&q=${label}`
      : Platform.OS === 'android'
        ? `geo:${ll}?q=${ll}(${label})`
        : web;
  try {
    await Linking.openURL(native);
  } catch {
    try {
      await Linking.openURL(web);
    } catch {
      Alert.alert(t('map.pop.directions'), t('map.pop.mapsError'));
    }
  }
}

export async function sharePlace(p: Readonly<{ name: string; address?: string | null; lat: number; lng: number }>): Promise<void> {
  const url = `https://www.google.com/maps/search/?api=1&query=${p.lat},${p.lng}`;
  const message = [p.name, p.address, url].filter(Boolean).join('\n');
  try {
    await Share.share({ title: p.name, message });
  } catch {
    // cancelled
  }
}

export async function shareEvent(e: Readonly<{ title: string; when: string; venue?: string | null; price?: string | null }>): Promise<void> {
  const message = [e.title, e.when, e.venue, e.price].filter(Boolean).join('\n');
  try {
    await Share.share({ title: e.title, message });
  } catch {
    // cancelled
  }
}
