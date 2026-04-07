// components/event/StoriesHeroSlider.tsx
import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
  useMemo,
  type ReactElement,
} from "react";
import {
  Animated,
  Dimensions,
  Image,
  Pressable,
  View,
  Text,
  type GestureResponderEvent,
  type LayoutChangeEvent,
} from "react-native";
import { Video, ResizeMode } from "expo-av";
import { Feather } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import type { EventStoryWithUser } from "@/lib/supabase/stories";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const DEFAULT_DURATION = 5000; // 5 seconds per story
const VIDEO_MAX_DURATION = 30000; // 30 seconds max for videos

function formatTimeAgo(isoDate: string): string {
  const date = new Date(isoDate);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function getInitials(name: string | null): string {
  if (!name) return "?";
  const parts = name.trim().split(" ").filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

export type StorySlide = {
  id: string;
  type: "image" | "video" | "hero";
  uri: string;
  duration?: number;
  // User info (only for user stories, not hero)
  userName?: string | null;
  userAvatarUrl?: string | null;
  caption?: string | null;
  createdAt?: string | null;
};

export type StoriesHeroSliderProps = {
  heroImageUrl?: string | null;
  stories: ReadonlyArray<EventStoryWithUser>;
  height: number;
  onSlideChange?: (index: number) => void;
};

function buildSlides(
  heroImageUrl: string | null | undefined,
  stories: ReadonlyArray<EventStoryWithUser>
): StorySlide[] {
  const slides: StorySlide[] = [];

  // First slide is always the hero image if available
  if (heroImageUrl) {
    slides.push({
      id: "hero",
      type: "hero",
      uri: heroImageUrl,
      duration: DEFAULT_DURATION,
    });
  }

  // Add user stories
  for (const story of stories) {
    const isVideo =
      story.photoUrl.includes(".mp4") ||
      story.photoUrl.includes(".mov") ||
      story.photoUrl.includes(".webm");

    slides.push({
      id: story.id,
      type: isVideo ? "video" : "image",
      uri: story.photoUrl,
      duration: isVideo ? VIDEO_MAX_DURATION : DEFAULT_DURATION,
      userName: story.userName,
      userAvatarUrl: story.userAvatarUrl,
      caption: story.caption,
      createdAt: story.createdAt,
    });
  }

  return slides;
}

export default function StoriesHeroSlider({
  heroImageUrl,
  stories,
  height,
  onSlideChange,
}: StoriesHeroSliderProps): ReactElement {
  const { t } = useTranslation();
  const slides = useMemo(
    () => buildSlides(heroImageUrl, stories),
    [heroImageUrl, stories]
  );
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [videoDuration, setVideoDuration] = useState<number | null>(null);

  // Create animated values for each slide - recreate when slide count changes
  const [progressAnims, setProgressAnims] = useState<Animated.Value[]>(() =>
    slides.map(() => new Animated.Value(0))
  );
  const progressAnimation = useRef<Animated.CompositeAnimation | null>(null);
  const videoRef = useRef<Video>(null);
  const containerWidth = useRef(SCREEN_WIDTH);

  // Update animations array when slides change
  useEffect(() => {
    if (progressAnims.length !== slides.length) {
      setProgressAnims(slides.map(() => new Animated.Value(0)));
      setCurrentIndex(0);
    }
  }, [slides.length]);

  const goToSlide = useCallback(
    (index: number) => {
      if (index < 0 || index >= slides.length) return;

      // Stop current animation
      if (progressAnimation.current) {
        progressAnimation.current.stop();
      }

      // Reset all progress bars
      progressAnims.forEach((anim, i) => {
        if (i < index) {
          anim.setValue(1); // Completed
        } else {
          anim.setValue(0); // Not started
        }
      });

      setCurrentIndex(index);
      setVideoDuration(null);
      onSlideChange?.(index);
    },
    [slides.length, progressAnims, onSlideChange]
  );

  const goNext = useCallback(() => {
    if (currentIndex < slides.length - 1) {
      goToSlide(currentIndex + 1);
    } else {
      // Loop back to start or stay at end
      goToSlide(0);
    }
  }, [currentIndex, slides.length, goToSlide]);

  const goPrev = useCallback(() => {
    // If we're more than 2 seconds in, restart current slide
    // Otherwise go to previous
    const currentAnim = progressAnims[currentIndex];
    const currentProgress = currentAnim ? (currentAnim as any)._value : 0;
    if (currentProgress > 0.3 || currentIndex === 0) {
      goToSlide(currentIndex); // Restart current
    } else {
      goToSlide(currentIndex - 1);
    }
  }, [currentIndex, progressAnims, goToSlide]);

  // Animate progress bar
  useEffect(() => {
    if (isPaused || slides.length === 0) return;

    const currentSlide = slides[currentIndex];
    if (!currentSlide) return;

    // Safety check - ensure animation exists for current index
    const currentAnim = progressAnims[currentIndex];
    if (!currentAnim) return;

    // For videos, wait for duration to be known
    if (currentSlide.type === "video" && !videoDuration) return;

    const duration =
      currentSlide.type === "video" && videoDuration
        ? Math.min(videoDuration, VIDEO_MAX_DURATION)
        : currentSlide.duration || DEFAULT_DURATION;

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
  }, [currentIndex, isPaused, videoDuration, slides, progressAnims, goNext]);

  const handlePress = (e: GestureResponderEvent) => {
    const x = e.nativeEvent.locationX;
    const threshold = containerWidth.current / 3;

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

  const handleLayout = (e: LayoutChangeEvent) => {
    containerWidth.current = e.nativeEvent.layout.width;
  };

  const handleVideoLoad = (status: any) => {
    if (status.durationMillis) {
      setVideoDuration(status.durationMillis);
    }
  };

  const handleVideoEnd = () => {
    goNext();
  };

  // If no slides, show placeholder
  if (slides.length === 0) {
    return (
      <View
        style={{ width: SCREEN_WIDTH, height }}
        className="bg-gray200"
        onLayout={handleLayout}
      />
    );
  }

  const currentSlide = slides[currentIndex];
  const isUserStory = currentSlide?.type !== "hero";
  const storyCount = stories.length;

  return (
    <View
      style={{ width: SCREEN_WIDTH, height }}
      className="relative bg-black"
      onLayout={handleLayout}
    >
      {/* Progress bars */}
      <View className="absolute top-3 left-3 right-3 z-20 flex-row gap-x-1">
        {slides.map((slide, index) => {
          const anim = progressAnims[index];
          // Safety check - skip rendering if animation not ready
          if (!anim) return null;

          return (
            <View
              key={slide.id}
              className="flex-1 h-1 bg-white/30 rounded-full overflow-hidden"
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

      {/* User info header (only for user stories) */}
      {isUserStory && currentSlide && (
        <View className="absolute top-8 left-3 right-3 z-20 flex-row items-center">
          {/* User Avatar */}
          {currentSlide.userAvatarUrl ? (
            <Image
              source={{ uri: currentSlide.userAvatarUrl }}
              className="h-9 w-9 rounded-full bg-white/20"
              resizeMode="cover"
            />
          ) : (
            <View className="h-9 w-9 rounded-full bg-white/20 items-center justify-center">
              <Text className="text-white text-xs font-semibold">
                {getInitials(currentSlide.userName ?? null)}
              </Text>
            </View>
          )}

          <View className="ml-2 flex-1">
            <Text className="text-white font-semibold text-sm" numberOfLines={1}>
              {currentSlide.userName || t("event.stories.anonymous")}
            </Text>
            {currentSlide.createdAt && (
              <Text className="text-white/60 text-xs">
                {formatTimeAgo(currentSlide.createdAt)}
              </Text>
            )}
          </View>
        </View>
      )}

      {/* Hero image label */}


      {/* Media content */}
      <Pressable
        onPress={handlePress}
        onLongPress={handleLongPressIn}
        onPressOut={handleLongPressOut}
        delayLongPress={200}
        className="flex-1"
      >
        {currentSlide?.type === "video" ? (
          <Video
            ref={videoRef}
            source={{ uri: currentSlide.uri }}
            style={{ width: "100%", height: "100%" }}
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
            source={{ uri: currentSlide?.uri }}
            className="w-full h-full"
            resizeMode="cover"
          />
        )}
      </Pressable>

      {/* Caption overlay (for user stories with captions) */}
      {isUserStory && currentSlide?.caption && (
        <View className="absolute bottom-16 left-3 right-3 z-20">
          <View className="bg-black/50 rounded-xl px-3 py-2">
            <Text className="text-white text-sm leading-5" numberOfLines={3}>
              {currentSlide.caption}
            </Text>
          </View>
        </View>
      )}

      {/* Pause indicator */}
      {isPaused && (
        <View className="absolute inset-0 items-center justify-center z-10 pointer-events-none">
          <View className="bg-black/40 rounded-full p-3">
            <Feather name="pause" size={24} color="#FFFFFF" />
          </View>
        </View>
      )}

      {/* Story indicator dots (shown at bottom) */}
      {slides.length > 1 && (
        <View className="absolute bottom-3 left-0 right-0 flex-row justify-center gap-x-1.5">
          {slides.map((slide, index) => (
            <Pressable
              key={slide.id}
              onPress={() => goToSlide(index)}
              hitSlop={8}
            >
              <View
                className={`w-2 h-2 rounded-full ${
                  index === currentIndex ? "bg-white" : "bg-white/40"
                }`}
              />
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}
