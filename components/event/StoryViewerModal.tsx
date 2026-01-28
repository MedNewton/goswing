// components/event/StoryViewerModal.tsx
import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactElement,
} from "react";
import {
  Animated,
  Dimensions,
  Image,
  Modal,
  Pressable,
  Text,
  View,
  ActivityIndicator,
  type GestureResponderEvent,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Video, ResizeMode } from "expo-av";
import { Feather } from "@expo/vector-icons";
import {
  getStoriesWithUserInfo,
  type EventStoryWithUser,
} from "@/lib/supabase/stories";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const DEFAULT_DURATION = 5000; // 5 seconds per story
const VIDEO_MAX_DURATION = 30000; // 30 seconds max for videos

function formatTimeAgo(isoDate: string): string {
  const date = new Date(isoDate);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function getInitials(name: string | null): string {
  if (!name) return "?";
  const parts = name.trim().split(" ").filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

export type StoryViewerModalProps = {
  visible: boolean;
  eventId: string;
  eventTitle?: string;
  onClose: () => void;
};

export default function StoryViewerModal({
  visible,
  eventId,
  eventTitle,
  onClose,
}: StoryViewerModalProps): ReactElement {
  const insets = useSafeAreaInsets();
  const [stories, setStories] = useState<ReadonlyArray<EventStoryWithUser>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [videoDuration, setVideoDuration] = useState<number | null>(null);

  const progressAnims = useRef<Animated.Value[]>([]);
  const progressAnimation = useRef<Animated.CompositeAnimation | null>(null);
  const videoRef = useRef<Video>(null);

  // Fetch stories when modal opens
  useEffect(() => {
    if (!visible || !eventId) return;

    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getStoriesWithUserInfo(eventId);
        if (!cancelled) {
          setStories(data);
          setCurrentIndex(0);
          // Initialize progress animations
          progressAnims.current = data.map(() => new Animated.Value(0));
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load stories");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [visible, eventId]);

  // Reset state when modal closes
  useEffect(() => {
    if (!visible) {
      setCurrentIndex(0);
      setIsPaused(false);
      setVideoDuration(null);
      progressAnims.current = [];
      if (progressAnimation.current) {
        progressAnimation.current.stop();
      }
    }
  }, [visible]);

  const goToSlide = useCallback(
    (index: number) => {
      if (index < 0 || index >= stories.length) return;

      // Stop current animation
      if (progressAnimation.current) {
        progressAnimation.current.stop();
      }

      // Reset all progress bars
      progressAnims.current.forEach((anim, i) => {
        if (i < index) {
          anim.setValue(1);
        } else {
          anim.setValue(0);
        }
      });

      setCurrentIndex(index);
      setVideoDuration(null);
    },
    [stories.length]
  );

  const goNext = useCallback(() => {
    if (currentIndex < stories.length - 1) {
      goToSlide(currentIndex + 1);
    } else {
      onClose(); // Close modal when all stories viewed
    }
  }, [currentIndex, stories.length, goToSlide, onClose]);

  const goPrev = useCallback(() => {
    const currentAnim = progressAnims.current[currentIndex];
    const currentProgress = currentAnim ? (currentAnim as any)._value : 0;
    if (currentProgress > 0.3 || currentIndex === 0) {
      goToSlide(currentIndex);
    } else {
      goToSlide(currentIndex - 1);
    }
  }, [currentIndex, goToSlide]);

  // Animate progress bar
  useEffect(() => {
    if (!visible || isPaused || stories.length === 0 || loading) return;

    const currentStory = stories[currentIndex];
    if (!currentStory) return;

    const currentAnim = progressAnims.current[currentIndex];
    if (!currentAnim) return;

    const isVideo =
      currentStory.photoUrl.includes(".mp4") ||
      currentStory.photoUrl.includes(".mov") ||
      currentStory.photoUrl.includes(".webm");

    if (isVideo && !videoDuration) return;

    const duration =
      isVideo && videoDuration
        ? Math.min(videoDuration, VIDEO_MAX_DURATION)
        : DEFAULT_DURATION;

    progressAnimation.current = Animated.timing(currentAnim, {
      toValue: 1,
      duration,
      useNativeDriver: false,
    });

    progressAnimation.current.start(({ finished }) => {
      if (finished) {
        goNext();
      }
    });

    return () => {
      if (progressAnimation.current) {
        progressAnimation.current.stop();
      }
    };
  }, [visible, currentIndex, isPaused, videoDuration, stories, loading, goNext]);

  const handlePress = (e: GestureResponderEvent) => {
    const x = e.nativeEvent.locationX;
    const threshold = SCREEN_WIDTH / 3;

    if (x < threshold) {
      goPrev();
    } else {
      goNext();
    }
  };

  const handleLongPressIn = () => {
    setIsPaused(true);
    if (progressAnimation.current) {
      progressAnimation.current.stop();
    }
    videoRef.current?.pauseAsync();
  };

  const handleLongPressOut = () => {
    setIsPaused(false);
    videoRef.current?.playAsync();
  };

  const handleVideoLoad = (status: any) => {
    if (status.durationMillis) {
      setVideoDuration(status.durationMillis);
    }
  };

  const handleVideoEnd = () => {
    goNext();
  };

  const currentStory = stories[currentIndex];
  const isVideo = currentStory
    ? currentStory.photoUrl.includes(".mp4") ||
      currentStory.photoUrl.includes(".mov") ||
      currentStory.photoUrl.includes(".webm")
    : false;

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={false}
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View className="flex-1 bg-black">
        {/* Loading State */}
        {loading && (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator color="#FFFFFF" size="large" />
            <Text className="text-white mt-4">Loading stories...</Text>
          </View>
        )}

        {/* Error State */}
        {!loading && error && (
          <View className="flex-1 items-center justify-center px-6">
            <Feather name="alert-circle" size={48} color="#EF4444" />
            <Text className="text-white text-lg font-semibold mt-4">
              Could not load stories
            </Text>
            <Text className="text-white/60 text-center mt-2">{error}</Text>
            <Pressable
              onPress={onClose}
              className="mt-6 px-6 py-3 rounded-full bg-white/10"
            >
              <Text className="text-white font-medium">Close</Text>
            </Pressable>
          </View>
        )}

        {/* Empty State */}
        {!loading && !error && stories.length === 0 && (
          <View className="flex-1 items-center justify-center px-6">
            <Feather name="camera-off" size={48} color="#6B7280" />
            <Text className="text-white text-lg font-semibold mt-4">
              No stories yet
            </Text>
            <Text className="text-white/60 text-center mt-2">
              Be the first to share a moment from this event!
            </Text>
            <Pressable
              onPress={onClose}
              className="mt-6 px-6 py-3 rounded-full bg-white/10"
            >
              <Text className="text-white font-medium">Close</Text>
            </Pressable>
          </View>
        )}

        {/* Stories Viewer */}
        {!loading && !error && stories.length > 0 && currentStory && (
          <>
            {/* Progress bars */}
            <View
              className="absolute left-3 right-3 z-20 flex-row gap-x-1"
              style={{ top: insets.top + 12 }}
            >
              {stories.map((story, index) => {
                const anim = progressAnims.current[index];
                if (!anim) return null;

                return (
                  <View
                    key={story.id}
                    className="flex-1 h-0.5 bg-white/30 rounded-full overflow-hidden"
                  >
                    <Animated.View
                      className="h-full bg-white rounded-full"
                      style={{
                        width: anim.interpolate({
                          inputRange: [0, 1],
                          outputRange: ["0%", "100%"],
                        }),
                      }}
                    />
                  </View>
                );
              })}
            </View>

            {/* Header with user info and close button */}
            <View
              className="absolute left-0 right-0 z-20 px-4 flex-row items-center justify-between"
              style={{ top: insets.top + 24 }}
            >
              <View className="flex-row items-center flex-1">
                {/* User Avatar */}
                {currentStory.userAvatarUrl ? (
                  <Image
                    source={{ uri: currentStory.userAvatarUrl }}
                    className="h-10 w-10 rounded-full bg-white/20"
                    resizeMode="cover"
                  />
                ) : (
                  <View className="h-10 w-10 rounded-full bg-white/20 items-center justify-center">
                    <Text className="text-white text-sm font-semibold">
                      {getInitials(currentStory.userName)}
                    </Text>
                  </View>
                )}

                <View className="ml-3 flex-1">
                  <Text
                    className="text-white font-semibold"
                    numberOfLines={1}
                  >
                    {currentStory.userName || "Anonymous"}
                  </Text>
                  <Text className="text-white/60 text-xs">
                    {formatTimeAgo(currentStory.createdAt)}
                  </Text>
                </View>
              </View>

              {/* Close button */}
              <Pressable
                onPress={onClose}
                className="h-10 w-10 rounded-full bg-white/10 items-center justify-center ml-3"
                hitSlop={12}
              >
                <Feather name="x" size={20} color="#FFFFFF" />
              </Pressable>
            </View>

            {/* Media content */}
            <Pressable
              onPress={handlePress}
              onLongPress={handleLongPressIn}
              onPressOut={handleLongPressOut}
              delayLongPress={200}
              className="flex-1"
            >
              {isVideo ? (
                <Video
                  ref={videoRef}
                  source={{ uri: currentStory.photoUrl }}
                  style={{ width: SCREEN_WIDTH, height: SCREEN_HEIGHT }}
                  resizeMode={ResizeMode.COVER}
                  shouldPlay={!isPaused}
                  isLooping={false}
                  onPlaybackStatusUpdate={(status) => {
                    if (status.isLoaded) {
                      if (!videoDuration && status.durationMillis) {
                        handleVideoLoad(status);
                      }
                      if (status.didJustFinish) {
                        handleVideoEnd();
                      }
                    }
                  }}
                />
              ) : (
                <Image
                  source={{ uri: currentStory.photoUrl }}
                  style={{ width: SCREEN_WIDTH, height: SCREEN_HEIGHT }}
                  resizeMode="cover"
                />
              )}
            </Pressable>

            {/* Caption overlay (bottom) */}
            {currentStory.caption && (
              <View
                className="absolute left-0 right-0 z-20 px-4"
                style={{ bottom: insets.bottom + 24 }}
              >
                <View className="bg-black/50 rounded-2xl px-4 py-3">
                  <Text className="text-white text-sm leading-5">
                    {currentStory.caption}
                  </Text>
                </View>
              </View>
            )}

            {/* Event title badge (optional) */}
            {eventTitle && (
              <View
                className="absolute left-4 z-20"
                style={{ top: insets.top + 80 }}
              >
                <View className="bg-black/40 rounded-full px-3 py-1.5 flex-row items-center">
                  <Feather name="calendar" size={12} color="#FFFFFF" />
                  <Text
                    className="text-white text-xs ml-1.5"
                    numberOfLines={1}
                  >
                    {eventTitle}
                  </Text>
                </View>
              </View>
            )}

            {/* Story counter */}
            <View
              className="absolute right-4 z-20"
              style={{ top: insets.top + 80 }}
            >
              <View className="bg-black/40 rounded-full px-3 py-1.5">
                <Text className="text-white text-xs font-medium">
                  {currentIndex + 1} / {stories.length}
                </Text>
              </View>
            </View>

            {/* Pause indicator */}
            {isPaused && (
              <View className="absolute inset-0 items-center justify-center z-10">
                <View className="bg-black/50 rounded-full p-4">
                  <Feather name="pause" size={32} color="#FFFFFF" />
                </View>
              </View>
            )}
          </>
        )}
      </View>
    </Modal>
  );
}
