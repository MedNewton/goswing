// pages/PrivacySecurityPage.tsx
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

type PrivacySecurityPageProps = Readonly<{
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
      <Text className="text-sm text-gray700 flex-1">{children}</Text>
    </View>
  );
}

function SubSection({ title, children }: { title: string; children: React.ReactNode }): ReactElement {
  return (
    <View className="mt-3">
      <Text className="text-sm font-medium text-gray900 mb-1">{title}</Text>
      {children}
    </View>
  );
}

export default function PrivacySecurityPage({ onBack }: PrivacySecurityPageProps): ReactElement {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  return (
    <SafeAreaView edges={['left', 'right']} className="flex-1 bg-white pb-16">
      {/* Header */}
      <View className="flex-row items-center px-5 py-4 border-b border-gray200">
        <Pressable onPress={onBack} className="mr-3 active:opacity-70">
          <Feather name="arrow-left" size={24} color="#111827" />
        </Pressable>
        <Text className="text-lg font-semibold text-black">{t('privacy.title')}</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 16) + 20 }}
      >
        {/* Last Updated */}
        <Text className="text-center text-sm text-gray500 mt-4">
          {t('privacy.lastUpdated', { date: t('privacy.lastUpdatedDate') })}
        </Text>

        {/* Your Privacy Matters */}
        <SectionCard>
          <SectionTitle icon="shield" title={t('privacy.yourPrivacyMattersTitle')} />
          <Text className="text-sm text-gray700 leading-5">
            {t('privacy.yourPrivacyMattersBody')}
          </Text>
        </SectionCard>

        {/* Information We Collect */}
        <SectionCard>
          <SectionTitle icon="database" title={t('privacy.informationWeCollectTitle')} />

          <SubSection title={t('privacy.personalInformationTitle')}>
            <BulletPoint>{t('privacy.personalInformation1')}</BulletPoint>
            <BulletPoint>{t('privacy.personalInformation2')}</BulletPoint>
            <BulletPoint>{t('privacy.personalInformation3')}</BulletPoint>
            <BulletPoint>{t('privacy.personalInformation4')}</BulletPoint>
          </SubSection>

          <SubSection title={t('privacy.usageInformationTitle')}>
            <BulletPoint>{t('privacy.usageInformation1')}</BulletPoint>
            <BulletPoint>{t('privacy.usageInformation2')}</BulletPoint>
            <BulletPoint>{t('privacy.usageInformation3')}</BulletPoint>
            <BulletPoint>{t('privacy.usageInformation4')}</BulletPoint>
          </SubSection>
        </SectionCard>

        {/* How We Use Your Information */}
        <SectionCard>
          <SectionTitle icon="eye" title={t('privacy.howWeUseTitle')} />
          <BulletPoint>
            <Text className="font-medium">{t('privacy.serviceProvisionLabel')}</Text> {t('privacy.serviceProvisionBody')}
          </BulletPoint>
          <BulletPoint>
            <Text className="font-medium">{t('privacy.personalizationLabel')}</Text> {t('privacy.personalizationBody')}
          </BulletPoint>
          <BulletPoint>
            <Text className="font-medium">{t('privacy.communicationLabel')}</Text> {t('privacy.communicationBody')}
          </BulletPoint>
          <BulletPoint>
            <Text className="font-medium">{t('privacy.safetySecurityLabel')}</Text> {t('privacy.safetySecurityBody')}
          </BulletPoint>
          <BulletPoint>
            <Text className="font-medium">{t('privacy.analyticsLabel')}</Text> {t('privacy.analyticsBody')}
          </BulletPoint>
        </SectionCard>

        {/* Information Sharing */}
        <SectionCard>
          <SectionTitle icon="users" title={t('privacy.informationSharingTitle')} />
          <Text className="text-sm text-gray700 leading-5 mb-2">
            {t('privacy.informationSharingBody')}
          </Text>
          <BulletPoint>
            <Text className="font-medium">{t('privacy.eventOrganizersLabel')}</Text> {t('privacy.eventOrganizersBody')}
          </BulletPoint>
          <BulletPoint>
            <Text className="font-medium">{t('privacy.serviceProvidersLabel')}</Text> {t('privacy.serviceProvidersBody')}
          </BulletPoint>
          <BulletPoint>
            <Text className="font-medium">{t('privacy.legalRequirementsLabel')}</Text> {t('privacy.legalRequirementsBody')}
          </BulletPoint>
          <BulletPoint>
            <Text className="font-medium">{t('privacy.businessTransfersLabel')}</Text> {t('privacy.businessTransfersBody')}
          </BulletPoint>
        </SectionCard>

        {/* Your Rights & Choices */}
        <SectionCard>
          <SectionTitle icon="check-circle" title={t('privacy.yourRightsTitle')} />
          <BulletPoint>
            <Text className="font-medium">{t('privacy.accessLabel')}</Text> {t('privacy.accessBody')}
          </BulletPoint>
          <BulletPoint>
            <Text className="font-medium">{t('privacy.correctionLabel')}</Text> {t('privacy.correctionBody')}
          </BulletPoint>
          <BulletPoint>
            <Text className="font-medium">{t('privacy.deletionLabel')}</Text> {t('privacy.deletionBody')}
          </BulletPoint>
          <BulletPoint>
            <Text className="font-medium">{t('privacy.portabilityLabel')}</Text> {t('privacy.portabilityBody')}
          </BulletPoint>
          <BulletPoint>
            <Text className="font-medium">{t('privacy.optOutLabel')}</Text> {t('privacy.optOutBody')}
          </BulletPoint>
          <BulletPoint>
            <Text className="font-medium">{t('privacy.restrictProcessingLabel')}</Text> {t('privacy.restrictProcessingBody')}
          </BulletPoint>
        </SectionCard>

        {/* Data Security */}
        <SectionCard>
          <SectionTitle icon="lock" title={t('privacy.dataSecurityTitle')} />
          <Text className="text-sm text-gray700 leading-5">
            {t('privacy.dataSecurityBody')}
          </Text>
        </SectionCard>

        {/* International Data Transfers */}
        <SectionCard>
          <SectionTitle icon="globe" title={t('privacy.internationalTransfersTitle')} />
          <Text className="text-sm text-gray700 leading-5">
            {t('privacy.internationalTransfersBody')}
          </Text>
        </SectionCard>

        {/* Children's Privacy */}
        <SectionCard>
          <SectionTitle icon="alert-circle" title={t('privacy.childrenPrivacyTitle')} />
          <Text className="text-sm text-gray700 leading-5">
            {t('privacy.childrenPrivacyBody')}
          </Text>
        </SectionCard>

        {/* Contact Us */}
        <SectionCard>
          <SectionTitle icon="mail" title={t('privacy.contactUsTitle')} />
          <Text className="text-sm text-gray700 leading-5 mb-2">
            {t('privacy.contactUsBody')}
          </Text>
          <View className="mt-2">
            <Text className="text-sm text-gray700">
              <Text className="font-medium">{t('privacy.emailLabel')}</Text> privacy@goswing.com
            </Text>
            <Text className="text-sm text-gray700 mt-1">
              <Text className="font-medium">{t('privacy.addressLabel')}</Text> 123 Privacy Street, Tech City, TC 12345
            </Text>
            <Text className="text-sm text-gray700 mt-1">
              <Text className="font-medium">{t('privacy.phoneLabel')}</Text> +1 (555) 123-PRIVACY
            </Text>
          </View>
        </SectionCard>

        {/* Changes to This Policy */}
        <SectionCard>
          <View className="flex-row items-center gap-x-2 mb-13">
            <Feather name="refresh-cw" size={18} color="#F97316" />
            <Text className="text-base font-semibold text-orange-500">{t('privacy.changesTitle')}</Text>
          </View>
          <Text className="text-sm text-gray700 leading-5">
            {t('privacy.changesBody')}
          </Text>
        </SectionCard>
      </ScrollView>
    </SafeAreaView>
  );
}
