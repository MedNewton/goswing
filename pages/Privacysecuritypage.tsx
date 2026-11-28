// pages/Privacysecuritypage.tsx — Privacy policy (sectioned text, last updated).
import React, { type ReactElement } from 'react';
import { Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { ShieldCheck } from 'lucide-react-native';

import { PageScaffold } from '@/screens/profile/components/ui';
import { LegalContact, LegalHero, LegalSections, type LegalSection } from '@/screens/profile/components/legal';
import { SUPPORT_EMAIL } from '@/pages/Helpsupportpage';

type PrivacySecurityPageProps = Readonly<{ onBack: () => void }>;

export default function PrivacySecurityPage({ onBack }: PrivacySecurityPageProps): ReactElement {
  const { t } = useTranslation();
  const lb = (k: string): { label: string; body: string } => ({ label: t(`privacy.${k}Label`), body: t(`privacy.${k}Body`) });

  const sections: ReadonlyArray<LegalSection> = [
    {
      title: t('privacy.informationWeCollectTitle'),
      subs: [
        { title: t('privacy.personalInformationTitle'), bullets: [1, 2, 3, 4].map((i) => t(`privacy.personalInformation${i}`)) },
        { title: t('privacy.usageInformationTitle'), bullets: [1, 2, 3, 4].map((i) => t(`privacy.usageInformation${i}`)) },
      ],
    },
    {
      title: t('privacy.howWeUseTitle'),
      bullets: ['serviceProvision', 'personalization', 'communication', 'safetySecurity', 'analytics'].map(lb),
    },
    {
      title: t('privacy.informationSharingTitle'),
      body: t('privacy.informationSharingBody'),
      bullets: ['eventOrganizers', 'serviceProviders', 'legalRequirements', 'businessTransfers'].map(lb),
    },
    {
      title: t('privacy.yourRightsTitle'),
      bullets: ['access', 'correction', 'deletion', 'portability', 'optOut', 'restrictProcessing'].map(lb),
    },
    { title: t('privacy.dataSecurityTitle'), body: t('privacy.dataSecurityBody') },
    { title: t('privacy.internationalTransfersTitle'), body: t('privacy.internationalTransfersBody') },
    { title: t('privacy.childrenPrivacyTitle'), body: t('privacy.childrenPrivacyBody') },
    { title: t('privacy.changesTitle'), body: t('privacy.changesBody') },
    {
      title: t('privacy.contactUsTitle'),
      body: t('privacy.contactUsBody'),
      extra: <LegalContact label={t('privacy.contactUsTitle')} email={SUPPORT_EMAIL} />,
    },
  ];

  return (
    <PageScaffold title={t('profile.home.privacy')} subtitle={t('profile.home.privacySub')} onBack={onBack}>
      <Text className="px-5 mt-1 text-[14px] font-bold text-subtle">
        {t('privacy.lastUpdated', { date: t('privacy.lastUpdatedDate') })}
      </Text>
      <LegalHero icon={ShieldCheck} title={t('privacy.yourPrivacyMattersTitle')} body={t('privacy.yourPrivacyMattersBody')} />
      <LegalSections sections={sections} />
    </PageScaffold>
  );
}
