// screens/discover/components/SectionTitle.tsx — "All events today   6 events   See all".
import React, { type ReactElement, type ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { gs } from '@/theme/colors';

export default function SectionTitle({
  title,
  icon,
  count,
  onSeeAll,
  className,
}: Readonly<{ title: string; icon?: ReactNode; count?: string | null; onSeeAll?: () => void; className?: string }>): ReactElement {
  const { t } = useTranslation();
  return (
    <View className={`flex-row items-center px-5 ${className ?? ''}`}>
      {icon ? <View className="mr-2">{icon}</View> : null}
      <Text className="flex-1 text-[22px] font-extrabold text-ink" numberOfLines={1} accessibilityRole="header">
        {title}
      </Text>
      {count ? <Text className="ml-2 text-[13px] font-semibold text-muted">{count}</Text> : null}
      {onSeeAll ? (
        <Pressable
          onPress={onSeeAll}
          accessibilityRole="button"
          accessibilityLabel={`${t('gs.seeAll')} · ${title}`}
          hitSlop={10}
          className="ml-3 min-h-[44px] justify-center"
        >
          <Text className="text-[15px] font-extrabold" style={{ color: gs.violet }}>
            {t('gs.seeAll')}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}
