// pages/EventDetailsPage.tsx
import React, { useMemo, useState, type ReactElement } from 'react';
import {
  Dimensions,
  Image,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import { getEvents } from '@/data/loaders';

export type EventDetailsPageProps = Readonly<{
  eventId: string;
  initialTab?: 'about' | 'offers' | 'upcoming';
  onBack?: () => void;
  onBook?: (eventId: string) => void;
}>;

const cx = (...c: ReadonlyArray<string | null | undefined | false>): string =>
  c.filter(Boolean).join(' ');

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const HERO_HEIGHT = Math.max(260, Math.min(340, Math.round(SCREEN_WIDTH * 0.62)));

function formatDateTime(
  iso?: string | null
): { date: string; time: string } | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const date = d.toLocaleDateString(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  const time = d.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });
  return { date, time };
}

export default function EventDetailsPage({
  eventId,
  initialTab = 'about',
  onBack,
  onBook,
}: EventDetailsPageProps): ReactElement {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<'about' | 'offers' | 'upcoming'>(initialTab);

  const event = useMemo(
    () => getEvents().find((e) => e.id === eventId) ?? null,
    [eventId]
  );

  if (!event) {
    return (
      <SafeAreaView edges={['top', 'left', 'right']} className="flex-1 bg-white items-center justify-center">
        <Text className="text-gray700">Event not found.</Text>
      </SafeAreaView>
    );
  }

  const dt = formatDateTime(event.startsAtIso);
  const bottomPad = (insets.bottom || 0) + 140;

  return (
    <SafeAreaView edges={['left', 'right']} className="flex-1 bg-white">
      <View className="flex-1">
        <View className="relative" style={{ width: SCREEN_WIDTH, height: HERO_HEIGHT }}>
          {event.imageUrl ? (
            <Image source={{ uri: event.imageUrl }} className="w-full h-full" resizeMode="cover" />
          ) : (
            <View className="w-full h-full bg-gray200" />
          )}

          <View className="absolute left-3 top-3 flex-row items-center" >
            <CircleIcon onPress={onBack}>
              <Feather name="chevron-left" size={20} color="#111827" />
            </CircleIcon>
          </View>

          <View className="absolute right-3 top-3 flex-row items-center gap-x-2">
            <CircleIcon onPress={() => {}}>
              <Feather name="heart" size={18} color="#111827" />
            </CircleIcon>
            <CircleIcon onPress={() => {}}>
              <Feather name="share-2" size={18} color="#111827" />
            </CircleIcon>
          </View>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerClassName="pb-40"
          contentContainerStyle={{ paddingBottom: bottomPad }}
        >
          <View className="px-5 mt-4">
            <Card variant="outlined" padding="md">
              <View className="flex-row items-start gap-x-2">
                <Feather name="info" size={14} color="#6B7280" style={{ marginTop: 2 }} />
                <View className="flex-1">
                  <Text className="text-gray800 font-medium">Demo Active:</Text>
                  <Text className="text-gray700 mt-1">
                    ✓ Tickets Purchased ✓ Checked In – Look for colored icons in the header!
                  </Text>
                </View>
              </View>
            </Card>
          </View>

          <View className="px-5 mt-4">
            <Text className="text-xl font-semibold text-black">{event.title}</Text>

            <View className="mt-3 flex-row items-center gap-x-3">
              {dt ? (
                <>
                  <View className="flex-row items-center gap-x-1">
                    <Feather name="calendar" size={16} color="#6B7280" />
                    <Text className="text-sm text-gray700">{dt.date}</Text>
                  </View>
                  <View className="flex-row items-center gap-x-1">
                    <Feather name="clock" size={16} color="#6B7280" />
                    <Text className="text-sm text-gray700">{dt.time}</Text>
                  </View>
                </>
              ) : null}
            </View>

            <View className="mt-2 flex-row items-center gap-x-1">
              <Feather name="map-pin" size={16} color="#6B7280" />
              <Text className="text-sm text-gray700">
                {event.venue}
                {event.city ? `, ${event.city}` : ''}
              </Text>
            </View>
          </View>

          <View className="px-5 mt-4 flex-row items-center gap-x-8">
            <ActionChip bg="bg-black" icon="music" label="Suggest Songs" darkIcon />
            <ActionChip bg="bg-indigo-600" icon="camera" label="Take Story" />
            <ActionChip bg="bg-amber-400" icon="gift" label="Give Reward" darkText />
          </View>

          <View className="px-5 mt-4">
            <Card variant="outlined" padding="md">
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center gap-x-3">
                  <View className="h-10 w-10 rounded-full bg-gray200 items-center justify-center">
                    <Text className="text-gray800 font-medium">
                      {event.organizer.slice(0, 2).toUpperCase()}
                    </Text>
                  </View>
                  <View>
                    <Text className="text-gray900 font-medium">{event.organizer}</Text>
                    <View className="flex-row items-center gap-x-1">
                      <Feather name="star" size={14} color="#F59E0B" />
                      <Text className="text-xs text-gray600">4.8 · 1.2k followers</Text>
                    </View>
                  </View>
                </View>
                <Pressable className="rounded-full border border-gray300 px-3 py-1.5 bg-white">
                  <Text className="text-sm text-gray800">Follow</Text>
                </Pressable>
              </View>
            </Card>
          </View>

          <View className="px-5 mt-5">
            <View className="flex-row items-center rounded-full bg-gray100 p-1 border border-gray200">
              <TabPill label="About" selected={activeTab === 'about'} onPress={() => setActiveTab('about')} />
              <TabPill label="Offers" selected={activeTab === 'offers'} onPress={() => setActiveTab('offers')} />
              <TabPill label="Upcoming" selected={activeTab === 'upcoming'} onPress={() => setActiveTab('upcoming')} />
            </View>
          </View>

          {activeTab === 'about' && (
            <>
              <View className="px-5 mt-4">
                <Text className="text-base font-semibold text-black">About This Event</Text>
                <Text className="text-gray700 mt-2">
                  Experience the underground techno scene with international DJs in Paris&apos; most iconic
                  club venue.
                </Text>

                <Text className="text-sm font-semibold text-black mt-4">What&apos;s Included</Text>
                <View className="mt-2 gap-y-1">
                  {[
                    'Live performances by 5+ artists',
                    'Food and beverage vendors',
                    'Free WiFi throughout venue',
                    'Professional sound and lighting',
                  ].map((t) => (
                    <Text key={t} className="text-gray700">
                      • {t}
                    </Text>
                  ))}
                </View>
              </View>

              <View className="px-5 mt-6">
                <Text className="text-base font-semibold text-black">Attendees (420)</Text>
                <View className="mt-2 flex-row items-center flex-wrap gap-2">
                  {['U1', 'U2', 'U3', 'U4', 'U5'].map((u) => (
                    <Badge key={u} label={u} variant="soft" tone="gray" size="sm" />
                  ))}
                  <Text className="text-gray600 ml-1">and 415 others</Text>
                </View>
              </View>

              <View className="px-5 mt-6">
                <View className="flex-row items-center gap-x-2">
                  <Feather name="shield" size={16} color="#6B7280" />
                  <Text className="text-base font-semibold text-black">
                    Cancellation & Refund Policy
                  </Text>
                </View>
                <View className="mt-2 gap-y-2">
                  {[
                    'Free cancellation up to 48 hours before the event',
                    '50% refund for cancellations 24–48 hours before',
                    'No refund for cancellations within 24 hours',
                    'Event cancellation by organizer: Full refund guaranteed',
                    'Weather-related cancellations: Reschedule or full refund',
                  ].map((line) => (
                    <Text key={line} className="text-gray700">
                      • {line}
                    </Text>
                  ))}
                </View>
              </View>

              <SectionHeader title={`More from ${event.organizer}`} action="View all" />
              <View className="px-5 mt-2 gap-y-3">
                {[{ t: 'Jazz Night Under Stars', p: '$45' }, { t: 'New Year Concert', p: '$80' }].map(
                  (r) => (
                    <Card
                      key={r.t}
                      variant="outlined"
                      padding="md"
                      className="flex-row items-center justify-between"
                    >
                      <View>
                        <Text className="text-gray900 font-medium">{r.t}</Text>
                        <View className="mt-1 flex-row items-center gap-x-1">
                          <Feather name="calendar" size={12} color="#6B7280" />
                          <Text className="text-xs text-gray600">Dec 28, 2024 · 8:00 PM</Text>
                        </View>
                      </View>
                      <Badge label={r.p} variant="solid" tone="brand" size="sm" className="rounded-full" />
                    </Card>
                  )
                )}
              </View>

              <View className="mt-5 mx-5 border-t border-gray200" />

              <View className="px-5 mt-4">
                <Text className="text-base font-semibold text-black">Similar Events You Might Like</Text>
                <View className="mt-3 gap-y-3">
                  {[
                    { t: 'Blues Festival Downtown', org: 'Blue Note Events', p: '$35' },
                    { t: 'Rock Concert Series', org: 'Rock City Productions', p: '$55' },
                    { t: 'Electronic Music Night', org: 'EDM Collective', p: '$40' },
                  ].map((s) => (
                    <Card
                      key={s.t}
                      variant="outlined"
                      padding="md"
                      className="flex-row items-center justify-between"
                    >
                      <View>
                        <Text className="text-gray900 font-medium">{s.t}</Text>
                        <Text className="text-xs text-gray500 mt-0.5">{s.org}</Text>
                        <View className="mt-1 flex-row items-center gap-x-1">
                          <Feather name="calendar" size={12} color="#6B7280" />
                          <Text className="text-xs text-gray600">Dec 25, 2024</Text>
                        </View>
                      </View>
                      <Badge label={s.p} variant="solid" tone="brand" size="sm" className="rounded-full" />
                    </Card>
                  ))}
                </View>
              </View>
            </>
          )}

          {activeTab === 'offers' && (
            <View className="px-5 mt-5 gap-y-3">
              {[
                { name: 'Early Bird Ticket', price: '$25', desc: 'Limited stock · Ends soon' },
                { name: 'VIP Pass', price: '$60', desc: 'Front row + lounge access' },
                { name: 'Group Pack (4)', price: '$80', desc: 'Save more with friends' },
              ].map((o) => (
                <Card key={o.name} variant="outlined" padding="md" className="flex-row items-center justify-between">
                  <View>
                    <Text className="text-gray900 font-medium">{o.name}</Text>
                    <Text className="text-xs text-gray500 mt-0.5">{o.desc}</Text>
                  </View>
                  <Badge label={o.price} variant="solid" tone="brand" size="sm" className="rounded-full" />
                </Card>
              ))}
            </View>
          )}

          {activeTab === 'upcoming' && (
            <View className="px-5 mt-5 gap-y-3">
              {[{ t: 'Sunset Set Vol. 2' }, { t: 'Afterparty Night' }].map((u) => (
                <Card key={u.t} variant="outlined" padding="md" className="flex-row items-center justify-between">
                  <View>
                    <Text className="text-gray900 font-medium">{u.t}</Text>
                    <View className="mt-1 flex-row items-center gap-x-1">
                      <Feather name="calendar" size={12} color="#6B7280" />
                      <Text className="text-xs text-gray600">Jan 14, 2025 · 9:00 PM</Text>
                    </View>
                  </View>
                  <Badge label="Remind me" variant="soft" tone="gray" size="sm" className="rounded-full" />
                </Card>
              ))}
            </View>
          )}
        </ScrollView>

        <View
          className="absolute inset-x-5"
          style={{ bottom: (insets.bottom || 0) + 72 }}
        >
          <Pressable
            onPress={() => onBook?.(event.id)}
            className="rounded-2xl bg-black px-6 py-4 items-center justify-center"
            style={{
              shadowColor: '#000',
              shadowOpacity: 0.25,
              shadowRadius: 12,
              shadowOffset: { width: 0, height: 6 },
              elevation: 8,
            }}
          >
            <Text className="text-white text-base font-semibold">Book Now</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

function CircleIcon({
  children,
  onPress,
}: {
  children: ReactElement;
  onPress?: () => void;
}): ReactElement {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      className="h-9 w-9 rounded-full bg-white/95 items-center justify-center border border-gray200"
      hitSlop={10}
    >
      {children}
    </Pressable>
  );
}

function ActionChip({
  bg,
  icon,
  label,
  darkText,
  darkIcon,
}: {
  bg: 'bg-black' | 'bg-indigo-600' | 'bg-amber-400';
  icon: keyof typeof Feather.glyphMap;
  label: string;
  darkText?: boolean;
  darkIcon?: boolean;
}): ReactElement {
  return (
    <View className={cx('flex-row items-center gap-x-2 rounded-xl px-3 py-2', bg)}>
      <Feather name={icon} size={14} color={darkIcon ? '#111827' : '#FFFFFF'} />
      <Text className={cx('text-sm', darkText ? 'text-black' : 'text-white')}>{label}</Text>
    </View>
  );
}

function SectionHeader({
  title,
  action,
}: {
  title: string;
  action?: string;
}): ReactElement {
  return (
    <View className="px-5 mt-6 flex-row items-center justify-between">
      <Text className="text-base font-semibold text-black">{title}</Text>
      {action ? (
        <View className="flex-row items-center">
          <Text className="text-sm text-gray600 mr-1">{action}</Text>
          <Feather name="chevron-right" size={16} color="#6B7280" />
        </View>
      ) : null}
    </View>
  );
}

function TabPill({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}): ReactElement {
  return (
    <Pressable
      onPress={onPress}
      className={cx(
        'px-0 py-1.5 rounded-full flex-1 items-center',
        selected ? 'bg-white border border-gray300' : ''
      )}
    >
      <Text className={selected ? 'text-brand font-medium' : 'text-gray700 font-medium'}>
        {label}
      </Text>
    </Pressable>
  );
}
