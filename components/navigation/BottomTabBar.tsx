// components/navigation/BottomTabBar.tsx — floating tab bar of the redesign.
// Social is shown but disabled until the Social area ships.
import React, { memo, useState, type ReactElement } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Compass, Map as MapIcon, Ticket, User, Users, type LucideIcon } from 'lucide-react-native';

import { gs } from '@/theme/colors';
import { floatShadow } from '@/components/gs/styles';
import type { TabKey } from '@/navigation/routes';

/** Kept for older imports; the redesign uses `TabKey`. */
export type BottomTabKey = TabKey;

type Item = Readonly<{ key: TabKey; labelKey: string; Icon: LucideIcon; disabled?: boolean }>;

const ITEMS: ReadonlyArray<Item> = [
  { key: 'map', labelKey: 'gs.tab.map', Icon: MapIcon },
  { key: 'discover', labelKey: 'gs.tab.discover', Icon: Compass },
  { key: 'bookings', labelKey: 'gs.tab.bookings', Icon: Ticket },
  { key: 'social', labelKey: 'gs.tab.social', Icon: Users, disabled: true },
  { key: 'profile', labelKey: 'gs.tab.profile', Icon: User },
];

/** Height of the bar itself, without the safe-area inset. Screens pad by this. */
export const TAB_BAR_HEIGHT = 70;

export function useTabBarSpace(): number {
  const insets = useSafeAreaInsets();
  return TAB_BAR_HEIGHT + Math.max(insets.bottom, 12) + 12;
}

export type BottomTabBarProps = Readonly<{
  activeKey: TabKey;
  onChange: (key: TabKey) => void;
  badges?: Partial<Record<TabKey, number>>;
}>;

export default memo(function BottomTabBar({ activeKey, onChange, badges }: BottomTabBarProps): ReactElement {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [hint, setHint] = useState<boolean>(false);

  return (
    <View pointerEvents="box-none" className="absolute inset-x-0 bottom-0 px-4" style={{ paddingBottom: Math.max(insets.bottom, 12) }}>
      {hint ? (
        <View className="self-center mb-2 rounded-full px-4 py-2" style={{ backgroundColor: gs.ink }}>
          <Text className="text-[13px] font-semibold text-white">{t('gs.tab.socialSoon')}</Text>
        </View>
      ) : null}
      <View
        className="flex-row items-center rounded-[28px] bg-white px-2"
        style={[{ height: TAB_BAR_HEIGHT }, floatShadow]}
      >
        {ITEMS.map(({ key, labelKey, Icon, disabled }) => {
          const selected = key === activeKey;
          const color = disabled ? gs.faint : selected ? gs.violet : gs.subtle;
          const badge = badges?.[key];
          return (
            <Pressable
              key={key}
              accessibilityRole="tab"
              accessibilityState={{ selected, disabled }}
              accessibilityLabel={disabled ? `${t(labelKey)}, ${t('gs.comingSoon')}` : t(labelKey)}
              onPress={() => {
                if (disabled) {
                  setHint(true);
                  setTimeout(() => setHint(false), 1800);
                  return;
                }
                onChange(key);
              }}
              className="flex-1 items-center justify-center"
            >
              <View
                className="h-8 w-[52px] items-center justify-center rounded-full"
                style={{ backgroundColor: selected ? gs.violetSoft : 'transparent' }}
              >
                <Icon size={22} color={color} strokeWidth={selected ? 2.4 : 2} />
                {badge ? (
                  <View
                    className="absolute -top-1.5 right-1.5 min-w-[18px] h-[18px] px-1 rounded-full items-center justify-center border-2 border-white"
                    style={{ backgroundColor: gs.pink }}
                  >
                    <Text className="text-[10px] font-bold text-white">{badge > 9 ? '9+' : badge}</Text>
                  </View>
                ) : null}
              </View>
              <Text className="mt-1 text-[11px] font-bold" style={{ color }} numberOfLines={1}>
                {t(labelKey)}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
});
