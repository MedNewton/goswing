// screens/discover/DiscoverTab.tsx — Discover tab root.
// Foundation placeholder: the existing search page. The Discover area PR
// replaces this with the redesigned Discover tab.
import React, { type ReactElement } from 'react';
import SearchPage from '@/pages/SearchPage';
import { useAppNav } from '@/navigation/AppNav';

export default function DiscoverTab(): ReactElement {
  const nav = useAppNav();
  return <SearchPage onOpenEvent={(event, initialTab) => nav.push({ name: 'eventDetails', event, initialTab })} />;
}
