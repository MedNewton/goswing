// components/social/MediaGrid.tsx
// 3-column grid of a user's photos or videos. Video tiles show a play overlay.

import React, { type ReactElement } from 'react';
import { View, Text, Image, Pressable, useWindowDimensions } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { UserMedia } from '@/lib/social/types';

type Props = Readonly<{
  items: ReadonlyArray<UserMedia>;
  emptyLabel: string;
  onPressItem: (item: UserMedia, index: number) => void;
}>;

const GAP = 4;
const H_PADDING = 20; // matches mx-5 (20px) container padding

export default function MediaGrid({ items, emptyLabel, onPressItem }: Props): ReactElement {
  const { width } = useWindowDimensions();
  const tile = Math.floor((width - H_PADDING * 2 - GAP * 2) / 3);

  if (items.length === 0) {
    return (
      <View className="items-center justify-center py-16">
        <Feather name="image" size={28} color="#9CA3AF" />
        <Text className="text-gray500 text-sm mt-3">{emptyLabel}</Text>
      </View>
    );
  }

  return (
    <View className="flex-row flex-wrap" style={{ gap: GAP }}>
      {items.map((item, index) => (
        <Pressable
          key={item.id}
          onPress={() => onPressItem(item, index)}
          className="active:opacity-80 rounded-lg overflow-hidden bg-gray100"
          style={{ width: tile, height: tile }}
        >
          <Image
            source={{ uri: item.thumbnailUrl ?? item.mediaUrl }}
            style={{ width: tile, height: tile }}
            resizeMode="cover"
          />
          {item.mediaType === 'video' ? (
            <View className="absolute inset-0 items-center justify-center">
              <View className="bg-black/40 rounded-full p-2">
                <Feather name="play" size={16} color="#FFFFFF" />
              </View>
            </View>
          ) : null}
          {item.caption ? (
            <View className="absolute bottom-0 left-0 right-0 bg-black/35 px-1.5 py-1">
              <Text numberOfLines={1} className="text-white text-[10px]">
                {item.caption}
              </Text>
            </View>
          ) : null}
        </Pressable>
      ))}
    </View>
  );
}
