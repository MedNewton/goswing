// pages/PrivacySecurityPage.tsx
import React, { type ReactElement } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

type PrivacySecurityPageProps = Readonly<{
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
      <Text className="text-sm text-gray700 flex-1">{children}</Text>
    </View>
  );
}

function SubSection({ title, children }: { title: string; children: React.ReactNode }): ReactElement {
  return (
    <View className="mt-3">
      <Text className="text-sm font-medium text-gray900 mb-1">{title}</Text>
      {children}
    </View>
  );
}

export default function PrivacySecurityPage({ onBack }: PrivacySecurityPageProps): ReactElement {
  const insets = useSafeAreaInsets();

  return (
    <SafeAreaView edges={['left', 'right']} className="flex-1 bg-white pb-16">
      {/* Header */}
      <View className="flex-row items-center px-5 py-4 border-b border-gray200">
        <Pressable onPress={onBack} className="mr-3 active:opacity-70">
          <Feather name="arrow-left" size={24} color="#111827" />
        </Pressable>
        <Text className="text-lg font-semibold text-black">Privacy Policy</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 16) + 20 }}
      >
        {/* Last Updated */}
        <Text className="text-center text-sm text-gray500 mt-4">
          Last updated: August 30, 2025
        </Text>

        {/* Your Privacy Matters */}
        <SectionCard>
          <SectionTitle icon="shield" title="Your Privacy Matters" />
          <Text className="text-sm text-gray700 leading-5">
            At GoSwing, we are committed to protecting your privacy and ensuring the security of your personal information. This privacy policy explains how we collect, use, and safeguard your data when you use our services.
          </Text>
        </SectionCard>

        {/* Information We Collect */}
        <SectionCard>
          <SectionTitle icon="database" title="Information We Collect" />
          
          <SubSection title="Personal Information">
            <BulletPoint>Name, email address, and phone number</BulletPoint>
            <BulletPoint>Profile picture and biographical information</BulletPoint>
            <BulletPoint>Payment information (processed securely by our partners)</BulletPoint>
            <BulletPoint>Location data when you grant permission</BulletPoint>
          </SubSection>

          <SubSection title="Usage Information">
            <BulletPoint>Events you view, save, and attend</BulletPoint>
            <BulletPoint>Search queries and preferences</BulletPoint>
            <BulletPoint>App usage patterns and interactions</BulletPoint>
            <BulletPoint>Device information and IP address</BulletPoint>
          </SubSection>
        </SectionCard>

        {/* How We Use Your Information */}
        <SectionCard>
          <SectionTitle icon="eye" title="How We Use Your Information" />
          <BulletPoint>
            <Text className="font-medium">Service Provision:</Text> To provide and improve our event discovery services
          </BulletPoint>
          <BulletPoint>
            <Text className="font-medium">Personalization:</Text> To recommend events and content tailored to your interests
          </BulletPoint>
          <BulletPoint>
            <Text className="font-medium">Communication:</Text> To send you important updates, notifications, and marketing (with your consent)
          </BulletPoint>
          <BulletPoint>
            <Text className="font-medium">Safety & Security:</Text> To protect against fraud and ensure platform safety
          </BulletPoint>
          <BulletPoint>
            <Text className="font-medium">Analytics:</Text> To understand how our service is used and improve user experience
          </BulletPoint>
        </SectionCard>

        {/* Information Sharing */}
        <SectionCard>
          <SectionTitle icon="users" title="Information Sharing" />
          <Text className="text-sm text-gray700 leading-5 mb-2">
            We do not sell your personal information. We may share your information only in these limited circumstances:
          </Text>
          <BulletPoint>
            <Text className="font-medium">Event Organizers:</Text> Basic attendee information for events you register for
          </BulletPoint>
          <BulletPoint>
            <Text className="font-medium">Service Providers:</Text> Third-party services that help us operate our platform
          </BulletPoint>
          <BulletPoint>
            <Text className="font-medium">Legal Requirements:</Text> When required by law or to protect our rights
          </BulletPoint>
          <BulletPoint>
            <Text className="font-medium">Business Transfers:</Text> In case of merger, acquisition, or sale of our company
          </BulletPoint>
        </SectionCard>

        {/* Your Rights & Choices */}
        <SectionCard>
          <SectionTitle icon="check-circle" title="Your Rights & Choices" />
          <BulletPoint>
            <Text className="font-medium">Access:</Text> Request a copy of your personal data
          </BulletPoint>
          <BulletPoint>
            <Text className="font-medium">Correction:</Text> Update or correct your information
          </BulletPoint>
          <BulletPoint>
            <Text className="font-medium">Deletion:</Text> Request deletion of your account and data
          </BulletPoint>
          <BulletPoint>
            <Text className="font-medium">Portability:</Text> Export your data in a portable format
          </BulletPoint>
          <BulletPoint>
            <Text className="font-medium">Opt-out:</Text> Unsubscribe from marketing communications
          </BulletPoint>
          <BulletPoint>
            <Text className="font-medium">Restrict Processing:</Text> Limit how we use your data
          </BulletPoint>
        </SectionCard>

        {/* Data Security */}
        <SectionCard>
          <SectionTitle icon="lock" title="Data Security" />
          <Text className="text-sm text-gray700 leading-5">
            We implement industry-standard security measures to protect your data, including encryption, secure servers, and regular security audits. However, no method of transmission over the internet is 100% secure, and we cannot guarantee absolute security.
          </Text>
        </SectionCard>

        {/* International Data Transfers */}
        <SectionCard>
          <SectionTitle icon="globe" title="International Data Transfers" />
          <Text className="text-sm text-gray700 leading-5">
            Your information may be transferred to and processed in countries other than your own. We ensure appropriate safeguards are in place for such transfers in accordance with applicable data protection laws.
          </Text>
        </SectionCard>

        {/* Children's Privacy */}
        <SectionCard>
          <SectionTitle icon="alert-circle" title="Children's Privacy" />
          <Text className="text-sm text-gray700 leading-5">
            Our service is not directed to children under 13. We do not knowingly collect personal information from children under 13. If you become aware that a child has provided us with personal information, please contact us immediately.
          </Text>
        </SectionCard>

        {/* Contact Us */}
        <SectionCard>
          <SectionTitle icon="mail" title="Contact Us" />
          <Text className="text-sm text-gray700 leading-5 mb-2">
            If you have questions about this privacy policy or your personal data, contact us at:
          </Text>
          <View className="mt-2">
            <Text className="text-sm text-gray700">
              <Text className="font-medium">Email:</Text> privacy@goswing.com
            </Text>
            <Text className="text-sm text-gray700 mt-1">
              <Text className="font-medium">Address:</Text> 123 Privacy Street, Tech City, TC 12345
            </Text>
            <Text className="text-sm text-gray700 mt-1">
              <Text className="font-medium">Phone:</Text> +1 (555) 123-PRIVACY
            </Text>
          </View>
        </SectionCard>

        {/* Changes to This Policy */}
        <SectionCard>
          <View className="flex-row items-center gap-x-2 mb-13">
            <Feather name="refresh-cw" size={18} color="#F97316" />
            <Text className="text-base font-semibold text-orange-500">Changes to This Policy</Text>
          </View>
          <Text className="text-sm text-gray700 leading-5">
            We may update this privacy policy from time to time. We will notify you of any material changes by posting the new policy on this page and updating the "Last updated" date. Continued use of our service constitutes acceptance of the updated policy.
          </Text>
        </SectionCard>
      </ScrollView>
    </SafeAreaView>
  );
}