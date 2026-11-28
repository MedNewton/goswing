// pages/Editprofilepage.tsx — Edit profile: photo, public profile (name,
// username, city, bio) and private information (email, phone, date of birth).
//
// Username, bio and date of birth are Phase 4 fields (spec § K.1): their inputs
// only show when GET /v1/me/profile returns them. The photo is uploaded through
// route 169 (POST /v1/me/avatar) — a phone-local file URI is never sent as
// avatarUrl. While that route is missing the screen says "coming soon".
import React, { useEffect, useMemo, useRef, useState, type ReactElement } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useTranslation } from 'react-i18next';
import { Camera, CircleCheck, CircleX, ImageIcon, Lock } from 'lucide-react-native';

import { gs } from '@/theme/colors';
import { GsSheet } from '@/components/gs';
import { useProfile } from '@/hooks/profile';
import { ApiError } from '@/lib/api/client';
import { checkUsername, deleteAvatar, uploadAvatar, type ProfilePatch, type UsernameAvailability } from '@/lib/api/profile';
import { Avatar, Card, ConfirmSheet, Field, Input, Loading, PageScaffold, Row, SectionTitle, Divider } from '@/screens/profile/components/ui';

type EditProfilePageProps = Readonly<{ onBack: () => void }>;

const USERNAME_RE = /^[a-z0-9._]{3,24}$/;
const BIO_MAX = 150;

/** Remembered for the session once the avatar route answered "not deployed". */
let avatarUploadUnavailable = false;

function validUsername(u: string): boolean {
  return USERNAME_RE.test(u) && !u.startsWith('.') && !u.endsWith('.');
}

/** "1996-04-12" ⇄ "12/04/1996". */
function isoToDmy(iso: string | null): string {
  const m = iso ? /^(\d{4})-(\d{2})-(\d{2})/.exec(iso) : null;
  return m ? `${m[3]}/${m[2]}/${m[1]}` : '';
}
function dmyToIso(dmy: string): string | null {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(dmy.trim());
  if (!m) return null;
  const d = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
  if (d.getDate() !== Number(m[1]) || d.getMonth() !== Number(m[2]) - 1) return null;
  return `${m[3]}-${m[2]}-${m[1]}`;
}
function maskDmy(text: string): string {
  const digits = text.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

type UsernameState = Readonly<
  | { kind: 'idle' }
  | { kind: 'checking' }
  | { kind: 'invalid' }
  | { kind: 'result'; value: UsernameAvailability }
  | { kind: 'unknown' }
>;

export default function EditProfilePage({ onBack }: EditProfilePageProps): ReactElement {
  const { t } = useTranslation();
  const { profile, extras, support, isLoading, patchProfile, applyProfile } = useProfile();

  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [city, setCity] = useState('');
  const [bio, setBio] = useState('');
  const [phone, setPhone] = useState('');
  const [dob, setDob] = useState('');
  const [initialized, setInitialized] = useState(false);

  const [saving, setSaving] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [usernameState, setUsernameState] = useState<UsernameState>({ kind: 'idle' });

  const [photoSheet, setPhotoSheet] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoNotice, setPhotoNotice] = useState<string | null>(null);
  const [discardOpen, setDiscardOpen] = useState(false);

  useEffect(() => {
    if (!profile || initialized) return;
    setName(profile.name ?? '');
    setUsername(extras.username ?? '');
    setCity(profile.city ?? '');
    setBio(extras.bio ?? '');
    setPhone(profile.phone ?? '');
    setDob(isoToDmy(extras.dateOfBirth));
    setInitialized(true);
  }, [profile, extras, initialized]);

  // ── Live username check (route 168), debounced ──
  const checkSeq = useRef(0);
  useEffect(() => {
    if (!support.username) return;
    const u = username.trim().toLowerCase();
    if (!u || u === (extras.username ?? '')) {
      setUsernameState({ kind: 'idle' });
      return;
    }
    if (!validUsername(u)) {
      setUsernameState({ kind: 'invalid' });
      return;
    }
    const seq = ++checkSeq.current;
    setUsernameState({ kind: 'checking' });
    const timer = setTimeout(() => {
      checkUsername(u)
        .then((res) => {
          if (seq !== checkSeq.current) return;
          setUsernameState(res ? { kind: 'result', value: res } : { kind: 'unknown' });
        })
        .catch(() => {
          if (seq === checkSeq.current) setUsernameState({ kind: 'unknown' });
        });
    }, 400);
    return () => clearTimeout(timer);
  }, [username, support.username, extras.username]);

  // ── What changed ──
  const body = useMemo<ProfilePatch>(() => {
    if (!profile) return {};
    const out: { -readonly [K in keyof ProfilePatch]: ProfilePatch[K] } = {};
    if (name.trim() !== (profile.name ?? '')) out.displayName = name.trim();
    if (city.trim() !== (profile.city ?? '')) out.city = city.trim() || null;
    if (phone.trim() !== (profile.phone ?? '')) out.phone = phone.trim() || null;
    if (support.username && username.trim().toLowerCase() !== (extras.username ?? '')) out.username = username.trim().toLowerCase() || null;
    if (support.bio && bio.trim() !== (extras.bio ?? '')) out.bio = bio.trim() || null;
    if (support.dateOfBirth && dob !== isoToDmy(extras.dateOfBirth)) out.dateOfBirth = dob ? dmyToIso(dob) : null;
    return out;
  }, [profile, extras, support, name, city, phone, username, bio, dob]);

  const dirty = Object.keys(body).length > 0;
  const dobInvalid = support.dateOfBirth && dob.length > 0 && !dmyToIso(dob);
  const usernameBlocked =
    usernameState.kind === 'invalid' || (usernameState.kind === 'result' && !usernameState.value.available);
  const canSave = dirty && !saving && !dobInvalid && !usernameBlocked && usernameState.kind !== 'checking';

  const onSave = async (): Promise<void> => {
    if (!name.trim()) {
      setNameError(t('editProfile.errNameRequired'));
      return;
    }
    if (!canSave) return;
    try {
      setSaving(true);
      setSaveError(null);
      await patchProfile(body);
      onBack();
    } catch (e: unknown) {
      if (e instanceof ApiError && e.code === 'username_taken') {
        setUsernameState({ kind: 'result', value: { username, available: false, reason: 'taken' } });
      } else {
        setSaveError(e instanceof Error ? e.message : t('editProfile.errSaveFailed'));
      }
    } finally {
      setSaving(false);
    }
  };

  const onBackPress = (): void => (dirty ? setDiscardOpen(true) : onBack());

  // ── Photo ──
  const pick = async (source: 'camera' | 'library'): Promise<void> => {
    setPhotoSheet(false);
    if (avatarUploadUnavailable) {
      setPhotoNotice(t('profile.edit.photoSoon'));
      return;
    }
    const perm =
      source === 'camera' ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(
        t('editProfile.permissionRequired'),
        source === 'camera' ? t('editProfile.cameraPermissionMessage') : t('editProfile.libraryPermissionMessage'),
      );
      return;
    }
    const opts: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.8 };
    const result = source === 'camera' ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts);
    const asset = !result.canceled ? result.assets[0] : null;
    if (!asset) return;
    try {
      setPhotoBusy(true);
      setPhotoNotice(null);
      const type = asset.mimeType ?? 'image/jpeg';
      const ext = type.split('/')[1] ?? 'jpg';
      const res = await uploadAvatar({ uri: asset.uri, name: asset.fileName ?? `avatar.${ext}`, type });
      if (!res) {
        avatarUploadUnavailable = true;
        setPhotoNotice(t('profile.edit.photoSoon'));
        return;
      }
      applyProfile({ avatarUrl: res.avatarUrl });
    } catch (e: unknown) {
      setPhotoNotice(e instanceof Error ? e.message : t('profile.edit.photoFailed'));
    } finally {
      setPhotoBusy(false);
    }
  };

  const removePhoto = async (): Promise<void> => {
    try {
      setPhotoBusy(true);
      setPhotoNotice(null);
      const done = await deleteAvatar();
      if (done) applyProfile({ avatarUrl: null });
      else await patchProfile({ avatarUrl: null });
    } catch (e: unknown) {
      setPhotoNotice(e instanceof Error ? e.message : t('profile.edit.photoFailed'));
    } finally {
      setPhotoBusy(false);
    }
  };

  const hasPhoto = !!profile?.avatarUri && /^https?:\/\//.test(profile.avatarUri);

  const usernameHint = (): { text: string | null; tone: 'muted' | 'green' | 'red'; icon: ReactElement | null } => {
    const u = username.trim().toLowerCase();
    switch (usernameState.kind) {
      case 'checking':
        return { text: t('profile.edit.usernameChecking'), tone: 'muted', icon: <ActivityIndicator size="small" color={gs.violet} /> };
      case 'invalid':
        return { text: t('profile.edit.usernameRules'), tone: 'red', icon: <CircleX size={20} color={gs.danger} /> };
      case 'result':
        if (usernameState.value.available)
          return { text: t('profile.edit.usernameAvailable', { username: u }), tone: 'green', icon: <CircleCheck size={20} color={gs.green} /> };
        return {
          text: usernameState.value.reason === 'reserved' ? t('profile.edit.usernameReserved') : t('profile.edit.usernameTaken'),
          tone: 'red',
          icon: <CircleX size={20} color={gs.danger} />,
        };
      default:
        return { text: u ? t('profile.edit.usernameLink', { username: u }) : t('profile.edit.usernameRules'), tone: 'muted', icon: null };
    }
  };
  const uh = usernameHint();

  const saveButton = (
    <Pressable
      onPress={() => void onSave()}
      disabled={!canSave}
      accessibilityRole="button"
      accessibilityLabel={t('gs.save')}
      accessibilityState={{ disabled: !canSave, busy: saving }}
      className="h-11 px-5 rounded-full items-center justify-center"
      style={{ backgroundColor: canSave ? gs.violet : gs.lineStrong }}
    >
      {saving ? (
        <ActivityIndicator color={gs.white} />
      ) : (
        <Text className="text-[15px] font-extrabold" style={{ color: canSave ? gs.white : gs.muted }}>
          {t('gs.save')}
        </Text>
      )}
    </Pressable>
  );

  return (
    <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <PageScaffold title={t('profile.edit.title')} subtitle={t('profile.edit.subtitle')} onBack={onBackPress} right={saveButton}>
        {isLoading && !profile ? (
          <Loading />
        ) : (
          <>
            {/* Photo */}
            <View className="items-center mt-2">
              <View>
                <Avatar uri={profile?.avatarUri} name={name || profile?.name} size={108} />
                {photoBusy ? (
                  <View className="absolute inset-0 rounded-full items-center justify-center" style={{ backgroundColor: 'rgba(20,18,31,0.35)' }}>
                    <ActivityIndicator color={gs.white} />
                  </View>
                ) : null}
                <Pressable
                  onPress={() => setPhotoSheet(true)}
                  accessibilityRole="button"
                  accessibilityLabel={t('profile.edit.changePhoto')}
                  className="absolute right-0 bottom-0 h-10 w-10 rounded-full items-center justify-center border-[3px] border-white"
                  style={{ backgroundColor: gs.violet }}
                >
                  <Camera size={17} color={gs.white} />
                </Pressable>
              </View>
              <View className="flex-row items-center mt-4 gap-x-4">
                <Pressable
                  onPress={() => setPhotoSheet(true)}
                  accessibilityRole="button"
                  className="h-11 px-5 rounded-full items-center justify-center bg-white"
                  style={{ borderWidth: 1, borderColor: gs.lineStrong }}
                >
                  <Text className="text-[15px] font-bold text-ink">{t('profile.edit.change')}</Text>
                </Pressable>
                {hasPhoto ? (
                  <Pressable onPress={() => void removePhoto()} accessibilityRole="button" className="h-11 px-2 justify-center">
                    <Text className="text-[15px] font-bold" style={{ color: '#B42318' }}>
                      {t('profile.edit.remove')}
                    </Text>
                  </Pressable>
                ) : null}
              </View>
              {photoNotice ? (
                <Text className="mt-2 text-[13px] font-semibold text-center px-8" style={{ color: gs.orange }}>
                  {photoNotice}
                </Text>
              ) : null}
            </View>

            {/* Public profile */}
            <SectionTitle title={t('profile.edit.public')} />
            <Card className="p-4 pb-1">
              <Field label={t('profile.edit.fullName')} hint={nameError} hintTone="red">
                <Input
                  value={name}
                  onChangeText={(v) => {
                    setName(v);
                    if (v.trim()) setNameError(null);
                  }}
                  onBlur={() => setNameError(name.trim() ? null : t('editProfile.errNameRequired'))}
                  placeholder={t('profile.edit.fullNamePlaceholder')}
                  autoCapitalize="words"
                  textContentType="name"
                  accessibilityLabel={t('profile.edit.fullName')}
                />
              </Field>
              {support.username ? (
                <Field label={t('profile.edit.username')} hint={uh.text} hintTone={uh.tone}>
                  <Input
                    value={username}
                    onChangeText={(v) => setUsername(v.replace(/\s/g, '').toLowerCase())}
                    left={<Text className="text-[16px] text-muted">@</Text>}
                    right={uh.icon}
                    autoCapitalize="none"
                    autoCorrect={false}
                    maxLength={24}
                    placeholder="username"
                    accessibilityLabel={t('profile.edit.username')}
                  />
                </Field>
              ) : null}
              <Field label={t('profile.edit.city')}>
                <Input value={city} onChangeText={setCity} placeholder={t('profile.edit.cityPlaceholder')} accessibilityLabel={t('profile.edit.city')} />
              </Field>
              {support.bio ? (
                <Field
                  label={t('profile.edit.bio')}
                  right={
                    <Text className="text-[13px] font-bold" style={{ color: bio.length >= BIO_MAX ? gs.danger : gs.muted }}>
                      {bio.length}/{BIO_MAX}
                    </Text>
                  }
                >
                  <Input
                    value={bio}
                    onChangeText={(v) => setBio(v.slice(0, BIO_MAX))}
                    multiline
                    placeholder={t('profile.edit.bioPlaceholder')}
                    accessibilityLabel={t('profile.edit.bio')}
                  />
                </Field>
              ) : null}
            </Card>

            {/* Private information */}
            <SectionTitle title={t('profile.edit.private')} />
            <View className="flex-row items-center px-5 -mt-2 mb-3">
              <Lock size={14} color={gs.muted} />
              <Text className="ml-1.5 text-[13px] text-muted">{t('profile.edit.privateHint')}</Text>
            </View>
            <Card className="p-4 pb-1">
              <Field label={t('profile.edit.email')} hint={t('profile.edit.emailHint')}>
                <Input value={profile?.email ?? ''} editable={false} accessibilityLabel={t('profile.edit.email')} />
              </Field>
              <Field label={t('profile.edit.phone')}>
                <Input
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                  textContentType="telephoneNumber"
                  placeholder="+33 6 12 34 56 78"
                  accessibilityLabel={t('profile.edit.phone')}
                />
              </Field>
              {support.dateOfBirth ? (
                <Field label={t('profile.edit.dob')} hint={dobInvalid ? t('profile.edit.dobInvalid') : null} hintTone="red">
                  <Input
                    value={dob}
                    onChangeText={(v) => setDob(maskDmy(v))}
                    keyboardType="number-pad"
                    placeholder={t('profile.edit.dobPlaceholder')}
                    maxLength={10}
                    accessibilityLabel={t('profile.edit.dob')}
                  />
                </Field>
              ) : null}
            </Card>

            {saveError ? (
              <Text className="mx-5 mt-4 text-[14px] font-semibold" style={{ color: gs.danger }}>
                {saveError}
              </Text>
            ) : null}
          </>
        )}
      </PageScaffold>

      <GsSheet visible={photoSheet} onClose={() => setPhotoSheet(false)} title={t('profile.edit.photoTitle')}>
        <View className="mx-5 rounded-[20px]" style={{ backgroundColor: gs.surface }}>
          {Platform.OS !== 'web' ? (
            <>
              <Row icon={Camera} title={t('editProfile.takePhoto')} onPress={() => void pick('camera')} chevron={false} />
              <Divider />
            </>
          ) : null}
          <Row icon={ImageIcon} title={t('editProfile.chooseFromLibrary')} onPress={() => void pick('library')} chevron={false} />
        </View>
      </GsSheet>

      <ConfirmSheet
        visible={discardOpen}
        title={t('profile.edit.discardTitle')}
        message={t('profile.edit.discardMessage')}
        confirmLabel={t('profile.edit.discard')}
        onConfirm={() => {
          setDiscardOpen(false);
          onBack();
        }}
        onClose={() => setDiscardOpen(false)}
      />
    </KeyboardAvoidingView>
  );
}
