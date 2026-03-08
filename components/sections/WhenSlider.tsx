import React, { type ReactElement } from 'react';
import { View, Text, ScrollView, type ViewProps } from 'react-native';
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

const items: ReadonlyArray<{ key: WhenKey; label: string }> = [
  { key: 'tonight',      label: 'Tonight' },
  { key: 'tomorrow',     label: 'Tomorrow' },
  { key: 'this_week',    label: 'This Week' },
  { key: 'this_weekend', label: 'This Weekend' },
  { key: 'next_week',    label: 'Next Week' },
  { key: 'next_weekend', label: 'Next Weekend' },
  { key: 'this_month',   label: 'This Month' },
] as const;

export default function WhenSlider({
  title = 'When',
  activeKey,
  onChange,
  className,
  contentClassName,
  ...rest
}: WhenSliderProps): ReactElement {
  return (
    <View {...rest} className={cx('w-full', className)}>
      <View className="px-4 mb-3">
        <Text className="text-lg font-bold text-black">{title}</Text>
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
              label={it.label}
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
