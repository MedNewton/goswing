import React, { type ReactElement } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import SearchPageBody, { type SearchPageProps as SearchPageBodyProps } from '@/components/sections/SearchPage';

export type SearchPageProps = Readonly<{
  onOpenEvent?: SearchPageBodyProps['onOpenEvent'];
}>;

export default function SearchPage({ onOpenEvent }: SearchPageProps): ReactElement {
  return (
    <SafeAreaView edges={['left', 'right']} className="flex-1 bg-white pt-4">
      <SearchPageBody onOpenEvent={onOpenEvent} />
    </SafeAreaView>
  );
}
