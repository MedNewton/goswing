// src/components/blocks/EventCard.tsx
import React, { type ReactElement, memo } from 'react';
import {
  Image,
  Pressable,
  Text,
  View,
  ViewProps,
  type ImageProps,
} from 'react-native';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import IconButton from '@/components/ui/IconButton';

export type Attendee = Readonly<{
  id: string;
  initials: string; // e.g., "U1"
}>;

export type EventItem = Readonly<{
  id: string;
  title: string;
  organizer: string;
  imageUrl: string;
  startsAtIso: string; // ISO date string
  venue: string;
  city?: string;
  priceLabel?: string;  // e.g., "From $25", "Free", "Sold Out"
  favorite?: boolean;
  attendees?: ReadonlyArray<Attendee>;
  attendeesExtraCount?: number; // e.g., 350
}>;

export type EventCardProps = Readonly<
  {
    event: EventItem;
    onPress?: (eventId: string) => void;
    onToggleFavorite?: (eventId: string, next: boolean) => void;
    imageProps?: Omit<ImageProps, 'source'>;
    className?: string; // wrapper Card classes
  } & Omit<ViewProps, 'children'>
>;

const cx = (...classes: ReadonlyArray<string | null | undefined | false>): string =>
  classes.filter(Boolean).join(' ');

const formatDate = (iso: string): string => {
  const d = new Date(iso);
  // Example: "Sep 30, 2025"
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  });
};

const formatTime = (iso: string): string => {
  const d = new Date(iso);
  // Example: "11:00 PM"
  return d.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
};

const Attendees = memo(function Attendees({
  attendees,
  extra,
}: {
  attendees: ReadonlyArray<Attendee>;
  extra: number;
}): ReactElement {
  const shown = attendees.slice(0, 3);

  return (
    <View className="flex-row items-center gap-x-1">
      {shown.map((a) => (
        <View
          key={a.id}
          className="h-6 px-2 rounded-full bg-gray100 border border-gray200 items-center justify-center"
        >
          <Text className="text-xs text-gray700">{a.initials}</Text>
        </View>
      ))}
      {extra > 0 ? (
        <Text className="text-xs text-gray500">+{extra}</Text>
      ) : null}
    </View>
  );
});

export default function EventCard({
  event,
  onPress,
  onToggleFavorite,
  imageProps,
  className,
  ...rest
}: EventCardProps): ReactElement {
  const dateLabel = formatDate(event.startsAtIso);
  const timeLabel = formatTime(event.startsAtIso);

  return (
    <Card
      variant="flat"
      padding="none"
      className={cx('overflow-hidden', className)}
      {...rest}
    >
      {/* Image header */}
      <View className="relative">
        <Image
          source={{ uri: event.imageUrl }}
          className="h-48 w-full"
          resizeMode="cover"
          {...imageProps}
        />

        {/* Top-left price/status badge */}
        {event.priceLabel ? (
          <View className="absolute left-3 top-3">
            <Badge label={event.priceLabel} variant="solid" tone="gray" size="sm" />
          </View>
        ) : null}

        {/* Top-right favorite icon */}
        <View className="absolute right-3 top-3">
          <IconButton
            accessibilityLabel={event.favorite ? 'Remove from favorites' : 'Add to favorites'}
            icon={<Text className="text-lg">{event.favorite ? '❤️' : '🤍'}</Text>}
            variant="ghost"
            tone="gray"
            size="md"
            onPress={() => onToggleFavorite?.(event.id, !event.favorite)}
          />
        </View>
      </View>

      {/* Body */}
      <View className="p-4">
        <Pressable onPress={() => onPress?.(event.id)} className="active:opacity-90">
          <Text className="text-lg font-bold text-black" numberOfLines={2}>
            {event.title}
          </Text>

          <Text className="mt-1 text-sm text-gray600">{event.organizer}</Text>

          {/* Meta rows */}
          <View className="mt-3 gap-y-2">
            <View className="flex-row items-center gap-x-2">
              <Text className="text-base">📅</Text>
              <Text className="text-sm text-gray800">
                {dateLabel}  <Text className="text-gray400">•</Text>  {timeLabel}
              </Text>
            </View>

            <View className="flex-row items-center gap-x-2">
              <Text className="text-base">📍</Text>
              <Text className="text-sm text-gray800" numberOfLines={1}>
                {event.venue}
                {event.city ? `, ${event.city}` : ''}
              </Text>
            </View>
          </View>

          {/* Attendees */}
          {event.attendees && event.attendees.length > 0 ? (
            <View className="mt-3">
              <Attendees
                attendees={event.attendees}
                extra={event.attendeesExtraCount ?? 0}
              />
            </View>
          ) : null}
        </Pressable>
      </View>
    </Card>
  );
}
