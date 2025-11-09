import React, { useMemo, useState, type ReactElement } from 'react';
import {
  Dimensions,
  Pressable,
  ScrollView,
  Text,
  View,
  Image,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import BottomTabBar, { type BottomTabKey } from '@/components/navigation/BottomTabBar';
import ImageViewerModal from '@/components/event/ImageViewerModal';

export type EventGalleryPageProps = Readonly<{
  eventTitle: string;
  images?: ReadonlyArray<string>;
  onBack: () => void;
  bottomTab: BottomTabKey;
  onChangeBottomTab: (key: BottomTabKey) => void;
  startIndex?: number;
}>;

const FALLBACK_IMAGES: ReadonlyArray<string> = [
  'https://picsum.photos/seed/evg1/900/700',
  'https://picsum.photos/seed/evg2/900/700',
  'https://picsum.photos/seed/evg3/900/700',
  'https://picsum.photos/seed/evg4/900/700',
  'https://picsum.photos/seed/evg5/900/700',
  'https://picsum.photos/seed/evg6/900/700',
  'https://picsum.photos/seed/evg7/900/700',
  'https://picsum.photos/seed/evg8/900/700',
  'https://picsum.photos/seed/evg9/900/700',
  'https://picsum.photos/seed/evg10/900/700',
];

export default function EventGalleryPage({
  eventTitle,
  images,
  onBack,
  bottomTab,
  onChangeBottomTab,
  startIndex,
}: EventGalleryPageProps): ReactElement {
  const insets = useSafeAreaInsets();

  const data = useMemo(
    () => (images && images.length > 0 ? images : FALLBACK_IMAGES),
    [images]
  );

  const [viewerOpen, setViewerOpen] = useState<boolean>(typeof startIndex === 'number');
  const [current, setCurrent] = useState<number>(startIndex ?? 0);

  const openViewer = (index: number): void => {
    setCurrent(index);
    setViewerOpen(true);
  };

  const { width } = Dimensions.get('window');
  const horizontalPad = 20;
  const gap = 12;
  const colWidth = Math.floor((width - horizontalPad * 2 - gap) / 2);

  const bottomPad = (insets.bottom || 0) + 80;

  return (
    <SafeAreaView edges={['left', 'right']} className="flex-1 bg-white">
      <View className="px-5 py-3 flex-row items-center justify-between border-b border-gray200">
        <View className="flex-row items-center gap-x-3">
          <Pressable
            accessibilityRole="button"
            onPress={onBack}
            className="h-9 w-9 rounded-full items-center justify-center active:opacity-80"
          >
            <Feather name="arrow-left" size={20} color="#111827" />
          </Pressable>
          <View>
            <Text className="text-xl font-semibold text-black">Event Gallery</Text>
            <Text className="text-sm text-gray600">{eventTitle}</Text>
          </View>
        </View>

        <Text className="text-gray600">{data.length} photos</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: horizontalPad, paddingBottom: bottomPad }}
        contentContainerClassName="pt-6"
      >
        <View className="flex-row flex-wrap justify-between">
          {data.map((uri, i) => (
            <Pressable
              key={`${uri}-${i}`}
              onPress={() => openViewer(i)}
              className="rounded-2xl overflow-hidden mb-3 bg-gray100 border border-gray200 active:opacity-90"
              style={{ width: colWidth, height: Math.round(colWidth * 1.05) }}
            >
              <Image source={{ uri }} style={{ width: '100%', height: '100%' }} />
            </Pressable>
          ))}
        </View>
      </ScrollView>

      <BottomTabBar activeKey={bottomTab} onChange={onChangeBottomTab} />

      <ImageViewerModal
        visible={viewerOpen}
        images={data}
        startIndex={current}
        onClose={() => setViewerOpen(false)}
        onIndexChange={setCurrent}
      />
    </SafeAreaView>
  );
}
