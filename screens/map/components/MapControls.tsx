// screens/map/components/MapControls.tsx — right-side round buttons:
// search, map type (standard / satellite) and recenter. The story camera of
// the prototype is hidden until Social ships.
import React, { useState, type ReactElement } from 'react';
import { Pressable, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Layers, Map as MapIcon, Satellite, Search } from 'lucide-react-native';

import { gs } from '@/theme/colors';
import { NavArrow } from './MapHeader';

export type MapKind = 'standard' | 'satellite';

const shadow = {
  shadowColor: '#14121F',
  shadowOpacity: 0.14,
  shadowRadius: 10,
  shadowOffset: { width: 0, height: 2 },
  elevation: 5,
} as const;

function Round({
  label,
  onPress,
  children,
  expanded,
}: Readonly<{ label: string; onPress: () => void; children: ReactElement; expanded?: boolean }>): ReactElement {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={expanded == null ? undefined : { expanded }}
      className="h-12 w-12 rounded-full bg-white items-center justify-center"
      style={shadow}
    >
      {children}
    </Pressable>
  );
}

export default function MapControls({
  bottom,
  mapKind,
  onMapKind,
  onSearch,
  onRecenter,
}: Readonly<{
  bottom: number;
  mapKind: MapKind;
  onMapKind: (k: MapKind) => void;
  onSearch: () => void;
  onRecenter: () => void;
}>): ReactElement {
  const { t } = useTranslation();
  const [typesOpen, setTypesOpen] = useState<boolean>(false);
  const options: ReadonlyArray<readonly [MapKind, typeof MapIcon]> = [
    ['standard', MapIcon],
    ['satellite', Satellite],
  ];
  return (
    <View pointerEvents="box-none" className="absolute right-4 items-center" style={{ bottom, gap: 10 }}>
      <Round label={t('map.search')} onPress={onSearch}>
        <Search size={20} color={gs.ink} />
      </Round>
      <View className="w-12 rounded-full bg-white items-center overflow-hidden" style={shadow}>
        {typesOpen ? (
          <View accessibilityRole="radiogroup" accessibilityLabel={t('map.mapStyle')} className="items-center pt-1" style={{ gap: 4 }}>
            {options.map(([k, Icon]) => {
              const on = mapKind === k;
              return (
                <Pressable
                  key={k}
                  onPress={() => {
                    onMapKind(k);
                    setTypesOpen(false);
                  }}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: on }}
                  accessibilityLabel={t(`map.type.${k}`)}
                  className="h-11 w-11 rounded-full items-center justify-center"
                  style={{ backgroundColor: on ? gs.violetSoft : 'transparent' }}
                >
                  <Icon size={20} color={on ? gs.violet : gs.ink} />
                </Pressable>
              );
            })}
          </View>
        ) : null}
        <Pressable
          onPress={() => setTypesOpen((v) => !v)}
          accessibilityRole="button"
          accessibilityLabel={t('map.mapType')}
          accessibilityState={{ expanded: typesOpen }}
          className="h-12 w-12 rounded-full items-center justify-center"
        >
          <Layers size={20} color={typesOpen ? gs.violet : gs.ink} />
        </Pressable>
      </View>
      <Round label={t('map.recenter')} onPress={onRecenter}>
        <NavArrow size={20} />
      </Round>
    </View>
  );
}
