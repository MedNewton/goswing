import React, { type ReactElement } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import SearchPageBody from '@/components/sections/SearchPage';

export default function SearchPage(): ReactElement {
  return (
    <SafeAreaView edges={['left', 'right']} className="flex-1 bg-white pt-4">
      <SearchPageBody />
    </SafeAreaView>
  );
}
