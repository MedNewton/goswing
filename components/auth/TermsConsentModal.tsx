import React, { useEffect, useRef, type ReactElement } from 'react';
import { Animated, Easing, Modal, Pressable, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

type Props = Readonly<{
  visible: boolean;
  onAccept: () => void;
  onCancel: () => void;
}>;

export default function TermsConsentModal({ visible, onAccept, onCancel }: Props): ReactElement {
  const { t } = useTranslation();
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.96)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }),
        Animated.timing(scale, {
          toValue: 1,
          duration: 220,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 0, duration: 120, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 0.96, duration: 120, useNativeDriver: true }),
      ]).start();
    }
  }, [visible, opacity, scale]);

  const Row = ({ label }: { label: string }) => (
    <View className="flex-row items-center gap-x-2 mt-3">
      <Feather name="check-circle" size={20} color="#16A34A" />
      <Text className="text-gray900 text-base">{label}</Text>
    </View>
  );

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onCancel}>
      <Animated.View
        className="flex-1 items-center justify-center px-5"
        style={{ backgroundColor: 'rgba(0,0,0,0.45)', opacity }}
      >
        <Animated.View
          className="w-full rounded-3xl bg-white p-5"
          style={{
            transform: [{ scale }],
            shadowColor: '#000',
            shadowOpacity: 0.12,
            shadowRadius: 18,
            shadowOffset: { width: 0, height: 8 },
            elevation: 8,
          }}
        >
          <Text className="text-[20px] font-semibold text-black">{t('onboarding.terms.title')}</Text>
          <Text className="text-[20px] text-gray600 mt-2">
            {t('onboarding.terms.subtitle')}
          </Text>

          <Text className="text-gray700 mt-4 leading-6">
            {t('onboarding.terms.body')}
          </Text>

          <Row label={t('onboarding.terms.itemGdpr')} />
          <Row label={t('onboarding.terms.itemDataProtection')} />
          <Row label={t('onboarding.terms.itemPrivacyRights')} />

          <Pressable
            onPress={onAccept}
            className="mt-6 rounded-2xl bg-[#0B0B15] py-3 items-center"
          >
            <Text className="text-white font-semibold">{t('onboarding.terms.acceptContinue')}</Text>
          </Pressable>

          <Pressable
            onPress={onCancel}
            className="mt-3 rounded-2xl border border-gray300 bg-white py-3 items-center"
          >
            <Text className="text-gray900">{t('common.cancel')}</Text>
          </Pressable>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}
