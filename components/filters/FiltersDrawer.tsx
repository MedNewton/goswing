
import React, { useMemo, useRef, useState, useEffect, type ReactElement } from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  Animated,
  Easing,
  ScrollView,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

export type SortBy = 'best' | 'date' | 'price';
export type DateQuick =
  | 'any'
  | 'today'
  | 'tomorrow'
  | 'this_week'
  | 'this_weekend'
  | 'this_month'
  | 'pick';

export type FiltersPayload = {
  sortBy: SortBy;
  dateQuick: DateQuick;
  venueTypes: string[];
  musicStyles: string[];
  partyTypes: string[];
  access: ('free' | 'free_ladies')[];
};

export type FiltersDrawerProps = Readonly<{
  visible: boolean;
  onClose: () => void;
  initial?: Partial<FiltersPayload>;
  onApply?: (filters: FiltersPayload) => void;
  onReset?: () => void;
}>;

const VENUE_TYPES = [
  'Restaurant','Brasserie','Bistro','Bar','Pub','Lounge','Guinguette','Taverne',
  'Rooftop','Discothèque','Club','Cabaret',
] as const;

const MUSIC_STYLES = [
  'Electro','House','Techno','Hip-Hop','RnB','Rap','Afrobeat','Oriental',
  'Latino','Reggaeton','Rock','Indie','Raï','Jazz','Blues','Live Band','DJ Set','Jam Session',
] as const;

const PARTY_TYPES = [
  'DJ Night','Soirée Dansante','Afterwork','Soirée Déguisée','Soirée Mousse','White Party',
  'Bal Masqué','Soirée Afro','Soirée Latine','Soirée Années 80/90','Soirée Karaoké',
  'Halloween Party','Noël','Nouvel An',
] as const;

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View className="mb-5 rounded-2xl border border-gray200 bg-white p-3">
      <Text className="text-gray800 font-medium mb-3">{title}</Text>
      {children}
    </View>
  );
}

function PillFullWidth({
  label,
  selected,
  onPress,
  disabled,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled}
      style={{
        borderRadius: 14,
        paddingVertical: 12,
        paddingHorizontal: 14,
        borderWidth: 1,
        borderColor: selected ? '#9CA3AF' : '#E5E7EB',
        backgroundColor: '#FFFFFF',
        marginBottom: 10,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
      android_ripple={{ color: '#E5E7EB', borderless: false }}
    >
      <Text style={{ color: '#111827', fontWeight: selected ? '600' : '500' }}>{label}</Text>
      {selected ? <Feather name="check" size={16} color="#111827" /> : <View style={{ width: 16 }} />}
    </Pressable>
  );
}

function PillTwoCol({
  label,
  selected,
  onPress,
  colGap = 10,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  colGap?: number;
}) {
  const screenW = Dimensions.get('window').width;
  const available = screenW - 32 - 24; // drawer px-4 (16*2) + section p-3 (12*2)
  const itemW = (available - colGap) / 2;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={{
        width: itemW,
        borderRadius: 12,
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderWidth: 1,
        borderColor: selected ? '#9CA3AF' : '#E5E7EB',
        backgroundColor: '#FFFFFF',
        marginBottom: colGap,
        alignItems: 'center',
        justifyContent: 'center',
      }}
      android_ripple={{ color: '#E5E7EB', borderless: false }}
    >
      <Text style={{ color: selected ? '#111827' : '#374151', fontWeight: selected ? '600' : '500' }}>
        {label}
      </Text>
    </Pressable>
  );
}

function ListSingle({
  options,
  value,
  onChange,
}: {
  options: ReadonlyArray<{ key: string; label: string }>;
  value: string;
  onChange: (k: string) => void;
}) {
  return (
    <View>
      {options.map((opt) => (
        <PillFullWidth
          key={opt.key}
          label={opt.label}
          selected={value === opt.key}
          onPress={() => onChange(opt.key)}
        />
      ))}
    </View>
  );
}

function ListMulti({
  options,
  values,
  onToggle,
}: {
  options: ReadonlyArray<{ key: string; label: string }>;
  values: ReadonlyArray<string>;
  onToggle: (k: string) => void;
}) {
  return (
    <View>
      {options.map((opt) => {
        const selected = values.includes(opt.key);
        return (
          <PillFullWidth
            key={opt.key}
            label={opt.label}
            selected={selected}
            onPress={() => onToggle(opt.key)}
          />
        );
      })}
    </View>
  );
}

function GridMulti({
  options,
  values,
  onToggle,
}: {
  options: ReadonlyArray<string>;
  values: ReadonlyArray<string>;
  onToggle: (k: string) => void;
}) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: 10 }}>
      {options.map((opt) => {
        const selected = values.includes(opt);
        return (
          <PillTwoCol key={opt} label={opt} selected={selected} onPress={() => onToggle(opt)} colGap={10} />
        );
      })}
    </View>
  );
}

export default function FiltersDrawer({
  visible,
  onClose,
  initial,
  onApply,
  onReset,
}: FiltersDrawerProps): ReactElement {
  const insets = useSafeAreaInsets();

  const initialNormalized = useMemo<FiltersPayload>(
    () => ({
      sortBy: initial?.sortBy ?? 'best',
      dateQuick: initial?.dateQuick ?? 'any',
      venueTypes: initial?.venueTypes ?? [],
      musicStyles: initial?.musicStyles ?? [],
      partyTypes: initial?.partyTypes ?? [],
      access: initial?.access ?? [],
    }),
    [
      initial?.sortBy,
      initial?.dateQuick,
      initial?.venueTypes,
      initial?.musicStyles,
      initial?.partyTypes,
      initial?.access,
    ],
  );

  const [sortBy, setSortBy] = useState<SortBy>(initialNormalized.sortBy);
  const [dateQuick, setDateQuick] = useState<DateQuick>(initialNormalized.dateQuick);
  const [venueTypes, setVenueTypes] = useState<string[]>(initialNormalized.venueTypes);
  const [musicStyles, setMusicStyles] = useState<string[]>(initialNormalized.musicStyles);
  const [partyTypes, setPartyTypes] = useState<string[]>(initialNormalized.partyTypes);
  const [access, setAccess] = useState<('free' | 'free_ladies')[]>(initialNormalized.access);

  const prevInitialKeyRef = useRef<string>('');
  const initialKey = JSON.stringify(initialNormalized);
  useEffect(() => {
    if (prevInitialKeyRef.current === initialKey) return;
    prevInitialKeyRef.current = initialKey;

    setSortBy(initialNormalized.sortBy);
    setDateQuick(initialNormalized.dateQuick);
    setVenueTypes(initialNormalized.venueTypes);
    setMusicStyles(initialNormalized.musicStyles);
    setPartyTypes(initialNormalized.partyTypes);
    setAccess(initialNormalized.access);
  }, [initialKey, initialNormalized]);

  const payload: FiltersPayload = useMemo(
    () => ({ sortBy, dateQuick, venueTypes, musicStyles, partyTypes, access }),
    [sortBy, dateQuick, venueTypes, musicStyles, partyTypes, access],
  );

  const translateX = useRef(new Animated.Value(1)).current;
  const backdrop = useRef(new Animated.Value(0)).current;

  const screenW = Dimensions.get('window').width;
  const drawerWidthPx = screenW;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(translateX, {
          toValue: 0,
          duration: 280,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(backdrop, {
          toValue: 1,
          duration: 200,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      translateX.setValue(1);
      backdrop.setValue(0);
    }
  }, [visible, translateX, backdrop]);

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(translateX, {
        toValue: 1,
        duration: 220,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(backdrop, {
        toValue: 0,
        duration: 180,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) onClose();
    });
  };

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={handleClose}>
      <Animated.View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', opacity: backdrop }}>
        <Pressable style={{ flex: 1 }} onPress={handleClose} accessibilityRole="button" />
      </Animated.View>

      <Animated.View
        style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          right: 0,
          width: drawerWidthPx,
          transform: [
            {
              translateX: translateX.interpolate({
                inputRange: [0, 1],
                outputRange: [0, drawerWidthPx],
              }),
            },
          ],
          backgroundColor: '#FFFFFF',
          borderTopLeftRadius: 18,
          borderBottomLeftRadius: 18,
          shadowColor: '#000',
          shadowOpacity: 0.25,
          shadowRadius: 16,
          shadowOffset: { width: -4, height: 0 },
          elevation: 12,
          overflow: 'hidden',
        }}
      >
        <View style={{ paddingTop: Math.max(insets.top, 12) }} className="px-4 pb-3 border-b border-gray200 bg-white">
          <View className="flex-row items-center justify-between">
            <Text className="text-gray800 text-base font-semibold">Filters</Text>
            <Pressable accessibilityRole="button" onPress={handleClose} className="rounded-2xl px-3 py-2 bg-gray100 border border-gray200">
              <Feather name="x" size={16} color="#111827" />
            </Pressable>
          </View>
        </View>

        <ScrollView
          className="flex-1 px-4 pt-4"
          contentContainerStyle={{ paddingBottom: (insets.bottom || 0) + 150 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Section title="Sort By">
            <ListSingle
              value={sortBy}
              onChange={(k) => setSortBy(k as SortBy)}
              options={[
                { key: 'best', label: 'Best Match' },
                { key: 'date', label: 'Date' },
                { key: 'price', label: 'Price' },
              ]}
            />
          </Section>

          <Section title="Date">
            <ListSingle
              value={dateQuick}
              onChange={(k) => setDateQuick(k as DateQuick)}
              options={[
                { key: 'any', label: 'Any' },
                { key: 'today', label: 'Today' },
                { key: 'tomorrow', label: 'Tomorrow' },
                { key: 'this_week', label: 'This Week' },
                { key: 'this_weekend', label: 'This Weekend' },
                { key: 'this_month', label: 'This Month' },
                { key: 'pick', label: 'Choose a Date' },
              ]}
            />
          </Section>

          <Section title="Venue Type">
            <GridMulti
              options={[...VENUE_TYPES]}
              values={venueTypes}
              onToggle={(k) => setVenueTypes((cur) => (cur.includes(k) ? cur.filter((x) => x !== k) : [...cur, k]))}
            />
          </Section>

          <Section title="Music Style">
            <GridMulti
              options={[...MUSIC_STYLES]}
              values={musicStyles}
              onToggle={(k) => setMusicStyles((cur) => (cur.includes(k) ? cur.filter((x) => x !== k) : [...cur, k]))}
            />
          </Section>

          <Section title="Party Type">
            <GridMulti
              options={[...PARTY_TYPES]}
              values={partyTypes}
              onToggle={(k) => setPartyTypes((cur) => (cur.includes(k) ? cur.filter((x) => x !== k) : [...cur, k]))}
            />
          </Section>

          <Section title="Access">
            <ListMulti
              options={[
                { key: 'free', label: 'Free' },
                { key: 'free_ladies', label: 'Free for Ladies' },
              ]}
              values={access}
              onToggle={(k) => setAccess((cur) => (cur.includes(k as any) ? cur.filter((x) => x !== k) : [...cur, k as any]))}
            />
          </Section>
        </ScrollView>

        <View
          style={{ paddingBottom: Math.max(insets.bottom, 12) }}
          className="absolute left-0 right-0 bottom-0 bg-white border-t border-gray200 px-4 pt-3"
        >
          <View className="flex-col gap-y-3">
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                setSortBy('best');
                setDateQuick('any');
                setVenueTypes([]);
                setMusicStyles([]);
                setPartyTypes([]);
                setAccess([]);

                onReset?.();

                const defaults: FiltersPayload = {
                  sortBy: 'best',
                  dateQuick: 'any',
                  venueTypes: [],
                  musicStyles: [],
                  partyTypes: [],
                  access: [],
                };
                onApply?.(defaults);
              }}
              className="w-full rounded-2xl border border-gray300 bg-white py-3 items-center"
            >
              <Text className="text-gray800 font-semibold">Reset</Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              onPress={() => {
                onApply?.(payload);
                handleClose();
              }}
              className="w-full rounded-2xl bg-gray900 py-3 items-center"
            >
              <Text className="text-white font-semibold">Apply Filters</Text>
            </Pressable>
          </View>
        </View>
      </Animated.View>
    </Modal>
  );
}
