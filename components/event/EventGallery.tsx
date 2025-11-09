import React, { type ReactElement } from 'react';
import { ScrollView, View, Text } from 'react-native';
import { Feather } from '@expo/vector-icons';
import SectionHeader from './SectionHeader';

export default function EventGallery(): ReactElement {
  return (
    <>
      <SectionHeader title="Event Gallery" action="See all" />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerClassName="px-5 gap-x-2 mt-2"
      >
        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => (
          <View key={i} className="items-center">
            <View className="h-32 w-32 rounded-xl bg-gray100 border border-gray200 items-center justify-center" />
            {i === 9 ? (
              <View className="absolute h-24 w-24 rounded-xl flex flex-col items-center justify-center gap-y-1">
                <Feather name="camera" size={18} color="#6B7280" />
                <Text className="text-xs text-gray500 mt-1">+1</Text>
              </View>
            ) : null}
          </View>
        ))}
      </ScrollView>
    </>
  );
}
