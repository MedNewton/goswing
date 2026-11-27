// pages/PaymentMethodsPage.tsx — saved cards, Apple Pay / Google Pay, payment
// settings and recent transactions (Phase 4 route 152, hidden until it ships).
// No wallet, top-up or auto-reload (wallet is deferred).
import React, { useEffect, useState, type ReactElement } from 'react';
import { Alert, Platform, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { CreditCard, Plus, RotateCcw, ShieldCheck, Ticket } from 'lucide-react-native';

import { gs } from '@/theme/colors';
import { EmptyState, GsButton, StatusChip } from '@/components/gs';
import { usePaymentMethods, useSettings } from '@/hooks/profile';
import { listMyPayments, type ApiPaymentTx } from '@/lib/api/profile';
import { formatCents } from '@/lib/format';
import type { PaymentMethod } from '@/types/domain';
import { Card, ConfirmSheet, Divider, IconTile, Loading, PageScaffold, SectionTitle, SmallButton, TextAction, ToggleRow } from '@/screens/profile/components/ui';
import { BrandBadge, brandName, cardLabel, expiryLabel, isExpired } from '@/screens/profile/components/cards';

type PaymentMethodsPageProps = Readonly<{ onBack: () => void }>;

export default function PaymentMethodsPage({ onBack }: PaymentMethodsPageProps): ReactElement {
  const { t, i18n } = useTranslation();
  const { paymentMethods, isLoading, error, refetch, removePaymentMethod, setDefaultPaymentMethod } = usePaymentMethods();
  const { settings, updateSettings } = useSettings();

  const [busyId, setBusyId] = useState<string | null>(null);
  const [toRemove, setToRemove] = useState<PaymentMethod | null>(null);
  const [removing, setRemoving] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [txs, setTxs] = useState<ReadonlyArray<ApiPaymentTx> | null>(null);

  useEffect(() => {
    let alive = true;
    listMyPayments()
      .then((items) => alive && setTxs(items))
      .catch(() => alive && setTxs(null));
    return () => {
      alive = false;
    };
  }, []);

  const onSetDefault = async (m: PaymentMethod): Promise<void> => {
    try {
      setBusyId(String(m.id));
      await setDefaultPaymentMethod(m.id);
    } catch (e: unknown) {
      Alert.alert(t('common.error'), e instanceof Error ? e.message : t('paymentMethods.errCouldNotSetDefault'));
    } finally {
      setBusyId(null);
    }
  };

  const onRemove = async (): Promise<void> => {
    if (!toRemove) return;
    try {
      setRemoving(true);
      await removePaymentMethod(toRemove.id);
      setToRemove(null);
    } catch (e: unknown) {
      Alert.alert(t('common.error'), e instanceof Error ? e.message : t('paymentMethods.errCouldNotRemove'));
    } finally {
      setRemoving(false);
    }
  };

  const onToggle = (key: 'savePaymentInfo' | 'emailReceipts', v: boolean): void => {
    void updateSettings({ [key]: v }).catch((e: unknown) =>
      Alert.alert(t('common.error'), e instanceof Error ? e.message : t('paymentMethods.errCouldNotUpdateSetting')),
    );
  };

  const wallet = Platform.OS === 'ios' ? 'apple' : Platform.OS === 'android' ? 'google' : null;
  const onlyOne = paymentMethods.length <= 1;

  const txMethod = (tx: ApiPaymentTx): string => {
    const m = (tx.method ?? '').toLowerCase();
    if (m === 'apple_pay') return 'Apple Pay';
    if (m === 'google_pay') return 'Google Pay';
    if (m === 'venue' || m === 'pay_at_venue') return t('profile.pay.atVenue');
    return tx.cardLastFour ? `${t('profile.pay.card')} •••• ${tx.cardLastFour}` : t('profile.pay.card');
  };

  return (
    <PageScaffold title={t('profile.pay.title')} subtitle={t('profile.pay.subtitle')} onBack={onBack}>
      <View className="px-5 mt-1">
        <GsButton label={t('profile.pay.add')} icon={<Plus size={18} color={gs.white} />} size="lg" onPress={() => setAddOpen(true)} fullWidth />
      </View>

      <SectionTitle title={t('profile.pay.saved')} />
      {wallet ? (
        <Card className="p-4 mb-3">
          <View className="flex-row items-center">
            <BrandBadge label={wallet === 'apple' ? 'Pay' : 'G Pay'} />
            <View className="flex-1 ml-3">
              <Text className="text-[16px] font-extrabold text-ink">{wallet === 'apple' ? 'Apple Pay' : 'Google Pay'}</Text>
              <Text className="text-[13px] text-subtle">{wallet === 'apple' ? t('profile.pay.applePaySub') : t('profile.pay.googlePaySub')}</Text>
            </View>
          </View>
          <Text className="text-[13px] text-muted mt-2">{t('profile.pay.walletAtCheckout')}</Text>
        </Card>
      ) : null}

      {isLoading && paymentMethods.length === 0 ? (
        <Loading />
      ) : error ? (
        <EmptyState title={t('gs.errorTitle')} message={error.message} actionLabel={t('gs.retry')} onAction={() => void refetch()} />
      ) : paymentMethods.length === 0 ? (
        <Card className="py-2">
          <EmptyState icon={<CreditCard size={28} color={gs.violet} />} title={t('profile.pay.emptyTitle')} message={t('profile.pay.emptyMessage')} />
        </Card>
      ) : (
        <View className="gap-y-3">
          {paymentMethods.map((m) => {
            const expired = isExpired(m);
            return (
              <Card key={String(m.id)} className="p-4" style={m.isDefault ? { borderWidth: 1.5, borderColor: gs.violetLine } : undefined}>
                <View className="flex-row items-center">
                  <BrandBadge brand={m.cardBrand} />
                  <View className="flex-1 ml-3">
                    <Text className="text-[16px] font-extrabold text-ink" numberOfLines={1}>
                      {cardLabel(m, t)}
                    </Text>
                    <Text className="text-[13px]" style={{ color: expired ? gs.danger : gs.subtle }}>
                      {expired ? t('profile.pay.expired', { date: expiryLabel(m) }) : t('profile.pay.expires', { date: expiryLabel(m) })}
                    </Text>
                  </View>
                  {m.isDefault ? <StatusChip label={t('profile.pay.default')} tone="violet" /> : null}
                </View>
                <View className="flex-row items-center justify-end mt-3 gap-x-3">
                  {m.isDefault ? (
                    onlyOne ? null : <Text className="flex-1 text-[12px] text-muted">{t('profile.pay.defaultHint')}</Text>
                  ) : (
                    <SmallButton label={t('profile.pay.setDefault')} loading={busyId === String(m.id)} onPress={() => void onSetDefault(m)} />
                  )}
                  {m.isDefault && !onlyOne ? null : (
                    <TextAction label={t('profile.pay.remove')} tone="danger" onPress={() => setToRemove(m)} />
                  )}
                </View>
              </Card>
            );
          })}
        </View>
      )}

      {/* Payment settings (existing settings fields; auto-reload is wallet → omitted) */}
      <SectionTitle title={t('profile.pay.settings')} />
      <Card>
        <ToggleRow
          title={t('profile.pay.saveDetails')}
          subtitle={t('profile.pay.saveDetailsSub')}
          value={settings?.savePaymentInfo ?? false}
          onChange={(v) => onToggle('savePaymentInfo', v)}
          disabled={!settings}
        />
        <Divider />
        <ToggleRow
          title={t('profile.pay.receipts')}
          subtitle={t('profile.pay.receiptsSub')}
          value={settings?.emailReceipts ?? true}
          onChange={(v) => onToggle('emailReceipts', v)}
          disabled={!settings}
        />
      </Card>

      {/* Recent transactions (route 152) */}
      {txs && txs.length > 0 ? (
        <>
          <SectionTitle title={t('profile.pay.recent')} />
          <Card>
            {txs.slice(0, 6).map((tx, i) => {
              const refund = tx.kind === 'refund';
              const date = tx.createdAt ? new Date(tx.createdAt).toLocaleDateString(i18n.language, { day: 'numeric', month: 'short' }) : '';
              const amount = formatCents(Math.abs(tx.amountCents), tx.currency ?? 'EUR', i18n.language);
              return (
                <View key={tx.paymentId}>
                  {i > 0 ? <Divider inset={68} /> : null}
                  <View className="flex-row items-center px-4 py-3">
                    <IconTile icon={refund ? RotateCcw : Ticket} tone={refund ? 'green' : 'violet'} />
                    <View className="flex-1 ml-3 pr-2">
                      <Text className="text-[15px] font-extrabold text-ink" numberOfLines={1}>
                        {refund ? `${t('profile.pay.refund')} · ${tx.label ?? ''}` : tx.label ?? t('profile.pay.payment')}
                      </Text>
                      <Text className="text-[13px] text-subtle" numberOfLines={1}>
                        {[txMethod(tx), date].filter(Boolean).join(' · ')}
                      </Text>
                    </View>
                    <Text className="text-[15px] font-extrabold" style={{ color: refund ? gs.green : gs.ink }}>
                      {refund ? '+' : '−'}
                      {amount}
                    </Text>
                  </View>
                </View>
              );
            })}
          </Card>
        </>
      ) : null}

      <View className="flex-row px-6 mt-6">
        <ShieldCheck size={16} color={gs.green} />
        <Text className="flex-1 ml-2 text-[13px] text-subtle leading-[18px]">{t('profile.pay.tokenized')}</Text>
      </View>

      <ConfirmSheet
        visible={!!toRemove}
        title={t('profile.pay.removeTitle')}
        message={toRemove ? t('profile.pay.removeMessage', { card: `${brandName(toRemove.cardBrand, t)} •••• ${toRemove.cardLastFour}` }) : undefined}
        confirmLabel={t('profile.pay.remove')}
        busy={removing}
        onConfirm={() => void onRemove()}
        onClose={() => setToRemove(null)}
      />

      <ConfirmSheet
        visible={addOpen}
        title={t('profile.pay.addSoonTitle')}
        message={t('profile.pay.addSoonMessage')}
        confirmLabel={t('profile.pay.gotIt')}
        danger={false}
        hideCancel
        onConfirm={() => setAddOpen(false)}
        onClose={() => setAddOpen(false)}
      />
    </PageScaffold>
  );
}
