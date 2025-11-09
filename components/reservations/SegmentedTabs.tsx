import React, { type ReactElement } from 'react';
import { Pressable, Text, View } from 'react-native';

export type SegKey = 'active' | 'past';

export default function SegmentedTabs({
  active,
  onChange,
}: {
  active: SegKey;
  onChange: (key: SegKey) => void;
}): ReactElement {
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
      <Pill label="Active (2)" keyv="active" />
      <Pill label="Past (1)" keyv="past" />
    </View>
  );
}
