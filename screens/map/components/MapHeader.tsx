// screens/map/components/MapHeader.tsx — floating header over the map:
// GoSwing logo pill, city pill (opens the location menu) and category chips.
import React, { type ReactElement } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { ChevronDown } from 'lucide-react-native';
import Svg, { Circle as SvgCircle, Path } from 'react-native-svg';

import { gs } from '@/theme/colors';
import { MAP_CATEGORIES, type MapCategory } from '../model';

const pillShadow = {
  shadowColor: '#14121F',
  shadowOpacity: 0.1,
  shadowRadius: 10,
  shadowOffset: { width: 0, height: 2 },
  elevation: 4,
} as const;

/** Filled "navigation" arrow used by the prototype for location actions. */
export function NavArrow({ size = 16, color = gs.violet }: Readonly<{ size?: number; color?: string }>): ReactElement {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M21 3L3 10.5l7.5 2.9L13.4 21z" fill={color} />
    </Svg>
  );
}

export function GoSwingMark({ size = 32 }: Readonly<{ size?: number }>): ReactElement {
  return (
    <View
      style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: gs.violet }}
      className="items-center justify-center"
    >
      <Svg width={size * 0.56} height={size * 0.56} viewBox="0 0 24 24" fill="none">
        <Path d="M4 15c2.5-6 5-6 8 0s5.5 6 8 0" stroke={gs.white} strokeWidth={2.4} strokeLinecap="round" />
        <SvgCircle cx={12} cy={6} r={1.6} fill={gs.white} />
      </Svg>
    </View>
  );
}

export function MapHeader({
  cityLabel,
  menuOpen,
  onToggleMenu,
  category,
  onCategory,
}: Readonly<{
  cityLabel: string;
  menuOpen: boolean;
  onToggleMenu: () => void;
  category: MapCategory;
  onCategory: (c: MapCategory) => void;
}>): ReactElement {
  const { t } = useTranslation();
  return (
    <View pointerEvents="box-none" className="absolute left-0 right-0 top-0 pt-2">
      <View pointerEvents="box-none" className="flex-row items-center justify-between px-4">
        <View
          accessibilityRole="header"
          accessibilityLabel={t('map.logo')}
          className="flex-row items-center rounded-full pl-1.5 pr-3.5 py-1.5"
          style={[{ backgroundColor: 'rgba(255,255,255,0.95)' }, pillShadow]}
        >
          <GoSwingMark />
          <Text className="ml-2 text-[20px] font-extrabold text-ink" style={{ letterSpacing: -0.4 }}>
            Go<Text style={{ color: gs.violet }}>Swing</Text>
          </Text>
        </View>
        <Pressable
          onPress={onToggleMenu}
          accessibilityRole="button"
          accessibilityState={{ expanded: menuOpen }}
          accessibilityLabel={t('map.changeLocation', { city: cityLabel })}
          className="flex-row items-center h-11 rounded-full pl-2.5 pr-3"
          style={[{ backgroundColor: 'rgba(255,255,255,0.95)', maxWidth: 200 }, pillShadow]}
        >
          <NavArrow />
          <Text className="mx-1.5 text-[14px] font-bold text-ink" numberOfLines={1} style={{ flexShrink: 1 }}>
            {cityLabel}
          </Text>
          <ChevronDown size={16} color={gs.muted} style={{ transform: [{ rotate: menuOpen ? '180deg' : '0deg' }] }} />
        </Pressable>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 10, gap: 8 }}
        keyboardShouldPersistTaps="handled"
      >
        {MAP_CATEGORIES.map((c) => {
          const on = c === category;
          return (
            <Pressable
              key={c}
              onPress={() => onCategory(c)}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              className="h-10 px-4 rounded-full items-center justify-center"
              style={[
                { backgroundColor: on ? gs.violet : 'rgba(255,255,255,0.96)' },
                { shadowColor: '#14121F', shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 3 },
              ]}
            >
              <Text className="text-[14px] font-bold" style={{ color: on ? gs.white : gs.ink }}>
                {t(`map.cat.${c}`)}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

export type CityOption = Readonly<{ key: string; label: string }>;

/** Drop-down under the city pill (prototype loc-1). */
export function LocationMenu({
  cities,
  currentLabel,
  onUseMyLocation,
  onPickCity,
  onClose,
}: Readonly<{
  cities: ReadonlyArray<CityOption>;
  currentLabel: string;
  onUseMyLocation: () => void;
  onPickCity: (key: string) => void;
  onClose: () => void;
}>): ReactElement {
  const { t } = useTranslation();
  return (
    <>
      <Pressable
        className="absolute inset-0"
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel={t('map.closeMenu')}
      />
      <View
        className="absolute right-4 bg-white rounded-[18px] p-2"
        style={{
          top: 58,
          width: 230,
          shadowColor: '#14121F',
          shadowOpacity: 0.18,
          shadowRadius: 32,
          shadowOffset: { width: 0, height: 12 },
          elevation: 12,
        }}
        accessibilityViewIsModal
      >
        <Pressable
          onPress={onUseMyLocation}
          accessibilityRole="button"
          className="flex-row items-center h-11 rounded-xl px-3"
          style={{ backgroundColor: '#F3F0FF' }}
        >
          <NavArrow />
          <Text className="ml-2.5 text-[14px] font-bold" style={{ color: gs.violetDark }}>
            {t('map.useMyLocation')}
          </Text>
        </Pressable>
        <Text className="px-3 pt-2.5 pb-1 text-[11px] font-bold uppercase text-muted" style={{ letterSpacing: 0.7 }}>
          {t('map.chooseCity')}
        </Text>
        {cities.map((c) => {
          const on = c.label === currentLabel;
          return (
            <Pressable
              key={c.key}
              onPress={() => onPickCity(c.key)}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              className="h-11 rounded-xl px-3 justify-center"
              style={{ backgroundColor: on ? '#F6F5FA' : gs.white }}
            >
              <Text className="text-[14px] text-ink" style={{ fontWeight: on ? '800' : '600' }}>
                {c.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </>
  );
}
