// pages/AccountSettingsPage.tsx — Account settings: password, two-step
// verification, login alerts, email/phone verification, signed-in devices,
// sign-in history, data export (Phase 4 route 171) and account deletion.
//
// Password, 2-step verification, verification and devices are Clerk features;
// the rest uses the GoSwing API. Social privacy settings (private account,
// who can message you, blocked accounts) are deferred with Social.
import React, { useCallback, useEffect, useMemo, useState, type ReactElement } from 'react';
import { ActivityIndicator, Linking, Platform, Pressable, Text, View } from 'react-native';
import { useAuth as useClerkAuth, useUser } from '@clerk/clerk-expo';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import {
  BellRing,
  ChevronDown,
  ChevronUp,
  Download,
  Eye,
  EyeOff,
  History,
  KeyRound,
  Laptop,
  Mail,
  Phone,
  ShieldCheck,
  Smartphone,
  Tablet,
  Trash2,
} from 'lucide-react-native';

import QRCode from 'react-native-qrcode-svg';
import { gs } from '@/theme/colors';
import { GsButton, GsSheet, StatusChip } from '@/components/gs';
import { useAuth } from '@/providers/AuthProvider';
import { useLoginHistory, useProfile, useSettings } from '@/hooks/profile';
import { requestDataExport } from '@/lib/api/profile';
import {
  Card,
  ConfirmSheet,
  Divider,
  Field,
  GsSwitch,
  IconTile,
  Input,
  PageScaffold,
  Row,
  SectionTitle,
  SmallButton,
  ToggleRow,
} from '@/screens/profile/components/ui';

type AccountSettingsPageProps = Readonly<{ onBack: () => void }>;

/** Clerk errors carry a list of { message, longMessage }. */
function clerkMessage(e: unknown, fallback: string): string {
  const errs = (e as { errors?: ReadonlyArray<{ longMessage?: string; message?: string }> })?.errors;
  if (errs && errs.length) return errs[0].longMessage ?? errs[0].message ?? fallback;
  return e instanceof Error ? e.message : fallback;
}

/** 0–4: length ≥ 8, uppercase, digit, symbol. */
export function passwordScore(p: string): number {
  if (!p) return 0;
  return [p.length >= 8, /[A-Z]/.test(p), /\d/.test(p), /[^A-Za-z0-9]/.test(p)].filter(Boolean).length;
}

export function timeAgo(d: Date, t: TFunction, locale: string): string {
  const s = Math.max(0, (Date.now() - d.getTime()) / 1000);
  if (s < 60) return t('profile.time.justNow');
  if (s < 3600) return t('profile.time.minutes', { count: Math.floor(s / 60) });
  if (s < 86400) return t('profile.time.hours', { count: Math.floor(s / 3600) });
  if (s < 86400 * 7) return t('profile.time.days', { count: Math.floor(s / 86400) });
  if (s < 86400 * 35) return t('profile.time.weeks', { count: Math.floor(s / (86400 * 7)) });
  return d.toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' });
}

type Device = Readonly<{
  id: string;
  title: string;
  where: string;
  lastActive: Date | null;
  kind: 'phone' | 'tablet' | 'computer';
  revoke: () => Promise<unknown>;
}>;

export default function AccountSettingsPage({ onBack }: AccountSettingsPageProps): ReactElement {
  const { t, i18n } = useTranslation();
  const locale = i18n.language;
  const { user } = useUser();
  const { sessionId } = useClerkAuth();
  const { signOutAsync } = useAuth();
  const { deleteAccount } = useProfile();
  const { settings, updateSettings } = useSettings();
  const { history, isLoading: historyLoading } = useLoginHistory(10);

  // ── Password ──
  const hasPassword = !!user?.passwordEnabled;
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNext, setShowNext] = useState(false);
  const [pwBusy, setPwBusy] = useState(false);
  const [pwMsg, setPwMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const score = passwordScore(next);
  const canUpdatePw = score === 4 && (!hasPassword || current.length > 0) && !pwBusy;

  const onUpdatePassword = async (): Promise<void> => {
    if (!user || !canUpdatePw) return;
    try {
      setPwBusy(true);
      setPwMsg(null);
      await user.updatePassword({ newPassword: next, ...(hasPassword ? { currentPassword: current } : {}) });
      setCurrent('');
      setNext('');
      setPwMsg({ ok: true, text: t('profile.acct.passwordUpdated') });
    } catch (e: unknown) {
      setPwMsg({ ok: false, text: clerkMessage(e, t('profile.acct.passwordFailed')) });
    } finally {
      setPwBusy(false);
    }
  };

  // ── Two-step verification (TOTP) ──
  const [totpOn, setTotpOn] = useState<boolean>(!!user?.totpEnabled);
  useEffect(() => setTotpOn(!!user?.totpEnabled), [user?.totpEnabled]);
  const [totpSheet, setTotpSheet] = useState<{ secret?: string; uri?: string } | null>(null);
  const [totpCode, setTotpCode] = useState('');
  const [totpBusy, setTotpBusy] = useState(false);
  const [totpError, setTotpError] = useState<string | null>(null);
  const [disableTotpOpen, setDisableTotpOpen] = useState(false);

  const startTotp = async (): Promise<void> => {
    if (!user) return;
    try {
      setTotpBusy(true);
      setTotpError(null);
      const totp = await user.createTOTP();
      setTotpCode('');
      setTotpSheet({ secret: totp.secret, uri: totp.uri });
    } catch (e: unknown) {
      setTotpSheet({});
      setTotpError(clerkMessage(e, t('profile.acct.twoStepUnavailable')));
    } finally {
      setTotpBusy(false);
    }
  };

  const verifyTotp = async (): Promise<void> => {
    if (!user || totpCode.length !== 6) return;
    try {
      setTotpBusy(true);
      setTotpError(null);
      await user.verifyTOTP({ code: totpCode });
      setTotpOn(true);
      setTotpSheet(null);
      void user.reload?.();
    } catch (e: unknown) {
      setTotpError(clerkMessage(e, t('profile.acct.codeInvalid')));
    } finally {
      setTotpBusy(false);
    }
  };

  const disableTotp = async (): Promise<void> => {
    if (!user) return;
    try {
      setTotpBusy(true);
      await user.disableTOTP();
      setTotpOn(false);
      setDisableTotpOpen(false);
      void user.reload?.();
    } catch (e: unknown) {
      setTotpError(clerkMessage(e, t('profile.tryAgain')));
    } finally {
      setTotpBusy(false);
    }
  };

  // ── Phone verification ──
  const email = user?.primaryEmailAddress?.emailAddress ?? null;
  const emailVerified = user?.primaryEmailAddress?.verification?.status === 'verified';
  const phone = user?.primaryPhoneNumber?.phoneNumber ?? null;
  const phoneVerified = user?.primaryPhoneNumber?.verification?.status === 'verified';
  const [phoneSheet, setPhoneSheet] = useState(false);

  // ── Devices (Clerk sessions) ──
  const [devices, setDevices] = useState<ReadonlyArray<Device> | null>(null);
  const [revoking, setRevoking] = useState<string | null>(null);
  const loadDevices = useCallback(async () => {
    if (!user?.getSessions) return;
    try {
      const sessions = await user.getSessions();
      setDevices(
        sessions
          .filter((s) => s.status === 'active')
          .map((s) => {
            const a = s.latestActivity ?? ({} as typeof s.latestActivity);
            const dt = (a?.deviceType ?? '').toLowerCase();
            const kind: Device['kind'] = /ipad|tablet/.test(dt) ? 'tablet' : a?.isMobile || /iphone|android|mobile/.test(dt) ? 'phone' : 'computer';
            const title = [a?.deviceType, a?.browserName].filter(Boolean).join(' · ') || t('profile.acct.unknownDevice');
            const where = [a?.city, a?.country].filter(Boolean).join(', ');
            return { id: s.id, title, where, lastActive: s.lastActiveAt ? new Date(s.lastActiveAt) : null, kind, revoke: () => s.revoke() };
          })
          .sort((a, b) => (a.id === sessionId ? -1 : b.id === sessionId ? 1 : (b.lastActive?.getTime() ?? 0) - (a.lastActive?.getTime() ?? 0))),
      );
    } catch {
      setDevices([]);
    }
  }, [user, sessionId, t]);
  useEffect(() => {
    void loadDevices();
  }, [loadDevices]);

  const revoke = async (d: Device): Promise<void> => {
    try {
      setRevoking(d.id);
      await d.revoke();
      setDevices((xs) => (xs ?? []).filter((x) => x.id !== d.id));
    } catch {
      // keep the row; the next load shows the real state
    } finally {
      setRevoking(null);
    }
  };

  const [historyOpen, setHistoryOpen] = useState(false);

  // ── Data export (route 171) ──
  const [exportState, setExportState] = useState<'idle' | 'busy' | 'sent' | 'soon' | 'error'>('idle');
  const [exportError, setExportError] = useState<string | null>(null);
  const onExport = async (): Promise<void> => {
    try {
      setExportState('busy');
      const res = await requestDataExport();
      setExportState(res ? 'sent' : 'soon');
    } catch (e: unknown) {
      setExportError(e instanceof Error ? e.message : t('profile.tryAgain'));
      setExportState('error');
    }
  };

  // ── Delete account ──
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteText, setDeleteText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [scheduledFor, setScheduledFor] = useState<string | null>(null);

  const onDelete = async (): Promise<void> => {
    try {
      setDeleting(true);
      setDeleteError(null);
      const res = await deleteAccount();
      if (res.accountStatus === 'pendingDeletion') {
        const when = res.scheduledDeletionAt ? new Date(res.scheduledDeletionAt) : new Date(Date.now() + 30 * 86400_000);
        setScheduledFor(when.toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' }));
      } else {
        setDeleteOpen(false);
        await signOutAsync();
      }
    } catch (e: unknown) {
      setDeleteError(e instanceof Error ? e.message : t('account.couldNotDelete'));
    } finally {
      setDeleting(false);
    }
  };

  const strength = useMemo(() => {
    const labels = ['', t('profile.acct.strength.weak'), t('profile.acct.strength.fair'), t('profile.acct.strength.good'), t('profile.acct.strength.strong')];
    const colors = [gs.lineStrong, gs.danger, gs.orange, '#C9A100', gs.green];
    return { label: labels[score], color: colors[score] };
  }, [score, t]);

  const eye = (shown: boolean, toggle: () => void): ReactElement => (
    <Pressable onPress={toggle} accessibilityRole="button" accessibilityLabel={shown ? t('profile.acct.hidePassword') : t('profile.acct.showPassword')} hitSlop={10}>
      {shown ? <EyeOff size={20} color={gs.subtle} /> : <Eye size={20} color={gs.subtle} />}
    </Pressable>
  );

  return (
    <PageScaffold title={t('profile.acct.title')} subtitle={t('profile.acct.subtitle')} onBack={onBack}>
      {/* Password & security */}
      <SectionTitle title={t('profile.acct.passwordSecurity')} className="mt-2" />
      <Card className="p-4">
        {hasPassword ? (
          <Field label={t('profile.acct.currentPassword')}>
            <Input
              value={current}
              onChangeText={setCurrent}
              secureTextEntry={!showCurrent}
              autoCapitalize="none"
              textContentType="password"
              right={eye(showCurrent, () => setShowCurrent((v) => !v))}
              accessibilityLabel={t('profile.acct.currentPassword')}
            />
          </Field>
        ) : null}
        <Field label={hasPassword ? t('profile.acct.newPassword') : t('profile.acct.setPassword')}>
          <Input
            value={next}
            onChangeText={setNext}
            secureTextEntry={!showNext}
            autoCapitalize="none"
            textContentType="newPassword"
            right={eye(showNext, () => setShowNext((v) => !v))}
            accessibilityLabel={t('profile.acct.newPassword')}
          />
        </Field>
        {next.length > 0 ? (
          <View className="-mt-2 mb-3" accessibilityLabel={t('profile.acct.strengthLabel', { strength: strength.label })}>
            <View className="flex-row gap-x-1.5">
              {[1, 2, 3, 4].map((i) => (
                <View key={i} className="flex-1 h-1.5 rounded-full" style={{ backgroundColor: i <= score ? strength.color : gs.line }} />
              ))}
            </View>
            <Text className="mt-1 text-[13px] font-bold" style={{ color: strength.color }}>
              {strength.label}
            </Text>
          </View>
        ) : null}
        <Text className="text-[13px] text-subtle mb-3 leading-[18px]">{t('profile.acct.passwordRules')}</Text>
        <GsButton
          label={hasPassword ? t('profile.acct.updatePassword') : t('profile.acct.setPasswordAction')}
          onPress={() => void onUpdatePassword()}
          disabled={!canUpdatePw}
          loading={pwBusy}
          fullWidth
        />
        {pwMsg ? (
          <Text className="mt-2 text-[13px] font-semibold" style={{ color: pwMsg.ok ? gs.green : gs.danger }}>
            {pwMsg.text}
          </Text>
        ) : null}
      </Card>

      <Card className="mt-3">
        <Row
          icon={ShieldCheck}
          title={t('profile.acct.twoStep')}
          subtitle={totpOn ? t('profile.acct.twoStepOn') : t('profile.acct.twoStepOff')}
          chevron={false}
          right={
            totpBusy && !totpSheet ? (
              <ActivityIndicator color={gs.violet} />
            ) : (
              <GsSwitch
                value={totpOn}
                onValueChange={(v) => (v ? void startTotp() : setDisableTotpOpen(true))}
                accessibilityLabel={t('profile.acct.twoStep')}
              />
            )
          }
        />
        <Divider />
        <ToggleRow
          icon={BellRing}
          title={t('profile.acct.loginAlerts')}
          subtitle={t('profile.acct.loginAlertsSub')}
          value={settings?.loginNotificationsEnabled ?? false}
          onChange={(v) => void updateSettings({ loginNotificationsEnabled: v }).catch(() => undefined)}
          disabled={!settings}
        />
      </Card>

      {/* Verification */}
      <SectionTitle title={t('profile.acct.verification')} />
      <Card>
        <Row
          icon={Mail}
          title={t('profile.acct.email')}
          subtitle={email ?? '—'}
          chevron={false}
          right={
            email ? (
              <StatusChip label={emailVerified ? `✓ ${t('account.verified')}` : t('account.unverified')} tone={emailVerified ? 'green' : 'orange'} />
            ) : null
          }
        />
        <Divider />
        <Row
          icon={Phone}
          title={t('profile.acct.phone')}
          subtitle={phone ?? '—'}
          chevron={false}
          right={
            phone && phoneVerified ? (
              <StatusChip label={`✓ ${t('account.verified')}`} tone="green" />
            ) : (
              <GsButton label={phone ? t('account.verify') : t('profile.acct.addVerify')} size="sm" onPress={() => setPhoneSheet(true)} />
            )
          }
        />
      </Card>

      {/* Devices */}
      <SectionTitle title={t('profile.acct.devices')} />
      <Card>
        {devices === null ? (
          <View className="py-6 items-center">
            <ActivityIndicator color={gs.violet} />
          </View>
        ) : devices.length === 0 ? (
          <Text className="px-4 py-5 text-[14px] text-muted">{t('profile.acct.noDevices')}</Text>
        ) : (
          devices.map((d, i) => {
            const isThis = d.id === sessionId;
            return (
              <View key={d.id}>
                {i > 0 ? <Divider /> : null}
                <View className="flex-row items-center px-4 py-3 min-h-[64px]">
                  <IconTile icon={d.kind === 'phone' ? Smartphone : d.kind === 'tablet' ? Tablet : Laptop} />
                  <View className="flex-1 ml-3 pr-2">
                    <Text className="text-[16px] font-bold text-ink" numberOfLines={1}>
                      {d.title}
                    </Text>
                    <Text className="text-[13px]" style={{ color: isThis ? gs.green : gs.subtle }} numberOfLines={1}>
                      {[d.where || null, isThis ? t('profile.acct.thisDevice') : d.lastActive ? timeAgo(d.lastActive, t, locale) : null]
                        .filter(Boolean)
                        .join(' · ')}
                    </Text>
                  </View>
                  {isThis ? null : (
                    <SmallButton label={t('profile.acct.logOut')} tone="danger" loading={revoking === d.id} onPress={() => void revoke(d)} />
                  )}
                </View>
              </View>
            );
          })
        )}
        <Divider />
        <Row
          icon={History}
          title={t('profile.acct.history')}
          subtitle={t('profile.acct.historySub')}
          onPress={() => setHistoryOpen((v) => !v)}
          chevron={false}
          right={historyOpen ? <ChevronUp size={18} color={gs.subtle} /> : <ChevronDown size={18} color={gs.subtle} />}
        />
        {historyOpen ? (
          <View className="px-4 pb-3">
            {historyLoading ? (
              <ActivityIndicator color={gs.violet} />
            ) : history.length === 0 ? (
              <Text className="text-[14px] text-muted py-2">{t('account.noLoginHistory')}</Text>
            ) : (
              history.map((h) => (
                <View key={h.id} className="flex-row items-center py-2 border-t" style={{ borderColor: gs.line }}>
                  <View className="flex-1 pr-2">
                    <Text className="text-[14px] font-bold text-ink" numberOfLines={1}>
                      {h.loggedInAt ? new Date(h.loggedInAt).toLocaleString(locale, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'}
                    </Text>
                    <Text className="text-[13px] text-subtle" numberOfLines={1}>
                      {[h.location ?? t('account.unknownLocation'), h.deviceType !== 'unknown' ? t(`profile.acct.deviceType.${h.deviceType}`) : null]
                        .filter(Boolean)
                        .join(' · ')}
                    </Text>
                  </View>
                  <StatusChip
                    label={h.wasSuccessful ? t('account.loginSuccess') : t('account.loginFailed')}
                    tone={h.wasSuccessful ? 'green' : 'red'}
                    size="xs"
                  />
                </View>
              ))
            )}
          </View>
        ) : null}
      </Card>

      {/* Your data */}
      <SectionTitle title={t('profile.acct.yourData')} />
      <Card>
        <Row
          icon={Download}
          title={t('profile.acct.download')}
          subtitle={
            exportState === 'sent'
              ? t('profile.acct.downloadSent')
              : exportState === 'soon'
                ? t('profile.acct.downloadSoon')
                : exportState === 'error'
                  ? exportError
                  : t('profile.acct.downloadSub')
          }
          onPress={exportState === 'busy' || exportState === 'sent' ? undefined : () => void onExport()}
          right={exportState === 'busy' ? <ActivityIndicator color={gs.violet} /> : null}
        />
        <Divider />
        <Row
          icon={Trash2}
          tone="danger"
          title={t('profile.acct.delete')}
          subtitle={t('profile.acct.deleteSub')}
          onPress={() => {
            setDeleteText('');
            setDeleteError(null);
            setScheduledFor(null);
            setDeleteOpen(true);
          }}
        />
      </Card>

      {/* Two-step setup sheet */}
      <GsSheet visible={!!totpSheet} onClose={() => setTotpSheet(null)} title={t('profile.acct.twoStepSetup')}>
        <View className="px-5">
          {totpSheet?.secret ? (
            <>
              <Text className="text-[15px] text-subtle leading-[21px]">{t('profile.acct.twoStepStep1')}</Text>
              <View className="mt-3 rounded-2xl p-4 items-center" style={{ backgroundColor: gs.surface2 }}>
                {totpSheet.uri ? (
                  <View className="p-3 mb-3 rounded-xl bg-white">
                    <QRCode value={totpSheet.uri} size={148} color={gs.ink} backgroundColor={gs.white} />
                  </View>
                ) : null}
                <Text selectable className="text-[18px] font-extrabold text-ink tracking-[2px] text-center">
                  {totpSheet.secret.replace(/(.{4})/g, '$1 ').trim()}
                </Text>
              </View>
              {totpSheet.uri && Platform.OS !== 'web' ? (
                <GsButton
                  label={t('profile.acct.openAuthenticator')}
                  variant="soft"
                  icon={<KeyRound size={16} color={gs.violetDark} />}
                  onPress={() => void Linking.openURL(String(totpSheet.uri)).catch(() => undefined)}
                  className="mt-3"
                  fullWidth
                />
              ) : null}
              <Text className="mt-4 text-[15px] text-subtle">{t('profile.acct.twoStepStep2')}</Text>
              <View className="mt-2">
                <Input
                  value={totpCode}
                  onChangeText={(v) => setTotpCode(v.replace(/\D/g, '').slice(0, 6))}
                  keyboardType="number-pad"
                  textContentType="oneTimeCode"
                  placeholder="123456"
                  maxLength={6}
                  accessibilityLabel={t('profile.acct.code')}
                />
              </View>
              {totpError ? (
                <Text className="mt-2 text-[13px] font-semibold" style={{ color: gs.danger }}>
                  {totpError}
                </Text>
              ) : null}
              <GsButton
                label={t('profile.acct.verifyEnable')}
                onPress={() => void verifyTotp()}
                disabled={totpCode.length !== 6}
                loading={totpBusy}
                className="mt-4"
                fullWidth
              />
            </>
          ) : (
            <Text className="text-[15px] text-subtle leading-[21px]">{totpError ?? t('profile.acct.twoStepUnavailable')}</Text>
          )}
        </View>
      </GsSheet>

      <ConfirmSheet
        visible={disableTotpOpen}
        title={t('profile.acct.disableTwoStepTitle')}
        message={t('profile.acct.disableTwoStepMessage')}
        confirmLabel={t('profile.acct.disableTwoStep')}
        busy={totpBusy}
        onConfirm={() => void disableTotp()}
        onClose={() => setDisableTotpOpen(false)}
      />

      <PhoneVerifySheet visible={phoneSheet} onClose={() => setPhoneSheet(false)} />

      {/* Delete account */}
      <ConfirmSheet
        visible={deleteOpen}
        title={scheduledFor ? t('profile.acct.deleteScheduledTitle') : t('profile.acct.deleteTitle')}
        message={scheduledFor ? t('profile.acct.deleteScheduled', { date: scheduledFor }) : t('profile.acct.deleteMessage')}
        confirmLabel={scheduledFor ? t('profile.acct.done') : t('profile.acct.deleteConfirm')}
        danger={!scheduledFor}
        hideCancel={!!scheduledFor}
        busy={deleting}
        confirmDisabled={!scheduledFor && deleteText.trim().toUpperCase() !== 'DELETE'}
        onConfirm={() => (scheduledFor ? setDeleteOpen(false) : void onDelete())}
        onClose={() => setDeleteOpen(false)}
      >
        {scheduledFor ? null : (
          <View className="mt-4">
            <Field label={t('profile.acct.typeDelete')} hint={deleteError} hintTone="red">
              <Input value={deleteText} onChangeText={setDeleteText} autoCapitalize="characters" autoCorrect={false} placeholder="DELETE" accessibilityLabel={t('profile.acct.typeDelete')} />
            </Field>
          </View>
        )}
      </ConfirmSheet>
    </PageScaffold>
  );
}

/** Add (or re-verify) a phone number through Clerk: number → SMS code. */
function PhoneVerifySheet({ visible, onClose }: Readonly<{ visible: boolean; onClose: () => void }>): ReactElement {
  const { t } = useTranslation();
  const { user } = useUser();
  type PhoneRes = Awaited<ReturnType<NonNullable<typeof user>['createPhoneNumber']>>;
  const [number, setNumber] = useState('');
  const [resource, setResource] = useState<PhoneRes | null>(null);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setNumber(user?.primaryPhoneNumber?.phoneNumber ?? '');
    setResource(null);
    setCode('');
    setError(null);
  }, [visible, user]);

  const send = async (): Promise<void> => {
    if (!user) return;
    try {
      setBusy(true);
      setError(null);
      const existing = user.phoneNumbers?.find((p) => p.phoneNumber.replace(/\s/g, '') === number.replace(/\s/g, ''));
      const res = existing ?? (await user.createPhoneNumber({ phoneNumber: number.replace(/\s/g, '') }));
      await res.prepareVerification();
      setResource(res);
    } catch (e: unknown) {
      setError(clerkMessage(e, t('profile.tryAgain')));
    } finally {
      setBusy(false);
    }
  };

  const verify = async (): Promise<void> => {
    if (!resource || !user) return;
    try {
      setBusy(true);
      setError(null);
      const res = await resource.attemptVerification({ code });
      if (res.verification?.status === 'verified' && user.primaryPhoneNumberId !== res.id) {
        await user.update({ primaryPhoneNumberId: res.id }).catch(() => undefined);
      }
      void user.reload?.();
      onClose();
    } catch (e: unknown) {
      setError(clerkMessage(e, t('profile.acct.codeInvalid')));
    } finally {
      setBusy(false);
    }
  };

  return (
    <GsSheet visible={visible} onClose={onClose} title={t('profile.acct.phoneTitle')}>
      <View className="px-5">
        {resource ? (
          <>
            <Text className="text-[15px] text-subtle">{t('profile.acct.codeSent', { phone: number })}</Text>
            <View className="mt-3">
              <Input
                value={code}
                onChangeText={(v) => setCode(v.replace(/\D/g, '').slice(0, 6))}
                keyboardType="number-pad"
                textContentType="oneTimeCode"
                placeholder="123456"
                accessibilityLabel={t('profile.acct.code')}
              />
            </View>
          </>
        ) : (
          <>
            <Text className="text-[15px] text-subtle">{t('profile.acct.phoneIntro')}</Text>
            <View className="mt-3">
              <Input
                value={number}
                onChangeText={setNumber}
                keyboardType="phone-pad"
                textContentType="telephoneNumber"
                placeholder="+33 6 12 34 56 78"
                accessibilityLabel={t('profile.acct.phone')}
              />
            </View>
          </>
        )}
        {error ? (
          <Text className="mt-2 text-[13px] font-semibold" style={{ color: gs.danger }}>
            {error}
          </Text>
        ) : null}
        <GsButton
          label={resource ? t('profile.acct.verify') : t('profile.acct.sendCode')}
          onPress={() => void (resource ? verify() : send())}
          disabled={resource ? code.length < 6 : number.replace(/\D/g, '').length < 8}
          loading={busy}
          className="mt-4"
          fullWidth
        />
      </View>
    </GsSheet>
  );
}
