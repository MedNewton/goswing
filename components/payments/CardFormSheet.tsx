// components/payments/CardFormSheet.tsx — card entry used by checkout and
// Profile › Payment methods. Validates locally; the parent decides whether to
// pay with the card, save it (lib/payments saveCard), or both.
import React, { useEffect, useState, type ReactElement } from 'react';
import { Pressable, Switch, Text, TextInput, View } from 'react-native';
import { CreditCard } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';

import { gs } from '@/theme/colors';
import GsSheet from '@/components/gs/GsSheet';
import GsButton from '@/components/gs/GsButton';
import TestModeBadge from './TestModeBadge';
import { cardBrand, formatCardNumber, isTestMode, luhnValid, type CardDetails } from '@/lib/payments';

export type CardFormResult = Readonly<{ card: CardDetails; save: boolean; makeDefault: boolean }>;

export type CardFormSheetProps = Readonly<{
  visible: boolean;
  onClose: () => void;
  /** Resolve to close the sheet; throw an Error to show its message. */
  onSubmit: (result: CardFormResult) => Promise<void>;
  /** 'add' (Profile) saves the card; 'pay' (checkout) offers "Save card for later". */
  mode?: 'add' | 'pay';
  defaultName?: string;
  /** Show the "Use as default card" switch (Profile, when cards already exist). */
  offerDefault?: boolean;
}>;

// react-native-web colors the "on" thumb teal unless activeThumbColor is set.
const WEB_THUMB = { activeThumbColor: gs.white } as Record<string, string>;

type Errors = Partial<Record<'number' | 'expiry' | 'cvc' | 'holder' | 'form', string>>;

function parseExpiry(v: string): { m: number; y: number } | null {
  const m = v.match(/^(\d{2})\/(\d{2})$/);
  if (!m) return null;
  const month = Number(m[1]);
  const year = 2000 + Number(m[2]);
  if (month < 1 || month > 12) return null;
  const now = new Date();
  const endOfMonth = new Date(year, month, 0, 23, 59, 59);
  return endOfMonth >= now ? { m: month, y: year } : null;
}

const BRAND_LABEL: Readonly<Record<string, string>> = { visa: 'VISA', mastercard: 'Mastercard', amex: 'AMEX', discover: 'Discover' };

export default function CardFormSheet({
  visible,
  onClose,
  onSubmit,
  mode = 'add',
  defaultName = '',
  offerDefault = false,
}: CardFormSheetProps): ReactElement {
  const { t } = useTranslation();
  const [number, setNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvc, setCvc] = useState('');
  const [holder, setHolder] = useState(defaultName);
  const [save, setSave] = useState(mode === 'add');
  const [makeDefault, setMakeDefault] = useState(!offerDefault);
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setNumber('');
    setExpiry('');
    setCvc('');
    setHolder(defaultName);
    setSave(mode === 'add');
    setMakeDefault(!offerDefault);
    setErrors({});
  }, [visible, defaultName, mode, offerDefault]);

  const digits = number.replace(/\D/g, '');
  const brand = cardBrand(digits);

  const submit = async (): Promise<void> => {
    const exp = parseExpiry(expiry);
    const next: Errors = {};
    if (!luhnValid(digits)) next.number = t('gs.pay.err.number');
    if (!exp) next.expiry = t('gs.pay.err.expiry');
    if (!/^\d{3,4}$/.test(cvc)) next.cvc = t('gs.pay.err.cvc');
    if (!holder.trim()) next.holder = t('gs.pay.err.holder');
    setErrors(next);
    if (Object.keys(next).length || !exp) return;
    setBusy(true);
    try {
      await onSubmit({
        card: { number: digits, brand, expMonth: exp.m, expYear: exp.y, cvc, holderName: holder.trim() },
        save: mode === 'add' ? true : save,
        makeDefault,
      });
    } catch (e: unknown) {
      setErrors({ form: e instanceof Error ? e.message : String(e) });
    } finally {
      setBusy(false);
    }
  };

  const field = (
    label: string,
    value: string,
    onChange: (v: string) => void,
    err: string | undefined,
    opts: { keyboard?: 'number-pad' | 'default'; placeholder?: string; secure?: boolean; maxLength?: number; flex?: boolean } = {},
  ): ReactElement => (
    <View className={opts.flex ? 'flex-1' : undefined}>
      <Text className="text-[13px] font-bold text-subtle mb-1.5">{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        keyboardType={opts.keyboard ?? 'default'}
        placeholder={opts.placeholder}
        placeholderTextColor={gs.faint}
        secureTextEntry={opts.secure}
        maxLength={opts.maxLength}
        accessibilityLabel={label}
        className="h-12 rounded-2xl px-4 text-[16px] text-ink"
        style={{ backgroundColor: gs.surface2, borderWidth: 1, borderColor: err ? gs.danger : gs.line }}
      />
      {err ? <Text className="mt-1 text-[12px]" style={{ color: gs.danger }}>{err}</Text> : null}
    </View>
  );

  return (
    <GsSheet
      visible={visible}
      onClose={onClose}
      title={t('gs.pay.cardTitle')}
      footer={
        <GsButton
          label={mode === 'add' ? t('gs.pay.addCard') : t('gs.pay.useCard')}
          onPress={() => void submit()}
          loading={busy}
          size="lg"
          fullWidth
        />
      }
    >
      <View className="px-5 gap-y-4">
        {isTestMode() ? <TestModeBadge /> : null}
        <View>
          <Text className="text-[13px] font-bold text-subtle mb-1.5">{t('gs.pay.cardNumber')}</Text>
          <View
            className="h-12 rounded-2xl px-4 flex-row items-center"
            style={{ backgroundColor: gs.surface2, borderWidth: 1, borderColor: errors.number ? gs.danger : gs.line }}
          >
            <CreditCard size={20} color={gs.muted} />
            <TextInput
              value={formatCardNumber(number)}
              onChangeText={(v) => setNumber(v.replace(/\D/g, '').slice(0, 19))}
              keyboardType="number-pad"
              placeholder="1234 5678 9012 3456"
              placeholderTextColor={gs.faint}
              accessibilityLabel={t('gs.pay.cardNumber')}
              className="flex-1 ml-3 text-[16px] text-ink"
            />
            {BRAND_LABEL[brand] && digits.length >= 2 ? (
              <Text className="text-[12px] font-extrabold" style={{ color: gs.violet }}>{BRAND_LABEL[brand]}</Text>
            ) : null}
          </View>
          {errors.number ? <Text className="mt-1 text-[12px]" style={{ color: gs.danger }}>{errors.number}</Text> : null}
        </View>
        <View className="flex-row gap-x-3">
          {field(
            t('gs.pay.expiry'),
            expiry,
            (v) => {
              const d = v.replace(/\D/g, '').slice(0, 4);
              setExpiry(d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d);
            },
            errors.expiry,
            { keyboard: 'number-pad', placeholder: 'MM/YY', maxLength: 5, flex: true },
          )}
          {field(t('gs.pay.cvc'), cvc, (v) => setCvc(v.replace(/\D/g, '').slice(0, 4)), errors.cvc, {
            keyboard: 'number-pad',
            placeholder: '123',
            secure: true,
            maxLength: 4,
            flex: true,
          })}
        </View>
        {field(t('gs.pay.holder'), holder, setHolder, errors.holder, { placeholder: 'Mehdi Louijab' })}

        {mode === 'pay' ? (
          <Pressable onPress={() => setSave((v) => !v)} className="flex-row items-center justify-between py-1" accessibilityRole="switch" accessibilityState={{ checked: save }}>
            <Text className="text-[15px] font-semibold text-ink">{t('gs.pay.saveCard')}</Text>
            <Switch value={save} onValueChange={setSave} trackColor={{ true: gs.violet, false: gs.lineStrong }} thumbColor={gs.white} {...WEB_THUMB} />
          </Pressable>
        ) : null}
        {offerDefault ? (
          <Pressable onPress={() => setMakeDefault((v) => !v)} className="flex-row items-center justify-between py-1" accessibilityRole="switch" accessibilityState={{ checked: makeDefault }}>
            <Text className="text-[15px] font-semibold text-ink">{t('gs.pay.makeDefault')}</Text>
            <Switch value={makeDefault} onValueChange={setMakeDefault} trackColor={{ true: gs.violet, false: gs.lineStrong }} thumbColor={gs.white} {...WEB_THUMB} />
          </Pressable>
        ) : null}

        {errors.form ? (
          <View className="rounded-2xl px-4 py-3" style={{ backgroundColor: gs.dangerSoft }}>
            <Text className="text-[14px] font-semibold" style={{ color: gs.danger }}>{errors.form}</Text>
          </View>
        ) : null}
        {isTestMode() ? <Text className="text-[12px] leading-[17px] text-muted">{t('gs.pay.testCards')}</Text> : null}
      </View>
    </GsSheet>
  );
}
