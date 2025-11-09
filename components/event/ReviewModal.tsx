import React, { useMemo, useState, type ReactElement } from 'react';
import {
  Modal,
  Pressable,
  Text,
  TextInput,
  View,
  type ViewProps,
  type ColorValue,
} from 'react-native';
import { Feather } from '@expo/vector-icons';

export type ReviewPayload = Readonly<{
  rating: 1 | 2 | 3 | 4 | 5;
  comment: string;
}>;

export type ReviewModalProps = Readonly<
  {
    visible: boolean;
    title?: string;
    subtitle?: string;
    onClose: () => void;
    onSubmit: (payload: ReviewPayload) => void;
    accentColor?: ColorValue;
  } & Omit<ViewProps, 'children'>
>;

function Star({
  filled,
  onPress,
  size = 32,
  color = '#6B7280',
  fillColor = '#11111B',
}: {
  filled: boolean;
  onPress: () => void;
  size?: number;
  color?: ColorValue;
  fillColor?: ColorValue;
}): ReactElement {
  return (
    <Pressable onPress={onPress} className="active:opacity-80">
      <Feather name="star" size={size} color={filled ? (fillColor as string) : (color as string)} />
    </Pressable>
  );
}

function SolidButton({
  label,
  icon,
  onPress,
  disabled = false,
  background = '#11111B',
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
      className={`flex-row items-center justify-center gap-x-2 rounded-2xl px-5 py-3 shadow-sm w-1/2 ${
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
      className="rounded-2xl border border-gray300 bg-white px-5 py-3 active:opacity-90 w-1/2 items-center justify-center"
    >
      <Text className="text-gray800 font-medium">{label}</Text>
    </Pressable>
  );
}

export default function ReviewModal({
  visible,
  title = 'Rate Your Experience',
  subtitle,
  onClose,
  onSubmit,
  accentColor = '#6B7280',
  ...rest
}: ReviewModalProps): ReactElement {
  const [rating, setRating] = useState<1 | 2 | 3 | 4 | 5 | 0>(0);
  const [comment, setComment] = useState<string>('');

  const canSubmit = useMemo(() => rating > 0, [rating]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        onPress={onClose}
        className="flex-1 bg-black/40"
        accessibilityHint="Close review dialog"
      />

      <View
        {...rest}
        className="absolute left-5 right-5 top-1/2 -translate-y-1/2 rounded-3xl bg-white"
        style={{ elevation: 6 }}
      >
        <View className="px-5 pt-5 pb-2">
          <View className="flex-row items-start justify-between">
            <Text className="text-2xl font-semibold text-black">{title}</Text>
            <Pressable onPress={onClose} accessibilityLabel="Close" hitSlop={12}>
              <Feather name="x" size={20} color="#6B7280" />
            </Pressable>
          </View>

          {subtitle ? (
            <Text className="mt-2 text-gray600">{subtitle}</Text>
          ) : null}
        </View>

        <View className="px-5 mt-4 flex-row items-center justify-center gap-x-2">
          {([1, 2, 3, 4, 5] as const).map((v) => (
            <Star
              key={v}
              filled={rating >= v}
              onPress={() => setRating(v)}
              size={34}
              color="#D1D5DB"
              fillColor={accentColor}
            />
          ))}
        </View>

        <View className="px-5 mt-6">
          <Text className="text-gray800 font-medium mb-2">Share your thoughts (optional)</Text>
          <TextInput
            value={comment}
            onChangeText={setComment}
            placeholder="Tell us about your experience..."
            multiline
            numberOfLines={4}
            className="rounded-2xl border border-gray300 bg-gray100 px-4 py-3 text-gray800 min-h-24"
            placeholderTextColor="#9CA3AF"
          />
        </View>

        <View className="px-8 py-5 flex-row items-center justify-center gap-x-3">
          <GhostButton label="Cancel" onPress={onClose} />
          <SolidButton
            label="Submit Review"
            icon="send"
            onPress={() => {
              if (canSubmit) {
                onSubmit({ rating: rating as 1 | 2 | 3 | 4 | 5, comment });
                setRating(0);
                setComment('');
                onClose();
              }
            }}
            disabled={!canSubmit}
            background={accentColor}
          />
        </View>

        <View className="px-5 pb-5">
          <Text className="text-center text-gray500">
            Your review will help other users discover great events
          </Text>
        </View>
      </View>
    </Modal>
  );
}
