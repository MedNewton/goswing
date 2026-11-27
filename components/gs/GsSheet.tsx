// components/gs/GsSheet.tsx — bottom sheet modal with a grab handle.
import React, { type ReactElement, type ReactNode } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { gs } from '@/theme/colors';

export type GsSheetProps = Readonly<{
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  /** Sticky area under the scroll content (main action). */
  footer?: ReactNode;
  /** Fraction of the screen height, 0–1. */
  maxHeight?: number;
  scroll?: boolean;
}>;

export default function GsSheet({
  visible,
  onClose,
  title,
  children,
  footer,
  maxHeight = 0.9,
  scroll = true,
}: GsSheetProps): ReactElement {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View className="flex-1 justify-end">
        <Pressable
          className="absolute inset-0"
          style={{ backgroundColor: 'rgba(20,18,31,0.45)' }}
          onPress={onClose}
          accessibilityLabel={t('gs.close')}
        />
        <View
          className="bg-white rounded-t-[28px] overflow-hidden"
          style={{ maxHeight: `${Math.round(maxHeight * 100)}%`, paddingBottom: footer ? 0 : Math.max(insets.bottom, 16) }}
        >
          <View className="items-center pt-2.5 pb-1">
            <View className="h-1.5 w-11 rounded-full" style={{ backgroundColor: gs.lineStrong }} />
          </View>
          {title ? (
            <View className="flex-row items-center justify-between px-5 pt-2 pb-3">
              <Text className="text-[22px] font-extrabold text-ink flex-1 pr-3">{title}</Text>
              <Pressable
                onPress={onClose}
                accessibilityRole="button"
                accessibilityLabel={t('gs.close')}
                className="h-9 w-9 rounded-full items-center justify-center"
                style={{ backgroundColor: gs.surface2 }}
              >
                <X size={18} color={gs.ink} />
              </Pressable>
            </View>
          ) : null}
          {scroll ? (
            <ScrollView contentContainerStyle={{ paddingBottom: 16 }} showsVerticalScrollIndicator={false}>
              {children}
            </ScrollView>
          ) : (
            children
          )}
          {footer ? (
            <View
              className="px-5 pt-3 border-t border-line bg-white"
              style={{ paddingBottom: Math.max(insets.bottom, 16) }}
            >
              {footer}
            </View>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}
