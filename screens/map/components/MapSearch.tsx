// screens/map/components/MapSearch.tsx — search the events and places that
// are on the map (prototype msearch-search). Tapping a result focuses the map
// and opens its pop-up.
import React, { useMemo, useState, type ReactElement } from 'react';
import { FlatList, Modal, Pressable, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Search, X } from 'lucide-react-native';

import { gs } from '@/theme/colors';
import Cover from '@/components/gs/Cover';

export type SearchResult = Readonly<{
  key: string;
  kind: 'event' | 'place';
  title: string;
  meta: string;
  metaColor: string;
  sub: string;
  imageUrl?: string | null;
  /** Stable key for the image placeholder tone. */
  toneKey: string;
  /** Lower-cased text searched by the query. */
  haystack: string;
  order: number;
}>;

type Scope = 'all' | 'events' | 'places';

const strip = (s: string): string =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');

export default function MapSearch({
  visible,
  results,
  onClose,
  onPick,
}: Readonly<{
  visible: boolean;
  results: ReadonlyArray<SearchResult>;
  onClose: () => void;
  onPick: (r: SearchResult) => void;
}>): ReactElement {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [q, setQ] = useState<string>('');
  const [scope, setScope] = useState<Scope>('all');

  const shown = useMemo(() => {
    const words = strip(q).split(/\s+/).filter(Boolean);
    return results
      .filter((r) => scope === 'all' || (scope === 'events' ? r.kind === 'event' : r.kind === 'place'))
      .filter((r) => words.every((w) => r.haystack.includes(w)))
      .slice()
      .sort((a, b) => a.order - b.order)
      .slice(0, 60);
  }, [q, scope, results]);

  const scopes: ReadonlyArray<readonly [Scope, string]> = [
    ['all', t('map.search.all')],
    ['events', t('map.search.events')],
    ['places', t('map.search.places')],
  ];

  return (
    <Modal visible={visible} animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View className="flex-1" style={{ backgroundColor: '#F5F3FB', paddingTop: insets.top + 10 }}>
        <View className="flex-row items-center px-4" style={{ gap: 10 }}>
          <View
            className="flex-1 flex-row items-center h-[52px] px-4 rounded-[20px] bg-white"
            style={{ gap: 10, shadowColor: '#14121F', shadowOpacity: 0.06, shadowRadius: 12, shadowOffset: { width: 0, height: 2 }, elevation: 2 }}
          >
            <View style={{ width: 18, height: 18 }}>
              <Search size={18} color={gs.muted} />
            </View>
            <TextInput
              value={q}
              onChangeText={setQ}
              autoFocus
              placeholder={t('map.search.placeholder')}
              placeholderTextColor={gs.faint}
              accessibilityLabel={t('map.search.placeholder')}
              returnKeyType="search"
              className="flex-1 text-[16px] text-ink"
              style={{ paddingVertical: 0 }}
            />
          </View>
          <Pressable
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel={t('map.search.close')}
            className="h-12 w-12 rounded-full bg-white items-center justify-center"
            style={{ shadowColor: '#14121F', shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2 }}
          >
            <X size={20} color={gs.ink} />
          </Pressable>
        </View>

        <View className="flex-row px-4 pt-3.5 pb-3.5" style={{ gap: 8 }}>
          {scopes.map(([k, label]) => {
            const on = k === scope;
            return (
              <Pressable
                key={k}
                onPress={() => setScope(k)}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                className="h-10 px-4 rounded-full items-center justify-center"
                style={{ borderWidth: 1.5, borderColor: on ? gs.violet : '#E4E1EE', backgroundColor: on ? gs.violet : gs.white }}
              >
                <Text className="text-[14px] font-bold" style={{ color: on ? gs.white : gs.ink }}>
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <FlatList
          data={shown as SearchResult[]}
          keyExtractor={(r) => r.key}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 20, gap: 10 }}
          ListEmptyComponent={
            <View className="bg-white rounded-[22px] p-6">
              <Text className="text-[15px] text-muted text-center">{t('map.search.none')}</Text>
            </View>
          }
          renderItem={({ item }) => (
            <Pressable
              onPress={() => onPick(item)}
              accessibilityRole="button"
              accessibilityLabel={`${item.title}, ${item.meta}`}
              className="flex-row items-center bg-white rounded-[22px] p-2.5"
              style={{ gap: 12, shadowColor: '#14121F', shadowOpacity: 0.05, shadowRadius: 16, shadowOffset: { width: 0, height: 4 }, elevation: 1 }}
            >
              <Cover uri={item.imageUrl} toneKey={item.toneKey} radius={item.kind === 'place' ? 32 : 14} style={{ width: 64, height: 64 }} />
              <View className="flex-1" style={{ gap: 2 }}>
                <Text className="text-[12px] font-extrabold" style={{ color: item.metaColor }} numberOfLines={1}>
                  {item.meta}
                </Text>
                <Text className="text-[16px] font-extrabold text-ink" numberOfLines={1}>
                  {item.title}
                </Text>
                {item.sub ? (
                  <Text className="text-[13px] text-muted" numberOfLines={1}>
                    {item.sub}
                  </Text>
                ) : null}
              </View>
            </Pressable>
          )}
        />
      </View>
    </Modal>
  );
}
