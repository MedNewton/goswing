import '../style/globals.css';
import React, { type ReactElement } from 'react';
import { View, Text, Pressable, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, AntDesign } from '@expo/vector-icons';

type Props = Readonly<{
  onClose?: () => void;
  onContinueEmail?: () => void;
  onContinuePhone?: () => void;
  onContinueGoogle?: () => void;
  onContinueApple?: () => void;
}>;

const cx = (...c: Array<string | false | null | undefined>) => c.filter(Boolean).join(' ');

function PillButton({
  label,
  onPress,
  left,
  className,
}: {
  label: string;
  onPress?: () => void;
  left: ReactElement;
  className?: string;
}): ReactElement {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      className={cx(
        'w-full flex-row items-center gap-x-3 rounded-2xl border border-gray300 bg-white px-5 py-4 active:opacity-90',
        className
      )}
    >
      {left}
      <Text className="text-lg text-gray900">{label}</Text>
    </Pressable>
  );
}

export default function AuthPage({
  onClose,
  onContinueEmail,
  onContinuePhone,
  onContinueGoogle,
  onContinueApple,
}: Props): ReactElement {
  return (
    <SafeAreaView edges={['left', 'right']} className="flex-1 bg-white">
      <StatusBar barStyle="dark-content" />
      <View className="flex-1 items-center justify-center px-5">
        <View className="w-full max-w-[520px] items-center gap-y-4">
          <Text className="text-4xl font-bold text-[#0B0B15] text-center">GoSwing</Text>
          <Text className="text-2xl text-gray800 text-center">
            Welcome! Let&apos;s get fun.
          </Text>

          <View className="w-full mt-4 gap-y-4 px-2">
            <PillButton
              label="Continue with Email"
              onPress={onContinueEmail}
              left={<Feather name="mail" size={18} color="#111827" />}
              className="flex flex-row items-center justify-center"
            />
            <PillButton
              label="Continue with Phone"
              onPress={onContinuePhone}
              left={<Feather name="smartphone" size={18} color="#111827" />}
              className="flex flex-row items-center justify-center"
            />
            <PillButton
              label="Continue with Google"
              onPress={onContinueGoogle}
              left={<AntDesign name="google" size={18} color="#DB4437" />}
              className="flex flex-row items-center justify-center"
            />
            <PillButton
              label="Continue with Apple"
              onPress={onContinueApple}
              left={<AntDesign name="apple" size={20} color="#000000" />}
              className="flex flex-row items-center justify-center"
            />
          </View>
          
        </View>
      </View>
    </SafeAreaView>
  );
}
