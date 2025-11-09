import React, { type ReactElement } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export type FloatingBookButtonProps = Readonly<{
  onPress?: () => void;
}>;

export default function FloatingBookButton({ onPress }: FloatingBookButtonProps): ReactElement {
  const insets = useSafeAreaInsets();
  return (
    <View className="absolute inset-x-5" style={{ bottom: (insets.bottom || 0) + 72 }}>
      <Pressable
        onPress={onPress}
        className="rounded-2xl bg-black px-6 py-4 items-center justify-center"
        style={{
          shadowColor: '#000',
          shadowOpacity: 0.25,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 6 },
          elevation: 8,
        }}
      >
        <Text className="text-white text-base font-semibold">Book Now</Text>
      </Pressable>
    </View>
  );
}
