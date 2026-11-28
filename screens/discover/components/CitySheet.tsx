// screens/discover/components/CitySheet.tsx — pick a city or go back to GPS.
import React, { type ReactElement } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Check, LocateFixed, MapPin } from 'lucide-react-native';
import { GsSheet } from '@/components/gs';
import { gs } from '@/theme/colors';
import { useEvents, type CityChoice } from '@/providers/EventsProvider';

const CITIES: ReadonlyArray<CityChoice> = [
  { label: 'Paris', center: { latitude: 48.8566, longitude: 2.3522 } },
  { label: 'Lyon', center: { latitude: 45.764, longitude: 4.8357 } },
  { label: 'Marseille', center: { latitude: 43.2965, longitude: 5.3698 } },
  { label: 'Bordeaux', center: { latitude: 44.8378, longitude: -0.5792 } },
  { label: 'Lille', center: { latitude: 50.6292, longitude: 3.0573 } },
  { label: 'Toulouse', center: { latitude: 43.6047, longitude: 1.4442 } },
  { label: 'Nantes', center: { latitude: 47.2184, longitude: -1.5536 } },
  { label: 'Nice', center: { latitude: 43.7102, longitude: 7.262 } },
  { label: 'Casablanca', center: { latitude: 33.5731, longitude: -7.5898 } },
  { label: 'Marrakech', center: { latitude: 31.6295, longitude: -7.9811 } },
];

function Row({
  icon,
  label,
  selected,
  onPress,
}: Readonly<{ icon: ReactElement; label: string; selected: boolean; onPress: () => void }>): ReactElement {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      className="mx-5 min-h-[52px] flex-row items-center border-b border-line"
    >
      <View className="h-9 w-9 items-center justify-center rounded-full" style={{ backgroundColor: gs.violetSoft }}>
        {icon}
      </View>
      <Text className="ml-3 flex-1 text-[16px] font-bold text-ink">{label}</Text>
      {selected ? <Check size={20} color={gs.violet} /> : null}
    </Pressable>
  );
}

export default function CitySheet({ visible, onClose }: Readonly<{ visible: boolean; onClose: () => void }>): ReactElement {
  const { t } = useTranslation();
  const { location } = useEvents();
  const pick = (c: CityChoice | null): void => {
    location.setChoice(c);
    if (!c) location.refresh();
    onClose();
  };
  return (
    <GsSheet visible={visible} onClose={onClose} title={t('discover.city.title')} maxHeight={0.8}>
      <Row
        icon={<LocateFixed size={18} color={gs.violet} />}
        label={t('discover.city.useLocation')}
        selected={!location.choice}
        onPress={() => pick(null)}
      />
      {CITIES.map((c) => (
        <Row
          key={c.label}
          icon={<MapPin size={18} color={gs.violet} />}
          label={c.label}
          selected={location.choice?.label === c.label}
          onPress={() => pick(c)}
        />
      ))}
    </GsSheet>
  );
}
