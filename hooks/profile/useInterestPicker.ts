// hooks/profile/useInterestPicker.ts
// Interest chips on the Profile tab: the interest tag catalog with the user's
// selection, toggled in place (routes H.1–H.4 + the tag catalog).
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import * as meApi from '@/lib/api/me';
import { useUserInterests } from './useUserInterests';
import type { ID } from '@/types/domain';

export type InterestOption = Readonly<{ id: string; label: string; selected: boolean }>;

export function useInterestPicker(): Readonly<{
  options: ReadonlyArray<InterestOption>;
  selectedCount: number;
  loading: boolean;
  editable: boolean;
  toggle: (tagId: string) => Promise<void>;
  reload: () => Promise<void>;
}> {
  const { t } = useTranslation();
  const { interests, isLoading, addInterest, removeInterest, refetch } = useUserInterests();
  const [catalog, setCatalog] = useState<ReadonlyArray<{ id: string; label: string }>>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [pending, setPending] = useState<ReadonlyMap<string, boolean>>(new Map());

  const loadCatalog = useCallback(async () => {
    try {
      setCatalogLoading(true);
      const page = await meApi.listTags({ type: 'interest' });
      setCatalog((page.items ?? []).map((x) => ({ id: String(x.id), label: String(x.label ?? x.slug ?? '') })).filter((x) => x.label));
    } catch {
      setCatalog([]);
    } finally {
      setCatalogLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCatalog();
  }, [loadCatalog]);

  const selectedIds = useMemo(() => {
    const s = new Set(interests.map((i) => String(i.tagId)));
    pending.forEach((on, id) => (on ? s.add(id) : s.delete(id)));
    return s;
  }, [interests, pending]);

  const options = useMemo<ReadonlyArray<InterestOption>>(() => {
    const seen = new Set<string>();
    const out: InterestOption[] = [];
    // Catalog order first, then any selected tag the catalog does not list.
    for (const c of catalog) {
      seen.add(c.id);
      out.push({ id: c.id, label: c.label, selected: selectedIds.has(c.id) });
    }
    for (const i of interests) {
      const id = String(i.tagId);
      if (seen.has(id)) continue;
      out.push({ id, label: i.tagLabel, selected: selectedIds.has(id) });
    }
    return out;
  }, [catalog, interests, selectedIds]);

  const toggle = useCallback(
    async (tagId: string) => {
      const next = !selectedIds.has(tagId);
      setPending((m) => new Map(m).set(tagId, next));
      try {
        if (next) await addInterest(tagId as ID);
        else await removeInterest(tagId as ID);
      } catch (e: unknown) {
        Alert.alert(t('common.error'), e instanceof Error ? e.message : t('profile.couldNotUpdateSetting'));
      } finally {
        setPending((m) => {
          const copy = new Map(m);
          copy.delete(tagId);
          return copy;
        });
      }
    },
    [selectedIds, addInterest, removeInterest, t],
  );

  const reload = useCallback(async () => {
    await Promise.all([refetch(), loadCatalog()]);
  }, [refetch, loadCatalog]);

  return {
    options,
    selectedCount: options.filter((o) => o.selected).length,
    loading: isLoading || catalogLoading,
    editable: true,
    toggle,
    reload,
  };
}
