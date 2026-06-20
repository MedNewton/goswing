// components/social/GroupCommentsModal.tsx
import React, { useState, type ReactElement } from 'react';
import {
  Modal,
  View,
  Text,
  Image,
  Pressable,
  TextInput,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { usePostComments } from '@/hooks/social/useGroupPosts';
import type { GroupComment } from '@/lib/social/groupTypes';

type Props = Readonly<{
  postId: string | null;
  viewerId: string | null;
  onClose: () => void;
  onChanged?: (postId: string, delta: number) => void;
  onOpenUser?: (userId: string) => void;
}>;

export default function GroupCommentsModal({
  postId,
  viewerId,
  onClose,
  onChanged,
  onOpenUser,
}: Props): ReactElement | null {
  const { comments, isLoading, add, remove } = usePostComments(postId);
  const [text, setText] = useState('');
  const [posting, setPosting] = useState(false);

  if (!postId) return null;

  const submit = async (): Promise<void> => {
    const body = text.trim();
    if (!body) return;
    try {
      setPosting(true);
      await add(body);
      setText('');
      onChanged?.(postId, 1);
    } catch (err: any) {
      Alert.alert('Could not comment', err?.message ?? 'Please try again.');
    } finally {
      setPosting(false);
    }
  };

  const handleDelete = (c: GroupComment): void => {
    Alert.alert('Delete comment', 'Remove this comment?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await remove(c.id);
            onChanged?.(postId, -1);
          } catch (err: any) {
            Alert.alert('Could not delete', err?.message ?? 'Please try again.');
          }
        },
      },
    ]);
  };

  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <SafeAreaView edges={['top', 'left', 'right']} className="flex-1 bg-white">
        <View className="flex-row items-center px-5 py-3 border-b border-gray100">
          <Pressable onPress={onClose} className="mr-3 active:opacity-70">
            <Feather name="x" size={24} color="#111827" />
          </Pressable>
          <Text className="text-lg font-semibold text-black">Comments</Text>
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          className="flex-1"
        >
          <ScrollView className="flex-1" contentContainerClassName="py-3">
            {isLoading ? (
              <View className="py-12 items-center">
                <ActivityIndicator size="small" color="#9CA3AF" />
              </View>
            ) : comments.length === 0 ? (
              <View className="py-12 items-center">
                <Feather name="message-circle" size={26} color="#9CA3AF" />
                <Text className="text-gray500 text-sm mt-3">Be the first to comment</Text>
              </View>
            ) : (
              comments.map((c) => (
                <View key={c.id} className="flex-row items-start px-5 py-2">
                  <Pressable onPress={() => onOpenUser?.(c.authorId)} className="active:opacity-80">
                    {c.authorAvatarUrl ? (
                      <Image source={{ uri: c.authorAvatarUrl }} className="w-9 h-9 rounded-full" />
                    ) : (
                      <View className="w-9 h-9 rounded-full bg-gray100 items-center justify-center">
                        <Text className="text-gray700 text-xs font-semibold">
                          {(c.authorName || 'U').slice(0, 1).toUpperCase()}
                        </Text>
                      </View>
                    )}
                  </Pressable>
                  <View className="flex-1 ml-3 bg-gray50 rounded-2xl px-3 py-2">
                    <Text className="text-gray900 text-sm font-medium">{c.authorName}</Text>
                    <Text className="text-gray800 text-sm mt-0.5">{c.body}</Text>
                  </View>
                  {viewerId && c.authorId === viewerId ? (
                    <Pressable onPress={() => handleDelete(c)} className="p-1 ml-1 active:opacity-70">
                      <Feather name="trash-2" size={16} color="#9CA3AF" />
                    </Pressable>
                  ) : null}
                </View>
              ))
            )}
          </ScrollView>

          <View className="flex-row items-center gap-x-2 px-4 py-3 border-t border-gray200">
            <TextInput
              value={text}
              onChangeText={setText}
              placeholder="Add a comment…"
              placeholderTextColor="#9CA3AF"
              className="flex-1 bg-gray100 rounded-full px-4 py-2.5 text-sm text-gray900"
            />
            <Pressable
              onPress={submit}
              disabled={posting || !text.trim()}
              className={`rounded-full p-2.5 ${posting || !text.trim() ? 'bg-gray300' : 'bg-brand'}`}
            >
              {posting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Feather name="send" size={18} color="#FFFFFF" />
              )}
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}
