// pages/InterestsSelectionPage.tsx
import React, { useEffect, useState, type ReactElement } from 'react';
import { View, Text, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useUser } from '@clerk/clerk-expo';
import { supabase } from '@/lib/supabase';
import type { ID } from '@/types/domain';

type Tag = { id: string; label: string; slug: string };

export type InterestsSelectionPageProps = Readonly<{
  onDone: (selectedTagIds: string[]) => Promise<void>;
  onSkip: () => Promise<void>;
}>;

const cx = (...c: ReadonlyArray<string | null | undefined | false>): string =>
  c.filter(Boolean).join(' ');

export default function InterestsSelectionPage({
  onDone,
  onSkip,
}: InterestsSelectionPageProps): ReactElement {
  const { user } = useUser();
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const { data, error } = await supabase
          .from('tags')
          .select('id, label, slug')
          .order('label');

        if (!cancelled && data) {
          setTags(data as Tag[]);
        }
      } catch {
        // silently fail - user can skip
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, []);

  const toggle = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleContinue = async () => {
    if (saving) return;
    setSaving(true);

    try {
      const ids = Array.from(selectedIds);

      if (ids.length > 0 && user?.id) {
        // Save interests to supabase
        const { error } = await supabase
          .from('user_interests')
          .insert(ids.map((tagId) => ({ user_id: user.id, tag_id: tagId })));

        if (error) console.error('Failed to save interests:', error);
      }

      await onDone(ids);
    } catch {
      await onDone([]);
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right', 'bottom']} className="flex-1 bg-white">
      <View className="px-6 pt-8 pb-4">
        <Text className="text-3xl font-bold text-black">What are you into?</Text>
        <Text className="mt-2 text-base text-gray600">
          Pick your interests so we can personalize your experience.
        </Text>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#0B0B15" />
        </View>
      ) : (
        <ScrollView
          className="flex-1 px-6"
          contentContainerStyle={{ paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
        >
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            {tags.map((tag) => {
              const selected = selectedIds.has(tag.id);
              return (
                <Pressable
                  key={tag.id}
                  onPress={() => toggle(tag.id)}
                  accessibilityRole="button"
                  style={{
                    borderRadius: 20,
                    paddingVertical: 10,
                    paddingHorizontal: 18,
                    borderWidth: 1.5,
                    borderColor: selected ? '#0B0B15' : '#E5E7EB',
                    backgroundColor: selected ? '#0B0B15' : '#FFFFFF',
                  }}
                >
                  <Text
                    style={{
                      color: selected ? '#FFFFFF' : '#374151',
                      fontWeight: selected ? '600' : '500',
                      fontSize: 14,
                    }}
                  >
                    {tag.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>
      )}

      <View className="absolute left-0 right-0 bottom-0 bg-white px-6 pb-8 pt-4 border-t border-gray200">
        <Pressable
          accessibilityRole="button"
          onPress={handleContinue}
          disabled={saving}
          className={cx(
            'w-full rounded-2xl py-4 items-center justify-center',
            selectedIds.size > 0 ? 'bg-black' : 'bg-gray300',
          )}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className={cx('text-base font-semibold', selectedIds.size > 0 ? 'text-white' : 'text-gray700')}>
              {selectedIds.size > 0 ? `Continue (${selectedIds.size} selected)` : 'Continue'}
            </Text>
          )}
        </Pressable>

        <Pressable
          accessibilityRole="button"
          onPress={onSkip}
          className="mt-3 w-full items-center py-3"
        >
          <Text className="text-base font-semibold text-gray600">Skip for now</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
