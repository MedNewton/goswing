// components/reservations/SegmentedTabs.tsx — "Active (3) | Past (2)" segmented control.
import React, { type ReactElement } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { gs } from '@/theme/colors';
import { softShadow } from '@/components/gs';

export type SegKey = 'active' | 'past';

export type SegmentedTabsCounts = Readonly<{ active: number; past: number }>;

export default function SegmentedTabs({
  active,
  onChange,
  counts,
}: Readonly<{ active: SegKey; onChange: (key: SegKey) => void; counts: SegmentedTabsCounts }>): ReactElement {
  const { t } = useTranslation();
  const items: ReadonlyArray<{ key: SegKey; label: string }> = [
    { key: 'active', label: t('bookings.active', { count: counts.active }) },
    { key: 'past', label: t('bookings.past', { count: counts.past }) },
  ];
  return (
    <View accessibilityRole="tablist" className="flex-row rounded-full p-1" style={{ backgroundColor: '#E9E6F3' }}>
      {items.map((it) => {
        const on = it.key === active;
        return (
          <Pressable
            key={it.key}
            onPress={() => onChange(it.key)}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            className="flex-1 h-[46px] rounded-full items-center justify-center"
            style={on ? [{ backgroundColor: gs.white }, softShadow] : undefined}
          >
            <Text className="text-[15px] font-extrabold" style={{ color: on ? gs.ink : gs.muted }}>
              {it.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
