import React, { type ReactElement } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

export type SegKey = 'active' | 'past';

export type SegmentedTabsCounts = Readonly<{
  active: number;
  past: number;
}>;

export default function SegmentedTabs({
  active,
  onChange,
  counts,
}: {
  active: SegKey;
  onChange: (key: SegKey) => void;
  counts: SegmentedTabsCounts;
}): ReactElement {
  const { t } = useTranslation();
  const activeCount = Number.isFinite(counts?.active) ? Math.max(0, Math.trunc(counts.active)) : 0;
  const pastCount = Number.isFinite(counts?.past) ? Math.max(0, Math.trunc(counts.past)) : 0;

  const Pill = ({ label, keyv }: { label: string; keyv: SegKey }) => {
    const selected = active === keyv;
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ selected }}
        onPress={() => onChange(keyv)}
        className={[
          'flex-1 items-center py-2 rounded-full',
          selected ? 'bg-white border border-gray300' : 'bg-transparent',
        ].join(' ')}
      >
        <Text className={selected ? 'text-gray900 font-medium' : 'text-gray600 font-medium'}>
          {label}
        </Text>
      </Pressable>
    );
  };

  return (
    <View className="flex-row items-center rounded-full bg-gray100 p-1 border border-gray200">
      <Pill label={t('reservations.activeTab', { count: activeCount })} keyv="active" />
      <Pill label={t('reservations.pastTab', { count: pastCount })} keyv="past" />
    </View>
  );
}
