// screens/profile/ProfileTab.tsx — Profile tab root: account header, stats,
// interests, quick settings and the account menu. No social features (posts,
// followers, highlights) — decision 1 of the redesign.
import React, { useState, type ReactElement } from 'react';
import { ActivityIndicator, Alert, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import Constants from 'expo-constants';
import { useTranslation } from 'react-i18next';
import {
  Bell,
  BellRing,
  Bookmark,
  Check,
  CircleHelp,
  CreditCard,
  FileText,
  Globe,
  Heart,
  Lock,
  LogOut,
  MapPin,
  Navigation,
  Shield,
  Star,
  Ticket,
  TriangleAlert,
  UserPen,
  type LucideIcon,
} from 'lucide-react-native';

import { gs } from '@/theme/colors';
import { GsSheet, RoundButton, softShadow } from '@/components/gs';
import { useTabBarSpace } from '@/components/navigation/BottomTabBar';
import { useAppNav } from '@/navigation/AppNav';
import type { ProfileScreenKey } from '@/navigation/routes';
import { useEvents } from '@/providers/EventsProvider';
import { useAuth } from '@/providers/AuthProvider';
import { useProfile, useSettings, usePaymentMethods } from '@/hooks/profile';
import { useInterestPicker } from '@/hooks/profile/useInterestPicker';
import { useLanguage, type Lang } from '@/lib/i18n/useLanguage';
import { cancelDeletion } from '@/lib/api/profile';
import { Avatar, Card, Divider, Notice, Row, SectionTitle, ToggleRow } from './components/ui';
import { cardLabel } from './components/cards';

const LANGS: ReadonlyArray<{ key: Lang; label: string }> = [
  { key: 'en', label: 'English' },
  { key: 'fr', label: 'Français' },
];

export default function ProfileTab(): ReactElement {
  const { t, i18n } = useTranslation();
  const nav = useAppNav();
  const tabSpace = useTabBarSpace();
  const { savedIds } = useEvents();
  const { signOutAsync } = useAuth();
  const { profile, extras, isLoading, error, refetch, applyProfile } = useProfile();
  const { settings, updateSettings } = useSettings();
  const { paymentMethods } = usePaymentMethods();
  const { lang, setLanguage } = useLanguage();
  const interests = useInterestPicker();

  const [langOpen, setLangOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const open = (screen: ProfileScreenKey): void => nav.push({ name: 'profileScreen', screen });

  const onToggle = async (key: 'pushNotificationsEnabled' | 'locationServicesEnabled', value: boolean): Promise<void> => {
    try {
      await updateSettings({ [key]: value });
    } catch (err: unknown) {
      Alert.alert(t('common.error'), err instanceof Error ? err.message : t('profile.couldNotUpdateSetting'));
    }
  };

  const onSignOut = async (): Promise<void> => {
    if (signingOut) return;
    try {
      setSigningOut(true);
      await signOutAsync();
    } catch (err: unknown) {
      setSigningOut(false);
      Alert.alert(t('profile.signOutFailed'), err instanceof Error ? err.message : t('profile.tryAgain'));
    }
  };

  const onRefresh = async (): Promise<void> => {
    setRefreshing(true);
    await Promise.all([refetch(), interests.reload()]);
    setRefreshing(false);
  };

  const defaultCard = paymentMethods.find((m) => m.isDefault) ?? paymentMethods[0];
  const savedCount = savedIds.size > 0 ? savedIds.size : profile?.stats?.savedCount ?? 0;
  const version = Constants.expoConfig?.version ?? '1.0.0';

  const stats: ReadonlyArray<{ key: string; Icon: LucideIcon; value: number; label: string; onPress: () => void }> = [
    {
      key: 'attended',
      Icon: Ticket,
      value: profile?.stats?.attendedCount ?? 0,
      label: t('profile.eventsAttended'),
      onPress: () => nav.switchTab('bookings', { bookingsTab: 'past' }),
    },
    { key: 'saved', Icon: Heart, value: savedCount, label: t('profile.eventsSaved'), onPress: () => nav.push({ name: 'saved' }) },
    { key: 'reviews', Icon: Star, value: profile?.stats?.reviewsCount ?? 0, label: t('profile.reviews'), onPress: () => open('reviews') },
  ];

  const pendingDeletion = extras.accountStatus === 'pendingDeletion';
  const deletionDate = extras.scheduledDeletionAt
    ? new Date(extras.scheduledDeletionAt).toLocaleDateString(i18n.language, { day: 'numeric', month: 'long' })
    : null;

  return (
    <View className="flex-1 bg-surface">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: tabSpace + 16 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={gs.violet} />}
      >
        <View className="flex-row items-center justify-between px-5 pt-2 pb-4">
          <Text accessibilityRole="header" className="text-[34px] leading-[40px] font-extrabold text-ink">
            {t('profile.home.title')}
          </Text>
          <RoundButton
            icon={<Bell size={22} color={gs.ink} />}
            onPress={() => nav.push({ name: 'notifications' })}
            accessibilityLabel={t('profile.home.notifications')}
            size={44}
          />
        </View>

        {pendingDeletion ? (
          <View className="mb-4">
            <Notice
              icon={TriangleAlert}
              tone="red"
              title={t('profile.home.pendingDeletionTitle')}
              message={deletionDate ? t('profile.home.pendingDeletionMessage', { date: deletionDate }) : undefined}
              actionLabel={t('profile.home.cancelDeletion')}
              onAction={async () => {
                try {
                  const res = await cancelDeletion();
                  if (res) applyProfile(res);
                  else applyProfile({ accountStatus: 'active', scheduledDeletionAt: null });
                } catch (e: unknown) {
                  Alert.alert(t('common.error'), e instanceof Error ? e.message : t('profile.tryAgain'));
                }
              }}
            />
          </View>
        ) : null}

        {/* Account header */}
        <Card className="p-4">
          {isLoading && !profile ? (
            <View className="h-[72px] items-center justify-center">
              <ActivityIndicator color={gs.violet} />
            </View>
          ) : (
            <View className="flex-row items-center">
              <Avatar uri={profile?.avatarUri} name={profile?.name} size={72} />
              <View className="flex-1 ml-4 pr-2">
                <Text className="text-[20px] font-extrabold text-ink" numberOfLines={1}>
                  {profile?.name || t('profile.userNameFallback')}
                </Text>
                {extras.username ? (
                  <Text className="text-[14px] font-bold" style={{ color: gs.violet }} numberOfLines={1}>
                    @{extras.username}
                  </Text>
                ) : null}
                {profile?.email ? (
                  <Text className="text-[14px] text-subtle" numberOfLines={1}>
                    {profile.email}
                  </Text>
                ) : null}
                {profile?.city ? (
                  <View className="flex-row items-center mt-0.5">
                    <MapPin size={13} color={gs.muted} />
                    <Text className="text-[14px] text-subtle ml-1" numberOfLines={1}>
                      {profile.city}
                    </Text>
                  </View>
                ) : null}
              </View>
              <Pressable
                onPress={() => open('editProfile')}
                accessibilityRole="button"
                accessibilityLabel={t('profile.home.editProfile')}
                className="h-11 px-4 rounded-full items-center justify-center bg-white"
                style={{ borderWidth: 1, borderColor: gs.lineStrong }}
              >
                <Text className="text-[15px] font-bold text-ink">{t('common.edit')}</Text>
              </Pressable>
            </View>
          )}
          {error && !profile ? (
            <Pressable onPress={() => void refetch()} accessibilityRole="button" className="mt-3">
              <Text className="text-[13px] font-bold" style={{ color: gs.danger }}>
                {t('profile.home.loadError')}
              </Text>
            </Pressable>
          ) : null}
        </Card>

        {/* Stats */}
        <View className="flex-row px-5 mt-4 gap-x-3">
          {stats.map(({ key, Icon, value, label, onPress }) => (
            <Pressable
              key={key}
              onPress={onPress}
              accessibilityRole="button"
              accessibilityLabel={`${value} ${label}`}
              className="flex-1 rounded-[22px] bg-white p-3.5 active:opacity-80"
              style={softShadow}
            >
              <View className="h-10 w-10 rounded-xl items-center justify-center" style={{ backgroundColor: gs.violetSoft }}>
                <Icon size={20} color={gs.violet} strokeWidth={1.9} />
              </View>
              <Text className="mt-3 text-[26px] leading-[30px] font-extrabold text-ink">{value}</Text>
              <Text className="mt-0.5 text-[13px] text-subtle leading-[17px]" numberOfLines={2}>
                {label}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Interests */}
        <SectionTitle
          title={t('profile.interests')}
          right={
            interests.selectedCount > 0 ? (
              <Text className="text-[14px] font-bold" style={{ color: gs.violet }}>
                {t('profile.home.selectedCount', { count: interests.selectedCount })}
              </Text>
            ) : null
          }
        />
        <View className="px-5 flex-row flex-wrap gap-2">
          {interests.loading && interests.options.length === 0 ? (
            <ActivityIndicator color={gs.violet} />
          ) : interests.options.length === 0 ? (
            <Text className="text-[14px] text-muted">{t('profile.noInterestsSelected')}</Text>
          ) : (
            interests.options.map((o) => (
              <Pressable
                key={o.id}
                onPress={() => void interests.toggle(o.id)}
                disabled={!interests.editable}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: o.selected }}
                accessibilityLabel={o.label}
                className="flex-row items-center h-11 px-4 rounded-full"
                style={{
                  backgroundColor: o.selected ? gs.violetSoft : gs.white,
                  borderWidth: 1.5,
                  borderColor: o.selected ? gs.violet : gs.line,
                }}
              >
                {o.selected ? <Check size={15} color={gs.violet} strokeWidth={2.6} style={{ marginRight: 6 }} /> : null}
                <Text className="text-[15px] font-bold" style={{ color: o.selected ? gs.violetDark : gs.ink }}>
                  {o.label}
                </Text>
              </Pressable>
            ))
          )}
        </View>

        {/* Quick settings */}
        <SectionTitle title={t('profile.quickSettings')} />
        <Card>
          <ToggleRow
            icon={BellRing}
            title={t('profile.pushNotifications')}
            value={settings?.pushNotificationsEnabled ?? false}
            onChange={(v) => void onToggle('pushNotificationsEnabled', v)}
            disabled={!settings}
          />
          <Divider />
          <ToggleRow
            icon={Navigation}
            title={t('profile.locationServices')}
            value={settings?.locationServicesEnabled ?? false}
            onChange={(v) => void onToggle('locationServicesEnabled', v)}
            disabled={!settings}
          />
          <Divider />
          <Row
            icon={Globe}
            title={t('profile.language')}
            onPress={() => setLangOpen(true)}
            right={<Text className="text-[15px] text-subtle">{LANGS.find((l) => l.key === lang)?.label}</Text>}
          />
        </Card>

        {/* Account menu */}
        <SectionTitle title={t('profile.home.account')} />
        <Card>
          <Row icon={UserPen} title={t('profile.home.editProfile')} subtitle={t('profile.home.editProfileSub')} onPress={() => open('editProfile')} />
          <Divider />
          <Row icon={Shield} title={t('profile.accountSettings')} subtitle={t('profile.home.accountSub')} onPress={() => open('account')} />
          <Divider />
          <Row
            icon={CreditCard}
            title={t('profile.paymentMethods')}
            subtitle={defaultCard ? cardLabel(defaultCard, t) : t('profile.home.paymentsSub')}
            onPress={() => open('payments')}
          />
          <Divider />
          <Row icon={Bell} title={t('profile.home.notificationsRow')} subtitle={t('profile.home.notificationsSub')} onPress={() => open('notificationPrefs')} />
          <Divider />
          <Row icon={Bookmark} title={t('profile.saved.title')} subtitle={t('profile.home.savedSub')} onPress={() => nav.push({ name: 'saved' })} />
          <Divider />
          <Row icon={Star} title={t('profile.reviews.title')} subtitle={t('profile.home.reviewsSub')} onPress={() => open('reviews')} />
        </Card>

        <SectionTitle title={t('profile.home.support')} />
        <Card>
          <Row icon={CircleHelp} title={t('profile.helpSupport')} subtitle={t('profile.home.helpSub')} onPress={() => open('help')} />
          <Divider />
          <Row icon={Lock} title={t('profile.home.privacy')} subtitle={t('profile.home.privacySub')} onPress={() => open('privacy')} />
          <Divider />
          <Row icon={FileText} title={t('profile.home.terms')} subtitle={t('profile.home.termsSub')} onPress={() => open('terms')} />
        </Card>

        <Pressable
          onPress={() => void onSignOut()}
          disabled={signingOut}
          accessibilityRole="button"
          accessibilityLabel={t('profile.home.logOut')}
          className="mx-5 mt-7 h-14 rounded-full flex-row items-center justify-center bg-white"
          style={{ borderWidth: 1.5, borderColor: '#F5C2BE', opacity: signingOut ? 0.6 : 1 }}
        >
          {signingOut ? (
            <ActivityIndicator color={gs.danger} />
          ) : (
            <>
              <LogOut size={20} color="#B42318" />
              <Text className="ml-2 text-[16px] font-extrabold" style={{ color: '#B42318' }}>
                {t('profile.home.logOut')}
              </Text>
            </>
          )}
        </Pressable>

        <Text className="mt-5 text-center text-[13px] text-muted">{t('profile.home.version', { version })}</Text>
      </ScrollView>

      <GsSheet visible={langOpen} onClose={() => setLangOpen(false)} title={t('language.choose')}>
        <View className="px-5">
          {LANGS.map((opt) => {
            const selected = opt.key === lang;
            return (
              <Pressable
                key={opt.key}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                onPress={() => {
                  setLangOpen(false);
                  if (!selected) void setLanguage(opt.key);
                }}
                className="flex-row items-center justify-between h-14 border-b"
                style={{ borderColor: gs.line }}
              >
                <Text className="text-[17px] font-bold" style={{ color: selected ? gs.violet : gs.ink }}>
                  {opt.label}
                </Text>
                {selected ? <Check size={20} color={gs.violet} /> : null}
              </Pressable>
            );
          })}
        </View>
      </GsSheet>
    </View>
  );
}
