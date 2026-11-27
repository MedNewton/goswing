// preview/mocks/location.ts — fixed position (Paris 11e) for the web preview.
export enum Accuracy { Lowest = 1, Low = 2, Balanced = 3, High = 4, Highest = 5, BestForNavigation = 6 }
export enum PermissionStatus { DENIED = 'denied', GRANTED = 'granted', UNDETERMINED = 'undetermined' }
export type LocationGeocodedAddress = {
  city: string | null; district: string | null; subregion: string | null; region: string | null;
  name: string | null; country: string | null; postalCode: string | null; street: string | null;
  streetNumber: string | null; isoCountryCode: string | null; timezone: string | null; formattedAddress: string | null;
};

export const PREVIEW_COORDS = { latitude: 48.8636, longitude: 2.3735 };

export async function requestForegroundPermissionsAsync() {
  return { status: PermissionStatus.GRANTED, granted: true, canAskAgain: true, expires: 'never' };
}
export const getForegroundPermissionsAsync = requestForegroundPermissionsAsync;
export async function getCurrentPositionAsync() {
  return { coords: { ...PREVIEW_COORDS, accuracy: 10, altitude: 0, altitudeAccuracy: 0, heading: 0, speed: 0 }, timestamp: Date.now() };
}
export const getLastKnownPositionAsync = getCurrentPositionAsync;
export async function reverseGeocodeAsync(): Promise<LocationGeocodedAddress[]> {
  return [{
    city: 'Paris 11e', district: 'Oberkampf', subregion: 'Paris', region: 'Île-de-France', name: 'Rue Oberkampf',
    country: 'France', postalCode: '75011', street: 'Rue Oberkampf', streetNumber: '9', isoCountryCode: 'FR',
    timezone: 'Europe/Paris', formattedAddress: '9 Rue Oberkampf, 75011 Paris',
  }];
}
export async function geocodeAsync() {
  return [{ ...PREVIEW_COORDS, accuracy: 10 }];
}
export async function watchPositionAsync() {
  return { remove: () => undefined };
}
export async function hasServicesEnabledAsync() {
  return true;
}
