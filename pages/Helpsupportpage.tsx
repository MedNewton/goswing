// pages/HelpSupportPage.tsx
import React, { useState, type ReactElement } from 'react';
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

type HelpSupportPageProps = Readonly<{
  onBack: () => void;
}>;

type FAQItem = {
  id: string;
  question: string;
  answer: string;
  icon: keyof typeof Feather.glyphMap;
};

const FAQ_DATA: FAQItem[] = [
  {
    id: '1',
    question: 'How do I create an account?',
    answer: 'You can create an account by downloading the GoSwing app and signing up with your email address or social media accounts. Follow the on-screen instructions to complete your profile.',
    icon: 'help-circle',
  },
  {
    id: '2',
    question: 'How do I buy tickets for an event?',
    answer: 'Browse events in the app, select the event you want to attend, choose your ticket type and quantity, then proceed to checkout. You can pay using credit/debit cards or other supported payment methods.',
    icon: 'calendar',
  },
  {
    id: '3',
    question: 'What is your refund policy?',
    answer: 'Refund policies vary by event. Generally, refunds are available up to 48 hours before the event starts. Check the specific event details for the refund policy or contact the event organizer.',
    icon: 'credit-card',
  },
  {
    id: '4',
    question: 'How do I use my QR code ticket?',
    answer: 'Your QR code ticket can be found in the "My Tickets" section of the app. Simply show the QR code to the event staff at the entrance for scanning. Make sure your screen brightness is turned up.',
    icon: 'calendar',
  },
  {
    id: '5',
    question: 'How do I manage my notifications?',
    answer: 'Go to Profile > Notification Preferences to customize which notifications you receive. You can enable or disable push notifications, email updates, and event reminders.',
    icon: 'message-circle',
  },
];

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
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState('');
  const [category, setCategory] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');

  const handleLiveChat = (): void => {
    Alert.alert('Live Chat', 'Live chat coming soon!');
  };

  const handleEmailUs = async (): Promise<void> => {
    const emailUrl = 'mailto:goswingapp@gmail.com';
    const canOpen = await Linking.canOpenURL(emailUrl);
    
    if (canOpen) {
      await Linking.openURL(emailUrl);
    } else {
      Alert.alert('Error', 'Unable to open email app. Please email us at goswingapp@gmail.com');
    }
  };

  const handleSendMessage = (): void => {
    if (!subject.trim() || !message.trim()) {
      Alert.alert('Error', 'Please fill in all required fields.');
      return;
    }

    // Here you would typically send the support request to your backend
    Alert.alert(
      'Message Sent',
      'Thank you for contacting us. We will respond within 24 hours.',
      [
        {
          text: 'OK',
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
      'Report a Bug',
      'Please describe the bug you encountered. Our team will investigate and fix it as soon as possible.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Report via Email',
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
        <Text className="text-lg font-semibold text-black">Help & Support</Text>
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
            <Text className="mt-2 text-sm font-medium text-gray900">Live Chat</Text>
            <Text className="mt-1 text-xs text-gray500">Chat with support</Text>
          </Pressable>

          <Pressable
            onPress={handleEmailUs}
            className="flex-1 items-center rounded-2xl border border-gray200 bg-white py-5 active:opacity-80"
          >
            <Feather name="mail" size={24} color="#111827" />
            <Text className="mt-2 text-sm font-medium text-gray900">Email Us</Text>
            <Text className="mt-1 text-xs text-gray500">Get help via email</Text>
          </Pressable>
        </View>

        {/* Search Help Articles */}
        <View className="mx-5 mt-4 rounded-2xl border border-gray200 bg-white p-4">
          <Text className="text-base font-semibold text-black mb-3">Search Help Articles</Text>
          <View className="flex-row items-center border border-gray200 rounded-xl px-3 py-2.5 bg-gray50">
            <Feather name="search" size={18} color="#9CA3AF" />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search for help..."
              placeholderTextColor="#9CA3AF"
              className="flex-1 ml-2 text-sm text-gray900"
            />
          </View>
        </View>

        {/* Frequently Asked Questions */}
        <View className="mx-5 mt-4 rounded-2xl border border-gray200 bg-white overflow-hidden">
          <View className="px-4 py-4 border-b border-gray200">
            <Text className="text-base font-semibold text-black">Frequently Asked Questions</Text>
          </View>
          {filteredFAQs.length > 0 ? (
            filteredFAQs.map((faq) => <FAQAccordion key={faq.id} item={faq} />)
          ) : (
            <View className="px-4 py-6 items-center">
              <Text className="text-sm text-gray500">No matching questions found</Text>
            </View>
          )}
        </View>

        {/* Contact Support Form */}
        <View className="mx-5 mt-4 rounded-2xl border border-gray200 bg-white p-4">
          <Text className="text-base font-semibold text-black mb-4">Contact Support</Text>

          <View className="mb-4">
            <Text className="text-sm text-gray700 mb-2">Category</Text>
            <View className="border border-gray200 rounded-xl overflow-hidden">
              <TextInput
                value={category}
                onChangeText={setCategory}
                placeholder="Select a category"
                placeholderTextColor="#9CA3AF"
                className="px-3 py-3 text-sm text-gray900 bg-white"
              />
            </View>
          </View>

          <View className="mb-4">
            <Text className="text-sm text-gray700 mb-2">Subject</Text>
            <View className="border border-gray200 rounded-xl overflow-hidden">
              <TextInput
                value={subject}
                onChangeText={setSubject}
                placeholder="Brief description of your issue"
                placeholderTextColor="#9CA3AF"
                className="px-3 py-3 text-sm text-gray900 bg-white"
              />
            </View>
          </View>

          <View className="mb-4">
            <Text className="text-sm text-gray700 mb-2">Message</Text>
            <View className="border border-gray200 rounded-xl overflow-hidden">
              <TextInput
                value={message}
                onChangeText={setMessage}
                placeholder="Please describe your issue in detail..."
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
            <Text className="text-white font-medium">Send Message</Text>
          </Pressable>
        </View>

        {/* Other Ways to Reach Us */}
        <View className="mx-5 mt-4 rounded-2xl border border-gray200 bg-white p-4">
          <Text className="text-base font-semibold text-black mb-4">Other Ways to Reach Us</Text>

          <View className="flex-row items-start gap-x-3 mb-4">
            <Feather name="mail" size={18} color="#111827" />
            <View className="flex-1">
              <Text className="text-sm font-medium text-gray900">Email Support</Text>
              <Text className="text-sm text-gray600">goswingapp@gmail.com</Text>
              <Text className="text-xs text-gray500 mt-0.5">Response within 24 hours</Text>
            </View>
          </View>

          <View className="flex-row items-start gap-x-3 mb-4">
            <Feather name="phone" size={18} color="#111827" />
            <View className="flex-1">
              <Text className="text-sm font-medium text-gray900">Phone Support</Text>
              <Text className="text-sm text-gray600">+1 (555) 123-HELP</Text>
              <Text className="text-xs text-gray500 mt-0.5">Mon-Fri, 9 AM - 6 PM EST</Text>
            </View>
          </View>

          <View className="flex-row items-start gap-x-3">
            <Feather name="message-circle" size={18} color="#111827" />
            <View className="flex-1">
              <Text className="text-sm font-medium text-gray900">Live Chat</Text>
              <Text className="text-sm text-gray600">Available in-app</Text>
              <Text className="text-xs text-gray500 mt-0.5">Mon-Fri, 9 AM - 9 PM EST</Text>
            </View>
          </View>
        </View>

        {/* Report a Bug */}
        <View className="mx-5 mt-4 rounded-2xl border border-orange-200 bg-orange-50 p-4">
          <View className="flex-row items-center gap-x-2 mb-2">
            <Feather name="settings" size={18} color="#F97316" />
            <Text className="text-base font-semibold text-orange-600">Found a Bug?</Text>
          </View>
          <Text className="text-sm text-orange-700 mb-3">
            Help us improve GoSwing by reporting bugs or issues you encounter.
          </Text>
          <Pressable
            onPress={handleReportBug}
            className="self-start border border-gray300 bg-white rounded-xl px-4 py-2 active:opacity-80"
          >
            <Text className="text-sm font-medium text-gray900">Report Bug</Text>
          </Pressable>
        </View>

        {/* System Status */}
        <View className="mx-5 mt-4 mb-16 rounded-2xl border border-gray200 bg-white p-4">
          <Text className="text-base font-semibold text-black mb-3">System Status</Text>
          <View className="flex-row items-center gap-x-2">
            <View className="w-2.5 h-2.5 rounded-full bg-green-500" />
            <Text className="text-sm text-gray900">All systems operational</Text>
          </View>
          <Pressable className="mt-2 active:opacity-70">
            <Text className="text-sm text-gray600 underline">View detailed status page</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}