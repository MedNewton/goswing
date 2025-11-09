import React, { type ReactElement } from 'react';
import { View, Text } from 'react-native';
import { Feather } from '@expo/vector-icons';

function Chip({
  bgClass,
  icon,
  label,
  darkText,
  darkIcon,
}: {
  bgClass: string;
  icon: keyof typeof Feather.glyphMap;
  label: string;
  darkText?: boolean;
  darkIcon?: boolean;
}): ReactElement {
  return (
    <View className={`flex-row items-center gap-x-2 rounded-xl px-3 py-2 ${bgClass}`}>
      <Feather name={icon} size={14} color={darkIcon ? '#111827' : '#FFFFFF'} />
      <Text className={`text-sm ${darkText ? 'text-black' : 'text-white'}`}>{label}</Text>
    </View>
  );
}

export default function ActionChips(): ReactElement {
  return (
    <View className="px-5 mt-4 flex-row items-center gap-x-2">
      <Chip bgClass="bg-black" icon="music" label="Suggest Songs" />
      <Chip bgClass="bg-indigo-600" icon="camera" label="Take Story" />
      <Chip bgClass="bg-amber-400" icon="star" label="Give Review" darkText darkIcon />
    </View>
  );
}
