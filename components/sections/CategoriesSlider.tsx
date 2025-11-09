// components/sections/CategoriesSlider.tsx
import React, { type ReactElement } from 'react';
import { ScrollView, View, Text, type ViewProps } from 'react-native';
import Chip from '@/components/ui/Chip';

export type CategoryItem = Readonly<{
  key: string;
  label: string;
  emoji?: string | null; // ignored in this design
  disabled?: boolean;
}>;

export type CategoriesSliderProps = Readonly<
  {
    title?: string;
    categories: ReadonlyArray<CategoryItem>;
    activeKeys: ReadonlyArray<string>;
    onToggle: (key: string, nextSelected: boolean) => void;
    singleSelect?: boolean;
    className?: string;
    contentClassName?: string;
  } & Omit<ViewProps, 'children'>
>;

const cx = (...classes: ReadonlyArray<string | null | undefined | false>): string =>
  classes.filter(Boolean).join(' ');

// simple color palette per category key (adjust as you like)
const catColor: Record<string, string> = {
  music:   '#EF4444', // red-500
  sports:  '#F59E0B', // amber-500
  nightlife: '#F97316', // orange-500
  outdoor: '#22C55E', // green-500
  business: '#0EA5E9', // sky-500
  networking: '#8B5CF6', // violet-500
  food: '#E11D48', // rose-600
  family: '#14B8A6', // teal-500
  arts: '#A855F7', // purple-500
  tech: '#06B6D4', // cyan-500
};

function Dot({ color }: { color: string }): ReactElement {
  return <View style={{ backgroundColor: color }} className="h-3 w-3 rounded-full" />;
}

export default function CategoriesSlider({
  title = 'Browse by Category',
  categories,
  activeKeys,
  onToggle,
  singleSelect = false,
  className,
  contentClassName,
  ...rest
}: CategoriesSliderProps): ReactElement {
  const isActive = (key: string): boolean => activeKeys.includes(key);

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
        {categories.map((cat) => {
          const selected = isActive(cat.key);
          const color = catColor[cat.key] ?? '#0EA5E9';

          return (
            <Chip
              key={cat.key}
              label={cat.label}
              selected={selected}
              variant="outline"
              tone={selected ? 'brand' : 'gray'}
              size="md"
              disabled={cat.disabled}
              leading={<Dot color={color} />}
              onPress={() => {
                if (singleSelect) {
                  onToggle(cat.key, !selected);
                } else {
                  onToggle(cat.key, !selected);
                }
              }}
            />
          );
        })}
      </ScrollView>
    </View>
  );
}
