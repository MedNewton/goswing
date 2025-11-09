import React, { useEffect, useRef, useState, type ReactElement } from 'react';
import {
  Dimensions,
  FlatList,
  Image,
  Modal,
  Pressable,
  StatusBar,
  View,
  Text,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

export type ImageViewerModalProps = Readonly<{
  visible: boolean;
  images: ReadonlyArray<string>;
  startIndex?: number;
  onClose: () => void;
  onIndexChange?: (i: number) => void;
}>;

export default function ImageViewerModal({
  visible,
  images,
  startIndex = 0,
  onClose,
  onIndexChange,
}: ImageViewerModalProps): ReactElement {
  const listRef = useRef<FlatList<string>>(null);
  const [index, setIndex] = useState<number>(Math.min(Math.max(startIndex, 0), images.length - 1));

  useEffect(() => {
    if (visible && listRef.current) {
      requestAnimationFrame(() => {
        listRef.current?.scrollToIndex({ index, animated: false });
      });
    }
  }, [visible]);

  const handleViewableChanged = useRef(
    ({ viewableItems }: { viewableItems: Array<{ index?: number }> }) => {
      const i = viewableItems?.[0]?.index;
      if (typeof i === 'number') {
        setIndex(i);
        onIndexChange?.(i);
      }
    }
  );

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <StatusBar barStyle="light-content" />
      <SafeAreaView edges={['left', 'right']} className="flex-1 bg-black">
        <Pressable
          accessibilityRole="button"
          onPress={onClose}
          className="absolute right-4 top-16 z-20 h-10 w-10 rounded-full items-center justify-center"
          style={{ backgroundColor: 'rgba(255,255,255,0.18)' }}
        >
          <Feather name="x" size={22} color="#FFFFFF" />
        </Pressable>

        <FlatList
          ref={listRef}
          data={images as string[]}
          keyExtractor={(uri, i) => `${i}-${uri}`}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onViewableItemsChanged={(info) => handleViewableChanged.current(info as any)}
          viewabilityConfig={{ itemVisiblePercentThreshold: 60 }}
          renderItem={({ item }) => (
            <View style={{ width, height }} className="items-center justify-center">
              <Image
                source={{ uri: item }}
                resizeMode="contain"
                style={{ width: width, height: height }}
              />
            </View>
          )}
        />

        <View className="absolute bottom-6 left-0 right-0 items-center">
          <Text className="text-white/80">{index + 1} / {images.length}</Text>
        </View>
      </SafeAreaView>
    </Modal>
  );
}
