// pages/Helpsupportpage.tsx — Help & support: contact, searchable FAQ and
// "Report a problem" (opens the mail app with the report filled in).
import React, { useMemo, useState, type ReactElement } from 'react';
import { Linking, Platform, Pressable, Text, TextInput, View } from 'react-native';
import Constants from 'expo-constants';
import { useTranslation } from 'react-i18next';
import {
  ChevronDown,
  ChevronUp,
  CircleUser,
  CreditCard,
  Mail,
  QrCode,
  RotateCcw,
  Search,
  Ticket,
  X,
  type LucideIcon,
} from 'lucide-react-native';

import { gs } from '@/theme/colors';
import { GsButton, Pill, softShadow } from '@/components/gs';
import { Card, Divider, Field, IconTile, Input, PageScaffold, SectionTitle } from '@/screens/profile/components/ui';

type HelpSupportPageProps = Readonly<{ onBack: () => void }>;

export const SUPPORT_EMAIL = 'goswingapp@gmail.com';

const FAQ: ReadonlyArray<{ id: string; icon: LucideIcon }> = [
  { id: 'book', icon: Ticket },
  { id: 'qr', icon: QrCode },
  { id: 'pay', icon: CreditCard },
  { id: 'refund', icon: RotateCcw },
  { id: 'account', icon: CircleUser },
  { id: 'contact', icon: Mail },
];

type Category = 'bug' | 'event' | 'payment';

const normalize = (s: string): string =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');

export default function HelpSupportPage({ onBack }: HelpSupportPageProps): ReactElement {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState<string | null>(null);
  const [category, setCategory] = useState<Category>('bug');
  const [description, setDescription] = useState('');
  const [mailError, setMailError] = useState<string | null>(null);

  const items = useMemo(() => {
    const q = normalize(query.trim());
    return FAQ.map((f) => ({ ...f, q: t(`profile.help.faq.${f.id}.q`), a: t(`profile.help.faq.${f.id}.a`) })).filter(
      (f) => !q || normalize(`${f.q} ${f.a}`).includes(q),
    );
  }, [query, t]);

  const mail = async (subject: string, body = ''): Promise<void> => {
    const url = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}${body ? `&body=${encodeURIComponent(body)}` : ''}`;
    try {
      setMailError(null);
      await Linking.openURL(url);
    } catch {
      setMailError(t('helpSupport.emailOpenError'));
    }
  };

  const sendReport = (): void => {
    const version = Constants.expoConfig?.version ?? '';
    const body = `${description.trim()}\n\n—\n${t('profile.help.reportCategory')}: ${t(`profile.help.cat.${category}`)}\nGoSwing ${version} · ${Platform.OS} ${String(Platform.Version ?? '')}`;
    void mail(`[${t(`profile.help.cat.${category}`)}] ${t('profile.help.reportSubject')}`, body);
  };

  return (
    <PageScaffold title={t('profile.help.title')} subtitle={t('profile.help.subtitle')} onBack={onBack}>
      {/* Contact */}
      <Pressable
        onPress={() => void mail(t('profile.help.mailSubject'))}
        accessibilityRole="button"
        accessibilityLabel={`${t('profile.help.emailUs')}, ${SUPPORT_EMAIL}`}
        className="mx-5 mt-1 rounded-[24px] bg-white p-4 flex-row items-center"
        style={softShadow}
      >
        <View className="h-12 w-12 rounded-2xl items-center justify-center" style={{ backgroundColor: gs.violet }}>
          <Mail size={22} color={gs.white} />
        </View>
        <View className="flex-1 ml-3">
          <Text className="text-[17px] font-extrabold text-ink">{t('profile.help.emailUs')}</Text>
          <Text className="text-[14px] text-subtle">{SUPPORT_EMAIL}</Text>
          <Text className="text-[12px] font-bold mt-0.5" style={{ color: gs.green }}>
            {t('profile.help.replyTime')}
          </Text>
        </View>
      </Pressable>

      {/* Search */}
      <View className="mx-5 mt-4 h-14 rounded-[20px] bg-white flex-row items-center px-4" style={softShadow}>
        <Search size={20} color={gs.muted} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder={t('profile.help.search')}
          placeholderTextColor={gs.faint}
          accessibilityLabel={t('profile.help.search')}
          returnKeyType="search"
          className="flex-1 ml-3 text-[16px] text-ink"
          style={{ outlineStyle: 'none' } as object}
        />
        {query ? (
          <Pressable onPress={() => setQuery('')} accessibilityRole="button" accessibilityLabel={t('gs.close')} hitSlop={10}>
            <X size={18} color={gs.muted} />
          </Pressable>
        ) : null}
      </View>

      <SectionTitle title={t('profile.help.faqTitle')} />
      <Card>
        {items.length === 0 ? (
          <Text className="px-4 py-5 text-[14px] text-muted">{t('profile.help.noResults')}</Text>
        ) : (
          items.map((f, i) => {
            const expanded = open === f.id || (query.trim().length > 1 && items.length <= 2);
            return (
              <View key={f.id}>
                {i > 0 ? <Divider /> : null}
                <Pressable
                  onPress={() => setOpen(open === f.id ? null : f.id)}
                  accessibilityRole="button"
                  accessibilityState={{ expanded }}
                  className="flex-row items-center px-4 py-3 min-h-[60px]"
                >
                  <IconTile icon={f.icon} />
                  <Text className="flex-1 ml-3 mr-2 text-[16px] font-bold text-ink">{f.q}</Text>
                  {expanded ? <ChevronUp size={18} color={gs.subtle} /> : <ChevronDown size={18} color={gs.subtle} />}
                </Pressable>
                {expanded ? <Text className="px-4 pb-4 pl-[68px] text-[14px] text-subtle leading-[21px]">{f.a}</Text> : null}
              </View>
            );
          })
        )}
      </Card>

      {/* Report a problem */}
      <SectionTitle title={t('profile.help.report')} subtitle={t('profile.help.reportSub')} />
      <Card className="p-4">
        <Field label={t('profile.help.reportCategory')}>
          <View className="flex-row flex-wrap gap-2">
            {(['bug', 'event', 'payment'] as const).map((c) => (
              <Pill key={c} label={t(`profile.help.cat.${c}`)} size="sm" active={category === c} onPress={() => setCategory(c)} />
            ))}
          </View>
        </Field>
        <Field label={t('profile.help.description')}>
          <Input
            value={description}
            onChangeText={(v) => setDescription(v.slice(0, 2000))}
            multiline
            placeholder={t('profile.help.descriptionPlaceholder')}
            accessibilityLabel={t('profile.help.description')}
          />
        </Field>
        <GsButton
          label={t('profile.help.send')}
          icon={<Mail size={17} color={gs.white} />}
          onPress={sendReport}
          disabled={description.trim().length < 10}
          fullWidth
        />
        <Text className="mt-2 text-[12px] text-muted text-center">{t('profile.help.sendHint')}</Text>
        {mailError ? (
          <Text className="mt-2 text-[13px] font-semibold text-center" style={{ color: gs.danger }}>
            {mailError}
          </Text>
        ) : null}
      </Card>
    </PageScaffold>
  );
}
