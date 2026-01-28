// pages/OrganizerProfilePage.tsx
import React, { useEffect, useMemo, useState, useCallback, type ReactElement } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  Pressable,
  ActivityIndicator,
  Dimensions,
  Alert,
  RefreshControl,
  Animated,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather, FontAwesome } from '@expo/vector-icons';

import Card from '@/components/ui/Card';
import {
  getOrganizerById,
  getOrganizerEvents,
  getOrganizerGallery,
  getOrganizerReviews,
  getSimilarOrganizers,
  followOrganizer,
  unfollowOrganizer,
  type OrganizerWithStats,
  type OrganizerEvent,
  type OrganizerGalleryImage,
  type OrganizerReview,
  type SimilarOrganizer,
} from '@/lib/supabase/organizers';

const cx = (...c: ReadonlyArray<string | null | undefined | false>): string =>
  c.filter(Boolean).join(' ');

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const HERO_HEIGHT = Math.max(240, Math.min(320, Math.round(SCREEN_WIDTH * 0.62)));

type OrganizerTab = 'about' | 'events' | 'gallery' | 'reviews' | 'similar';

export type OrganizerProfilePageProps = Readonly<{
  organizerId: string;
  organizerName?: string;
  onBack?: () => void;
}>;

function formatCompactNumber(n: number): string {
  if (!Number.isFinite(n)) return '0';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(n >= 10_000 ? 0 : 1)}k`;
  return String(Math.round(n));
}

function formatDateTime(iso?: string | null): { date: string; time: string } | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const date = d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
  const time = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  return { date, time };
}

function formatDateShort(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function getInitials(label: string): string {
  const parts = label.trim().split(' ').filter(Boolean);
  if (parts.length === 0) return 'OR';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase();
}

function errorMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  return 'Something went wrong.';
}

/* ─────────────────────────────────────────────────────────────
   Skeleton Components for faster perceived loading
───────────────────────────────────────────────────────────── */

function SkeletonBox({
  width,
  height,
  rounded = 'md',
  className = '',
}: {
  width?: number | string;
  height: number;
  rounded?: 'sm' | 'md' | 'lg' | 'full';
  className?: string;
}): ReactElement {
  const roundedClass = {
    sm: 'rounded',
    md: 'rounded-lg',
    lg: 'rounded-2xl',
    full: 'rounded-full',
  }[rounded];

  return (
    <View
      className={cx('bg-gray200 animate-pulse', roundedClass, className)}
      style={{ width, height }}
    />
  );
}

function CardSkeleton(): ReactElement {
  return (
    <Card variant="outlined" padding="md" className="mb-4">
      <SkeletonBox height={20} width="40%" rounded="md" />
      <View className="mt-3">
        <SkeletonBox height={14} width="100%" rounded="sm" className="mb-2" />
        <SkeletonBox height={14} width="80%" rounded="sm" className="mb-2" />
        <SkeletonBox height={14} width="60%" rounded="sm" />
      </View>
    </Card>
  );
}

function EventCardSkeleton(): ReactElement {
  return (
    <Card variant="outlined" padding="md" className="mt-3">
      <View className="flex-row items-start gap-x-3">
        <SkeletonBox height={80} width={80} rounded="lg" />
        <View className="flex-1">
          <SkeletonBox height={18} width="70%" rounded="sm" className="mb-2" />
          <SkeletonBox height={14} width="50%" rounded="sm" className="mb-2" />
          <SkeletonBox height={14} width="60%" rounded="sm" className="mb-2" />
          <SkeletonBox height={14} width="40%" rounded="sm" />
        </View>
      </View>
    </Card>
  );
}

function GallerySkeleton(): ReactElement {
  return (
    <View className="flex-row flex-wrap justify-between">
      {[1, 2, 3, 4].map((i) => (
        <View key={i} style={{ width: '48%' }} className="mb-3">
          <SkeletonBox height={SCREEN_WIDTH * 0.48 - 20} width="100%" rounded="lg" />
        </View>
      ))}
    </View>
  );
}

function ReviewSkeleton(): ReactElement {
  return (
    <Card variant="outlined" padding="md" className="mt-3">
      <View className="flex-row items-center gap-x-3 mb-3">
        <SkeletonBox height={40} width={40} rounded="full" />
        <SkeletonBox height={16} width={100} rounded="sm" />
      </View>
      <SkeletonBox height={14} width="100%" rounded="sm" className="mb-2" />
      <SkeletonBox height={14} width="80%" rounded="sm" />
    </Card>
  );
}

/* ─────────────────────────────────────────────────────────────
   UI Components
───────────────────────────────────────────────────────────── */

function StatItem({
  icon,
  iconColor = '#6B7280',
  value,
  label,
}: {
  icon: keyof typeof Feather.glyphMap;
  iconColor?: string;
  value: string;
  label: string;
}): ReactElement {
  return (
    <View className="flex-1 items-center">
      <View className="flex-row items-center gap-x-1">
        <Feather name={icon} size={16} color={iconColor} />
        <Text className="text-base font-semibold text-black">{value}</Text>
      </View>
      <Text className="text-xs text-gray500 mt-1">{label}</Text>
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
        'px-2 py-1.5 rounded-full flex-1 items-center',
        selected ? 'bg-white border border-gray300 shadow-sm' : '',
      )}
    >
      <Text className={selected ? 'text-sm text-black font-semibold' : 'text-sm text-gray600'}>
        {label}
      </Text>
    </Pressable>
  );
}

function Chip({ label }: { label: string }): ReactElement {
  return (
    <View className="px-3 py-1.5 rounded-full bg-gray100 border border-gray200 mr-2 mb-2">
      <Text className="text-xs text-gray700">{label}</Text>
    </View>
  );
}

function InfoRow({
  icon,
  label,
}: {
  icon: keyof typeof Feather.glyphMap;
  label: string;
}): ReactElement {
  return (
    <View className="flex-row items-center gap-x-3 mt-2">
      <Feather name={icon} size={16} color="#6B7280" />
      <Text className="text-sm text-gray700">{label}</Text>
    </View>
  );
}

function MetricItem({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  value: string;
}): ReactElement {
  return (
    <View className="flex-1 flex-row items-start gap-x-3">
      <View className="h-10 w-10 rounded-full bg-gray100 items-center justify-center">
        <Feather name={icon} size={18} color="#374151" />
      </View>
      <View>
        <Text className="text-xs text-gray500">{label}</Text>
        <Text className="text-base font-semibold text-black mt-0.5">{value}</Text>
      </View>
    </View>
  );
}

function OrganizerEventCard({ item }: { item: OrganizerEvent }): ReactElement {
  const dt = useMemo(() => formatDateTime(item.startsAt), [item.startsAt]);

  return (
    <Card variant="outlined" padding="md" className="mt-3">
      <View className="flex-row items-start gap-x-3">
        {item.imageUrl ? (
          <Image
            source={{ uri: item.imageUrl }}
            className="h-20 w-20 rounded-2xl bg-gray100"
            resizeMode="cover"
          />
        ) : (
          <View className="h-20 w-20 rounded-2xl bg-gray100 items-center justify-center">
            <Feather name="image" size={20} color="#9CA3AF" />
          </View>
        )}

        <View className="flex-1">
          <Text className="text-base font-semibold text-black" numberOfLines={2}>{item.title}</Text>
          <View className="mt-1 flex-row items-center gap-x-2">
            <Feather name="calendar" size={14} color="#6B7280" />
            <Text className="text-sm text-gray600">{dt?.date ?? 'TBA'}</Text>
            <Feather name="clock" size={14} color="#6B7280" />
            <Text className="text-sm text-gray600">{dt?.time ?? ''}</Text>
          </View>
          <View className="mt-1 flex-row items-center gap-x-2">
            <Feather name="map-pin" size={14} color="#6B7280" />
            <Text className="text-sm text-gray600" numberOfLines={1}>
              {item.venue ?? 'Venue TBA'}
              {item.city ? `, ${item.city}` : ''}
            </Text>
          </View>
          <View className="mt-2 flex-row items-center justify-between">
            <View className="flex-row items-center gap-x-2">
              <Feather name="users" size={14} color="#6B7280" />
              <Text className="text-sm text-gray600">{formatCompactNumber(item.attendeeCount)}</Text>
            </View>
            {item.priceLabel ? (
              <View className="rounded-full border border-gray200 px-3 py-1 bg-gray50">
                <Text className="text-sm font-medium text-gray700">{item.priceLabel}</Text>
              </View>
            ) : null}
          </View>
        </View>
      </View>
    </Card>
  );
}

function StarRating({ rating, size = 14 }: { rating: number; size?: number }): ReactElement {
  const stars = [];
  for (let i = 1; i <= 5; i += 1) {
    stars.push(
      <FontAwesome
        key={i}
        name={i <= rating ? 'star' : 'star-o'}
        size={size}
        color="#FBBF24"
        style={{ marginRight: 3 }}
      />,
    );
  }
  return <View className="flex-row">{stars}</View>;
}

function ReviewCard({ review }: { review: OrganizerReview }): ReactElement {
  const name = review.userName ?? 'Anonymous';
  const initials = getInitials(name);

  return (
    <Card variant="outlined" padding="md" className="mt-3">
      <View className="flex-row items-start justify-between">
        <View className="flex-row items-center gap-x-3">
          {review.userAvatarUrl ? (
            <Image
              source={{ uri: review.userAvatarUrl }}
              className="h-10 w-10 rounded-full bg-gray100"
              resizeMode="cover"
            />
          ) : (
            <View className="h-10 w-10 rounded-full bg-gray200 items-center justify-center">
              <Text className="text-xs text-gray600 font-medium">{initials}</Text>
            </View>
          )}
          <View>
            <Text className="text-base font-medium text-black">{name}</Text>
            <Text className="text-xs text-gray500">{formatDateShort(review.createdAt)}</Text>
          </View>
        </View>
        <StarRating rating={Math.round(review.rating)} />
      </View>

      <Text className="text-sm text-gray700 mt-3" numberOfLines={4}>
        {review.comment ?? 'No comment provided.'}
      </Text>
      {review.eventTitle ? (
        <View className="mt-3 self-start rounded-full border border-gray200 px-3 py-1 bg-gray50">
          <Text className="text-xs text-gray600">{review.eventTitle}</Text>
        </View>
      ) : null}
    </Card>
  );
}

function SimilarOrganizerCard({ organizer }: { organizer: SimilarOrganizer }): ReactElement {
  const initials = getInitials(organizer.name);
  return (
    <Card variant="outlined" padding="md" className="mt-3">
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-x-3 flex-1">
          {organizer.logoUrl ? (
            <Image
              source={{ uri: organizer.logoUrl }}
              className="h-14 w-14 rounded-full bg-gray100"
              resizeMode="cover"
            />
          ) : (
            <View className="h-14 w-14 rounded-full bg-gray200 items-center justify-center">
              <Text className="text-sm text-gray600 font-medium">{initials}</Text>
            </View>
          )}
          <View className="flex-1">
            <Text className="text-base font-semibold text-black" numberOfLines={1}>{organizer.name}</Text>
            <View className="flex-row items-center gap-x-3 mt-1">
              <View className="flex-row items-center gap-x-1">
                <FontAwesome name="star" size={12} color="#FBBF24" />
                <Text className="text-sm text-gray600">{organizer.avgRating.toFixed(1)}</Text>
              </View>
              <View className="flex-row items-center gap-x-1">
                <Feather name="calendar" size={12} color="#6B7280" />
                <Text className="text-sm text-gray600">{organizer.eventCount}</Text>
              </View>
              <View className="flex-row items-center gap-x-1">
                <Feather name="users" size={12} color="#6B7280" />
                <Text className="text-sm text-gray600">{formatCompactNumber(organizer.followerCount)}</Text>
              </View>
            </View>
          </View>
        </View>
        <Pressable className="rounded-full border border-gray300 px-4 py-2 bg-white ml-2">
          <Text className="text-sm font-medium text-gray800">Follow</Text>
        </Pressable>
      </View>
    </Card>
  );
}

/* ─────────────────────────────────────────────────────────────
   Main Component
───────────────────────────────────────────────────────────── */

export default function OrganizerProfilePage({
  organizerId,
  organizerName,
  onBack,
}: OrganizerProfilePageProps): ReactElement {
  const insets = useSafeAreaInsets();

  const [activeTab, setActiveTab] = useState<OrganizerTab>('about');
  const [organizer, setOrganizer] = useState<OrganizerWithStats | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);

  // Main loading state (only for organizer info)
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Lazy-loaded tab data with individual loading states
  const [events, setEvents] = useState<{
    upcoming: ReadonlyArray<OrganizerEvent>;
    past: ReadonlyArray<OrganizerEvent>;
    loaded: boolean;
    loading: boolean;
  }>({ upcoming: [], past: [], loaded: false, loading: false });

  const [gallery, setGallery] = useState<{
    items: ReadonlyArray<OrganizerGalleryImage>;
    loaded: boolean;
    loading: boolean;
  }>({ items: [], loaded: false, loading: false });

  const [reviews, setReviews] = useState<{
    items: ReadonlyArray<OrganizerReview>;
    loaded: boolean;
    loading: boolean;
  }>({ items: [], loaded: false, loading: false });

  const [similar, setSimilar] = useState<{
    items: ReadonlyArray<SimilarOrganizer>;
    loaded: boolean;
    loading: boolean;
  }>({ items: [], loaded: false, loading: false });

  // Load organizer basic info
  const loadOrganizer = useCallback(async (isRefresh = false) => {
    if (!organizerId) {
      setError('Missing organizer id.');
      return;
    }

    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const org = await getOrganizerById(organizerId);
      setOrganizer(org);
      setIsFollowing(Boolean(org?.isFollowing));

      // Reset tab data on refresh
      if (isRefresh) {
        setEvents({ upcoming: [], past: [], loaded: false, loading: false });
        setGallery({ items: [], loaded: false, loading: false });
        setReviews({ items: [], loaded: false, loading: false });
        setSimilar({ items: [], loaded: false, loading: false });
      }
    } catch (e: unknown) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [organizerId]);

  // Lazy load events
  const loadEvents = useCallback(async () => {
    if (events.loaded || events.loading || !organizerId) return;

    setEvents((prev) => ({ ...prev, loading: true }));
    try {
      const [upcoming, past] = await Promise.all([
        getOrganizerEvents(organizerId, 'upcoming'),
        getOrganizerEvents(organizerId, 'past'),
      ]);
      setEvents({ upcoming, past, loaded: true, loading: false });
    } catch {
      setEvents((prev) => ({ ...prev, loading: false }));
    }
  }, [organizerId, events.loaded, events.loading]);

  // Lazy load gallery
  const loadGallery = useCallback(async () => {
    if (gallery.loaded || gallery.loading || !organizerId) return;

    setGallery((prev) => ({ ...prev, loading: true }));
    try {
      const items = await getOrganizerGallery(organizerId);
      setGallery({ items, loaded: true, loading: false });
    } catch {
      setGallery((prev) => ({ ...prev, loading: false }));
    }
  }, [organizerId, gallery.loaded, gallery.loading]);

  // Lazy load reviews
  const loadReviews = useCallback(async () => {
    if (reviews.loaded || reviews.loading || !organizerId) return;

    setReviews((prev) => ({ ...prev, loading: true }));
    try {
      const items = await getOrganizerReviews(organizerId);
      setReviews({ items, loaded: true, loading: false });
    } catch {
      setReviews((prev) => ({ ...prev, loading: false }));
    }
  }, [organizerId, reviews.loaded, reviews.loading]);

  // Lazy load similar
  const loadSimilar = useCallback(async () => {
    if (similar.loaded || similar.loading || !organizerId) return;

    setSimilar((prev) => ({ ...prev, loading: true }));
    try {
      const items = await getSimilarOrganizers(organizerId);
      setSimilar({ items, loaded: true, loading: false });
    } catch {
      setSimilar((prev) => ({ ...prev, loading: false }));
    }
  }, [organizerId, similar.loaded, similar.loading]);

  // Initial load
  useEffect(() => {
    loadOrganizer();
  }, [loadOrganizer]);

  // Load tab data when tab changes
  useEffect(() => {
    if (activeTab === 'events') loadEvents();
    if (activeTab === 'gallery') loadGallery();
    if (activeTab === 'reviews') loadReviews();
    if (activeTab === 'similar') loadSimilar();
  }, [activeTab, loadEvents, loadGallery, loadReviews, loadSimilar]);

  const handleRefresh = useCallback(() => {
    loadOrganizer(true);
  }, [loadOrganizer]);

  const displayName = organizer?.name ?? organizerName ?? 'Organizer';
  const initials = getInitials(displayName);
  const coverUri = organizer?.coverImageUrl ?? null;
  const logoUri = organizer?.logoUrl ?? null;
  const tagline =
    organizer?.tagline ??
    'Creating unforgettable experiences through music, art, and community gatherings';
  const establishedLabel = organizer?.establishedYear
    ? `Est. ${organizer.establishedYear}`
    : null;

  const stats = organizer?.stats;
  const ratingValue = Number.isFinite(stats?.avgRating ?? NaN) ? (stats?.avgRating ?? 0).toFixed(1) : '0.0';
  const reviewsLabel = `${formatCompactNumber(stats?.reviewCount ?? 0)} reviews`;
  const eventsValue = formatCompactNumber(stats?.eventCount ?? 0);
  const followersValue = formatCompactNumber(stats?.followerCount ?? 0);
  const successValue = `${(stats?.successRate ?? 0).toFixed(0)}%`;

  const locationLabel = organizer?.city
    ? organizer?.countryCode
      ? `${organizer.city}, ${organizer.countryCode}`
      : organizer.city
    : 'Location not set';

  const handleToggleFollow = async (): Promise<void> => {
    if (!organizerId) return;
    const next = !isFollowing;
    setIsFollowing(next);
    try {
      if (next) {
        await followOrganizer(organizerId);
      } else {
        await unfollowOrganizer(organizerId);
      }
    } catch (e: unknown) {
      setIsFollowing(!next);
      Alert.alert('Follow failed', errorMessage(e));
    }
  };

  return (
    <SafeAreaView edges={['left', 'right']} className="flex-1 bg-white">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: (insets.bottom || 0) + 32 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#374151"
          />
        }
      >
        {/* Hero Section */}
        <View style={{ height: HERO_HEIGHT }} className="relative">
          {coverUri ? (
            <Image source={{ uri: coverUri }} className="h-full w-full" resizeMode="cover" />
          ) : (
            <View className="h-full w-full bg-gradient-to-b from-gray300 to-gray200" />
          )}
          <View className="absolute inset-0 bg-black/50" />

          {/* Back Button */}
          <View
            className="absolute top-0 left-0 right-0 px-5 flex-row items-center justify-between"
            style={{ paddingTop: insets.top + 8 }}
          >
            <Pressable
              onPress={onBack}
              className="h-10 w-10 rounded-full bg-white/90 items-center justify-center"
              accessibilityRole="button"
            >
              <Feather name="arrow-left" size={18} color="#111827" />
            </Pressable>
            <Pressable className="h-10 w-10 rounded-full bg-white/90 items-center justify-center">
              <Feather name="more-horizontal" size={18} color="#111827" />
            </Pressable>
          </View>

          {/* Profile Info Overlay */}
          <View className="absolute bottom-0 left-0 right-0 px-5 pb-5">
            <View className="flex-row items-end">
              <View className="h-24 w-24 rounded-full border-4 border-white bg-white items-center justify-center overflow-hidden shadow-lg">
                {logoUri ? (
                  <Image source={{ uri: logoUri }} className="h-full w-full" resizeMode="cover" />
                ) : (
                  <Text className="text-lg text-gray600 font-bold">{initials}</Text>
                )}
              </View>
              <View className="ml-4 flex-1 pb-1">
                <View className="flex-row items-center gap-x-2">
                  <Text className="text-white text-xl font-bold" numberOfLines={1}>{displayName}</Text>
                  {organizer?.isVerified ? (
                    <View className="bg-blue-500 rounded-full p-0.5">
                      <Feather name="check" size={12} color="#FFFFFF" />
                    </View>
                  ) : null}
                </View>
                {establishedLabel ? (
                  <Text className="text-white/70 text-sm mt-0.5">{establishedLabel}</Text>
                ) : null}
              </View>
            </View>
          </View>
        </View>

        {/* Content */}
        <View className="pt-4">
          {/* Tagline */}
          <View className="px-5">
            <Text className="text-gray600 text-sm leading-5" numberOfLines={2}>{tagline}</Text>
          </View>

          {/* Stats Row */}
          <View className="px-5 mt-4">
            <View className="flex-row items-center justify-between py-3 px-2 rounded-2xl bg-gray50 border border-gray100">
              <StatItem icon="star" iconColor="#FBBF24" value={ratingValue} label={reviewsLabel} />
              <View className="w-px h-8 bg-gray200" />
              <StatItem icon="calendar" value={eventsValue} label="events" />
              <View className="w-px h-8 bg-gray200" />
              <StatItem icon="users" value={followersValue} label="followers" />
              <View className="w-px h-8 bg-gray200" />
              <StatItem icon="trending-up" value={successValue} label="success" />
            </View>
          </View>

          {/* Action Buttons */}
          <View className="px-5 mt-4 flex-row items-center gap-x-3">
            <Pressable
              onPress={handleToggleFollow}
              className={cx(
                'flex-1 rounded-full py-3.5 items-center justify-center flex-row gap-x-2',
                isFollowing ? 'bg-gray100 border border-gray300' : 'bg-black',
              )}
            >
              <FontAwesome
                name={isFollowing ? 'heart' : 'heart-o'}
                size={16}
                color={isFollowing ? '#EF4444' : '#FFFFFF'}
              />
              <Text className={isFollowing ? 'text-gray800 font-semibold' : 'text-white font-semibold'}>
                {isFollowing ? 'Following' : 'Follow'}
              </Text>
            </Pressable>
            <Pressable className="h-12 w-12 rounded-full border border-gray200 items-center justify-center bg-white">
              <Feather name="share-2" size={18} color="#111827" />
            </Pressable>
            <Pressable className="h-12 w-12 rounded-full border border-gray200 items-center justify-center bg-white">
              <Feather name="message-circle" size={18} color="#111827" />
            </Pressable>
          </View>

          {/* Location */}
          <View className="px-5 mt-4 flex-row items-center justify-between">
            <View className="flex-row items-center gap-x-2">
              <View className="h-8 w-8 rounded-full bg-gray100 items-center justify-center">
                <Feather name="map-pin" size={14} color="#6B7280" />
              </View>
              <Text className="text-sm text-gray700">{locationLabel}</Text>
            </View>
            <Pressable className="flex-row items-center gap-x-1">
              <Text className="text-sm text-gray900 font-medium">View on Map</Text>
              <Feather name="chevron-right" size={14} color="#374151" />
            </Pressable>
          </View>

          {/* Tabs */}
          <View className="px-5 mt-5">
            <View className="flex-row items-center rounded-full bg-gray100 p-1">
              <TabPill label="About" selected={activeTab === 'about'} onPress={() => setActiveTab('about')} />
              <TabPill label="Events" selected={activeTab === 'events'} onPress={() => setActiveTab('events')} />
              <TabPill label="Gallery" selected={activeTab === 'gallery'} onPress={() => setActiveTab('gallery')} />
              <TabPill label="Reviews" selected={activeTab === 'reviews'} onPress={() => setActiveTab('reviews')} />
              <TabPill label="Similar" selected={activeTab === 'similar'} onPress={() => setActiveTab('similar')} />
            </View>
          </View>

          {/* Loading State - Only for initial load */}
          {loading ? (
            <View className="px-5 mt-6">
              <CardSkeleton />
              <CardSkeleton />
            </View>
          ) : error ? (
            <View className="px-5 mt-6">
              <Card variant="outlined" padding="md">
                <Text className="text-gray900 font-semibold">Could not load organizer</Text>
                <Text className="text-gray500 mt-2">{error}</Text>
                <Pressable
                  onPress={() => loadOrganizer()}
                  className="mt-4 self-start px-4 py-2 rounded-full bg-black"
                >
                  <Text className="text-white font-medium">Try Again</Text>
                </Pressable>
              </Card>
            </View>
          ) : null}

          {/* Tab Content */}
          {!loading && !error && (
            <>
              {/* About Tab */}
              {activeTab === 'about' && (
                <View className="px-5 mt-4">
                  <Card variant="outlined" padding="md" className="mb-4">
                    <Text className="text-base font-semibold text-black">About</Text>
                    <Text className="text-sm text-gray700 mt-2 leading-5">
                      {organizer?.about ??
                        'This organizer has not added a detailed description yet.'}
                    </Text>
                  </Card>

                  <Card variant="outlined" padding="md" className="mb-4">
                    <Text className="text-base font-semibold text-black">Contact Information</Text>
                    <InfoRow icon="phone" label={organizer?.phone ?? '+1 (000) 000-0000'} />
                    <InfoRow icon="mail" label={organizer?.email ?? 'hello@example.com'} />
                    <InfoRow icon="globe" label={organizer?.websiteUrl ?? 'www.example.com'} />

                    <View className="mt-4 pt-3 border-t border-gray100">
                      <Text className="text-sm font-semibold text-gray700">Social Media</Text>
                      <InfoRow
                        icon="instagram"
                        label={organizer?.instagramHandle ?? '@organizer'}
                      />
                      <InfoRow
                        icon="facebook"
                        label={organizer?.facebookHandle ?? 'Organizer'}
                      />
                    </View>
                  </Card>

                  <Card variant="outlined" padding="md" className="mb-4">
                    <Text className="text-base font-semibold text-black">Specialties</Text>
                    <View className="flex-row flex-wrap mt-3">
                      {(organizer?.specialties ?? ['Live Music', 'Cultural Events']).map((s) => (
                        <Chip key={s} label={s} />
                      ))}
                    </View>
                  </Card>

                  <Card variant="outlined" padding="md" className="mb-4">
                    <Text className="text-base font-semibold text-black">Performance Metrics</Text>
                    <View className="flex-row mt-4">
                      <MetricItem
                        icon="users"
                        label="Total Attendees"
                        value={`${formatCompactNumber(stats?.totalAttendees ?? 0)}+`}
                      />
                      <MetricItem
                        icon="message-circle"
                        label="Response Time"
                        value={
                          organizer?.responseTimeHours
                            ? `< ${Math.round(organizer.responseTimeHours)}h`
                            : 'N/A'
                        }
                      />
                    </View>
                  </Card>

                  <Card variant="outlined" padding="md" className="mb-4">
                    <Text className="text-base font-semibold text-black">Policies</Text>
                    <Text className="text-sm font-medium text-gray800 mt-3">Cancellation</Text>
                    <Text className="text-sm text-gray600 mt-1 leading-5">
                      {organizer?.cancellationPolicy ??
                        'Tickets can be canceled up to 48 hours before the event for a full refund.'}
                    </Text>
                    <Text className="text-sm font-medium text-gray800 mt-4">Refund</Text>
                    <Text className="text-sm text-gray600 mt-1 leading-5">
                      {organizer?.refundPolicy ??
                        'Refunds are processed within 5-7 business days to the original payment method.'}
                    </Text>
                  </Card>
                </View>
              )}

              {/* Events Tab */}
              {activeTab === 'events' && (
                <View className="px-5 mt-4">
                  <Pressable className="rounded-xl border border-gray200 py-3 items-center flex-row justify-center gap-x-2 bg-white active:bg-gray50">
                    <Feather name="calendar" size={18} color="#374151" />
                    <Text className="text-base text-gray800 font-medium">View Event Calendar</Text>
                  </Pressable>

                  {events.loading ? (
                    <>
                      <Text className="text-lg font-semibold text-black mt-6">Upcoming Events</Text>
                      <EventCardSkeleton />
                      <EventCardSkeleton />
                    </>
                  ) : (
                    <>
                      <Text className="text-lg font-semibold text-black mt-6">
                        Upcoming Events ({events.upcoming.length})
                      </Text>
                      {events.upcoming.length === 0 ? (
                        <Text className="text-sm text-gray500 mt-3">No upcoming events scheduled.</Text>
                      ) : (
                        events.upcoming.map((ev) => <OrganizerEventCard key={ev.id} item={ev} />)
                      )}

                      <View className="h-px bg-gray200 my-6" />

                      <Text className="text-lg font-semibold text-black">
                        Past Events ({events.past.length})
                      </Text>
                      {events.past.length === 0 ? (
                        <Text className="text-sm text-gray500 mt-3">No past events.</Text>
                      ) : (
                        events.past.slice(0, 5).map((ev) => <OrganizerEventCard key={ev.id} item={ev} />)
                      )}
                      {events.past.length > 5 && (
                        <Pressable className="mt-4 py-3 items-center">
                          <Text className="text-sm text-gray800 font-medium">
                            View All Past Events ({events.past.length})
                          </Text>
                        </Pressable>
                      )}
                    </>
                  )}
                </View>
              )}

              {/* Gallery Tab */}
              {activeTab === 'gallery' && (
                <View className="px-5 mt-4">
                  {gallery.loading ? (
                    <GallerySkeleton />
                  ) : gallery.items.length === 0 ? (
                    <View className="items-center py-8">
                      <Feather name="image" size={32} color="#D1D5DB" />
                      <Text className="text-sm text-gray500 mt-3">No gallery images yet.</Text>
                    </View>
                  ) : (
                    <View className="flex-row flex-wrap justify-between">
                      {gallery.items.map((img) => (
                        <Pressable key={img.id} style={{ width: '48%' }} className="mb-3 active:opacity-90">
                          <Image
                            source={{ uri: img.imageUrl }}
                            className="w-full rounded-2xl bg-gray100"
                            style={{ aspectRatio: 1 }}
                            resizeMode="cover"
                          />
                        </Pressable>
                      ))}
                    </View>
                  )}
                </View>
              )}

              {/* Reviews Tab */}
              {activeTab === 'reviews' && (
                <View className="px-5 mt-4">
                  {reviews.loading ? (
                    <>
                      <ReviewSkeleton />
                      <ReviewSkeleton />
                    </>
                  ) : reviews.items.length === 0 ? (
                    <View className="items-center py-8">
                      <Feather name="message-square" size={32} color="#D1D5DB" />
                      <Text className="text-sm text-gray500 mt-3">No reviews yet.</Text>
                    </View>
                  ) : (
                    reviews.items.map((r) => <ReviewCard key={r.id} review={r} />)
                  )}
                </View>
              )}

              {/* Similar Tab */}
              {activeTab === 'similar' && (
                <View className="px-5 mt-4">
                  {similar.loading ? (
                    <>
                      <ReviewSkeleton />
                      <ReviewSkeleton />
                    </>
                  ) : similar.items.length === 0 ? (
                    <View className="items-center py-8">
                      <Feather name="users" size={32} color="#D1D5DB" />
                      <Text className="text-sm text-gray500 mt-3">No similar organizers found.</Text>
                    </View>
                  ) : (
                    similar.items.map((org) => <SimilarOrganizerCard key={org.id} organizer={org} />)
                  )}
                </View>
              )}
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
