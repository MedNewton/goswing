// pages/MyReviewsPage.tsx
import React, { useEffect, useState, type ReactElement } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

import { getMyReviews, deleteReview, type UserReview, type UserReviewsResult } from '@/lib/supabase/reviews';

const cx = (...c: ReadonlyArray<string | null | undefined | false>) =>
  c.filter(Boolean).join(' ');

type MyReviewsPageProps = Readonly<{
  onBack: () => void;
}>;

type TabKey = 'published' | 'drafts';

function StarRating({ rating, size = 16 }: { rating: number; size?: number }): ReactElement {
  const stars = [];
  for (let i = 1; i <= 5; i++) {
    stars.push(
      <Feather
        key={i}
        name="star"
        size={size}
        color={i <= rating ? '#FBBF24' : '#E5E7EB'}
        style={{ marginRight: 2 }}
      />
    );
  }
  return <View className="flex-row">{stars}</View>;
}

function ReviewCard({
  review,
  onEdit,
  onDelete,
}: {
  review: UserReview;
  onEdit: () => void;
  onDelete: () => void;
}): ReactElement {
  return (
    <View className="rounded-2xl border border-gray200 bg-white p-4 mb-4">
      {/* Header */}
      <View className="flex-row items-start justify-between">
        <View className="flex-row items-center flex-1">
          {review.eventImageUrl ? (
            <Image
              source={{ uri: review.eventImageUrl }}
              className="w-14 h-14 rounded-xl"
            />
          ) : (
            <View className="w-14 h-14 rounded-xl bg-gray200 items-center justify-center">
              <Feather name="calendar" size={20} color="#9CA3AF" />
            </View>
          )}
          <View className="ml-3 flex-1">
            <Text className="text-base font-semibold text-black" numberOfLines={1}>
              {review.eventTitle}
            </Text>
            <Text className="text-xs text-gray500 mt-0.5">
              by {review.organizerName}
            </Text>
            <View className="flex-row items-center mt-1">
              <Feather name="calendar" size={12} color="#9CA3AF" />
              <Text className="text-xs text-gray500 ml-1">{review.eventDate}</Text>
            </View>
          </View>
        </View>

        {/* Actions */}
        <View className="flex-row items-center gap-x-2">
          <Pressable onPress={onEdit} className="p-2 active:opacity-70">
            <Feather name="edit-2" size={18} color="#6B7280" />
          </Pressable>
          <Pressable onPress={onDelete} className="p-2 active:opacity-70">
            <Feather name="trash-2" size={18} color="#6B7280" />
          </Pressable>
        </View>
      </View>

      {/* Rating */}
      <View className="flex-row items-center mt-3">
        <StarRating rating={review.rating} />
        <Text className="text-sm text-gray600 ml-2">{review.rating}/5 stars</Text>
      </View>

      {/* Comment */}
      {review.comment && (
        <Text className="text-sm text-gray700 mt-3 leading-5">
          {review.comment}
        </Text>
      )}

      {/* Review Images */}
      {review.images.length > 0 && (
        <View className="flex-row mt-3 gap-x-2">
          {review.images.slice(0, 3).map((img, idx) => (
            <Image
              key={idx}
              source={{ uri: img }}
              className="w-16 h-16 rounded-lg"
            />
          ))}
        </View>
      )}

      {/* Footer */}
      <View className="flex-row items-center justify-between mt-4 pt-3 border-t border-gray100">
        <Text className="text-xs text-gray500">
          Reviewed on {new Date(review.createdAt).toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })}
        </Text>
        {review.helpfulCount > 0 && (
          <Text className="text-xs text-gray500">
            {review.helpfulCount} {review.helpfulCount === 1 ? 'person' : 'people'} found this helpful
          </Text>
        )}
      </View>
    </View>
  );
}

export default function MyReviewsPage({ onBack }: MyReviewsPageProps): ReactElement {
  const insets = useSafeAreaInsets();

  const [tab, setTab] = useState<TabKey>('published');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reviewsData, setReviewsData] = useState<UserReviewsResult | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchReviews = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await getMyReviews();
      setReviewsData(data);
    } catch (err: any) {
      setError(err?.message ?? 'Failed to load reviews');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, []);

  const handleEdit = (review: UserReview) => {
    // TODO: Navigate to edit review screen or open modal
    Alert.alert('Edit Review', 'Edit functionality coming soon!');
  };

  const handleDelete = (review: UserReview) => {
    Alert.alert(
      'Delete Review',
      `Are you sure you want to delete your review for "${review.eventTitle}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setDeletingId(review.id);
              await deleteReview(review.id);
              await fetchReviews();
            } catch (err: any) {
              Alert.alert('Error', err?.message ?? 'Could not delete review.');
            } finally {
              setDeletingId(null);
            }
          },
        },
      ]
    );
  };

  const reviews = tab === 'published' 
    ? reviewsData?.published ?? [] 
    : reviewsData?.drafts ?? [];

  if (isLoading) {
    return (
      <SafeAreaView edges={['top', 'left', 'right']} className="flex-1 bg-white items-center justify-center">
        <ActivityIndicator size="large" color="#6B7280" />
        <Text className="text-gray600 mt-3">Loading reviews…</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['left', 'right']} className="flex-1 bg-white">
      {/* Header */}
      <View className="flex-row items-center px-5 py-4 border-b border-gray200">
        <Pressable onPress={onBack} className="mr-4 active:opacity-70">
          <Feather name="arrow-left" size={24} color="#111827" />
        </Pressable>
        <View>
          <Text className="text-lg font-semibold text-black">My Reviews</Text>
          <Text className="text-xs text-gray500">
            {reviewsData?.totalCount ?? 0} {(reviewsData?.totalCount ?? 0) === 1 ? 'review' : 'reviews'} published
          </Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 16) + 40 }}
      >
        {/* Stats Cards */}
        <View className="mx-5 mt-5 flex-row gap-x-3">
          <View className="flex-1 rounded-2xl border border-gray200 bg-white py-4 items-center">
            <Text className="text-2xl font-bold text-black">{reviewsData?.totalCount ?? 0}</Text>
            <Text className="text-xs text-gray500 mt-1">Published Reviews</Text>
          </View>
          <View className="flex-1 rounded-2xl border border-gray200 bg-white py-4 items-center">
            <Text className="text-2xl font-bold text-black">{reviewsData?.averageRating ?? 0}</Text>
            <Text className="text-xs text-gray500 mt-1">Average Rating</Text>
          </View>
        </View>

        {/* Tabs */}
        <View className="mx-5 mt-5 flex-row rounded-xl border border-gray200 bg-gray100 p-1">
          <Pressable
            className={cx(
              'flex-1 py-2.5 rounded-lg items-center',
              tab === 'published' && 'bg-white'
            )}
            onPress={() => setTab('published')}
          >
            <Text className={cx(
              'text-sm font-medium',
              tab === 'published' ? 'text-black' : 'text-gray500'
            )}>
              Published ({reviewsData?.published.length ?? 0})
            </Text>
          </Pressable>
          <Pressable
            className={cx(
              'flex-1 py-2.5 rounded-lg items-center',
              tab === 'drafts' && 'bg-white'
            )}
            onPress={() => setTab('drafts')}
          >
            <Text className={cx(
              'text-sm font-medium',
              tab === 'drafts' ? 'text-black' : 'text-gray500'
            )}>
              Drafts ({reviewsData?.drafts.length ?? 0})
            </Text>
          </Pressable>
        </View>

        {/* Error State */}
        {error && (
          <View className="mx-5 mt-5 rounded-2xl border border-red-200 bg-red-50 p-4">
            <Text className="text-red-600">{error}</Text>
            <Pressable
              className="mt-3 bg-red-500 rounded-xl py-2 items-center"
              onPress={fetchReviews}
            >
              <Text className="text-white font-medium">Retry</Text>
            </Pressable>
          </View>
        )}

        {/* Reviews List */}
        {!error && (
          <View className="mx-5 mt-5">
            {reviews.length === 0 ? (
              <View className="rounded-2xl border border-gray200 bg-white p-6 items-center">
                <Feather name="star" size={40} color="#9CA3AF" />
                <Text className="text-gray700 font-medium mt-3">
                  {tab === 'published' ? 'No published reviews yet' : 'No drafts'}
                </Text>
                <Text className="text-gray500 text-sm mt-1 text-center">
                  {tab === 'published'
                    ? 'Your reviews will appear here after attending events'
                    : 'Started reviews that you haven\'t finished will appear here'}
                </Text>
              </View>
            ) : (
              reviews.map((review) => (
                <View key={review.id} style={{ opacity: deletingId === review.id ? 0.5 : 1 }}>
                  <ReviewCard
                    review={review}
                    onEdit={() => handleEdit(review)}
                    onDelete={() => handleDelete(review)}
                  />
                </View>
              ))
            )}
          </View>
        )}

        {/* Guidelines */}
        <View className="mx-5 mt-5 mb-10 rounded-2xl bg-amber-50 border border-amber-200 p-4">
          <Text className="text-base font-semibold text-amber-800 mb-3">Review Guidelines</Text>
          <View className="gap-y-2">
            {[
              'Be honest and helpful in your reviews',
              'Focus on your experience with the event',
              'Avoid personal attacks or inappropriate content',
              'Include photos to help other attendees',
            ].map((guideline, idx) => (
              <View key={idx} className="flex-row items-start">
                <Text className="text-amber-700 mr-2">•</Text>
                <Text className="text-sm text-amber-700 flex-1">{guideline}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}