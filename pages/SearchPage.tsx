// pages/SearchPage.tsx
import React, { type ReactElement } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import SearchPageBody from '@/components/sections/SearchPage';

/**
 * Screen wrapper for the Search experience.
 * Uses the reusable body from components/sections/SearchPage.
 */
export default function SearchPage(): ReactElement {
  return (
    <SafeAreaView edges={['top', 'left', 'right']} className="flex-1 bg-white">
      <SearchPageBody />
    </SafeAreaView>
  );
}
