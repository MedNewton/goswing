// pages/TermsConditionsPage.tsx
import React, { type ReactElement } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

type TermsConditionsPageProps = Readonly<{
  onBack: () => void;
}>;

function SectionCard({ children }: { children: React.ReactNode }): ReactElement {
  return (
    <View className="mx-5 mt-4 rounded-2xl border border-gray200 bg-white p-4">
      {children}
    </View>
  );
}

function SectionTitle({ icon, title }: { icon: keyof typeof Feather.glyphMap; title: string }): ReactElement {
  return (
    <View className="flex-row items-center gap-x-2 mb-3">
      <Feather name={icon} size={18} color="#111827" />
      <Text className="text-base font-semibold text-black">{title}</Text>
    </View>
  );
}

function BulletPoint({ children }: { children: React.ReactNode }): ReactElement {
  return (
    <View className="flex-row mt-2">
      <Text className="text-gray700 mr-2">•</Text>
      <Text className="text-sm text-gray700 flex-1 leading-5">{children}</Text>
    </View>
  );
}

function TicketPurchaseCard(): ReactElement {
  return (
    <View className="flex-row gap-x-2 mt-3">
      <View className="flex-1 border border-gray200 rounded-xl p-3 items-center">
        <Feather name="check-circle" size={20} color="#22C55E" />
        <Text className="text-xs text-gray700 mt-2 text-center">Instant Confirmation</Text>
      </View>
      <View className="flex-1 border border-gray200 rounded-xl p-3 items-center">
        <Feather name="shield" size={20} color="#3B82F6" />
        <Text className="text-xs text-gray700 mt-2 text-center">Secure Payment</Text>
      </View>
      <View className="flex-1 border border-gray200 rounded-xl p-3 items-center">
        <Feather name="smartphone" size={20} color="#8B5CF6" />
        <Text className="text-xs text-gray700 mt-2 text-center">Digital Tickets</Text>
      </View>
    </View>
  );
}

export default function TermsConditionsPage({ onBack }: TermsConditionsPageProps): ReactElement {
  const insets = useSafeAreaInsets();

  return (
    <SafeAreaView edges={['left', 'right']} className="flex-1 bg-white">
      {/* Header */}
      <View className="flex-row items-center px-5 py-4 border-b border-gray200">
        <Pressable onPress={onBack} className="mr-3 active:opacity-70">
          <Feather name="arrow-left" size={24} color="#111827" />
        </Pressable>
        <Text className="text-lg font-semibold text-black">Terms & Conditions</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 16) + 20 }}
      >
        {/* Last Updated */}
        <Text className="text-center text-sm text-gray500 mt-4">
          Last Updated: August 30, 2025
        </Text>

        {/* Terms of Service */}
        <SectionCard>
          <SectionTitle icon="file-text" title="Terms of Service" />
          <Text className="text-sm text-gray700 leading-5">
            Welcome to GoSwing! These Terms of Service ("Terms") govern your use of our mobile application and services. By using GoSwing, you agree to these terms. Please read them carefully.
          </Text>
        </SectionCard>

        {/* 1. Acceptance of Terms */}
        <SectionCard>
          <Text className="text-base font-semibold text-black mb-3">1. Acceptance of Terms</Text>
          <Text className="text-sm text-gray700 leading-5">
            By accessing or using GoSwing, you agree to be bound by these Terms and our Privacy Policy. If you do not agree to these Terms, you may not use our services. We may update these Terms from time to time, and your continued use constitutes acceptance of any changes.
          </Text>
        </SectionCard>

        {/* 2. Account Registration */}
        <SectionCard>
          <SectionTitle icon="user-plus" title="2. Account Registration" />
          <Text className="text-sm text-gray700 leading-5 mb-2">
            To use certain features of GoSwing, you must create an account. You agree to:
          </Text>
          <BulletPoint>Provide accurate, current, and complete information</BulletPoint>
          <BulletPoint>Maintain and update your information to keep it accurate</BulletPoint>
          <BulletPoint>Keep your password confidential and secure</BulletPoint>
          <BulletPoint>Be responsible for all activities that occur under your account</BulletPoint>
          <BulletPoint>Notify us immediately of any unauthorized use of your account</BulletPoint>
        </SectionCard>

        {/* 3. Use of Services */}
        <SectionCard>
          <Text className="text-base font-semibold text-black mb-3">3. Use of Services</Text>
          
          <Text className="text-sm font-medium text-gray900 mb-2">Permitted Use</Text>
          <Text className="text-sm text-gray700 leading-5 mb-3">
            You may use GoSwing to discover, save, and manage event tickets for personal, non-commercial purposes.
          </Text>

          <Text className="text-sm font-medium text-gray900 mb-2">Prohibited Activities</Text>
          <BulletPoint>Using the service for any illegal purpose or in violation of any laws</BulletPoint>
          <BulletPoint>Impersonating any person or entity or providing false information</BulletPoint>
          <BulletPoint>Interfering with or disrupting the service or servers</BulletPoint>
          <BulletPoint>Attempting to gain unauthorized access to any accounts or systems</BulletPoint>
          <BulletPoint>Using any automated means to access the service without permission</BulletPoint>
          <BulletPoint>Posting inappropriate or harmful content</BulletPoint>
        </SectionCard>

        {/* 4. Ticket Purchases */}
        <SectionCard>
          <Text className="text-base font-semibold text-black mb-3">4. Ticket Purchases</Text>
          <TicketPurchaseCard />
          <View className="mt-4">
            <BulletPoint>All ticket sales are subject to availability and event organizer policies</BulletPoint>
            <BulletPoint>Prices are clearly displayed and include applicable fees</BulletPoint>
            <BulletPoint>Payment is processed securely through third-party payment processors</BulletPoint>
            <BulletPoint>Refund policies vary by event and are set by organizers</BulletPoint>
            <BulletPoint>You are responsible for reviewing ticket terms before purchase</BulletPoint>
            <BulletPoint>Tickets are non-transferable unless specifically allowed</BulletPoint>
          </View>
        </SectionCard>

        {/* 5. Intellectual Property */}
        <SectionCard>
          <Text className="text-base font-semibold text-black mb-3">5. Intellectual Property</Text>
          <Text className="text-sm text-gray700 leading-5">
            GoSwing and its content are protected by copyright, trademark, and other intellectual property laws. You may not copy, modify, distribute, or create derivative works without our express permission. Event organizers retain rights to their event content and materials.
          </Text>
        </SectionCard>

        {/* 6. User-Generated Content */}
        <SectionCard>
          <Text className="text-base font-semibold text-black mb-3">6. User-Generated Content</Text>
          <Text className="text-sm text-gray700 leading-5 mb-2">
            You may submit reviews, photos, and other content ("User Content"). By submitting User Content, you grant us a non-exclusive, worldwide, royalty-free license to use, display, and distribute such content. You represent that:
          </Text>
          <BulletPoint>You have the right to submit the content you post</BulletPoint>
          <BulletPoint>Your content does not violate any laws or third-party rights</BulletPoint>
          <BulletPoint>Your content is not false, misleading, defamatory, or harmful</BulletPoint>
        </SectionCard>

        {/* 7. Disclaimers & Limitations */}
        <SectionCard>
          <SectionTitle icon="alert-triangle" title="7. Disclaimers & Limitations" />
          <Text className="text-sm text-gray700 leading-5 mb-2">
            GoSwing is provided "as is" without warranties of any kind. We do not guarantee:
          </Text>
          <BulletPoint>Uninterrupted or error-free service</BulletPoint>
          <BulletPoint>Accuracy of all information provided by event organizers</BulletPoint>
          <BulletPoint>Quality or safety of events listed on our platform</BulletPoint>
          <BulletPoint>Availability of tickets or events</BulletPoint>
        </SectionCard>

        {/* 8. Limitation of Liability */}
        <SectionCard>
          <Text className="text-base font-semibold text-black mb-3">8. Limitation of Liability</Text>
          <Text className="text-sm text-gray700 leading-5">
            To the maximum extent permitted by law, GoSwing shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of our services. Our total liability shall not exceed the amount you paid us in the 12 months preceding the claim.
          </Text>
        </SectionCard>

        {/* 9. Indemnification */}
        <SectionCard>
          <Text className="text-base font-semibold text-black mb-3">9. Indemnification</Text>
          <Text className="text-sm text-gray700 leading-5">
            You agree to defend, indemnify, and hold harmless GoSwing and its officers, directors, employees, and agents from any claims, damages, losses, or expenses arising from your use of our services, your User Content, or violation of these Terms.
          </Text>
        </SectionCard>

        {/* 10. Termination */}
        <SectionCard>
          <Text className="text-base font-semibold text-black mb-3">10. Termination</Text>
          <Text className="text-sm text-gray700 leading-5">
            We may suspend or terminate your account at any time for violations of these Terms or other reasons. You may terminate your account by contacting us or deleting the app. Termination does not affect existing ticket purchases or obligations that survive termination.
          </Text>
        </SectionCard>

        {/* 11. Governing Law */}
        <SectionCard>
          <Text className="text-base font-semibold text-black mb-3">11. Governing Law</Text>
          <Text className="text-sm text-gray700 leading-5">
            These Terms are governed by the laws of the State of California, USA, without regard to conflict of law principles. Any disputes will be resolved through binding arbitration in accordance with the rules of the American Arbitration Association.
          </Text>
        </SectionCard>

        {/* 12. Contact Information */}
        <SectionCard>
          <Text className="text-base font-semibold text-black mb-3">12. Contact Information</Text>
          <Text className="text-sm text-gray700 leading-5 mb-3">
            If you have questions about these Terms, please contact us at:
          </Text>
          <View>
            <Text className="text-sm text-gray700">
              <Text className="font-medium">Email:</Text> goswingapp@gmail.com
            </Text>
            <Text className="text-sm text-gray700 mt-1">
              <Text className="font-medium">Address:</Text> 123 Legal Street, Tech City, TC 12345
            </Text>
            <Text className="text-sm text-gray700 mt-1">
              <Text className="font-medium">Phone:</Text> +1 (555) 123-LEGAL
            </Text>
          </View>
        </SectionCard>

        {/* Changes to Terms */}
        <SectionCard>
          <View className="flex-row items-center gap-x-2 mb-3">
            <Feather name="refresh-cw" size={18} color="#F97316" />
            <Text className="text-base font-semibold text-orange-500">Changes to Terms</Text>
          </View>
          <Text className="text-sm text-gray700 leading-5">
            We reserve the right to modify these Terms at any time. We will notify you of material changes by posting the updated Terms in the app and updating the "Last Updated" date. Your continued use of GoSwing after such changes constitutes acceptance of the new Terms.
          </Text>
        </SectionCard>

        {/* Effective Date Footer */}
        <View className="mt-6 mb-14 items-center">
          <Text className="text-xs text-gray500">These Terms are effective as of August 30, 2025</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}