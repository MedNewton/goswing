import React, { type ReactElement } from 'react';
import { View, Text, Pressable } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import Card from '@/components/ui/Card';

export type OrganizerCardProps = Readonly<{
  organizer: string;
}>;

export default function OrganizerCard({ organizer }: OrganizerCardProps): ReactElement {
  const { t } = useTranslation();
  return (
    <View className="px-5 mt-4">
      <Card variant="outlined" padding="md">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-x-3">
            <View className="h-10 w-10 rounded-full bg-gray200 items-center justify-center">
              <Text className="text-gray800 font-medium">{organizer.slice(0, 2).toUpperCase()}</Text>
            </View>
            <View>
              <Text className="text-gray900 font-medium">{organizer}</Text>
              <View className="flex-row items-center gap-x-1">
                <Feather name="star" size={14} color="#F59E0B" />
                <Text className="text-xs text-gray600">{t('event.organizerCard.followers')}</Text>
              </View>
            </View>
          </View>
          <Pressable className="rounded-full border border-gray300 px-3 py-1.5 bg-white">
            <Text className="text-sm text-gray800">{t('event.organizerCard.follow')}</Text>
          </Pressable>
        </View>
      </Card>
    </View>
  );
}
