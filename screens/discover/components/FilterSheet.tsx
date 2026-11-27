// screens/discover/components/FilterSheet.tsx — Discover filters (filt-1 / filt-2).
import React, { useEffect, useState, type ReactElement } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { GsButton, GsSheet } from '@/components/gs';
import { gs } from '@/theme/colors';
import {
  ACCESS_KEYS,
  DEFAULT_FILTERS,
  DISTANCE_KEYS,
  MUSIC_GENRES,
  PRICE_KEYS,
  VENUE_TYPES,
  WHEN_KEYS,
  type DiscoverFilters,
} from '../lib/filtering';

export function ChoiceChip({
  label,
  selected,
  onPress,
}: Readonly<{ label: string; selected: boolean; onPress: () => void }>): ReactElement {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      className="min-h-[44px] justify-center rounded-full px-4"
      style={{
        borderWidth: 1.5,
        borderColor: selected ? gs.violet : gs.lineStrong,
        backgroundColor: selected ? gs.violetSoft : gs.white,
      }}
    >
      <Text className="text-[14px] font-bold" style={{ color: selected ? gs.violetDark : gs.ink }}>
        {label}
      </Text>
    </Pressable>
  );
}

function Group({ title, children }: Readonly<{ title: string; children: React.ReactNode }>): ReactElement {
  return (
    <View className="px-5 pt-3 pb-2">
      <Text className="mb-2.5 text-[16px] font-extrabold text-ink">{title}</Text>
      <View className="flex-row flex-wrap gap-2">{children}</View>
    </View>
  );
}

const toggle = <T,>(list: ReadonlyArray<T>, v: T): ReadonlyArray<T> => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

export default function FilterSheet({
  visible,
  value,
  onClose,
  onApply,
  countFor,
}: Readonly<{
  visible: boolean;
  value: DiscoverFilters;
  onClose: () => void;
  onApply: (next: DiscoverFilters) => void;
  /** Live result count for the draft filters. */
  countFor: (draft: DiscoverFilters) => number;
}>): ReactElement {
  const { t } = useTranslation();
  const [draft, setDraft] = useState<DiscoverFilters>(value);

  useEffect(() => {
    if (visible) setDraft(value);
  }, [visible, value]);

  const set = (patch: Partial<DiscoverFilters>): void => setDraft((d) => ({ ...d, ...patch }));
  const count = countFor(draft);

  return (
    <GsSheet
      visible={visible}
      onClose={onClose}
      title={t('discover.filters.title')}
      maxHeight={0.92}
      footer={
        <View className="flex-row items-center gap-x-3">
          <GsButton label={t('discover.filters.reset')} variant="secondary" size="lg" onPress={() => setDraft(DEFAULT_FILTERS)} />
          <View className="flex-1">
            <GsButton
              label={t('discover.filters.show', { count })}
              size="lg"
              fullWidth
              onPress={() => {
                onApply(draft);
                onClose();
              }}
            />
          </View>
        </View>
      }
    >
      <Group title={t('discover.filters.when')}>
        {WHEN_KEYS.map((k) => (
          <ChoiceChip key={k} label={t(`discover.when.${k}`)} selected={draft.when === k} onPress={() => set({ when: k })} />
        ))}
      </Group>
      <Group title={t('discover.filters.price')}>
        {PRICE_KEYS.map((k) => (
          <ChoiceChip key={k} label={t(`discover.price.${k}`)} selected={draft.price === k} onPress={() => set({ price: k })} />
        ))}
      </Group>
      <Group title={t('discover.filters.access')}>
        {ACCESS_KEYS.map((k) => (
          <ChoiceChip key={k} label={t(`discover.access.${k}`)} selected={draft.access.includes(k)} onPress={() => set({ access: toggle(draft.access, k) })} />
        ))}
      </Group>
      <Group title={t('discover.filters.distance')}>
        {DISTANCE_KEYS.map((k) => (
          <ChoiceChip key={k} label={t(`discover.distance.${k}`)} selected={draft.distance === k} onPress={() => set({ distance: k })} />
        ))}
      </Group>
      <Group title={t('discover.filters.venueTypes')}>
        {VENUE_TYPES.map((k) => (
          <ChoiceChip key={k} label={t(`discover.venueType.${k}`)} selected={draft.venueTypes.includes(k)} onPress={() => set({ venueTypes: toggle(draft.venueTypes, k) })} />
        ))}
      </Group>
      <Group title={t('discover.filters.genres')}>
        {MUSIC_GENRES.map((g) => (
          <ChoiceChip key={g} label={g} selected={draft.genres.includes(g)} onPress={() => set({ genres: toggle(draft.genres, g) })} />
        ))}
      </Group>
    </GsSheet>
  );
}
