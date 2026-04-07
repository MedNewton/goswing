// pages/TermsConditionsPage.tsx
import React, { type ReactElement } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

type TermsConditionsPageProps = Readonly<{
  onBack: () => void;
}>;

function SectionCard({ children }: { children: React.ReactNode }): ReactElement {
  return (
    <View className="mx-5 mt-4 rounded-2xl border border-gray200 bg-white p-4">
      {children}
    </View>
  );
}

function SectionTitle({ icon, title }: { icon: keyof typeof Feather.glyphMap; title: string }): ReactElement {
  return (
    <View className="flex-row items-center gap-x-2 mb-3">
      <Feather name={icon} size={18} color="#111827" />
      <Text className="text-base font-semibold text-black">{title}</Text>
    </View>
  );
}

function BulletPoint({ children }: { children: React.ReactNode }): ReactElement {
  return (
    <View className="flex-row mt-2">
      <Text className="text-gray700 mr-2">•</Text>
      <Text className="text-sm text-gray700 flex-1 leading-5">{children}</Text>
    </View>
  );
}

function TicketPurchaseCard(): ReactElement {
  const { t } = useTranslation();
  return (
    <View className="flex-row gap-x-2 mt-3">
      <View className="flex-1 border border-gray200 rounded-xl p-3 items-center">
        <Feather name="check-circle" size={20} color="#22C55E" />
        <Text className="text-xs text-gray700 mt-2 text-center">{t('terms.section4.feat1')}</Text>
      </View>
      <View className="flex-1 border border-gray200 rounded-xl p-3 items-center">
        <Feather name="shield" size={20} color="#3B82F6" />
        <Text className="text-xs text-gray700 mt-2 text-center">{t('terms.section4.feat2')}</Text>
      </View>
      <View className="flex-1 border border-gray200 rounded-xl p-3 items-center">
        <Feather name="smartphone" size={20} color="#8B5CF6" />
        <Text className="text-xs text-gray700 mt-2 text-center">{t('terms.section4.feat3')}</Text>
      </View>
    </View>
  );
}

export default function TermsConditionsPage({ onBack }: TermsConditionsPageProps): ReactElement {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  return (
    <SafeAreaView edges={['left', 'right']} className="flex-1 bg-white">
      {/* Header */}
      <View className="flex-row items-center px-5 py-4 border-b border-gray200">
        <Pressable onPress={onBack} className="mr-3 active:opacity-70">
          <Feather name="arrow-left" size={24} color="#111827" />
        </Pressable>
        <Text className="text-lg font-semibold text-black">{t('terms.title')}</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 16) + 20 }}
      >
        {/* Last Updated */}
        <Text className="text-center text-sm text-gray500 mt-4">
          {t('terms.lastUpdated')}
        </Text>

        {/* Terms of Service */}
        <SectionCard>
          <SectionTitle icon="file-text" title={t('terms.tos.title')} />
          <Text className="text-sm text-gray700 leading-5">
            {t('terms.tos.body')}
          </Text>
        </SectionCard>

        {/* 1. Acceptance of Terms */}
        <SectionCard>
          <Text className="text-base font-semibold text-black mb-3">{t('terms.section1.title')}</Text>
          <Text className="text-sm text-gray700 leading-5">
            {t('terms.section1.body')}
          </Text>
        </SectionCard>

        {/* 2. Account Registration */}
        <SectionCard>
          <SectionTitle icon="user-plus" title={t('terms.section2.title')} />
          <Text className="text-sm text-gray700 leading-5 mb-2">
            {t('terms.section2.intro')}
          </Text>
          <BulletPoint>{t('terms.section2.b1')}</BulletPoint>
          <BulletPoint>{t('terms.section2.b2')}</BulletPoint>
          <BulletPoint>{t('terms.section2.b3')}</BulletPoint>
          <BulletPoint>{t('terms.section2.b4')}</BulletPoint>
          <BulletPoint>{t('terms.section2.b5')}</BulletPoint>
        </SectionCard>

        {/* 3. Use of Services */}
        <SectionCard>
          <Text className="text-base font-semibold text-black mb-3">{t('terms.section3.title')}</Text>

          <Text className="text-sm font-medium text-gray900 mb-2">{t('terms.section3.permittedTitle')}</Text>
          <Text className="text-sm text-gray700 leading-5 mb-3">
            {t('terms.section3.permittedBody')}
          </Text>

          <Text className="text-sm font-medium text-gray900 mb-2">{t('terms.section3.prohibitedTitle')}</Text>
          <BulletPoint>{t('terms.section3.p1')}</BulletPoint>
          <BulletPoint>{t('terms.section3.p2')}</BulletPoint>
          <BulletPoint>{t('terms.section3.p3')}</BulletPoint>
          <BulletPoint>{t('terms.section3.p4')}</BulletPoint>
          <BulletPoint>{t('terms.section3.p5')}</BulletPoint>
          <BulletPoint>{t('terms.section3.p6')}</BulletPoint>
        </SectionCard>

        {/* 4. Ticket Purchases */}
        <SectionCard>
          <Text className="text-base font-semibold text-black mb-3">{t('terms.section4.title')}</Text>
          <TicketPurchaseCard />
          <View className="mt-4">
            <BulletPoint>{t('terms.section4.b1')}</BulletPoint>
            <BulletPoint>{t('terms.section4.b2')}</BulletPoint>
            <BulletPoint>{t('terms.section4.b3')}</BulletPoint>
            <BulletPoint>{t('terms.section4.b4')}</BulletPoint>
            <BulletPoint>{t('terms.section4.b5')}</BulletPoint>
            <BulletPoint>{t('terms.section4.b6')}</BulletPoint>
          </View>
        </SectionCard>

        {/* 5. Intellectual Property */}
        <SectionCard>
          <Text className="text-base font-semibold text-black mb-3">{t('terms.section5.title')}</Text>
          <Text className="text-sm text-gray700 leading-5">
            {t('terms.section5.body')}
          </Text>
        </SectionCard>

        {/* 6. User-Generated Content */}
        <SectionCard>
          <Text className="text-base font-semibold text-black mb-3">{t('terms.section6.title')}</Text>
          <Text className="text-sm text-gray700 leading-5 mb-2">
            {t('terms.section6.intro')}
          </Text>
          <BulletPoint>{t('terms.section6.b1')}</BulletPoint>
          <BulletPoint>{t('terms.section6.b2')}</BulletPoint>
          <BulletPoint>{t('terms.section6.b3')}</BulletPoint>
        </SectionCard>

        {/* 7. Disclaimers & Limitations */}
        <SectionCard>
          <SectionTitle icon="alert-triangle" title={t('terms.section7.title')} />
          <Text className="text-sm text-gray700 leading-5 mb-2">
            {t('terms.section7.intro')}
          </Text>
          <BulletPoint>{t('terms.section7.b1')}</BulletPoint>
          <BulletPoint>{t('terms.section7.b2')}</BulletPoint>
          <BulletPoint>{t('terms.section7.b3')}</BulletPoint>
          <BulletPoint>{t('terms.section7.b4')}</BulletPoint>
        </SectionCard>

        {/* 8. Limitation of Liability */}
        <SectionCard>
          <Text className="text-base font-semibold text-black mb-3">{t('terms.section8.title')}</Text>
          <Text className="text-sm text-gray700 leading-5">
            {t('terms.section8.body')}
          </Text>
        </SectionCard>

        {/* 9. Indemnification */}
        <SectionCard>
          <Text className="text-base font-semibold text-black mb-3">{t('terms.section9.title')}</Text>
          <Text className="text-sm text-gray700 leading-5">
            {t('terms.section9.body')}
          </Text>
        </SectionCard>

        {/* 10. Termination */}
        <SectionCard>
          <Text className="text-base font-semibold text-black mb-3">{t('terms.section10.title')}</Text>
          <Text className="text-sm text-gray700 leading-5">
            {t('terms.section10.body')}
          </Text>
        </SectionCard>

        {/* 11. Governing Law */}
        <SectionCard>
          <Text className="text-base font-semibold text-black mb-3">{t('terms.section11.title')}</Text>
          <Text className="text-sm text-gray700 leading-5">
            {t('terms.section11.body')}
          </Text>
        </SectionCard>

        {/* 12. Contact Information */}
        <SectionCard>
          <Text className="text-base font-semibold text-black mb-3">{t('terms.section12.title')}</Text>
          <Text className="text-sm text-gray700 leading-5 mb-3">
            {t('terms.section12.intro')}
          </Text>
          <View>
            <Text className="text-sm text-gray700">
              <Text className="font-medium">{t('terms.section12.emailLabel')}</Text> goswingapp@gmail.com
            </Text>
            <Text className="text-sm text-gray700 mt-1">
              <Text className="font-medium">{t('terms.section12.addressLabel')}</Text> {t('terms.section12.address')}
            </Text>
            <Text className="text-sm text-gray700 mt-1">
              <Text className="font-medium">{t('terms.section12.phoneLabel')}</Text> +1 (555) 123-LEGAL
            </Text>
          </View>
        </SectionCard>

        {/* Changes to Terms */}
        <SectionCard>
          <View className="flex-row items-center gap-x-2 mb-3">
            <Feather name="refresh-cw" size={18} color="#F97316" />
            <Text className="text-base font-semibold text-orange-500">{t('terms.changes.title')}</Text>
          </View>
          <Text className="text-sm text-gray700 leading-5">
            {t('terms.changes.body')}
          </Text>
        </SectionCard>

        {/* Effective Date Footer */}
        <View className="mt-6 mb-14 items-center">
          <Text className="text-xs text-gray500">{t('terms.effectiveDate')}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}