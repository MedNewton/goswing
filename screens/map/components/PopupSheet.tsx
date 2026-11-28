// screens/map/components/PopupSheet.tsx — map pop-up with two heights:
// collapsed (about two thirds of the screen, the map stays visible above)
// and expanded. Tap or drag the grab handle to switch; drag down to close.
import React, { useEffect, useMemo, useRef, useState, type ReactElement, type ReactNode } from 'react';
import { Animated, Modal, PanResponder, Pressable, ScrollView, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react-native';

import { gs } from '@/theme/colors';

export default function PopupSheet({
  visible,
  onClose,
  accessibilityLabel,
  children,
  resetKey,
}: Readonly<{
  visible: boolean;
  onClose: () => void;
  accessibilityLabel: string;
  children: ReactNode;
  /** Changing it scrolls back to the top and collapses the sheet. */
  resetKey?: string;
}>): ReactElement {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { height: winH } = useWindowDimensions();
  const avail = winH - insets.top;
  const collapsedH = Math.round(avail * 0.7);
  const expandedH = Math.round(avail * 0.93);
  const [expanded, setExpanded] = useState<boolean>(false);
  const height = useRef(new Animated.Value(collapsedH)).current;
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    setExpanded(false);
    height.setValue(collapsedH);
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  }, [resetKey, visible, collapsedH, height]);

  useEffect(() => {
    Animated.spring(height, {
      toValue: expanded ? expandedH : collapsedH,
      useNativeDriver: false,
      bounciness: 0,
      speed: 18,
    }).start();
  }, [expanded, expandedH, collapsedH, height]);

  const expandedRef = useRef(expanded);
  expandedRef.current = expanded;
  const pan = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 6,
        onPanResponderRelease: (_, g) => {
          if (g.dy < -30) setExpanded(true);
          else if (g.dy > 30) {
            if (expandedRef.current) setExpanded(false);
            else onClose();
          }
        },
      }),
    [onClose],
  );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View className="flex-1 justify-end">
        <Pressable
          className="absolute inset-0"
          style={{ backgroundColor: 'rgba(20,18,31,0.22)' }}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel={t('map.pop.close')}
        />
        <Animated.View
          accessibilityViewIsModal
          accessibilityLabel={accessibilityLabel}
          style={{
            height,
            backgroundColor: gs.white,
            overflow: 'hidden',
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            shadowColor: '#14121F',
            shadowOpacity: 0.22,
            shadowRadius: 40,
            shadowOffset: { width: 0, height: -10 },
            elevation: 20,
          }}
        >
          <View className="h-[52px] items-center justify-center" {...pan.panHandlers}>
            <Pressable
              onPress={() => setExpanded((v) => !v)}
              accessibilityRole="button"
              accessibilityLabel={expanded ? t('map.pop.collapse') : t('map.pop.expand')}
              className="w-[120px] h-11 items-center justify-center"
            >
              <View className="h-[5px] w-11 rounded-full" style={{ backgroundColor: '#D6D3E0' }} />
            </Pressable>
            <Pressable
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel={t('gs.close')}
              className="absolute right-3 top-1.5 h-10 w-10 rounded-full items-center justify-center"
              style={{ backgroundColor: gs.surface2 }}
            >
              <X size={18} color={gs.ink} />
            </Pressable>
          </View>
          <ScrollView
            ref={scrollRef}
            className="flex-1"
            contentContainerStyle={{ paddingTop: 4, paddingBottom: Math.max(insets.bottom, 16) + 20 }}
            showsVerticalScrollIndicator={false}
            onScrollEndDrag={(e) => {
              // Pulling the content up while collapsed expands the sheet.
              if (!expandedRef.current && e.nativeEvent.contentOffset.y > 24) setExpanded(true);
            }}
          >
            {children}
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}
