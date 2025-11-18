import '@/style/globals.css';
import React, { useMemo, useState, type ReactElement } from 'react';
import {
  Modal,
  Pressable,
  Text,
  TextInput,
  View,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import type { User } from 'firebase/auth';
import {
  signInWithEmailPassword,
  signUpWithEmailPassword,
  sendResetEmail,
  type EmailPassword,
} from '@/lib/auth';

export type EmailAuthModalProps = Readonly<{
  visible: boolean;
  onClose: () => void;
  /** Called after a successful sign-in / sign-up */
  onSignedIn?: (user: User) => void;
}>;

type Mode = 'signIn' | 'signUp';

const cx = (...c: Array<string | false | null | undefined>) => c.filter(Boolean).join(' ');

export default function EmailAuthModal({
  visible,
  onClose,
  onSignedIn,
}: EmailAuthModalProps): ReactElement {
  const [mode, setMode] = useState<Mode>('signIn');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [busy, setBusy] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const title = useMemo<string>(() => (mode === 'signIn' ? 'Sign in' : 'Create account'), [mode]);
  const canSubmit = useMemo<boolean>(() => email.includes('@') && password.length >= 6, [email, password]);

  async function submit(): Promise<void> {
    if (!canSubmit || busy) return;
    setBusy(true);
    setError(null);
    try {
      const creds =
        mode === 'signIn'
          ? await signInWithEmailPassword({ email, password } as EmailPassword)
          : await signUpWithEmailPassword({ email, password } as EmailPassword);
      onSignedIn?.(creds.user);
      // Clear fields and close
      setEmail('');
      setPassword('');
      onClose();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Something went wrong. Please try again.';
      setError(msg);
    } finally {
      setBusy(false);
    }
  }

  async function handleForgotPassword(): Promise<void> {
    if (!email || !email.includes('@')) {
      Alert.alert('Reset password', 'Enter your email first, then tap “Forgot password?”.');
      return;
    }
    try {
      setBusy(true);
      await sendResetEmail(email);
      Alert.alert('Reset email sent', 'Check your inbox for password reset instructions.');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unable to send reset email right now.';
      Alert.alert('Reset failed', msg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <SafeAreaView className="flex-1 bg-black/40">
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.select({ ios: 'padding', android: undefined })}
        >
          {/* Sheet */}
          <View className="mt-auto bg-white rounded-t-3xl px-5 pt-4 pb-6">
            {/* Drag handle */}
            <View className="items-center">
              <View className="h-1.5 w-10 rounded-full bg-gray300" />
            </View>

            {/* Header */}
            <View className="mt-3 mb-2 flex-row items-center justify-between">
              <Text className="text-xl font-semibold text-black">{title}</Text>
              <Pressable
                accessibilityRole="button"
                onPress={onClose}
                className="h-9 w-9 items-center justify-center rounded-full active:opacity-80"
              >
                <Feather name="x" size={20} color="#111827" />
              </Pressable>
            </View>

            {/* Fields */}
            <View className="mt-2 gap-y-3">
              <View className="gap-y-1">
                <Text className="text-sm text-gray700">Email</Text>
                <View className="flex-row items-center rounded-2xl border border-gray300 bg-white px-3">
                  <Feather name="mail" size={18} color="#6B7280" />
                  <TextInput
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="email-address"
                    placeholder="you@example.com"
                    placeholderTextColor="#9CA3AF"
                    className="flex-1 px-3 py-3 text-gray900"
                  />
                </View>
              </View>

              <View className="gap-y-1">
                <Text className="text-sm text-gray700">Password</Text>
                <View className="flex-row items-center rounded-2xl border border-gray300 bg-white px-3">
                  <Feather name="lock" size={18} color="#6B7280" />
                  <TextInput
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                    placeholder="Minimum 6 characters"
                    placeholderTextColor="#9CA3AF"
                    className="flex-1 px-3 py-3 text-gray900"
                  />
                </View>
              </View>

              {error ? <Text className="text-sm text-red-600">{error}</Text> : null}

              {/* Actions */}
              <View className="mt-2 flex-row items-center justify-between">
                <Pressable onPress={handleForgotPassword} disabled={busy}>
                  <Text className="text-sm text-brand">Forgot password?</Text>
                </Pressable>
                <Pressable
                  onPress={() => setMode((m) => (m === 'signIn' ? 'signUp' : 'signIn'))}
                  disabled={busy}
                >
                  <Text className="text-sm text-gray700">
                    {mode === 'signIn' ? 'Create account' : 'I have an account'}
                  </Text>
                </Pressable>
              </View>

              {/* Submit */}
              <Pressable
                accessibilityRole="button"
                disabled={!canSubmit || busy}
                onPress={submit}
                className={cx(
                  'mt-3 h-12 rounded-2xl items-center justify-center',
                  canSubmit && !busy ? 'bg-black' : 'bg-gray300'
                )}
              >
                {busy ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text className="text-white font-semibold">
                    {mode === 'signIn' ? 'Continue' : 'Create account'}
                  </Text>
                )}
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}
