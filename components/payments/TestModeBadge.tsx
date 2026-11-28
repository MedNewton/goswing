// components/payments/TestModeBadge.tsx — "Test mode · nothing is charged" note.
import React, { type ReactElement } from 'react';
import { Text, View } from 'react-native';
import { FlaskConical } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { gs } from '@/theme/colors';
import { isTestMode } from '@/lib/payments';

export default function TestModeBadge({ compact = false }: Readonly<{ compact?: boolean }>): ReactElement | null {
  const { t } = useTranslation();
  if (!isTestMode()) return null;
  return (
    <View accessibilityRole="text" className={compact ? "self-start rounded-xl px-3 py-2" : "self-stretch rounded-xl px-3 py-2"} style={{ backgroundColor: gs.orangeSoft }}>
      <View className="flex-row items-center">
        <FlaskConical size={16} color={gs.orange} />
        <Text className="ml-2 text-[13px] font-bold" style={{ color: gs.orange }}>
          {t('gs.pay.testMode')}
        </Text>
      </View>
      {compact ? null : (
        <Text className="mt-0.5 text-[13px] leading-[18px]" style={{ color: gs.orange }}>
          {t('gs.pay.testModeNote')}
        </Text>
      )}
    </View>
  );
}
