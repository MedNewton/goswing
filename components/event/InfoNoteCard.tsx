import React, { type ReactElement } from 'react';
import { View, Text } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import Card from '@/components/ui/Card';

export default function InfoNoteCard(): ReactElement {
  const { t } = useTranslation();
  return (
    <View className="px-5 mt-5">
      <Card variant="outlined" padding="md">
        <View className="flex-row items-start gap-x-2">
          <Feather name="info" size={14} color="#6B7280" style={{ marginTop: 2 }} />
          <View className="flex-1">
            <Text className="text-gray800 font-medium">{t('event.infoNote.demoActiveLabel')}</Text>
            <Text className="text-gray700 mt-1">
              {t('event.infoNote.demoActiveBody')}
            </Text>
          </View>
        </View>
      </Card>
    </View>
  );
}
