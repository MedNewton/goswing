import React, { type ReactElement } from 'react';
import { ScrollView, View, Text, Pressable, Image } from 'react-native';
import { Feather } from '@expo/vector-icons';
import SectionHeader from './SectionHeader';

export type EventGalleryProps = Readonly<{
  images: ReadonlyArray<string>;
  eventTitle?: string | null;
  onOpenAll: () => void;
  onOpenIndex: (index: number) => void;
}>;

export default function EventGallery({
  images,
  eventTitle,
  onOpenAll,
  onOpenIndex,
}: EventGalleryProps): ReactElement {
  const thumbs = images.slice(0, 10);

  return (
    <>
      <SectionHeader title="Event Gallery" action="See all" onPressAction={onOpenAll} />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerClassName="px-5 gap-x-2 mt-2"
      >
        {thumbs.map((uri, i) => (
          <Pressable
            key={`${uri}-${i}`}
            onPress={() => onOpenIndex(i)}
            className="items-center active:opacity-90"
            accessibilityRole="imagebutton"
            accessibilityLabel={`Open photo ${i + 1}${eventTitle ? ` from ${eventTitle}` : ''}`}
          >
            <Image
              source={{ uri }}
              className="h-32 w-32 rounded-xl bg-gray100 border border-gray200"
            />
            {i === thumbs.length - 1 && images.length > thumbs.length ? (
              <View className="absolute h-24 w-24 rounded-xl items-center justify-center">
                <Feather name="camera" size={18} color="#6B7280" />
                <Text className="text-xs text-gray500 mt-1">
                  +{images.length - thumbs.length}
                </Text>
              </View>
            ) : null}
          </Pressable>
        ))}
      </ScrollView>
    </>
  );
}
