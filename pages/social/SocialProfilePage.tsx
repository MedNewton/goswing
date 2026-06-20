// pages/social/SocialProfilePage.tsx
// Social-media style profile: cover + avatar + bio + stats + stories + tabbed
// content (About / Photos / Videos / Friends). Works for the signed-in user
// (editable, add media/stories) and for other users (read-only, privacy-gated).

import React, { useMemo, useState, type ReactElement } from 'react';
import {
  View,
  Text,
  Image,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useUser } from '@clerk/clerk-expo';

import { useSocialProfile } from '@/hooks/social/useSocialProfile';
import { useUserMedia } from '@/hooks/social/useUserMedia';
import { useUserStories } from '@/hooks/social/useUserStories';
import StoryRing from '@/components/social/StoryRing';
import MediaGrid from '@/components/social/MediaGrid';
import MediaViewerModal from '@/components/social/MediaViewerModal';
import ComposeMediaModal from '@/components/social/ComposeMediaModal';
import UserStoryViewerModal from '@/components/social/UserStoryViewerModal';
import { choosePickSource, type PickedAsset } from '@/components/social/mediaPicker';
import type { UserMedia } from '@/lib/social/types';
import EditSocialProfilePage from '@/pages/social/EditSocialProfilePage';
import ProfilePrivacyPage from '@/pages/social/ProfilePrivacyPage';

type TabKey = 'about' | 'photos' | 'videos' | 'friends';

type Props = Readonly<{
  /** Target user. Omit to show the signed-in user's own profile. */
  userId?: string;
  onBack?: () => void;
  /** Provided in a later slice to enable the "Add friend" action. */
  onAddFriend?: (userId: string) => void;
  /** Provided in a later slice to open the full friends list. */
  onOpenFriends?: (userId: string) => void;
}>;

export default function SocialProfilePage({
  userId,
  onBack,
  onAddFriend,
  onOpenFriends,
}: Props): ReactElement {
  const { user } = useUser();
  const viewerId = user?.id ?? null;
  const targetId = userId ?? viewerId ?? undefined;

  const [subRoute, setSubRoute] = useState<'root' | 'edit' | 'privacy'>('root');
  const [tab, setTab] = useState<TabKey>('about');

  const { profile, isLoading, refetch } = useSocialProfile(targetId);
  const canLoadContent = !!profile?.canView && !!targetId;
  const media = useUserMedia(canLoadContent ? targetId : null);
  const stories = useUserStories(canLoadContent ? targetId : null);

  const isSelf = !!profile?.isSelf;

  // Composer / viewer state
  const [storyAsset, setStoryAsset] = useState<PickedAsset | null>(null);
  const [storySubmitting, setStorySubmitting] = useState(false);
  const [mediaAsset, setMediaAsset] = useState<PickedAsset | null>(null);
  const [mediaSubmitting, setMediaSubmitting] = useState(false);
  const [storyViewerOpen, setStoryViewerOpen] = useState(false);
  const [viewerItem, setViewerItem] = useState<UserMedia | null>(null);
  const [deletingMedia, setDeletingMedia] = useState(false);
  const [deletingStory, setDeletingStory] = useState(false);

  const tabs = useMemo<ReadonlyArray<{ key: TabKey; label: string; icon: keyof typeof Feather.glyphMap }>>(
    () => [
      { key: 'about', label: 'About', icon: 'info' },
      { key: 'photos', label: 'Photos', icon: 'image' },
      { key: 'videos', label: 'Videos', icon: 'video' },
      { key: 'friends', label: 'Friends', icon: 'users' },
    ],
    [],
  );

  // ---- Sub-routes (self only) ----
  if (subRoute === 'edit') {
    return <EditSocialProfilePage onBack={() => setSubRoute('root')} onSaved={refetch} />;
  }
  if (subRoute === 'privacy') {
    return <ProfilePrivacyPage onBack={() => setSubRoute('root')} onSaved={refetch} />;
  }

  // ---- Loading / not found ----
  if (isLoading) {
    return (
      <SafeAreaView edges={['top', 'left', 'right']} className="flex-1 bg-white items-center justify-center">
        <ActivityIndicator size="large" color="#6B7280" />
      </SafeAreaView>
    );
  }
  if (!profile) {
    return (
      <SafeAreaView edges={['top', 'left', 'right']} className="flex-1 bg-white">
        <Header onBack={onBack} title="Profile" />
        <View className="flex-1 items-center justify-center px-8">
          <Feather name="user-x" size={28} color="#9CA3AF" />
          <Text className="text-gray600 mt-3 text-center">This profile could not be found.</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ---- Actions ----
  const handleAddStory = (): void => {
    if (!isSelf || !viewerId) return;
    choosePickSource({ allowVideos: true }, (asset) => {
      if (asset) setStoryAsset(asset);
    });
  };

  const submitStory = async (caption: string): Promise<void> => {
    if (!storyAsset || !viewerId) return;
    try {
      setStorySubmitting(true);
      await stories.add({ userId: viewerId, uri: storyAsset.uri, kind: storyAsset.kind, caption });
      setStoryAsset(null);
      refetch();
    } catch (err: any) {
      Alert.alert('Could not post story', err?.message ?? 'Please try again.');
    } finally {
      setStorySubmitting(false);
    }
  };

  const handleStoryRingPress = (): void => {
    if (stories.stories.length > 0) {
      setStoryViewerOpen(true);
    } else if (isSelf) {
      handleAddStory();
    }
  };

  const handleAddMedia = (): void => {
    if (!isSelf || !viewerId) return;
    choosePickSource({ allowVideos: true }, (asset) => {
      if (asset) setMediaAsset(asset);
    });
  };

  const submitMedia = async (caption: string): Promise<void> => {
    if (!mediaAsset || !viewerId) return;
    try {
      setMediaSubmitting(true);
      await media.add({ userId: viewerId, uri: mediaAsset.uri, kind: mediaAsset.kind, caption });
      setMediaAsset(null);
      refetch();
    } catch (err: any) {
      Alert.alert('Could not upload', err?.message ?? 'Please try again.');
    } finally {
      setMediaSubmitting(false);
    }
  };

  const handleDeleteMedia = async (item: UserMedia): Promise<void> => {
    try {
      setDeletingMedia(true);
      await media.remove(item.id);
      setViewerItem(null);
      refetch();
    } catch (err: any) {
      Alert.alert('Could not delete', err?.message ?? 'Please try again.');
    } finally {
      setDeletingMedia(false);
    }
  };

  const handleDeleteStory = async (storyId: string): Promise<void> => {
    try {
      setDeletingStory(true);
      await stories.remove(storyId);
      if (stories.stories.length <= 1) setStoryViewerOpen(false);
      refetch();
    } catch (err: any) {
      Alert.alert('Could not delete', err?.message ?? 'Please try again.');
    } finally {
      setDeletingStory(false);
    }
  };

  const stat = profile.stats;

  return (
    <SafeAreaView edges={['top', 'left', 'right']} className="flex-1 bg-white">
      <Header onBack={onBack} title={isSelf ? 'My profile' : profile.displayName} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerClassName="pb-24">
        {/* Cover */}
        <View className="h-40 bg-gray200">
          {profile.coverImageUrl ? (
            <Image source={{ uri: profile.coverImageUrl }} className="w-full h-full" resizeMode="cover" />
          ) : (
            <View className="w-full h-full bg-brand/15" />
          )}
        </View>

        {/* Avatar + name row */}
        <View className="px-5">
          <View className="-mt-12 flex-row items-end justify-between">
            <StoryRing
              avatarUrl={profile.avatarUrl}
              displayName={profile.displayName}
              hasStories={stories.stories.length > 0}
              isSelf={isSelf}
              onPress={handleStoryRingPress}
            />

            {isSelf ? (
              <View className="flex-row items-center gap-x-2 mb-1">
                <Pressable
                  onPress={() => setSubRoute('privacy')}
                  className="px-3 py-2 rounded-xl border border-gray300 bg-white active:opacity-90"
                >
                  <Feather name="lock" size={16} color="#111827" />
                </Pressable>
                <Pressable
                  onPress={() => setSubRoute('edit')}
                  className="flex-row items-center gap-x-2 px-3 py-2 rounded-xl border border-gray300 bg-white active:opacity-90"
                >
                  <Feather name="edit-2" size={14} color="#111827" />
                  <Text className="text-sm text-gray900">Edit</Text>
                </Pressable>
              </View>
            ) : onAddFriend && profile.canView ? (
              <Pressable
                onPress={() => onAddFriend(profile.userId)}
                className="flex-row items-center gap-x-2 px-4 py-2 rounded-xl bg-brand active:opacity-90 mb-1"
              >
                <Feather name="user-plus" size={16} color="#FFFFFF" />
                <Text className="text-sm text-white font-medium">Add friend</Text>
              </Pressable>
            ) : null}
          </View>

          <View className="mt-3">
            <Text className="text-xl font-bold text-black">{profile.displayName}</Text>
            {profile.occupation ? (
              <Text className="text-sm text-gray600 mt-0.5">{profile.occupation}</Text>
            ) : null}
            <View className="flex-row items-center gap-x-3 mt-1">
              {profile.city ? (
                <View className="flex-row items-center gap-x-1">
                  <Feather name="map-pin" size={13} color="#6B7280" />
                  <Text className="text-xs text-gray500">{profile.city}</Text>
                </View>
              ) : null}
            </View>
          </View>
        </View>

        {/* Privacy gate for other users' private profiles */}
        {!profile.canView ? (
          <View className="items-center justify-center px-8 py-16">
            <Feather name="lock" size={28} color="#9CA3AF" />
            <Text className="text-gray700 font-semibold mt-3">This profile is private</Text>
            <Text className="text-gray500 text-sm mt-1 text-center">
              {profile.displayName} keeps their profile private.
            </Text>
          </View>
        ) : (
          <>
            {/* Stats */}
            <View className="mx-5 mt-5 flex-row gap-x-3">
              <StatCard icon="calendar" value={stat.attendedCount} label="Attended" />
              <StatCard icon="image" value={stat.mediaCount} label="Media" />
              <StatCard
                icon="users"
                value={stat.friendsCount}
                label="Friends"
                onPress={onOpenFriends ? () => onOpenFriends(profile.userId) : undefined}
              />
            </View>

            {/* Add content (self) */}
            {isSelf ? (
              <View className="mx-5 mt-4 flex-row gap-x-3">
                <Pressable
                  onPress={handleAddStory}
                  className="flex-1 flex-row items-center justify-center gap-x-2 py-3 rounded-xl border border-gray300 bg-white active:opacity-90"
                >
                  <Feather name="plus-circle" size={16} color="#0EA5E9" />
                  <Text className="text-sm font-medium text-gray900">Add story</Text>
                </Pressable>
                <Pressable
                  onPress={handleAddMedia}
                  className="flex-1 flex-row items-center justify-center gap-x-2 py-3 rounded-xl bg-brand active:opacity-90"
                >
                  <Feather name="upload" size={16} color="#FFFFFF" />
                  <Text className="text-sm font-medium text-white">Add media</Text>
                </Pressable>
              </View>
            ) : null}

            {/* Tabs */}
            <View className="mt-6 border-b border-gray200 flex-row px-5">
              {tabs.map((it) => {
                const active = it.key === tab;
                return (
                  <Pressable
                    key={it.key}
                    onPress={() => setTab(it.key)}
                    className={`flex-1 items-center pb-3 border-b-2 ${active ? 'border-brand' : 'border-transparent'}`}
                  >
                    <Feather name={it.icon} size={18} color={active ? '#0EA5E9' : '#9CA3AF'} />
                    <Text className={`text-xs mt-1 ${active ? 'text-brand font-semibold' : 'text-gray500'}`}>
                      {it.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Tab content */}
            <View className="mx-5 mt-4">
              {tab === 'about' ? (
                <AboutTab bio={profile.bio} occupation={profile.occupation} city={profile.city} />
              ) : tab === 'photos' ? (
                <MediaGrid
                  items={media.photos}
                  emptyLabel={isSelf ? 'Add your first photo' : 'No photos yet'}
                  onPressItem={(item) => setViewerItem(item)}
                />
              ) : tab === 'videos' ? (
                <MediaGrid
                  items={media.videos}
                  emptyLabel={isSelf ? 'Add your first video' : 'No videos yet'}
                  onPressItem={(item) => setViewerItem(item)}
                />
              ) : (
                <FriendsTabPlaceholder
                  count={stat.friendsCount}
                  onOpen={onOpenFriends ? () => onOpenFriends(profile.userId) : undefined}
                />
              )}
            </View>
          </>
        )}
      </ScrollView>

      {/* Modals */}
      <ComposeMediaModal
        visible={!!storyAsset}
        asset={storyAsset}
        title="New story"
        submitLabel="Share"
        submitting={storySubmitting}
        onCancel={() => setStoryAsset(null)}
        onSubmit={submitStory}
      />
      <ComposeMediaModal
        visible={!!mediaAsset}
        asset={mediaAsset}
        title="New post"
        submitLabel="Post"
        submitting={mediaSubmitting}
        onCancel={() => setMediaAsset(null)}
        onSubmit={submitMedia}
      />
      <UserStoryViewerModal
        visible={storyViewerOpen}
        stories={stories.stories}
        canDelete={isSelf}
        deleting={deletingStory}
        onClose={() => setStoryViewerOpen(false)}
        onDelete={(s) => handleDeleteStory(s.id)}
      />
      <MediaViewerModal
        item={viewerItem}
        canDelete={isSelf}
        deleting={deletingMedia}
        onClose={() => setViewerItem(null)}
        onDelete={handleDeleteMedia}
      />
    </SafeAreaView>
  );
}

function Header({ onBack, title }: { onBack?: () => void; title: string }): ReactElement {
  return (
    <View className="flex-row items-center px-5 py-3 border-b border-gray100">
      {onBack ? (
        <Pressable onPress={onBack} className="mr-3 active:opacity-70">
          <Feather name="arrow-left" size={24} color="#111827" />
        </Pressable>
      ) : null}
      <Text numberOfLines={1} className="text-lg font-semibold text-black flex-1">
        {title}
      </Text>
    </View>
  );
}

function StatCard({
  icon,
  value,
  label,
  onPress,
}: {
  icon: keyof typeof Feather.glyphMap;
  value: number;
  label: string;
  onPress?: () => void;
}): ReactElement {
  return (
    <Pressable
      disabled={!onPress}
      onPress={onPress}
      className="flex-1 items-center rounded-2xl border border-gray200 bg-white py-4 active:opacity-80"
    >
      <Feather name={icon} size={18} color="#0B1220" />
      <Text className="mt-1.5 text-black font-semibold">{value}</Text>
      <Text className="text-xs text-gray600 mt-0.5">{label}</Text>
    </Pressable>
  );
}

function AboutTab({
  bio,
  occupation,
  city,
}: {
  bio: string | null;
  occupation: string | null;
  city: string | null;
}): ReactElement {
  const hasAny = bio || occupation || city;
  if (!hasAny) {
    return (
      <View className="items-center justify-center py-12">
        <Feather name="info" size={26} color="#9CA3AF" />
        <Text className="text-gray500 text-sm mt-3">Nothing here yet.</Text>
      </View>
    );
  }
  return (
    <View className="rounded-2xl border border-gray200 bg-white p-4">
      {bio ? <Text className="text-sm text-gray800 leading-6">{bio}</Text> : null}
      {occupation ? (
        <Row icon="briefcase" text={occupation} top={!!bio} />
      ) : null}
      {city ? <Row icon="map-pin" text={city} top={!!bio || !!occupation} /> : null}
    </View>
  );
}

function Row({ icon, text, top }: { icon: keyof typeof Feather.glyphMap; text: string; top: boolean }): ReactElement {
  return (
    <View className={`flex-row items-center gap-x-2 ${top ? 'mt-3' : ''}`}>
      <Feather name={icon} size={15} color="#6B7280" />
      <Text className="text-sm text-gray700">{text}</Text>
    </View>
  );
}

function FriendsTabPlaceholder({
  count,
  onOpen,
}: {
  count: number;
  onOpen?: () => void;
}): ReactElement {
  return (
    <View className="items-center justify-center py-12">
      <Feather name="users" size={26} color="#9CA3AF" />
      <Text className="text-gray600 text-sm mt-3">
        {count > 0 ? `${count} friend${count === 1 ? '' : 's'}` : 'No friends yet'}
      </Text>
      {onOpen ? (
        <Pressable onPress={onOpen} className="mt-3 px-4 py-2 rounded-xl border border-gray300 active:opacity-80">
          <Text className="text-sm text-gray900">View all</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
