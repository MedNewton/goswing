import React, { useMemo, useState, type ReactElement } from 'react';
import {
  Modal,
  Pressable,
  Text,
  TextInput,
  View,
  type ViewProps,
  type ColorValue,
  Image,
} from 'react-native';
import { Feather } from '@expo/vector-icons';

export type CaptureStoryModalProps = Readonly<
  {
    visible: boolean;
    eventTitle?: string | null;
    onClose: () => void;
    onPickPhoto?: () => Promise<string | null> | string | null;
    onShare: (payload: { photoUri: string; caption: string }) => void;
    accentColor?: ColorValue;
  } & Omit<ViewProps, 'children'>
>;

function SolidButton({
  label,
  icon,
  onPress,
  disabled = false,
  background = '#6B7280',
}: {
  label: string;
  icon?: keyof typeof Feather.glyphMap;
  onPress: () => void;
  disabled?: boolean;
  background?: ColorValue;
}): ReactElement {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled}
      className={`w-full flex-row items-center justify-center gap-x-2 rounded-2xl px-5 py-3 shadow-sm ${
        disabled ? 'opacity-60' : 'active:opacity-90'
      }`}
      style={{ backgroundColor: background }}
    >
      {icon ? <Feather name={icon} size={16} color="#FFFFFF" /> : null}
      <Text className="text-white font-medium">{label}</Text>
    </Pressable>
  );
}

function GhostButton({
  label,
  onPress,
}: {
  label: string;
  onPress: () => void;
}): ReactElement {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      className="w-full rounded-2xl border border-gray300 bg-white px-5 py-3 active:opacity-90"
    >
      <Text className="text-gray800 font-medium">{label}</Text>
    </Pressable>
  );
}

export default function CaptureStoryModal({
  visible,
  eventTitle,
  onClose,
  onPickPhoto,
  onShare,
  accentColor = '#6B7280',
  ...rest
}: CaptureStoryModalProps): ReactElement {
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [caption, setCaption] = useState<string>('');

  const subtitle = useMemo(
    () =>
      eventTitle && eventTitle.trim().length > 0
        ? `Share your experience at ${eventTitle}`
        : 'Share your experience from the event',
    [eventTitle]
  );

  const canShare = useMemo(() => typeof photoUri === 'string' && photoUri.length > 0, [photoUri]);

  const handlePick = async (): Promise<void> => {
    try {
      const result = typeof onPickPhoto === 'function' ? await onPickPhoto() : null;
      if (typeof result === 'string' && result.length > 0) {
        setPhotoUri(result);
      } else {
        // Fallback demo: mark as “chosen” with a blank placeholder
        // Remove this else-branch once a real picker is wired.
        setPhotoUri('placeholder://chosen');
      }
    } catch {
      // ignore picker errors for now
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable onPress={onClose} className="flex-1 bg-black/40" />

      <View
        {...rest}
        className="absolute left-5 right-5 top-1/2 -translate-y-1/2 rounded-3xl bg-white"
        style={{ elevation: 6 }}
      >
        <View className="px-5 pt-5 pb-2">
          <View className="flex-row items-start justify-between">
            <View className="flex-row items-center gap-x-2">
              <Feather name="camera" size={20} color="#111827" />
              <Text className="text-2xl font-semibold text-black">Capture Story</Text>
            </View>
            <Pressable onPress={onClose} accessibilityLabel="Close" hitSlop={12}>
              <Feather name="x" size={20} color="#6B7280" />
            </Pressable>
          </View>

          <Text className="mt-3 text-center text-gray600">{subtitle}</Text>

          {eventTitle ? (
            <View className="self-center mt-3 rounded-2xl bg-gray100 px-3 py-1.5 border border-gray200">
              <Text className="text-gray700">Live at {eventTitle}</Text>
            </View>
          ) : null}
        </View>

        <View className="px-5 mt-4">
          <View className="rounded-3xl border border-gray300 bg-white px-4 py-10 items-center">
            {photoUri ? (
              <View className="w-full items-center">
                <View className="w-full h-40 rounded-2xl bg-gray200 overflow-hidden items-center justify-center">
                  {photoUri.startsWith('placeholder://') ? (
                    <Feather name="image" size={36} color="#6B7280" />
                  ) : (
                    <Image source={{ uri: photoUri }} className="w-full h-full" resizeMode="cover" />
                  )}
                </View>
                <Text className="mt-3 text-gray600">Preview</Text>
              </View>
            ) : (
              <>
                <Feather name="camera" size={40} color="#6B7280" />
                <Text className="mt-3 text-gray600 text-center">
                  Capture a moment from the event
                </Text>
                <Pressable
                  onPress={handlePick}
                  className="mt-5 flex-row items-center gap-x-2 rounded-2xl border border-gray300 bg-white px-4 py-2 active:opacity-90"
                >
                  <Feather name="upload" size={16} color="#6B7280" />
                  <Text className="text-gray800 font-medium">Choose Photo</Text>
                </Pressable>
              </>
            )}
          </View>

          <TextInput
            placeholder="Add a caption (optional)…"
            placeholderTextColor="#9CA3AF"
            value={caption}
            onChangeText={setCaption}
            className="mt-3 rounded-2xl border border-gray300 bg-gray100 px-4 py-3 text-gray800"
            multiline
          />
        </View>

        <View className="px-5 py-5">
          <View className="flex-row items-center gap-x-3">
            <View className="flex-1">
              <GhostButton label="Cancel" onPress={onClose} />
            </View>
            <View className="flex-1">
              <SolidButton
                label="Share Story"
                icon="image"
                onPress={() => {
                  if (canShare && photoUri) {
                    onShare({ photoUri, caption });
                    setCaption('');
                    setPhotoUri(null);
                    onClose();
                  }
                }}
                disabled={!canShare}
                background={accentColor}
              />
            </View>
          </View>
        </View>

        <View className="px-5 pb-5">
          <Text className="text-center text-gray500">
            Your story will be visible to event attendees for 24 hours
          </Text>
        </View>
      </View>
    </Modal>
  );
}
