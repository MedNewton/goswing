// screens/map/components/EventCarousel.tsx — snapping row of event cards at
// the bottom of the map. Scrolling focuses the map on the centered event;
// the selected pin's card gets a violet border.
import React, { forwardRef, memo, useCallback, useImperativeHandle, useRef, type ReactElement } from 'react';
import {
  FlatList,
  Platform,
  Pressable,
  Text,
  View,
  useWindowDimensions,
  type ListRenderItemInfo,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';

import { gs } from '@/theme/colors';
import Cover from '@/components/gs/Cover';

export type CarouselItem = Readonly<{
  id: string;
  title: string;
  when: string;
  where: string;
  price: string | null;
  imageUrl?: string | null;
  accessibilityLabel: string;
}>;

export type EventCarouselHandle = Readonly<{ scrollToId: (id: string) => void }>;

const GAP = 12;
const SIDE = 24;
export const CAROUSEL_HEIGHT = 128;

export function useCardWidth(): number {
  const { width } = useWindowDimensions();
  return Math.min(318, Math.max(240, width - SIDE * 2 - 24));
}

const Card = memo(function Card({
  item,
  width,
  selected,
  onPress,
}: Readonly<{ item: CarouselItem; width: number; selected: boolean; onPress: (id: string) => void }>): ReactElement {
  return (
    <Pressable
      onPress={() => onPress(item.id)}
      accessibilityRole="button"
      accessibilityLabel={item.accessibilityLabel}
      accessibilityState={{ selected }}
      className="flex-row items-center bg-white rounded-[22px] p-2.5"
      style={{
        width,
        borderWidth: 2,
        borderColor: selected ? gs.violet : gs.white,
        shadowColor: '#14121F',
        shadowOpacity: 0.14,
        shadowRadius: 20,
        shadowOffset: { width: 0, height: 6 },
        elevation: 6,
      }}
    >
      <Cover uri={item.imageUrl} toneKey={item.id} radius={16} style={{ width: 92, height: 92 }} />
      <View className="flex-1 ml-3" style={{ gap: 3 }}>
        <Text className="text-[12px] font-bold" style={{ color: gs.violetDark }} numberOfLines={1}>
          {item.when}
        </Text>
        <Text className="text-[16px] font-extrabold text-ink" style={{ letterSpacing: -0.16 }} numberOfLines={1}>
          {item.title}
        </Text>
        <Text className="text-[12px] font-medium text-muted" numberOfLines={1}>
          {item.where}
        </Text>
        {item.price ? (
          <Text className="mt-0.5 text-[17px] font-extrabold text-ink" numberOfLines={1}>
            {item.price}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
});

export default forwardRef<
  EventCarouselHandle,
  Readonly<{
    items: ReadonlyArray<CarouselItem>;
    selectedId: string | null;
    bottom: number;
    onFocus: (id: string) => void;
    onOpen: (id: string) => void;
  }>
>(function EventCarousel({ items, selectedId, bottom, onFocus, onOpen }, ref): ReactElement {
  const width = useCardWidth();
  const listRef = useRef<FlatList<CarouselItem>>(null);
  const settleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const programmatic = useRef<string | null>(null);
  const step = width + GAP;

  useImperativeHandle(
    ref,
    () => ({
      scrollToId: (id: string) => {
        const index = items.findIndex((i) => i.id === id);
        if (index < 0) return;
        programmatic.current = id;
        listRef.current?.scrollToOffset({ offset: index * step, animated: true });
      },
    }),
    [items, step],
  );

  const settle = useCallback(
    (x: number) => {
      const index = Math.max(0, Math.min(items.length - 1, Math.round(x / step)));
      const item = items[index];
      if (!item) return;
      if (programmatic.current) {
        // Scroll started by a pin tap: don't move the map again.
        const target = programmatic.current;
        programmatic.current = null;
        if (target === item.id) return;
      }
      if (item.id !== selectedId) onFocus(item.id);
    },
    [items, step, selectedId, onFocus],
  );

  const onMomentumEnd = (e: NativeSyntheticEvent<NativeScrollEvent>): void => settle(e.nativeEvent.contentOffset.x);
  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>): void => {
    if (Platform.OS !== 'web') return;
    const x = e.nativeEvent.contentOffset.x;
    if (settleTimer.current) clearTimeout(settleTimer.current);
    settleTimer.current = setTimeout(() => settle(x), 180);
  };

  const renderItem = ({ item }: ListRenderItemInfo<CarouselItem>): ReactElement => (
    <Card item={item} width={width} selected={item.id === selectedId} onPress={onOpen} />
  );

  return (
    <View pointerEvents="box-none" className="absolute left-0 right-0" style={{ bottom }}>
      <FlatList
        ref={listRef}
        horizontal
        data={items as CarouselItem[]}
        keyExtractor={(i) => i.id}
        renderItem={renderItem}
        showsHorizontalScrollIndicator={false}
        snapToInterval={step}
        snapToAlignment="start"
        decelerationRate="fast"
        disableIntervalMomentum
        contentContainerStyle={{ paddingHorizontal: SIDE, paddingTop: 6, paddingBottom: 10 }}
        ItemSeparatorComponent={() => <View style={{ width: GAP }} />}
        onMomentumScrollEnd={onMomentumEnd}
        onScroll={onScroll}
        scrollEventThrottle={32}
        getItemLayout={(_, index) => ({ length: step, offset: SIDE + index * step, index })}
        extraData={selectedId}
      />
    </View>
  );
});
