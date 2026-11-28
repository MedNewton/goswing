// navigation/AppNav.tsx
// Tab + stack navigation shared by every screen, without prop drilling.
//
//   const nav = useAppNav();
//   nav.push({ name: 'place', place });
//   nav.openEvent(eventId);          // resolves the event, then pushes it
//   nav.switchTab('bookings', { bookingsTab: 'past' });
import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react';

import type { EventTab, Route, TabKey } from '@/navigation/routes';

export type TabParams = Readonly<{
  /** Bookings tab: which segment to show when switching to it. */
  bookingsTab?: 'active' | 'past';
}>;

export type AppNavValue = Readonly<{
  tab: TabKey;
  tabParams: TabParams;
  stack: ReadonlyArray<Route>;
  top: Route | null;
  switchTab: (tab: TabKey, params?: TabParams) => void;
  push: (route: Route) => void;
  back: () => void;
  /** Close every pushed screen and stay on the current tab. */
  resetStack: () => void;
  /** Open an event by id; uses the loaded list or fetches it. */
  openEvent: (eventId: string, initialTab?: EventTab) => void;
}>;

const AppNavContext = createContext<AppNavValue | null>(null);

export function AppNavProvider({
  children,
  initialTab = 'map',
  resolveEvent,
}: Readonly<{
  children: ReactNode;
  initialTab?: TabKey;
  /** Supplied by the shell so navigation can open an event from just its id. */
  resolveEvent: (eventId: string, initialTab?: EventTab) => Promise<Route | null>;
}>): ReactElement {
  const [tab, setTab] = useState<TabKey>(initialTab);
  const [tabParams, setTabParams] = useState<TabParams>({});
  const [stack, setStack] = useState<ReadonlyArray<Route>>([]);

  const push = useCallback((route: Route) => setStack((prev) => [...prev, route]), []);
  const back = useCallback(() => setStack((prev) => prev.slice(0, -1)), []);
  const resetStack = useCallback(() => setStack([]), []);

  const switchTab = useCallback((next: TabKey, params?: TabParams) => {
    if (next === 'social') return; // Social ships later; the tab is disabled.
    setTab(next);
    setTabParams(params ?? {});
    setStack([]);
  }, []);

  const openEvent = useCallback(
    (eventId: string, initialEventTab?: EventTab) => {
      void resolveEvent(eventId, initialEventTab).then((route) => {
        if (route) setStack((prev) => [...prev, route]);
      });
    },
    [resolveEvent],
  );

  const value = useMemo<AppNavValue>(
    () => ({
      tab,
      tabParams,
      stack,
      top: stack[stack.length - 1] ?? null,
      switchTab,
      push,
      back,
      resetStack,
      openEvent,
    }),
    [tab, tabParams, stack, switchTab, push, back, resetStack, openEvent],
  );

  return <AppNavContext.Provider value={value}>{children}</AppNavContext.Provider>;
}

export function useAppNav(): AppNavValue {
  const ctx = useContext(AppNavContext);
  if (!ctx) throw new Error('useAppNav must be used inside <AppNavProvider>');
  return ctx;
}
