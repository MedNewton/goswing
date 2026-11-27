// components/gs/EmptyState.tsx — icon, title, message and an optional action.
import React, { type ReactElement, type ReactNode } from 'react';
import { Text, View } from 'react-native';
import { gs } from '@/theme/colors';
import GsButton from './GsButton';

export default function EmptyState({
  icon,
  title,
  message,
  actionLabel,
  onAction,
}: Readonly<{ icon?: ReactNode; title: string; message?: string; actionLabel?: string; onAction?: () => void }>): ReactElement {
  return (
    <View className="items-center px-8 py-12">
      {icon ? (
        <View className="h-16 w-16 rounded-full items-center justify-center mb-4" style={{ backgroundColor: gs.violetSoft }}>
          {icon}
        </View>
      ) : null}
      <Text className="text-[18px] font-extrabold text-ink text-center">{title}</Text>
      {message ? <Text className="mt-2 text-[15px] text-muted text-center leading-[21px]">{message}</Text> : null}
      {actionLabel && onAction ? <GsButton label={actionLabel} onPress={onAction} className="mt-5" /> : null}
    </View>
  );
}
