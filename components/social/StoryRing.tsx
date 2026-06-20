// components/social/StoryRing.tsx
// Avatar bubble with a gradient-style ring when the user has active stories,
// plus an "add" badge when viewing your own profile.

import React, { type ReactElement } from 'react';
import { View, Text, Image, Pressable } from 'react-native';
import { Feather } from '@expo/vector-icons';

type Props = Readonly<{
  avatarUrl: string | null;
  displayName: string;
  hasStories: boolean;
  isSelf: boolean;
  size?: number;
  onPress: () => void;
}>;

export default function StoryRing({
  avatarUrl,
  displayName,
  hasStories,
  isSelf,
  size = 84,
  onPress,
}: Props): ReactElement {
  const inner = size - 8;
  const initial = (displayName || 'U').slice(0, 1).toUpperCase();

  return (
    <Pressable onPress={onPress} className="items-center active:opacity-80">
      <View
        className={`items-center justify-center rounded-full ${
          hasStories ? 'bg-brand' : 'bg-gray200'
        }`}
        style={{ width: size, height: size, padding: 4 }}
      >
        <View
          className="rounded-full bg-white items-center justify-center overflow-hidden"
          style={{ width: inner, height: inner, padding: 2 }}
        >
          {avatarUrl ? (
            <Image
              source={{ uri: avatarUrl }}
              style={{ width: inner - 4, height: inner - 4, borderRadius: (inner - 4) / 2 }}
            />
          ) : (
            <View
              className="bg-gray100 items-center justify-center"
              style={{ width: inner - 4, height: inner - 4, borderRadius: (inner - 4) / 2 }}
            >
              <Text className="text-2xl font-semibold text-gray800">{initial}</Text>
            </View>
          )}
        </View>
      </View>

      {isSelf ? (
        <View
          className="absolute bottom-0 right-0 bg-brand rounded-full items-center justify-center border-2 border-white"
          style={{ width: 26, height: 26 }}
        >
          <Feather name="plus" size={14} color="#FFFFFF" />
        </View>
      ) : null}
    </Pressable>
  );
}
