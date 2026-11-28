// pages/Termsconditionspage.tsx — Terms & conditions (sectioned text, last updated).
import React, { type ReactElement } from 'react';
import { Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { FileText } from 'lucide-react-native';

import { PageScaffold } from '@/screens/profile/components/ui';
import { LegalContact, LegalHero, LegalSections, type LegalSection } from '@/screens/profile/components/legal';
import { SUPPORT_EMAIL } from '@/pages/Helpsupportpage';

type TermsConditionsPageProps = Readonly<{ onBack: () => void }>;

export default function TermsConditionsPage({ onBack }: TermsConditionsPageProps): ReactElement {
  const { t } = useTranslation();
  const keys = (prefix: string, ids: ReadonlyArray<string | number>): string[] => ids.map((i) => t(`terms.${prefix}${i}`));

  const sections: ReadonlyArray<LegalSection> = [
    { title: t('terms.section1.title'), body: t('terms.section1.body') },
    { title: t('terms.section2.title'), body: t('terms.section2.intro'), bullets: keys('section2.b', [1, 2, 3, 4, 5]) },
    {
      title: t('terms.section3.title'),
      subs: [
        { title: t('terms.section3.permittedTitle'), body: t('terms.section3.permittedBody') },
        { title: t('terms.section3.prohibitedTitle'), bullets: keys('section3.p', [1, 2, 3, 4, 5, 6]) },
      ],
    },
    {
      title: t('terms.section4.title'),
      bullets: [...keys('section4.feat', [1, 2, 3]), ...keys('section4.b', [1, 2, 3, 4, 5, 6])],
    },
    { title: t('terms.section5.title'), body: t('terms.section5.body') },
    { title: t('terms.section6.title'), body: t('terms.section6.intro'), bullets: keys('section6.b', [1, 2, 3]) },
    { title: t('terms.section7.title'), body: t('terms.section7.intro'), bullets: keys('section7.b', [1, 2, 3, 4]) },
    { title: t('terms.section8.title'), body: t('terms.section8.body') },
    { title: t('terms.section9.title'), body: t('terms.section9.body') },
    { title: t('terms.section10.title'), body: t('terms.section10.body') },
    { title: t('terms.section11.title'), body: t('terms.section11.body') },
    { title: t('terms.changes.title'), body: t('terms.changes.body') },
    {
      title: t('terms.section12.title'),
      body: t('terms.section12.intro'),
      extra: <LegalContact label={t('terms.section12.title')} email={SUPPORT_EMAIL} />,
    },
  ];

  return (
    <PageScaffold title={t('profile.home.terms')} subtitle={t('profile.home.termsSub')} onBack={onBack}>
      <Text className="px-5 mt-1 text-[14px] font-bold text-subtle">{t('terms.lastUpdated')}</Text>
      <LegalHero icon={FileText} title={t('terms.tos.title')} body={t('terms.tos.body')} />
      <LegalSections sections={sections} />
      <Text className="px-5 mt-5 text-[13px] text-muted text-center">{t('terms.effectiveDate')}</Text>
    </PageScaffold>
  );
}
