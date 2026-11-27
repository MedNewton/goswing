// components/gs/ScreenHeader.tsx — back button + title for pushed screens.
import React, { type ReactElement, type ReactNode } from 'react';
import { Text, View } from 'react-native';
import { ChevronLeft } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { gs } from '@/theme/colors';
import RoundButton from './RoundButton';
import { cx } from './styles';

export default function ScreenHeader({
  title,
  onBack,
  right,
  large = false,
  className,
}: Readonly<{ title?: string; onBack?: () => void; right?: ReactNode; large?: boolean; className?: string }>): ReactElement {
  const { t } = useTranslation();
  return (
    <View className={cx('px-4 pt-2 pb-3', className)}>
      <View className="flex-row items-center justify-between min-h-[48px]">
        {onBack ? (
          <RoundButton
            icon={<ChevronLeft size={24} color={gs.ink} />}
            onPress={onBack}
            accessibilityLabel={t('gs.back')}
            size={44}
          />
        ) : (
          <View />
        )}
        {!large && title ? (
          <Text className="absolute left-16 right-16 text-center text-[17px] font-extrabold text-ink" numberOfLines={1}>
            {title}
          </Text>
        ) : null}
        <View className="flex-row items-center gap-x-2">{right}</View>
      </View>
      {large && title ? <Text className="mt-3 text-[34px] leading-[40px] font-extrabold text-ink">{title}</Text> : null}
    </View>
  );
}
