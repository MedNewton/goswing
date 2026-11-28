// screens/profile/components/ui.tsx — building blocks shared by the Profile screens.
import React, { type ReactElement, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  Switch,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import { ChevronLeft, ChevronRight, Star, type LucideIcon } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { gs } from '@/theme/colors';
import { cx, softShadow, GsButton, GsSheet, RoundButton } from '@/components/gs';

// ─── Layout ──────────────────────────────────────────────────────────────────

/** Back button + large title + optional subtitle, as on every Profile sub-screen. */
export function PageHeader({
  title,
  subtitle,
  onBack,
  right,
}: Readonly<{ title: string; subtitle?: string; onBack?: () => void; right?: ReactNode }>): ReactElement {
  const { t } = useTranslation();
  return (
    <View className="flex-row items-center px-5 pt-2 pb-3">
      {onBack ? (
        <RoundButton icon={<ChevronLeft size={24} color={gs.ink} />} onPress={onBack} accessibilityLabel={t('gs.back')} size={44} />
      ) : null}
      <View className={cx('flex-1', onBack ? 'ml-3' : null)}>
        <Text accessibilityRole="header" className="text-[26px] leading-[32px] font-extrabold text-ink" numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text className="text-[14px] text-muted" numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right ? <View className="ml-3">{right}</View> : null}
    </View>
  );
}

/** Full-height pushed screen: header + scroll body on the lavender surface. */
export function PageScaffold({
  title,
  subtitle,
  onBack,
  right,
  children,
  footer,
  scrollRef,
}: Readonly<{
  title: string;
  subtitle?: string;
  onBack?: () => void;
  right?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  scrollRef?: React.Ref<ScrollView>;
}>): ReactElement {
  const insets = useSafeAreaInsets();
  return (
    <View className="flex-1 bg-surface">
      <PageHeader title={title} subtitle={subtitle} onBack={onBack} right={right} />
      <ScrollView
        ref={scrollRef}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 16) + 32 }}
      >
        {children}
      </ScrollView>
      {footer}
    </View>
  );
}

export function Card({
  children,
  className,
  style,
}: Readonly<{ children: ReactNode; className?: string; style?: StyleProp<ViewStyle> }>): ReactElement {
  return (
    <View className={cx('mx-5 rounded-[24px] bg-white', className)} style={[softShadow, style]}>
      {children}
    </View>
  );
}

export function SectionTitle({
  title,
  icon: Icon,
  right,
  subtitle,
  className,
}: Readonly<{ title: string; icon?: LucideIcon; right?: ReactNode; subtitle?: string; className?: string }>): ReactElement {
  return (
    <View className={cx('px-5 mt-7 mb-3', className)}>
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center flex-1 pr-3">
          {Icon ? (
            <View className="mr-2">
              <Icon size={20} color={gs.violet} />
            </View>
          ) : null}
          <Text accessibilityRole="header" className="text-[22px] font-extrabold text-ink" numberOfLines={1}>
            {title}
          </Text>
        </View>
        {right}
      </View>
      {subtitle ? <Text className="text-[14px] text-muted mt-0.5">{subtitle}</Text> : null}
    </View>
  );
}

export function Divider({ inset = 16 }: Readonly<{ inset?: number }>): ReactElement {
  return <View style={{ height: 1, backgroundColor: gs.line, marginLeft: inset, marginRight: 16 }} />;
}

// ─── Rows ────────────────────────────────────────────────────────────────────

export function Row({
  icon: Icon,
  title,
  subtitle,
  onPress,
  right,
  tone = 'default',
  chevron = true,
  accessibilityLabel,
}: Readonly<{
  icon?: LucideIcon;
  title: string;
  subtitle?: string | null;
  onPress?: () => void;
  right?: ReactNode;
  tone?: 'default' | 'danger';
  chevron?: boolean;
  accessibilityLabel?: string;
}>): ReactElement {
  const color = tone === 'danger' ? gs.danger : gs.ink;
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={accessibilityLabel ?? (subtitle ? `${title}, ${subtitle}` : title)}
      className="flex-row items-center px-4 min-h-[60px] py-3 active:opacity-70"
    >
      {Icon ? (
        <View className="w-8 mr-2">
          <Icon size={21} color={color} strokeWidth={1.8} />
        </View>
      ) : null}
      <View className="flex-1 pr-2">
        <Text className="text-[16px] font-bold" style={{ color }} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text className="text-[13px] text-subtle mt-0.5" numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right}
      {onPress && chevron ? <ChevronRight size={18} color={gs.subtle} style={{ marginLeft: 6 }} /> : null}
    </Pressable>
  );
}

export function GsSwitch({
  value,
  onValueChange,
  disabled,
  accessibilityLabel,
}: Readonly<{ value: boolean; onValueChange: (v: boolean) => void; disabled?: boolean; accessibilityLabel?: string }>): ReactElement {
  return (
    <Switch
      value={value}
      onValueChange={onValueChange}
      disabled={disabled}
      accessibilityLabel={accessibilityLabel}
      trackColor={{ false: gs.lineStrong, true: gs.violet }}
      thumbColor={gs.white}
      ios_backgroundColor={gs.lineStrong}
      // react-native-web
      {...({ activeThumbColor: gs.white } as object)}
    />
  );
}

export function ToggleRow({
  icon,
  title,
  subtitle,
  value,
  onChange,
  disabled,
}: Readonly<{
  icon?: LucideIcon;
  title: string;
  subtitle?: string;
  value: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}>): ReactElement {
  return (
    <Row
      icon={icon}
      title={title}
      subtitle={subtitle}
      chevron={false}
      right={<GsSwitch value={value} onValueChange={onChange} disabled={disabled} accessibilityLabel={title} />}
    />
  );
}

// ─── Avatar & stars ──────────────────────────────────────────────────────────

export function initialsOf(name: string | null | undefined): string {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  const first = parts[0][0] ?? '';
  const last = parts.length > 1 ? parts[parts.length - 1][0] ?? '' : '';
  return (first + last).toUpperCase();
}

export function Avatar({
  uri,
  name,
  size = 72,
}: Readonly<{ uri?: string | null; name?: string | null; size?: number }>): ReactElement {
  const remote = uri && /^https?:\/\//.test(uri) ? uri : null;
  return (
    <View
      className="items-center justify-center overflow-hidden"
      style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: gs.violetLine }}
      accessibilityRole="image"
      accessibilityLabel={name ?? undefined}
    >
      {remote ? (
        <Image source={{ uri: remote }} style={{ width: size, height: size }} />
      ) : (
        <Text style={{ fontSize: size * 0.36, color: '#2A1B7A' }} className="font-extrabold">
          {initialsOf(name)}
        </Text>
      )}
    </View>
  );
}

export const STAR = '#D69E0B';

export function Stars({
  rating,
  size = 16,
  onChange,
}: Readonly<{ rating: number; size?: number; onChange?: (r: number) => void }>): ReactElement {
  const { t } = useTranslation();
  return (
    <View className="flex-row items-center" accessibilityLabel={onChange ? undefined : t('profile.reviews.starsLabel', { rating })}>
      {[1, 2, 3, 4, 5].map((i) => {
        const on = i <= Math.round(rating);
        const star = <Star size={size} color={on ? STAR : gs.lineStrong} fill={on ? STAR : gs.lineStrong} />;
        return onChange ? (
          <Pressable
            key={i}
            onPress={() => onChange(i)}
            accessibilityRole="button"
            accessibilityLabel={t('profile.reviews.rateN', { count: i })}
            className="items-center justify-center"
            style={{ width: size + 18, height: Math.max(44, size + 8) }}
          >
            {star}
          </Pressable>
        ) : (
          <View key={i} style={{ marginRight: 2 }}>
            {star}
          </View>
        );
      })}
    </View>
  );
}

// ─── Form ────────────────────────────────────────────────────────────────────

export function Field({
  label,
  right,
  hint,
  hintTone = 'muted',
  children,
}: Readonly<{
  label: string;
  right?: ReactNode;
  hint?: string | null;
  hintTone?: 'muted' | 'green' | 'red';
  children: ReactNode;
}>): ReactElement {
  const hintColor = hintTone === 'green' ? gs.green : hintTone === 'red' ? gs.danger : gs.muted;
  return (
    <View className="mb-4">
      <View className="flex-row items-center justify-between mb-2">
        <Text className="text-[14px] font-bold text-subtle">{label}</Text>
        {right}
      </View>
      {children}
      {hint ? (
        <Text className="text-[13px] mt-1.5 font-semibold" style={{ color: hintColor }}>
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

export function Input({
  left,
  right,
  multiline,
  editable = true,
  style,
  ...rest
}: Readonly<TextInputProps & { left?: ReactNode; right?: ReactNode }>): ReactElement {
  return (
    <View
      className={cx('flex-row rounded-2xl px-4', multiline ? 'items-start py-3' : 'items-center h-[52px]')}
      style={{ backgroundColor: editable ? gs.surface2 : gs.surface, borderWidth: 1, borderColor: gs.line }}
    >
      {left ? <View className="mr-1">{left}</View> : null}
      <TextInput
        placeholderTextColor={gs.faint}
        multiline={multiline}
        editable={editable}
        textAlignVertical={multiline ? 'top' : 'center'}
        className="flex-1 text-[16px]"
        style={[{ color: editable ? gs.ink : gs.muted, minHeight: multiline ? 84 : undefined, outlineStyle: 'none' } as object, style]}
        {...rest}
      />
      {right ? <View className="ml-2">{right}</View> : null}
    </View>
  );
}

/** Pill segmented control (Saved tabs, "Who can…" pickers). */
export function Segmented<K extends string>({
  options,
  value,
  onChange,
}: Readonly<{ options: ReadonlyArray<{ key: K; label: string }>; value: K; onChange: (k: K) => void }>): ReactElement {
  return (
    <View className="mx-5 flex-row rounded-full p-1" style={{ backgroundColor: gs.surface2 }} accessibilityRole="tablist">
      {options.map((o) => {
        const active = o.key === value;
        return (
          <Pressable
            key={o.key}
            onPress={() => onChange(o.key)}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            className="flex-1 h-11 items-center justify-center rounded-full"
            style={active ? [{ backgroundColor: gs.white }, softShadow] : undefined}
          >
            <Text className="text-[15px] font-bold" style={{ color: active ? gs.ink : gs.subtle }} numberOfLines={1}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Loading(): ReactElement {
  return (
    <View className="py-16 items-center">
      <ActivityIndicator color={gs.violet} />
    </View>
  );
}

/** Small bordered pill button used inside cards ("Set default", "Log out"). */
export function SmallButton({
  label,
  onPress,
  tone = 'default',
  disabled,
  loading,
}: Readonly<{ label: string; onPress: () => void; tone?: 'default' | 'danger' | 'violet'; disabled?: boolean; loading?: boolean }>): ReactElement {
  const color = tone === 'danger' ? gs.danger : tone === 'violet' ? gs.violet : gs.ink;
  const border = tone === 'danger' ? '#F5C2BE' : gs.lineStrong;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityLabel={label}
      className="h-10 px-4 rounded-full items-center justify-center bg-white"
      style={{ borderWidth: 1, borderColor: border, opacity: disabled ? 0.45 : 1 }}
      hitSlop={4}
    >
      {loading ? <ActivityIndicator size="small" color={color} /> : <Text className="text-[14px] font-bold" style={{ color }}>{label}</Text>}
    </Pressable>
  );
}

/** Text-only action ("Remove", "Edit", "Delete"). */
export function TextAction({
  label,
  onPress,
  tone = 'violet',
}: Readonly<{ label: string; onPress: () => void; tone?: 'violet' | 'danger' }>): ReactElement {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} hitSlop={10} className="h-10 px-2 justify-center">
      <Text className="text-[14px] font-bold" style={{ color: tone === 'danger' ? '#B42318' : gs.violet }}>
        {label}
      </Text>
    </Pressable>
  );
}

/** Bottom-sheet confirmation (Alert.alert is a no-op on web). */
export function ConfirmSheet({
  visible,
  title,
  message,
  confirmLabel,
  danger = true,
  busy = false,
  confirmDisabled = false,
  hideCancel = false,
  onConfirm,
  onClose,
  children,
}: Readonly<{
  visible: boolean;
  title: string;
  message?: string;
  confirmLabel: string;
  danger?: boolean;
  busy?: boolean;
  confirmDisabled?: boolean;
  hideCancel?: boolean;
  onConfirm: () => void;
  onClose: () => void;
  children?: ReactNode;
}>): ReactElement {
  const { t } = useTranslation();
  return (
    <GsSheet visible={visible} onClose={onClose} title={title}>
      <View className="px-5">
        {message ? <Text className="text-[15px] text-subtle leading-[21px]">{message}</Text> : null}
        {children}
        <View className="mt-5 gap-y-2.5">
          <Pressable
            onPress={onConfirm}
            disabled={busy || confirmDisabled}
            accessibilityRole="button"
            accessibilityLabel={confirmLabel}
            className="h-12 rounded-full items-center justify-center"
            style={{ backgroundColor: danger ? gs.danger : gs.violet, opacity: confirmDisabled ? 0.45 : 1 }}
          >
            {busy ? <ActivityIndicator color={gs.white} /> : <Text className="text-[15px] font-bold text-white">{confirmLabel}</Text>}
          </Pressable>
          {hideCancel ? null : <GsButton label={t('common.cancel')} variant="secondary" onPress={onClose} fullWidth />}
        </View>
      </View>
    </GsSheet>
  );
}

/** Inline notice (OS notifications blocked, pending deletion…). */
export function Notice({
  icon: Icon,
  title,
  message,
  tone = 'orange',
  actionLabel,
  onAction,
}: Readonly<{
  icon: LucideIcon;
  title: string;
  message?: string;
  tone?: 'orange' | 'violet' | 'red';
  actionLabel?: string;
  onAction?: () => void;
}>): ReactElement {
  const [bg, fg] =
    tone === 'violet' ? [gs.violetSoft, gs.violetDark] : tone === 'red' ? [gs.dangerSoft, '#B42318'] : [gs.orangeSoft, gs.orange];
  return (
    <View className="mx-5 rounded-[20px] p-4 flex-row" style={{ backgroundColor: bg }}>
      <Icon size={20} color={fg} />
      <View className="flex-1 ml-3">
        <Text className="text-[15px] font-extrabold" style={{ color: fg }}>
          {title}
        </Text>
        {message ? <Text className="text-[13px] text-subtle mt-0.5 leading-[18px]">{message}</Text> : null}
        {actionLabel && onAction ? (
          <Pressable onPress={onAction} accessibilityRole="button" className="mt-2 self-start py-1" hitSlop={8}>
            <Text className="text-[14px] font-bold" style={{ color: fg }}>
              {actionLabel}
            </Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

/** Square soft-violet icon tile used in lists (FAQ, transactions, devices). */
export function IconTile({
  icon: Icon,
  tone = 'violet',
  size = 40,
}: Readonly<{ icon: LucideIcon; tone?: 'violet' | 'green' | 'pink' | 'orange'; size?: number }>): ReactElement {
  const [bg, fg] =
    tone === 'green' ? [gs.greenSoft, gs.green] : tone === 'pink' ? [gs.pinkSoft, gs.pink] : tone === 'orange' ? [gs.orangeSoft, gs.orange] : [gs.violetSoft, gs.violet];
  return (
    <View className="items-center justify-center rounded-xl" style={{ width: size, height: size, backgroundColor: bg }}>
      <Icon size={size * 0.5} color={fg} strokeWidth={1.9} />
    </View>
  );
}
