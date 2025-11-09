import React, { useMemo, useState, type ReactElement } from 'react';
import {
  Modal,
  Pressable,
  Text,
  TextInput,
  View,
  type ViewProps,
} from 'react-native';
import { Feather } from '@expo/vector-icons';

type TabKey = 'search' | 'mine';

export type SongSuggestion = Readonly<{
  id: string;
  title: string;
  artist: string;
}>;

export type SuggestSongsModalProps = Readonly<
  {
    visible: boolean;
    eventTitle?: string | null;
    onClose: () => void;
    onSuggest?: (song: SongSuggestion) => void;
  } & Omit<ViewProps, 'children'>
>;

function TabButton({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}): ReactElement {
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected }}
      onPress={onPress}
      className="px-3 py-3"
    >
      <Text className={`text-lg ${selected ? 'text-black font-semibold' : 'text-gray700'}`}>
        {label}
      </Text>
      <View className={`h-0.5 mt-2 ${selected ? 'bg-gray700' : 'bg-transparent'}`} />
    </Pressable>
  );
}

export default function SuggestSongsModal({
  visible,
  eventTitle,
  onClose,
  onSuggest,
  ...rest
}: SuggestSongsModalProps): ReactElement {
  const [tab, setTab] = useState<TabKey>('search');
  const [query, setQuery] = useState<string>('');

  const subtitle = useMemo(
    () =>
      eventTitle && eventTitle.trim().length > 0
        ? `Suggest songs you'd like to hear at ${eventTitle}`
        : `Suggest songs you'd like to hear`,
    [eventTitle]
  );

  const mySuggestions: ReadonlyArray<SongSuggestion> = [];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable onPress={onClose} className="flex-1 bg-black/40" />

      <View
        {...rest}
        className="absolute left-5 right-5 top-1/2 -translate-y-1/2 rounded-3xl bg-white"
        style={{ elevation: 6 }}
      >
        <View className="px-5 pt-5 pb-2">
          <View className="flex-row items-start justify-between">
            <View className="flex-row items-center gap-x-2">
              <Feather name="music" size={20} color="#111827" />
              <Text className="text-2xl font-semibold text-black">Suggest Songs</Text>
            </View>
            <Pressable onPress={onClose} accessibilityLabel="Close" hitSlop={12}>
              <Feather name="x" size={20} color="#6B7280" />
            </Pressable>
          </View>

          <Text className="mt-3 text-center text-gray600">{subtitle}</Text>
        </View>

        <View className="mt-4 px-5">
          <View className="flex-row items-end justify-start">
            <TabButton
              label="Search Songs"
              selected={tab === 'search'}
              onPress={() => setTab('search')}
            />
            <TabButton
              label="My Suggestions"
              selected={tab === 'mine'}
              onPress={() => setTab('mine')}
            />
          </View>
        </View>

        <View className="-mt-3 h-px bg-gray200" />

        {tab === 'search' ? (
          <View className="px-5 py-5">
            <View className="flex-row items-center gap-x-3">
              <View className="flex-1 flex-row items-center gap-x-2 rounded-2xl bg-gray100 border border-gray300 px-3 py-2">
                <Feather name="search" size={16} color="#6B7280" />
                <TextInput
                  value={query}
                  onChangeText={setQuery}
                  placeholder="Search for songs, artists, or albums"
                  placeholderTextColor="#9CA3AF"
                  className="flex-1 text-gray800"
                  returnKeyType="search"
                />
              </View>
              <Pressable className="rounded-2xl bg-gray600 px-4 py-2 active:opacity-90">
                <Text className="text-white font-medium">Search</Text>
              </Pressable>
            </View>

            <View className="mt-16 mb-40 items-center">
              <Feather name="search" size={48} color="#6B7280" />
              <Text className="mt-4 text-gray600 text-center">
                Search for songs to suggest
              </Text>
            </View>
          </View>
        ) : (
          <View className="px-5 pt-12 pb-40 items-center">
            <Feather name="music" size={48} color="#6B7280" />
            <Text className="mt-4 text-gray700 font-medium">No suggestions yet</Text>
            <Text className="mt-2 text-gray600 text-center">
              Search and suggest songs you&apos;d like{'\n'}to hear at the event
            </Text>
            <Pressable
              onPress={() => setTab('search')}
              className="mt-6 rounded-2xl border border-gray300 bg-white px-4 py-2 active:opacity-90"
            >
              <Text className="text-gray800 font-medium">Search Songs</Text>
            </Pressable>
          </View>
        )}

        <View className="h-px bg-gray200" />

        <View className="px-5 py-4">
          <Pressable
            accessibilityRole="button"
            onPress={onClose}
            className="w-full rounded-2xl border border-gray300 bg-white px-5 py-3 active:opacity-90"
          >
            <Text className="text-center text-gray800 font-medium">Close</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
