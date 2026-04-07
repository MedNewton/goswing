import React, { type ReactElement } from 'react';
import { View, Text } from 'react-native';
import { useTranslation } from 'react-i18next';

export default function AboutSection(): ReactElement {
  const { t } = useTranslation();
  const items = [
    t('event.about.included1'),
    t('event.about.included2'),
    t('event.about.included3'),
    t('event.about.included4'),
  ];
  return (
    <View className="px-2 mt-4">
      <Text className="text-base font-semibold text-black">{t('event.about.title')}</Text>
      <Text className="text-gray700 mt-2">{t('event.about.body')}</Text>

      <Text className="text-sm font-semibold text-black mt-4">{t('event.about.whatsIncluded')}</Text>
      <View className="mt-2 gap-y-1">
        {items.map((line) => (
          <Text key={line} className="text-gray700">• {line}</Text>
        ))}
      </View>
    </View>
  );
}
