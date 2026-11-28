// screens/profile/components/legal.tsx — sectioned legal text (privacy, terms).
import React, { type ReactElement, type ReactNode } from 'react';
import { Linking, Pressable, Text, View } from 'react-native';
import { Mail, type LucideIcon } from 'lucide-react-native';
import { gs } from '@/theme/colors';
import { Card } from './ui';

export type LegalBullet = string | Readonly<{ label: string; body: string }>;

export type LegalSection = Readonly<{
  title: string;
  body?: string;
  bullets?: ReadonlyArray<LegalBullet>;
  /** Extra titled sub-blocks inside the section. */
  subs?: ReadonlyArray<Readonly<{ title: string; body?: string; bullets?: ReadonlyArray<LegalBullet> }>>;
  footer?: string;
  extra?: ReactNode;
}>;

/** "12. Contact Information" → "Contact Information". */
const stripNumber = (s: string): string => s.replace(/^\s*\d+\.\s*/, '');

function Bullets({ items }: Readonly<{ items: ReadonlyArray<LegalBullet> }>): ReactElement {
  return (
    <View className="mt-1">
      {items.map((b, i) => (
        <View key={i} className="flex-row mt-2 pr-1">
          <View className="h-1.5 w-1.5 rounded-full mt-[9px] mr-3" style={{ backgroundColor: gs.violet }} />
          <Text className="flex-1 text-[15px] text-subtle leading-[22px]">
            {typeof b === 'string' ? (
              b
            ) : (
              <>
                <Text className="font-bold text-ink">{b.label}</Text> {b.body}
              </>
            )}
          </Text>
        </View>
      ))}
    </View>
  );
}

export function LegalHero({ icon: Icon, title, body }: Readonly<{ icon: LucideIcon; title: string; body: string }>): ReactElement {
  return (
    <View className="mx-5 mt-4 rounded-[24px] p-4 flex-row" style={{ backgroundColor: gs.violetSoft }}>
      <View className="h-11 w-11 rounded-xl items-center justify-center" style={{ backgroundColor: gs.violet }}>
        <Icon size={22} color={gs.white} />
      </View>
      <View className="flex-1 ml-3">
        <Text className="text-[17px] font-extrabold" style={{ color: '#2A1B7A' }}>
          {title}
        </Text>
        <Text className="text-[14px] text-subtle mt-1 leading-[20px]">{body}</Text>
      </View>
    </View>
  );
}

export function LegalSections({ sections }: Readonly<{ sections: ReadonlyArray<LegalSection> }>): ReactElement {
  return (
    <View className="gap-y-3 mt-4">
      {sections.map((s, i) => (
        <Card key={i} className="p-4">
          <View className="flex-row items-center">
            <View className="h-7 w-7 rounded-full items-center justify-center" style={{ backgroundColor: gs.ink }}>
              <Text className="text-[13px] font-extrabold text-white">{i + 1}</Text>
            </View>
            <Text accessibilityRole="header" className="flex-1 ml-2.5 text-[18px] font-extrabold text-ink">
              {stripNumber(s.title)}
            </Text>
          </View>
          {s.body ? <Text className="mt-2.5 text-[15px] text-subtle leading-[22px]">{s.body}</Text> : null}
          {s.bullets ? <Bullets items={s.bullets} /> : null}
          {s.subs?.map((sub, j) => (
            <View key={j} className="mt-3">
              <Text className="text-[15px] font-extrabold text-ink">{sub.title}</Text>
              {sub.body ? <Text className="mt-1 text-[15px] text-subtle leading-[22px]">{sub.body}</Text> : null}
              {sub.bullets ? <Bullets items={sub.bullets} /> : null}
            </View>
          ))}
          {s.extra}
          {s.footer ? <Text className="mt-3 text-[13px] text-muted">{s.footer}</Text> : null}
        </Card>
      ))}
    </View>
  );
}

export function LegalContact({ label, email }: Readonly<{ label: string; email: string }>): ReactElement {
  return (
    <Pressable
      onPress={() => void Linking.openURL(`mailto:${email}`).catch(() => undefined)}
      accessibilityRole="link"
      accessibilityLabel={`${label}, ${email}`}
      className="mt-3 flex-row items-center self-start h-11 px-4 rounded-full"
      style={{ backgroundColor: gs.violetSoft }}
    >
      <Mail size={16} color={gs.violet} />
      <Text className="ml-2 text-[14px] font-bold" style={{ color: gs.violetDark }}>
        {email}
      </Text>
    </Pressable>
  );
}
