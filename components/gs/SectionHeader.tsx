// components/gs/SectionHeader.tsx — "Happening now & today        See all".
import React, { type ReactElement, type ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { gs } from '@/theme/colors';
import { cx } from './styles';

export default function SectionHeader({
  title,
  icon,
  actionLabel,
  onAction,
  className,
}: Readonly<{ title: string; icon?: ReactNode; actionLabel?: string; onAction?: () => void; className?: string }>): ReactElement {
  const { t } = useTranslation();
  return (
    <View className={cx('flex-row items-center justify-between px-5', className)}>
      <View className="flex-row items-center flex-1 pr-3">
        {icon ? <View className="mr-2">{icon}</View> : null}
        <Text className="text-[22px] font-extrabold text-ink" numberOfLines={1}>
          {title}
        </Text>
      </View>
      {onAction ? (
        <Pressable onPress={onAction} accessibilityRole="button" hitSlop={8}>
          <Text className="text-[15px] font-bold" style={{ color: gs.violet }}>
            {actionLabel ?? t('gs.seeAll')}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}
