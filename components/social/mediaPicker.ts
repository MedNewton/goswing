// components/social/mediaPicker.ts
// Thin wrappers around expo-image-picker that return a normalized
// { uri, kind } asset (or null if cancelled), handling permissions + alerts.

import { Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import type { MediaType } from '@/lib/social/types';

export type PickedAsset = Readonly<{ uri: string; kind: MediaType }>;

type PickOptions = Readonly<{
  allowVideos?: boolean;
  /** Force a square crop (used for avatars). Videos ignore this. */
  square?: boolean;
}>;

function mediaTypes(allowVideos: boolean): ImagePicker.MediaTypeOptions {
  return allowVideos
    ? ImagePicker.MediaTypeOptions.All
    : ImagePicker.MediaTypeOptions.Images;
}

function normalize(asset: ImagePicker.ImagePickerAsset): PickedAsset {
  const kind: MediaType = asset.type === 'video' ? 'video' : 'image';
  return { uri: asset.uri, kind };
}

export async function pickFromLibrary(opts: PickOptions = {}): Promise<PickedAsset | null> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) {
    Alert.alert('Permission needed', 'Allow photo library access to continue.');
    return null;
  }
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: mediaTypes(opts.allowVideos ?? false),
    allowsEditing: opts.square ?? false,
    aspect: opts.square ? [1, 1] : undefined,
    quality: 0.8,
    videoMaxDuration: 60,
  });
  if (result.canceled || !result.assets?.[0]) return null;
  return normalize(result.assets[0]);
}

export async function captureWithCamera(opts: PickOptions = {}): Promise<PickedAsset | null> {
  const perm = await ImagePicker.requestCameraPermissionsAsync();
  if (!perm.granted) {
    Alert.alert('Permission needed', 'Allow camera access to continue.');
    return null;
  }
  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: mediaTypes(opts.allowVideos ?? false),
    allowsEditing: opts.square ?? false,
    aspect: opts.square ? [1, 1] : undefined,
    quality: 0.8,
    videoMaxDuration: 60,
  });
  if (result.canceled || !result.assets?.[0]) return null;
  return normalize(result.assets[0]);
}

/** Present a source chooser (camera / library) and resolve the picked asset. */
export function choosePickSource(
  opts: PickOptions,
  onPicked: (asset: PickedAsset | null) => void,
): void {
  Alert.alert('Add media', 'Choose a source', [
    { text: 'Take photo / video', onPress: async () => onPicked(await captureWithCamera(opts)) },
    { text: 'Choose from library', onPress: async () => onPicked(await pickFromLibrary(opts)) },
    { text: 'Cancel', style: 'cancel', onPress: () => onPicked(null) },
  ]);
}
