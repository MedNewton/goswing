import React, { type ReactElement } from 'react';
import { View, Text, ScrollView, type ViewProps } from 'react-native';
import { useTranslation } from 'react-i18next';
import Chip from '@/components/ui/Chip';

export type WhenKey = 'tonight' | 'tomorrow' | 'this_week' | 'this_weekend' | 'next_week' | 'next_weekend' | 'this_month';

export type WhenSliderProps = Readonly<
  {
    title?: string;
    activeKey: WhenKey | null;
    onChange: (key: WhenKey | null) => void;
    className?: string;
    contentClassName?: string;
  } & Omit<ViewProps, 'children'>
>;

const cx = (...classes: ReadonlyArray<string | null | undefined | false>): string =>
  classes.filter(Boolean).join(' ');

const items: ReadonlyArray<{ key: WhenKey; labelKey: string }> = [
  { key: 'tonight', labelKey: 'when.tonight' },
  { key: 'tomorrow', labelKey: 'when.tomorrow' },
  { key: 'this_week', labelKey: 'when.thisWeek' },
  { key: 'this_weekend', labelKey: 'when.thisWeekend' },
  { key: 'next_week', labelKey: 'when.nextWeek' },
  { key: 'next_weekend', labelKey: 'when.nextWeekend' },
  { key: 'this_month', labelKey: 'when.thisMonth' },
] as const;

export default function WhenSlider({
  title,
  activeKey,
  onChange,
  className,
  contentClassName,
  ...rest
}: WhenSliderProps): ReactElement {
  const { t } = useTranslation();
  const resolvedTitle = title ?? t('when.title');

  return (
    <View {...rest} className={cx('w-full', className)}>
      <View className="px-4 mb-3">
        <Text className="text-lg font-bold text-black">{resolvedTitle}</Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerClassName={cx('px-3 gap-x-2', contentClassName)}
      >
        {items.map((it) => {
          const selected = it.key === activeKey;
          return (
            <Chip
              key={it.key}
              label={t(it.labelKey)}
              selected={selected}
              variant="outline"
              tone={selected ? 'brand' : 'gray'}
              size="md"
              onPress={() => onChange(selected ? null : it.key)}
            />
          );
        })}
      </ScrollView>
    </View>
  );
}
