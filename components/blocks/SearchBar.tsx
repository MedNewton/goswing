
import React, { useMemo, useState, type ReactElement } from 'react';
import { View, Text, Pressable, ScrollView, Keyboard, type ViewProps } from 'react-native';
import { Feather } from '@expo/vector-icons';
import TextField, { type TextFieldProps } from '@/components/ui/TextField';
import type { Event } from '@/types/domain';
import FiltersDrawer, {
  type FiltersPayload,
} from '@/components/filters/FiltersDrawer';

export type SearchBarProps = Readonly<
  {
    value: string;
    onChangeText: (text: string) => void;
    events: ReadonlyArray<Event>;
    onSubmit?: (query: string) => void;
    onPickEvent?: (eventId: string) => void;
    maxSuggestions?: number;
    placeholder?: string;
    onPressFilter?: () => void;
    onApplyFilters?: (filters: FiltersPayload) => void;
    initialFilters?: Partial<FiltersPayload>;
    disabled?: boolean;
    className?: string;
    inputProps?: Omit<TextFieldProps, 'left' | 'right' | 'value' | 'onChangeText' | 'variant' | 'size'>;
  } & Omit<ViewProps, 'children'>
>;

const cx = (...c: ReadonlyArray<string | null | undefined | false>) => c.filter(Boolean).join(' ');
type Sug = { id: string; title: string; line2?: string };

function line2FromEvent(e: Event): string {
  const parts: string[] = [];
  if (e.organizer) parts.push(e.organizer);
  const loc: string[] = [];
  if (e.city) loc.push(e.city);
  if (e.venue) loc.push(e.venue);
  if (loc.length) parts.push(loc.join(' • '));
  return parts.join(' · ');
}

export default function SearchBar({
  value,
  onChangeText,
  events,
  onSubmit,
  onPickEvent,
  maxSuggestions = 6,
  placeholder = 'Search events, organizers, venues…',
  onPressFilter,
  onApplyFilters,
  initialFilters,
  disabled = false,
  className,
  inputProps,
  ...rest
}: SearchBarProps): ReactElement {
  const [open, setOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const q = value.trim().toLowerCase();
  const MIN_CHARS = 2;

  const suggestions: ReadonlyArray<Sug> = useMemo(() => {
    if (q.length < MIN_CHARS) return [];
    const scored = events.map((e) => {
      const t = e.title?.toLowerCase() ?? '';
      const org = e.organizer?.toLowerCase() ?? '';
      const ven = e.venue?.toLowerCase() ?? '';
      const city = e.city?.toLowerCase() ?? '';
      let score = 0;
      if (t.includes(q)) score += 3;
      if (org.includes(q)) score += 2;
      if (ven.includes(q)) score += 1;
      if (city.includes(q)) score += 1;
      return { e, score };
    });

    return scored
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, maxSuggestions)
      .map(({ e }) => ({ id: String(e.id), title: e.title, line2: line2FromEvent(e) }));
  }, [q, events, maxSuggestions]);

  const hasSug = suggestions.length > 0;

  return (
    <View {...rest} className={cx('relative w-full', className)} style={{ zIndex: 10 }}>
      <TextField
        value={value}
        onChangeText={(t) => {
          onChangeText(t);
          setOpen(true);
        }}
        placeholder={placeholder}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          setTimeout(() => setOpen(false), 120);
        }}
        onSubmitEditing={() => {
          setOpen(false);
          Keyboard.dismiss();
          onSubmit?.(value.trim());
        }}
        editable={!disabled}
        variant="filled"
        size="md"
        containerClassName="rounded-2xl bg-gray100"
        inputClassName="text-gray800"
        left={<Feather name="search" size={18} color="#6B7280" />}
        right={
          value ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                onChangeText('');
                setOpen(false);
                Keyboard.dismiss();
              }}
              className="active:opacity-80"
              hitSlop={10}
            >
              <Feather name="x" size={18} color="#111827" />
            </Pressable>
          ) : (
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                onPressFilter?.();
                setFiltersOpen(true);
              }}
              disabled={disabled}
              className="active:opacity-80"
              hitSlop={10}
            >
              <Feather name="filter" size={18} color="#111827" />
            </Pressable>
          )
        }
        {...inputProps}
      />

      {open && q.length >= MIN_CHARS ? (
        <View className="absolute left-0 right-0" style={{ top: 52, zIndex: 20 }}>
          <View
            className="bg-white rounded-2xl border border-gray200 overflow-hidden"
            style={{
              shadowColor: '#000',
              shadowOpacity: 0.15,
              shadowRadius: 10,
              shadowOffset: { width: 0, height: 6 },
              elevation: 6,
            }}
          >
            {hasSug ? (
              <ScrollView className="max-h-72" keyboardShouldPersistTaps="handled">
                {suggestions.map((s) => (
                  <Pressable
                    key={s.id}
                    onPress={() => {
                      onChangeText(s.title);
                      setOpen(false);
                      Keyboard.dismiss();
                      onPickEvent?.(s.id);
                    }}
                    className="px-4 py-3 active:opacity-95 flex-row items-start gap-x-3"
                  >
                    <Feather name="music" size={16} color="#6B7280" style={{ marginTop: 2 }} />
                    <View className="flex-1">
                      <Text className="text-gray900 font-medium">{s.title}</Text>
                      {s.line2 ? <Text className="text-xs text-gray500 mt-0.5">{s.line2}</Text> : null}
                    </View>
                  </Pressable>
                ))}
              </ScrollView>
            ) : (
              <View className="py-3 px-4">
                <Text className="text-gray500 text-sm">No matches. Press enter to search.</Text>
              </View>
            )}

            <Pressable
              onPress={() => {
                setOpen(false);
                Keyboard.dismiss();
                onSubmit?.(value.trim());
              }}
              className="px-4 py-3 border-t border-gray200 active:opacity-95 flex-row items-center gap-x-8"
            >
              <Feather name="search" size={16} color="#111827" />
              <Text className="text-gray800">
                Search for <Text className="font-semibold">“{value.trim()}”</Text>
              </Text>
            </Pressable>
          </View>

          <Pressable
            onPress={() => {
              setOpen(false);
              Keyboard.dismiss();
            }}
            style={{ height: 8 }}
            accessibilityRole="button"
          />
        </View>
      ) : null}

      <FiltersDrawer
        visible={filtersOpen}
        initial={initialFilters}
        onClose={() => setFiltersOpen(false)}
        onApply={(f) => {
          onApplyFilters?.(f);
          setFiltersOpen(false);
        }}
        onReset={() => {
        }}
      />
    </View>
  );
}
