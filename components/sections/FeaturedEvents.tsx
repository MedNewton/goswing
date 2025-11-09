import React, { type ReactElement } from 'react';
import { View, Text, Pressable, type ViewProps } from 'react-native';
import EventCard, { type EventItem } from '@/components/blocks/EventCard';

export type FeaturedEventsProps = Readonly<{
  title?: string;
  events: ReadonlyArray<EventItem>;
  onPressEvent?: (eventId: string) => void;
  onToggleFavorite?: (eventId: string, next: boolean) => void;
  onPressSeeAll?: () => void;
  className?: string;
  contentClassName?: string;
} & Omit<ViewProps, 'children'>>;

const cx = (...c: ReadonlyArray<string | null | undefined | false>): string =>
  c.filter(Boolean).join(' ');

export default function FeaturedEvents({
  title = 'Featured Events',
  events,
  onPressEvent,
  onToggleFavorite,
  onPressSeeAll,
  className,
  contentClassName,
  ...rest
}: FeaturedEventsProps): ReactElement {
  return (
    <View {...rest} className={cx('w-full', className)}>
      <View className="px-5 mt-1 mb-4 flex-row items-center justify-between">
        <Text className="text-base font-semibold text-black">{title}</Text>
        {onPressSeeAll ? (
          <Pressable accessibilityRole="button" onPress={onPressSeeAll} className="active:opacity-90">
            <Text className="text-sm text-gray700 font-medium">See All</Text>
          </Pressable>
        ) : null}
      </View>

      <View className={cx('px-2 gap-y-4', contentClassName)}>
        {events.map((ev) => (
          <EventCard
            key={ev.id}
            event={ev}
            onPress={onPressEvent}
            onToggleFavorite={onToggleFavorite}
          />
        ))}
      </View>
    </View>
  );
}
