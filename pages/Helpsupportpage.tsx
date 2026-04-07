// pages/HelpSupportPage.tsx
import React, { useMemo, useState, type ReactElement } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  Alert,
  Linking,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

type HelpSupportPageProps = Readonly<{
  onBack: () => void;
}>;

type FAQItem = {
  id: string;
  question: string;
  answer: string;
  icon: keyof typeof Feather.glyphMap;
};

function FAQAccordion({ item }: { item: FAQItem }): ReactElement {
  const [expanded, setExpanded] = useState(false);

  return (
    <View className="border-b border-gray200">
      <Pressable
        onPress={() => setExpanded(!expanded)}
        className="flex-row items-center justify-between py-4 px-4 active:opacity-80"
      >
        <View className="flex-row items-center gap-x-3 flex-1">
          <Feather name={item.icon} size={18} color="#6B7280" />
          <Text className="text-sm text-gray900 flex-1">{item.question}</Text>
        </View>
        <Feather name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color="#9CA3AF" />
      </Pressable>
      {expanded && (
        <View className="px-4 pb-4 pt-0">
          <Text className="text-sm text-gray600 leading-5 ml-7">{item.answer}</Text>
        </View>
      )}
    </View>
  );
}

export default function HelpSupportPage({ onBack }: HelpSupportPageProps): ReactElement {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState('');
  const [category, setCategory] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');

  const FAQ_DATA: FAQItem[] = useMemo(() => [
    { id: '1', question: t('helpSupport.faq.q1'), answer: t('helpSupport.faq.a1'), icon: 'help-circle' },
    { id: '2', question: t('helpSupport.faq.q2'), answer: t('helpSupport.faq.a2'), icon: 'calendar' },
    { id: '3', question: t('helpSupport.faq.q3'), answer: t('helpSupport.faq.a3'), icon: 'credit-card' },
    { id: '4', question: t('helpSupport.faq.q4'), answer: t('helpSupport.faq.a4'), icon: 'calendar' },
    { id: '5', question: t('helpSupport.faq.q5'), answer: t('helpSupport.faq.a5'), icon: 'message-circle' },
  ], [t]);

  const handleLiveChat = (): void => {
    Alert.alert(t('helpSupport.liveChat'), t('helpSupport.liveChatComingSoon'));
  };

  const handleEmailUs = async (): Promise<void> => {
    const emailUrl = 'mailto:goswingapp@gmail.com';
    const canOpen = await Linking.canOpenURL(emailUrl);

    if (canOpen) {
      await Linking.openURL(emailUrl);
    } else {
      Alert.alert(t('common.error'), t('helpSupport.emailOpenError'));
    }
  };

  const handleSendMessage = (): void => {
    if (!subject.trim() || !message.trim()) {
      Alert.alert(t('common.error'), t('helpSupport.errFillFields'));
      return;
    }

    Alert.alert(
      t('helpSupport.sentTitle'),
      t('helpSupport.sentMessage'),
      [
        {
          text: t('helpSupport.ok'),
          onPress: () => {
            setCategory('');
            setSubject('');
            setMessage('');
          },
        },
      ]
    );
  };

  const handleReportBug = (): void => {
    Alert.alert(
      t('helpSupport.reportBugTitle'),
      t('helpSupport.reportBugMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('helpSupport.reportViaEmail'),
          onPress: async () => {
            const emailUrl = 'mailto:goswingapp@gmail.com?subject=Bug%20Report';
            const canOpen = await Linking.canOpenURL(emailUrl);
            if (canOpen) {
              await Linking.openURL(emailUrl);
            }
          },
        },
      ]
    );
  };

  const filteredFAQs = FAQ_DATA.filter(
    (faq) =>
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <SafeAreaView edges={['left', 'right']} className="flex-1 bg-gray50">
      {/* Header */}
      <View className="flex-row items-center px-5 py-4 bg-white border-b border-gray200">
        <Pressable onPress={onBack} className="mr-3 active:opacity-70">
          <Feather name="arrow-left" size={24} color="#111827" />
        </Pressable>
        <Text className="text-lg font-semibold text-black">{t('helpSupport.title')}</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 16) + 20 }}
      >
        {/* Quick Actions */}
        <View className="mx-5 mt-4 flex-row gap-x-3">
          <Pressable
            onPress={handleLiveChat}
            className="flex-1 items-center rounded-2xl border border-gray200 bg-white py-5 active:opacity-80"
          >
            <Feather name="message-circle" size={24} color="#111827" />
            <Text className="mt-2 text-sm font-medium text-gray900">{t('helpSupport.liveChat')}</Text>
            <Text className="mt-1 text-xs text-gray500">{t('helpSupport.liveChatSubtitle')}</Text>
          </Pressable>

          <Pressable
            onPress={handleEmailUs}
            className="flex-1 items-center rounded-2xl border border-gray200 bg-white py-5 active:opacity-80"
          >
            <Feather name="mail" size={24} color="#111827" />
            <Text className="mt-2 text-sm font-medium text-gray900">{t('helpSupport.emailUs')}</Text>
            <Text className="mt-1 text-xs text-gray500">{t('helpSupport.emailUsSubtitle')}</Text>
          </Pressable>
        </View>

        {/* Search Help Articles */}
        <View className="mx-5 mt-4 rounded-2xl border border-gray200 bg-white p-4">
          <Text className="text-base font-semibold text-black mb-3">{t('helpSupport.searchTitle')}</Text>
          <View className="flex-row items-center border border-gray200 rounded-xl px-3 py-2.5 bg-gray50">
            <Feather name="search" size={18} color="#9CA3AF" />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder={t('helpSupport.searchPlaceholder')}
              placeholderTextColor="#9CA3AF"
              className="flex-1 ml-2 text-sm text-gray900"
            />
          </View>
        </View>

        {/* Frequently Asked Questions */}
        <View className="mx-5 mt-4 rounded-2xl border border-gray200 bg-white overflow-hidden">
          <View className="px-4 py-4 border-b border-gray200">
            <Text className="text-base font-semibold text-black">{t('helpSupport.faqTitle')}</Text>
          </View>
          {filteredFAQs.length > 0 ? (
            filteredFAQs.map((faq) => <FAQAccordion key={faq.id} item={faq} />)
          ) : (
            <View className="px-4 py-6 items-center">
              <Text className="text-sm text-gray500">{t('helpSupport.faqNoMatch')}</Text>
            </View>
          )}
        </View>

        {/* Contact Support Form */}
        <View className="mx-5 mt-4 rounded-2xl border border-gray200 bg-white p-4">
          <Text className="text-base font-semibold text-black mb-4">{t('helpSupport.contactTitle')}</Text>

          <View className="mb-4">
            <Text className="text-sm text-gray700 mb-2">{t('helpSupport.category')}</Text>
            <View className="border border-gray200 rounded-xl overflow-hidden">
              <TextInput
                value={category}
                onChangeText={setCategory}
                placeholder={t('helpSupport.categoryPlaceholder')}
                placeholderTextColor="#9CA3AF"
                className="px-3 py-3 text-sm text-gray900 bg-white"
              />
            </View>
          </View>

          <View className="mb-4">
            <Text className="text-sm text-gray700 mb-2">{t('helpSupport.subject')}</Text>
            <View className="border border-gray200 rounded-xl overflow-hidden">
              <TextInput
                value={subject}
                onChangeText={setSubject}
                placeholder={t('helpSupport.subjectPlaceholder')}
                placeholderTextColor="#9CA3AF"
                className="px-3 py-3 text-sm text-gray900 bg-white"
              />
            </View>
          </View>

          <View className="mb-4">
            <Text className="text-sm text-gray700 mb-2">{t('helpSupport.messageLabel')}</Text>
            <View className="border border-gray200 rounded-xl overflow-hidden">
              <TextInput
                value={message}
                onChangeText={setMessage}
                placeholder={t('helpSupport.messagePlaceholder')}
                placeholderTextColor="#9CA3AF"
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                className="px-3 py-3 text-sm text-gray900 bg-white min-h-[100px]"
              />
            </View>
          </View>

          <Pressable
            onPress={handleSendMessage}
            className="bg-gray900 rounded-xl py-3.5 items-center active:opacity-90"
          >
            <Text className="text-white font-medium">{t('helpSupport.sendMessage')}</Text>
          </Pressable>
        </View>

        {/* Other Ways to Reach Us */}
        <View className="mx-5 mt-4 rounded-2xl border border-gray200 bg-white p-4">
          <Text className="text-base font-semibold text-black mb-4">{t('helpSupport.otherTitle')}</Text>

          <View className="flex-row items-start gap-x-3 mb-4">
            <Feather name="mail" size={18} color="#111827" />
            <View className="flex-1">
              <Text className="text-sm font-medium text-gray900">{t('helpSupport.emailSupport')}</Text>
              <Text className="text-sm text-gray600">goswingapp@gmail.com</Text>
              <Text className="text-xs text-gray500 mt-0.5">{t('helpSupport.emailResponseTime')}</Text>
            </View>
          </View>

          <View className="flex-row items-start gap-x-3 mb-4">
            <Feather name="phone" size={18} color="#111827" />
            <View className="flex-1">
              <Text className="text-sm font-medium text-gray900">{t('helpSupport.phoneSupport')}</Text>
              <Text className="text-sm text-gray600">+1 (555) 123-HELP</Text>
              <Text className="text-xs text-gray500 mt-0.5">{t('helpSupport.phoneHours')}</Text>
            </View>
          </View>

          <View className="flex-row items-start gap-x-3">
            <Feather name="message-circle" size={18} color="#111827" />
            <View className="flex-1">
              <Text className="text-sm font-medium text-gray900">{t('helpSupport.liveChat')}</Text>
              <Text className="text-sm text-gray600">{t('helpSupport.liveChatAvailable')}</Text>
              <Text className="text-xs text-gray500 mt-0.5">{t('helpSupport.liveChatHours')}</Text>
            </View>
          </View>
        </View>

        {/* Report a Bug */}
        <View className="mx-5 mt-4 rounded-2xl border border-orange-200 bg-orange-50 p-4">
          <View className="flex-row items-center gap-x-2 mb-2">
            <Feather name="settings" size={18} color="#F97316" />
            <Text className="text-base font-semibold text-orange-600">{t('helpSupport.bugTitle')}</Text>
          </View>
          <Text className="text-sm text-orange-700 mb-3">
            {t('helpSupport.bugBody')}
          </Text>
          <Pressable
            onPress={handleReportBug}
            className="self-start border border-gray300 bg-white rounded-xl px-4 py-2 active:opacity-80"
          >
            <Text className="text-sm font-medium text-gray900">{t('helpSupport.reportBug')}</Text>
          </Pressable>
        </View>

        {/* System Status */}
        <View className="mx-5 mt-4 mb-16 rounded-2xl border border-gray200 bg-white p-4">
          <Text className="text-base font-semibold text-black mb-3">{t('helpSupport.systemStatus')}</Text>
          <View className="flex-row items-center gap-x-2">
            <View className="w-2.5 h-2.5 rounded-full bg-green-500" />
            <Text className="text-sm text-gray900">{t('helpSupport.allOperational')}</Text>
          </View>
          <Pressable className="mt-2 active:opacity-70">
            <Text className="text-sm text-gray600 underline">{t('helpSupport.viewStatusPage')}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
