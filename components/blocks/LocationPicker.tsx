import React, { useMemo, useState, type ReactElement } from 'react';
import { View, Text, Pressable, ScrollView, type ViewProps } from 'react-native';
import { Feather } from '@expo/vector-icons';
import TextField from '@/components/ui/TextField';
import Card from '@/components/ui/Card';

export type City = Readonly<{
  key: string;
  label: string;
}>;

export type LocationPickerProps = Readonly<
  {
    value: string | null;
    onChange: (key: string) => void;
    placeholder?: string;
    options?: ReadonlyArray<City>;
    className?: string;
  } & Omit<ViewProps, 'children'>
>;

const cx = (...c: ReadonlyArray<string | null | undefined | false>): string =>
  c.filter(Boolean).join(' ');

export const DEFAULT_CITIES: ReadonlyArray<City> = [
  { key: 'new_york', label: 'New York, NY' },
  { key: 'los_angeles', label: 'Los Angeles, CA' },
  { key: 'paris', label: 'Paris, FR' },
  { key: 'london', label: 'London, UK' },
  { key: 'madrid', label: 'Madrid, ES' },
  { key: 'rome', label: 'Rome, IT' },
  { key: 'berlin', label: 'Berlin, DE' },
  { key: 'casablanca', label: 'Casablanca, MA' },
  { key: 'marrakesh', label: 'Marrakesh, MA' },
  { key: 'dubai', label: 'Dubai, AE' },
  { key: 'tokyo', label: 'Tokyo, JP' },
  { key: 'singapore', label: 'Singapore, SG' },
  { key: 'sydney', label: 'Sydney, AU' },
  { key: 'toronto', label: 'Toronto, CA' },
  { key: 'san_francisco', label: 'San Francisco, CA' },
  { key: 'chicago', label: 'Chicago, IL' },
  { key: 'amsterdam', label: 'Amsterdam, NL' },
  { key: 'lisbon', label: 'Lisbon, PT' },
];

export default function LocationPicker({
  value,
  onChange,
  placeholder = 'Select a location',
  options = DEFAULT_CITIES,
  className,
  ...rest
}: LocationPickerProps): ReactElement {
  const [open, setOpen] = useState<boolean>(false);
  const [query, setQuery] = useState<string>('');

  const selectedLabel: string | null =
    options.find((o) => o.key === value)?.label ?? null;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length === 0) return options;
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, query]);

  return (
    <View {...rest} className={cx('w-full', className)}>
      <Pressable
        accessibilityRole="button"
        onPress={() => setOpen((s) => !s)}
        className="flex-row items-center justify-between rounded-2xl bg-gray100 border border-gray200 px-4 py-3"
      >
        <View className="flex-row items-center gap-x-2">
          <Feather name="map-pin" size={18} color="#6B7280" />
          <Text className={selectedLabel ? 'text-gray800' : 'text-gray500'}>
            {selectedLabel ?? placeholder}
          </Text>
        </View>
        <Feather name={open ? 'chevron-up' : 'chevron-down'} size={18} color="#6B7280" />
      </Pressable>

      {open ? (
        <Card
          variant="outlined"
          padding="md"
          className="mt-2"
        >
          <TextField
            value={query}
            onChangeText={setQuery}
            placeholder="Type a city…"
            variant="filled"
            size="md"
            left={<Feather name="search" size={16} color="#9CA3AF" />}
            containerClassName="rounded-xl bg-gray100"
            inputClassName="text-gray800"
          />

          <ScrollView className="max-h-64 mt-3">
            {filtered.map((o) => {
              const selected = o.key === value;
              return (
                <Pressable
                  key={o.key}
                  onPress={() => {
                    onChange(o.key);
                    setOpen(false);
                    setQuery('');
                  }}
                  className={cx(
                    'flex-row items-center justify-between px-2 py-2 rounded-lg',
                    selected ? 'bg-gray100' : 'bg-transparent'
                  )}
                >
                  <Text className="text-gray800">{o.label}</Text>
                  {selected ? <Feather name="check" size={18} color="#0EA5E9" /> : null}
                </Pressable>
              );
            })}
          </ScrollView>
        </Card>
      ) : null}
    </View>
  );
}
