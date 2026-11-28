// components/event/SuggestSongsModal.tsx
import React, { useEffect, useMemo, useState, type ReactElement } from "react";
import {
  Alert,
  Dimensions,
  Image,
  Keyboard,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View,
  type ViewProps,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

import {
  createDeezerSongSuggestion,
  deleteMySongSuggestionById,
  getMySongSuggestionsForEvent,
  type MySongSuggestion,
} from "@/lib/supabase/songSuggestions";

export type SuggestSongsModalProps = Readonly<
  {
    visible: boolean;
    eventId: string;
    eventTitle: string;
    onClose: () => void;
  } & Omit<ViewProps, "children">
>;

const cx = (...c: ReadonlyArray<string | null | undefined | false>): string =>
  c.filter(Boolean).join(" ");

const { height: SCREEN_HEIGHT } = Dimensions.get("window");
const MODAL_HEIGHT = Math.round(SCREEN_HEIGHT * 0.8);

type DeezerTrack = Readonly<{
  id: number;
  title: string;
  link?: string;
  artist?: { id: number; name: string };
  album?: {
    id: number;
    title: string;
    cover_small?: string;
    cover_medium?: string;
    cover_big?: string;
  };
}>;

async function searchDeezerTracks(q: string): Promise<ReadonlyArray<DeezerTrack>> {
  const query = q.trim();
  if (!query) return [];

  const url = `https://api.deezer.com/search/track?q=${encodeURIComponent(query)}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Deezer search failed (${res.status})`);

  const json = (await res.json()) as any;
  const data = Array.isArray(json?.data) ? (json.data as any[]) : [];

  return data
    .map((r) => ({
      id: Number(r?.id),
      title: String(r?.title ?? ""),
      link: r?.link ? String(r.link) : undefined,
      artist: r?.artist ? { id: Number(r.artist.id), name: String(r.artist.name ?? "") } : undefined,
      album: r?.album
        ? {
            id: Number(r.album.id),
            title: String(r.album.title ?? ""),
            cover_small: r.album.cover_small ? String(r.album.cover_small) : undefined,
            cover_medium: r.album.cover_medium ? String(r.album.cover_medium) : undefined,
            cover_big: r.album.cover_big ? String(r.album.cover_big) : undefined,
          }
        : undefined,
    }))
    .filter((t) => Number.isFinite(t.id) && t.title.length > 0);
}

function Tab({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}): ReactElement {
  return (
    <Pressable onPress={onPress} className={cx("px-6 pb-3", selected ? "" : "opacity-70")}>
      <Text className={cx("text-base", selected ? "text-black" : "text-gray600")}>{label}</Text>
      <View className={cx("mt-3 h-0.5 rounded-full", selected ? "bg-black" : "bg-transparent")} />
    </Pressable>
  );
}

function PillButton({
  label,
  onPress,
  disabled,
  tone = "dark",
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  tone?: "dark" | "light";
}): ReactElement {
  const isDisabled = Boolean(disabled);
  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      className={cx(
        "rounded-2xl px-4 py-2 items-center justify-center",
        tone === "dark" ? "bg-gray800" : "bg-gray100 border border-gray200",
        isDisabled ? "opacity-50" : "active:opacity-90"
      )}
    >
      <Text className={tone === "dark" ? "text-white font-medium" : "text-gray900 font-medium"}>{label}</Text>
    </Pressable>
  );
}

function RowDivider(): ReactElement {
  return <View className="h-px bg-gray200" />;
}

export default function SuggestSongsModal({
  visible,
  eventId,
  eventTitle,
  onClose,
  ...rest
}: SuggestSongsModalProps): ReactElement {
  const { t } = useTranslation();
  const translate = t;
  const [tab, setTab] = useState<"search" | "mine">("search");

  const [query, setQuery] = useState<string>("");
  const [searching, setSearching] = useState<boolean>(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [results, setResults] = useState<ReadonlyArray<DeezerTrack>>([]);

  const [myLoading, setMyLoading] = useState<boolean>(false);
  const [myError, setMyError] = useState<string | null>(null);
  const [mySuggestions, setMySuggestions] = useState<ReadonlyArray<MySongSuggestion>>([]);

  const [suggestingTrackIds, setSuggestingTrackIds] = useState<Set<string>>(new Set());
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());

  const suggestedTrackIdSet = useMemo(() => {
    const s = new Set<string>();
    for (const r of mySuggestions) s.add(String(r.deezerTrackId));
    return s;
  }, [mySuggestions]);

  const canSearch = useMemo(() => query.trim().length > 0 && !searching, [query, searching]);

  async function refreshMine(): Promise<void> {
    const id = String(eventId ?? "").trim();
    if (!id) return;

    try {
      setMyLoading(true);
      setMyError(null);
      const rows = await getMySongSuggestionsForEvent(id);
      setMySuggestions(rows);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setMyError(msg);
      setMySuggestions([]);
    } finally {
      setMyLoading(false);
    }
  }

  useEffect(() => {
    if (!visible) return;
    refreshMine().catch(() => {});
  }, [visible, eventId]);

  useEffect(() => {
    if (!visible) {
      setTab("search");
      setQuery("");
      setSearching(false);
      setSearchError(null);
      setResults([]);
      setMyError(null);
      setSuggestingTrackIds(new Set());
      setDeletingIds(new Set());
    }
  }, [visible]);

  const onRunSearch = async (): Promise<void> => {
    if (!canSearch) return;

    try {
      setSearching(true);
      setSearchError(null);
      const tracks = await searchDeezerTracks(query);
      setResults(tracks);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setSearchError(msg);
      setResults([]);
    } finally {
      setSearching(false);
    }
  };

  const onSuggest = async (t: DeezerTrack): Promise<void> => {
    Keyboard.dismiss();

    const tid = String(t.id);
    if (!tid) return;
    if (suggestedTrackIdSet.has(tid)) return;

    setSuggestingTrackIds((cur) => new Set(cur).add(tid));
    try {
      await createDeezerSongSuggestion({
        eventId: String(eventId),
        deezerTrackId: tid,
        trackTitle: String(t.title ?? ""),
        artistName: String(t.artist?.name ?? ""),
        deezerArtistId: t.artist?.id != null ? String(t.artist.id) : null,
        deezerAlbumId: t.album?.id != null ? String(t.album.id) : null,
        albumTitle: t.album?.title ? String(t.album.title) : null,
        artworkUrl: t.album?.cover_medium ?? t.album?.cover_small ?? null,
        deezerLink: t.link ?? null,
      });

      await refreshMine();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      Alert.alert(translate("event.songs.couldNotSuggest"), msg);
    } finally {
      setSuggestingTrackIds((cur) => {
        const next = new Set(cur);
        next.delete(tid);
        return next;
      });
    }
  };

  const onDeleteSuggestion = async (s: MySongSuggestion): Promise<void> => {
    const sid = String(s.id);
    if (!sid) return;

    Alert.alert(t("event.songs.removePromptTitle"), `"${s.trackTitle}" — ${s.artistName}`, [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("event.songs.remove"),
        style: "destructive",
        onPress: async () => {
          setDeletingIds((cur) => new Set(cur).add(sid));
          try {
            await deleteMySongSuggestionById(sid);
            await refreshMine();
          } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : String(e);
            Alert.alert(t("event.songs.couldNotRemove"), msg);
          } finally {
            setDeletingIds((cur) => {
              const next = new Set(cur);
              next.delete(sid);
              return next;
            });
          }
        },
      },
    ]);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      {/* Backdrop: tap to close + dismiss keyboard */}
      <Pressable
        onPress={() => {
          Keyboard.dismiss();
          onClose();
        }}
        className="flex-1 bg-black/40"
        accessibilityHint={t("event.songs.closeHint")}
      />

      <View
        {...rest}
        className="absolute left-5 right-5 top-1/2 -translate-y-1/2 rounded-3xl bg-white"
        style={{ elevation: 6, height: MODAL_HEIGHT }}
      >
        {/* Modal surface: tap anywhere non-input to dismiss keyboard */}
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <View className="flex-1">
            {/* Header */}
            <View className="px-5 pt-5 pb-3">
              <View className="flex-row items-start justify-between">
                <View className="flex-row items-center gap-x-2">
                  <Feather name="music" size={20} color="#111827" />
                  <Text className="text-2xl font-semibold text-black">{t("event.songs.title")}</Text>
                </View>

                <Pressable
                  onPress={() => {
                    Keyboard.dismiss();
                    onClose();
                  }}
                  accessibilityLabel={t("event.songs.closeA11y")}
                  hitSlop={12}
                >
                  <Feather name="x" size={20} color="#6B7280" />
                </Pressable>
              </View>

              <Text className="mt-2 text-gray600">
                {t("event.songs.description")}{" "}
                <Text className="font-medium text-gray800">{eventTitle}</Text>
              </Text>
            </View>

            {/* Tabs */}
            <View className="px-3">
              <View className="flex-row items-end justify-center">
                <Tab label={t("event.songs.tabSearch")} selected={tab === "search"} onPress={() => setTab("search")} />
                <Tab
                  label={t("event.songs.tabMine")}
                  selected={tab === "mine"}
                  onPress={() => {
                    Keyboard.dismiss();
                    setTab("mine");
                    refreshMine().catch(() => {});
                  }}
                />
              </View>
              <RowDivider />
            </View>

            {/* Scrollable body */}
            <ScrollView
              className="flex-1"
              contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16 }}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
            >
              {tab === "search" ? (
                <>
                  {/* Search row */}
                  <View className="flex-row items-center gap-x-3">
                    <View className="flex-1 flex-row items-center rounded-2xl bg-gray100 border border-gray200 px-4 py-3">
                      <Feather name="search" size={18} color="#6B7280" />
                      <TextInput
                        value={query}
                        onChangeText={setQuery}
                        placeholder={t("event.songs.searchPlaceholder")}
                        placeholderTextColor="#9CA3AF"
                        className="ml-3 flex-1 text-gray900"
                        returnKeyType="search"
                        onSubmitEditing={onRunSearch}
                      />
                    </View>

                    <PillButton label={searching ? "…" : t("event.songs.search")} onPress={onRunSearch} disabled={!canSearch} tone="dark" />
                  </View>

                  {searchError ? <Text className="mt-3 text-sm text-red-600">{searchError}</Text> : null}

                  {/* Results */}
                  {results.length === 0 ? (
                    <View className="mt-10 items-center justify-center">
                      <Feather name="search" size={56} color="#9CA3AF" />
                      <Text className="mt-4 text-gray600 text-base">
                        {searching ? t("event.songs.searching") : t("event.songs.searchPrompt")}
                      </Text>
                    </View>
                  ) : (
                    <View className="mt-4 rounded-2xl border border-gray200 overflow-hidden">
                      {results.slice(0, 8).map((track, idx) => {
                        const tid = String(track.id);
                        const already = suggestedTrackIdSet.has(tid);
                        const busy = suggestingTrackIds.has(tid);
                        const cover = track.album?.cover_medium ?? track.album?.cover_small;

                        return (
                          <View key={tid}>
                            <View className="flex-row items-center px-3 py-3 bg-white">
                              <View className="h-12 w-12 rounded-xl bg-gray100 overflow-hidden items-center justify-center">
                                {cover ? (
                                  <Image source={{ uri: cover }} className="h-12 w-12" resizeMode="cover" />
                                ) : (
                                  <Feather name="music" size={18} color="#9CA3AF" />
                                )}
                              </View>

                              <View className="flex-1 ml-3">
                                <Text className="text-sm font-semibold text-gray900" numberOfLines={1}>
                                  {track.title}
                                </Text>
                                <Text className="text-xs text-gray600" numberOfLines={1}>
                                  {track.artist?.name ?? t("event.songs.unknownArtist")}
                                </Text>
                              </View>

                              {already ? (
                                <View className="flex-row items-center gap-x-1">
                                  <Feather name="check" size={16} color="#16A34A" />
                                  <Text className="text-xs text-green-700 font-medium">{t("event.songs.suggested")}</Text>
                                </View>
                              ) : (
                                <PillButton label={busy ? "…" : t("event.songs.suggest")} onPress={() => onSuggest(track)} disabled={busy} tone="dark" />
                              )}
                            </View>

                            {idx < Math.min(results.length, 8) - 1 ? <RowDivider /> : null}
                          </View>
                        );
                      })}
                    </View>
                  )}
                </>
              ) : (
                <>
                  {myLoading ? <Text className="text-sm text-gray600">{t("event.songs.loadingMine")}</Text> : null}
                  {myError ? <Text className="mt-2 text-sm text-red-600">{myError}</Text> : null}

                  {!myLoading && mySuggestions.length === 0 ? (
                    <View className="mt-10 items-center justify-center">
                      <Feather name="music" size={56} color="#9CA3AF" />
                      <Text className="mt-4 text-gray600 text-base">{t("event.songs.noneTitle")}</Text>
                      <Text className="mt-1 text-gray500 text-sm text-center">
                        {t("event.songs.noneSubtitle")}
                      </Text>
                    </View>
                  ) : (
                    <View className="mt-3 rounded-2xl border border-gray200 overflow-hidden">
                      {mySuggestions.map((s, idx) => {
                        const busy = deletingIds.has(String(s.id));
                        return (
                          <View key={s.id}>
                            <View className="flex-row items-center px-3 py-3 bg-white">
                              <View className="h-12 w-12 rounded-xl bg-gray100 overflow-hidden items-center justify-center">
                                {s.artworkUrl ? (
                                  <Image source={{ uri: s.artworkUrl }} className="h-12 w-12" resizeMode="cover" />
                                ) : (
                                  <Feather name="music" size={18} color="#9CA3AF" />
                                )}
                              </View>

                              <View className="flex-1 ml-3">
                                <Text className="text-sm font-semibold text-gray900" numberOfLines={1}>
                                  {s.trackTitle}
                                </Text>
                                <Text className="text-xs text-gray600" numberOfLines={1}>
                                  {s.artistName}
                                </Text>
                              </View>

                              <Pressable
                                onPress={() => onDeleteSuggestion(s)}
                                disabled={busy}
                                className={busy ? "opacity-50" : "active:opacity-80"}
                                hitSlop={10}
                              >
                                <Feather name="trash-2" size={18} color="#6B7280" />
                              </Pressable>
                            </View>

                            {idx < mySuggestions.length - 1 ? <RowDivider /> : null}
                          </View>
                        );
                      })}
                    </View>
                  )}
                </>
              )}
            </ScrollView>

            {/* Footer (pinned) */}
            <View className="px-5 pb-5 pt-2">
              <Pressable
                onPress={() => {
                  Keyboard.dismiss();
                  onClose();
                }}
                className="w-full rounded-2xl border border-gray300 bg-white px-5 py-3 items-center justify-center active:opacity-90"
              >
                <Text className="text-gray900 font-medium">{t("event.songs.close")}</Text>
              </Pressable>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </View>
    </Modal>
  );
}
