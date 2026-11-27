// pages/NotificationPreferencesPage.tsx — what we notify about and how:
// push (reminders, updates, recommendations), email (digest; receipts always
// on) and quiet hours. Social notifications are deferred with Social.
import React, { useCallback, useEffect, useState, type ReactElement } from 'react';
import { Alert, AppState, Linking, Platform, Pressable, Text, View } from 'react-native';
import * as Notifications from 'expo-notifications';
import { useTranslation } from 'react-i18next';
import { Bell, BellOff, Mail, Moon } from 'lucide-react-native';

import { gs } from '@/theme/colors';
import { GsSheet, StatusChip } from '@/components/gs';
import { useNotificationPreferences } from '@/hooks/profile';
import type { NotificationPreferences } from '@/types/domain';
import { Card, Divider, Loading, Notice, PageScaffold, Row, SectionTitle, ToggleRow } from '@/screens/profile/components/ui';

type NotificationPreferencesPageProps = Readonly<{ onBack: () => void }>;

type Key = keyof Omit<NotificationPreferences, 'userId' | 'createdAt' | 'updatedAt'>;

const HOURS: ReadonlyArray<string> = Array.from({ length: 48 }, (_, i) => `${String(Math.floor(i / 2)).padStart(2, '0')}:${i % 2 ? '30' : '00'}`);

/** "23:00:00" → "23:00". */
const hm = (v: string | null | undefined, fallback: string): string => (v ? v.slice(0, 5) : fallback);

/** OS-level permission: blocked means the system will drop our pushes. */
function useOsBlocked(): boolean {
  const [blocked, setBlocked] = useState(false);
  const check = useCallback(async () => {
    if (Platform.OS === 'web') return;
    try {
      const p = await Notifications.getPermissionsAsync();
      setBlocked(p.status === 'denied');
    } catch {
      setBlocked(false);
    }
  }, []);
  useEffect(() => {
    void check();
    const sub = AppState.addEventListener('change', (s) => s === 'active' && void check());
    return () => sub.remove();
  }, [check]);
  return blocked;
}

export default function NotificationPreferencesPage({ onBack }: NotificationPreferencesPageProps): ReactElement {
  const { t } = useTranslation();
  const { preferences: p, isLoading, error, refetch, updatePreferences } = useNotificationPreferences();
  const osBlocked = useOsBlocked();
  const [optimistic, setOptimistic] = useState<Partial<NotificationPreferences>>({});
  const [picker, setPicker] = useState<'start' | 'end' | null>(null);

  const value = <K extends Key>(k: K): NotificationPreferences[K] | undefined =>
    (k in optimistic ? (optimistic as NotificationPreferences)[k] : p?.[k]) as NotificationPreferences[K] | undefined;

  const set = async (patch: Partial<NotificationPreferences>): Promise<void> => {
    setOptimistic((o) => ({ ...o, ...patch }));
    try {
      await updatePreferences(patch);
    } catch (e: unknown) {
      Alert.alert(t('common.error'), e instanceof Error ? e.message : t('profile.couldNotUpdateSetting'));
    } finally {
      setOptimistic((o) => {
        const copy = { ...o } as Record<string, unknown>;
        Object.keys(patch).forEach((k) => delete copy[k]);
        return copy as Partial<NotificationPreferences>;
      });
    }
  };

  const toggle = (k: Key, v: boolean): void => {
    const patch: Partial<NotificationPreferences> = { [k]: v };
    // Turning on a push / email item also turns its channel back on.
    if (v && k.startsWith('push') && k !== 'pushEnabled' && value('pushEnabled') === false) Object.assign(patch, { pushEnabled: true });
    if (v && k.startsWith('email') && k !== 'emailEnabled' && value('emailEnabled') === false) Object.assign(patch, { emailEnabled: true });
    void set(patch);
  };

  const pushOn = value('pushEnabled') !== false;
  const emailOn = value('emailEnabled') !== false;
  const start = hm(value('quietHoursStart'), '23:00');
  const end = hm(value('quietHoursEnd'), '08:00');

  return (
    <PageScaffold title={t('profile.notif.title')} subtitle={t('profile.notif.subtitle')} onBack={onBack}>
      {osBlocked ? (
        <View className="mt-1">
          <Notice
            icon={BellOff}
            title={t('profile.notif.blockedTitle')}
            message={t('profile.notif.blockedMessage')}
            actionLabel={t('profile.notif.openSettings')}
            onAction={() => void Linking.openSettings()}
          />
        </View>
      ) : null}

      {isLoading && !p ? (
        <Loading />
      ) : error && !p ? (
        <Notice icon={BellOff} tone="red" title={t('gs.errorTitle')} message={error.message} actionLabel={t('gs.retry')} onAction={() => void refetch()} />
      ) : (
        <>
          <SectionTitle title={t('profile.notif.push')} icon={Bell} className={osBlocked ? undefined : 'mt-2'} />
          <Card>
            <ToggleRow title={t('profile.notif.reminders')} subtitle={t('profile.notif.remindersSub')} value={pushOn && !!value('pushEventReminders')} onChange={(v) => toggle('pushEventReminders', v)} />
            <Divider />
            <ToggleRow title={t('profile.notif.updates')} subtitle={t('profile.notif.updatesSub')} value={pushOn && !!value('pushEventUpdates')} onChange={(v) => toggle('pushEventUpdates', v)} />
            <Divider />
            <ToggleRow
              title={t('profile.notif.recommendations')}
              subtitle={t('profile.notif.recommendationsSub')}
              value={pushOn && !!value('pushEventRecommendations')}
              onChange={(v) => toggle('pushEventRecommendations', v)}
            />
          </Card>

          <SectionTitle title={t('profile.notif.email')} icon={Mail} />
          <Card>
            <ToggleRow title={t('profile.notif.digest')} subtitle={t('profile.notif.digestSub')} value={emailOn && !!value('emailWeeklyDigest')} onChange={(v) => toggle('emailWeeklyDigest', v)} />
            <Divider />
            <Row title={t('profile.notif.receipts')} subtitle={t('profile.notif.receiptsSub')} chevron={false} right={<StatusChip label={t('profile.notif.alwaysOn')} tone="violet" />} />
          </Card>

          <Card className="mt-6">
            <ToggleRow
              icon={Moon}
              title={t('profile.notif.quiet')}
              subtitle={t('profile.notif.quietSub', { start, end })}
              value={!!value('quietHoursEnabled')}
              onChange={(v) =>
                void set(v ? { quietHoursEnabled: true, quietHoursStart: start, quietHoursEnd: end } : { quietHoursEnabled: false })
              }
            />
            {value('quietHoursEnabled') ? (
              <View className="flex-row px-4 pb-4 gap-x-3">
                <TimeButton label={t('profile.notif.from')} value={start} onPress={() => setPicker('start')} />
                <TimeButton label={t('profile.notif.to')} value={end} onPress={() => setPicker('end')} />
              </View>
            ) : null}
          </Card>
        </>
      )}

      <GsSheet visible={!!picker} onClose={() => setPicker(null)} title={picker === 'start' ? t('profile.notif.pickStart') : t('profile.notif.pickEnd')} maxHeight={0.7}>
        <View className="px-5 flex-row flex-wrap gap-2">
          {HOURS.map((h) => {
            const active = (picker === 'start' ? start : end) === h;
            return (
              <Pressable
                key={h}
                onPress={() => {
                  void set(picker === 'start' ? { quietHoursStart: h } : { quietHoursEnd: h });
                  setPicker(null);
                }}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                className="h-11 w-[74px] rounded-full items-center justify-center"
                style={{ backgroundColor: active ? gs.violet : gs.surface2 }}
              >
                <Text className="text-[15px] font-bold" style={{ color: active ? gs.white : gs.ink }}>
                  {h}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </GsSheet>
    </PageScaffold>
  );
}

function TimeButton({ label, value, onPress }: Readonly<{ label: string; value: string; onPress: () => void }>): ReactElement {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${label} ${value}`}
      className="flex-1 rounded-2xl px-4 py-2.5"
      style={{ backgroundColor: gs.surface2 }}
    >
      <Text className="text-[12px] font-bold text-muted">{label}</Text>
      <Text className="text-[18px] font-extrabold text-ink">{value}</Text>
    </Pressable>
  );
}
