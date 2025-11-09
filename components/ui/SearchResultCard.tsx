import React, { memo, type ReactElement } from 'react';
import { Image, Pressable, Text, View, type ImageProps, type ViewProps } from 'react-native';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import { Feather } from '@expo/vector-icons';

export type SearchResultItem = Readonly<{
  id: string;
  title: string;
  organizer: string;
  city?: string | null;
  venue?: string | null;
  startsAtIso?: string | null;
  priceLabel?: string | null;
  rating?: number | null;
  thumbnailUrl?: string | null;
}>;

export type SearchResultCardProps = Readonly<
  {
    item: SearchResultItem;
    onPress?: (id: string) => void;
    className?: string;
    imageProps?: Omit<ImageProps, 'source'>;
  } & Omit<ViewProps, 'children'>
>;

const cx = (...c: ReadonlyArray<string | null | undefined | false>): string =>
  c.filter(Boolean).join(' ');

function formatDateTime(
  iso?: string | null
): { date: string; time: string } | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const date = d.toLocaleDateString(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  const time = d.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });
  return { date, time };
}

function SearchResultCardBase({
  item,
  onPress,
  className,
  imageProps,
  ...rest
}: SearchResultCardProps): ReactElement {
  const dt = formatDateTime(item.startsAtIso);

  return (
    <Card {...rest} variant="outlined" padding="md" className={cx('overflow-hidden', className)}>
      <Pressable onPress={() => onPress?.(item.id)} className="active:opacity-95">
        <View className="flex-row">
          <View className="mr-3">
            <View className="h-20 w-20 items-center justify-center rounded-2xl border-2 border-brand/70 bg-white overflow-hidden">
              {item.thumbnailUrl ? (
                <Image source={{ uri: item.thumbnailUrl }} className="h-full w-full" {...imageProps} />
              ) : (
                <Feather name="image" size={24} color="#9CA3AF" />
              )}
            </View>
          </View>

          <View className="flex-1">
            <Text numberOfLines={1} className="text-base font-semibold text-black pr-16">
              {item.title}
            </Text>

            <Text numberOfLines={2} className="mt-0.5 text-sm text-gray600">
              By {item.organizer}
              {item.city ? `\n${item.city}` : ''}
            </Text>

            <View className="mt-2 flex-row items-center gap-x-3">
              {dt ? (
                <>
                  <View className="flex-row items-center gap-x-1">
                    <Feather name="calendar" size={14} color="#6B7280" />
                    <Text className="text-xs text-gray600">{dt.date}</Text>
                  </View>
                  <View className="flex-row items-center gap-x-1">
                    <Feather name="clock" size={14} color="#6B7280" />
                    <Text className="text-xs text-gray600">{dt.time}</Text>
                  </View>
                </>
              ) : null}
            </View>

            {item.venue ? (
              <View className="mt-1.5 flex-row items-center gap-x-1">
                <Feather name="map-pin" size={14} color="#6B7280" />
                <Text numberOfLines={1} className="text-xs text-gray600">
                  {item.venue}
                </Text>
              </View>
            ) : null}
          </View>

          <View className="ml-2 items-end justify-start">
            {item.priceLabel ? (
              <Badge label={item.priceLabel} tone="brand" variant="solid" size="sm" className="rounded-full" />
            ) : null}

            {typeof item.rating === 'number' ? (
              <View className="mt-2 flex-row items-center gap-x-1">
                <Feather name="star" size={14} color="#F59E0B" />
                <Text className="text-sm text-gray700">{item.rating.toFixed(1)}</Text>
              </View>
            ) : null}
          </View>
        </View>
      </Pressable>
    </Card>
  );
}

export default memo(SearchResultCardBase);
