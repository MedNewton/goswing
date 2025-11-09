import React, { type ReactElement } from 'react';
import { View, Text } from 'react-native';
import { Feather } from '@expo/vector-icons';

export type TitleMetaProps = Readonly<{
  title: string;
  dateLabel: string | null;
  timeLabel: string | null;
  venue: string | null;
  city: string | null;
}>;

export default function TitleMeta({
  title,
  dateLabel,
  timeLabel,
  venue,
  city,
}: TitleMetaProps): ReactElement {
  return (
    <View className="px-5 mt-4">
      <Text className="text-xl font-semibold text-black">{title}</Text>

      <View className="mt-3 flex-row items-center gap-x-3">
        {dateLabel ? (
          <View className="flex-row items-center gap-x-1">
            <Feather name="calendar" size={16} color="#6B7280" />
            <Text className="text-sm text-gray700">{dateLabel}</Text>
          </View>
        ) : null}
        {timeLabel ? (
          <View className="flex-row items-center gap-x-1">
            <Feather name="clock" size={16} color="#6B7280" />
            <Text className="text-sm text-gray700">{timeLabel}</Text>
          </View>
        ) : null}
      </View>

      {(venue || city) && (
        <View className="mt-2 flex-row items-center gap-x-1">
          <Feather name="map-pin" size={16} color="#6B7280" />
          <Text className="text-sm text-gray700">
            {venue ?? ''}{venue && city ? ', ' : ''}{city ?? ''}
          </Text>
        </View>
      )}
    </View>
  );
}
