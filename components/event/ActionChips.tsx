import React, { useState, type ReactElement } from 'react';
import { View, Text, Pressable } from 'react-native';
import { Feather } from '@expo/vector-icons';
import ReviewModal, { type ReviewPayload } from '@/components/event/ReviewModal';
import CaptureStoryModal from '@/components/event/CaptureStoryModal';
import SuggestSongsModal, { type SongSuggestion } from '@/components/event/SuggestSongsModal';

type Props = Readonly<{
  eventTitle?: string | null;
  onSuggestSongsTap?: () => void;
  onTakeStoryTap?: () => void;
  onSubmitReview?: (payload: ReviewPayload) => void;
  onPickStoryPhoto?: () => Promise<string | null> | string | null;
  onShareStory?: (payload: { photoUri: string; caption: string }) => void;
  onSuggestSong?: (song: SongSuggestion) => void;
  className?: string;
}>;

function Chip({
  bgClass,
  icon,
  label,
  darkText,
  darkIcon,
  onPress,
}: {
  bgClass: string;
  icon: keyof typeof Feather.glyphMap;
  label: string;
  darkText?: boolean;
  darkIcon?: boolean;
  onPress?: () => void;
}): ReactElement {
  const content = (
    <>
      <Feather name={icon} size={14} color={darkIcon ? '#111827' : '#FFFFFF'} />
      <Text className={`text-sm ${darkText ? 'text-black' : 'text-white'}`}>{label}</Text>
    </>
  );

  return onPress ? (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      className={`flex-row items-center gap-x-2 rounded-xl px-3 py-2 active:opacity-85 ${bgClass}`}
    >
      {content}
    </Pressable>
  ) : (
    <View className={`flex-row items-center gap-x-2 rounded-xl px-3 py-2 ${bgClass}`}>{content}</View>
  );
}

export default function ActionChips({
  eventTitle,
  onSuggestSongsTap,
  onTakeStoryTap,
  onSubmitReview,
  onPickStoryPhoto,
  onShareStory,
  onSuggestSong,
  className,
}: Props): ReactElement {
  const [reviewOpen, setReviewOpen] = useState<boolean>(false);
  const [storyOpen, setStoryOpen] = useState<boolean>(false);
  const [songsOpen, setSongsOpen] = useState<boolean>(false);

  const subtitle =
    eventTitle && eventTitle.trim().length > 0
      ? `How was your experience at ${eventTitle}?`
      : 'How was your experience?';

  const handleSubmitReview = (payload: ReviewPayload): void => {
    onSubmitReview?.(payload);
  };

  return (
    <>
      <View className={`px-5 mt-4 flex-row items-center gap-x-2 ${className ?? ''}`}>
        <Chip
          bgClass="bg-black"
          icon="music"
          label="Suggest Songs"
          onPress={() => {
            onSuggestSongsTap?.();
            setSongsOpen(true);
          }}
        />
        <Chip
          bgClass="bg-indigo-600"
          icon="camera"
          label="Take Story"
          onPress={() => {
            onTakeStoryTap?.();
            setStoryOpen(true);
          }}
        />
        <Chip
          bgClass="bg-amber-400"
          icon="star"
          label="Give Review"
          darkText
          darkIcon
          onPress={() => setReviewOpen(true)}
        />
      </View>

      <ReviewModal
        visible={reviewOpen}
        title="Rate Your Experience"
        subtitle={subtitle}
        onClose={() => setReviewOpen(false)}
        onSubmit={handleSubmitReview}
        accentColor="#6B7280"
      />

      <CaptureStoryModal
        visible={storyOpen}
        eventTitle={eventTitle ?? undefined}
        onClose={() => setStoryOpen(false)}
        onPickPhoto={onPickStoryPhoto}
        onShare={(p) => {
          onShareStory?.(p);
        }}
        accentColor="#6B7280"
      />

      <SuggestSongsModal
        visible={songsOpen}
        eventTitle={eventTitle ?? undefined}
        onClose={() => setSongsOpen(false)}
        onSuggest={(song) => {
          onSuggestSong?.(song);
        }}
      />
    </>
  );
}
