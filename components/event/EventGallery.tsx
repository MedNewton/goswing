import React, { type ReactElement } from 'react';
import { ScrollView, View, Text, Pressable, Image } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
  const thumbs = images.slice(0, 10);

  return (
    <>
      <SectionHeader title={t('event.gallery.title')} action={t('event.gallery.seeAll')} onPressAction={onOpenAll} />
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
            accessibilityLabel={t('event.gallery.openPhotoA11y', { index: i + 1, from: eventTitle ? t('event.gallery.fromTitle', { title: eventTitle }) : '' })}
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
