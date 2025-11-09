import React, { type ReactElement } from 'react';
import { Dimensions, Image, Pressable, View } from 'react-native';
import { Feather } from '@expo/vector-icons';

export type HeroHeaderProps = Readonly<{
  imageUrl: string | null | undefined;
  onBack?: () => void;
  onToggleFavorite?: () => void;
  onShare?: () => void;
}>;

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const HERO_HEIGHT = Math.max(260, Math.min(340, Math.round(SCREEN_WIDTH * 0.62)));

function CircleIcon({
  children,
  onPress,
}: {
  children: ReactElement;
  onPress?: () => void;
}): ReactElement {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      className="h-9 w-9 rounded-full bg-white/95 items-center justify-center border border-gray200"
      hitSlop={10}
    >
      {children}
    </Pressable>
  );
}

export default function HeroHeader({
  imageUrl,
  onBack,
  onToggleFavorite,
  onShare,
}: HeroHeaderProps): ReactElement {
  return (
    <View className="relative" style={{ width: SCREEN_WIDTH, height: HERO_HEIGHT }}>
      {imageUrl ? (
        <Image source={{ uri: imageUrl }} className="w-full h-full" resizeMode="cover" />
      ) : (
        <View className="w-full h-full bg-gray200" />
      )}

      <View className="absolute left-3 top-3">
        <CircleIcon onPress={onBack}>
          <Feather name="chevron-left" size={20} color="#111827" />
        </CircleIcon>
      </View>

      <View className="absolute right-3 top-3 flex-row items-center gap-x-2">
        <CircleIcon onPress={onToggleFavorite}>
          <Feather name="heart" size={18} color="#111827" />
        </CircleIcon>
        <CircleIcon onPress={onShare}>
          <Feather name="share-2" size={18} color="#111827" />
        </CircleIcon>
      </View>
    </View>
  );
}
