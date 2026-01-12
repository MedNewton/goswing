// src/lib/supabase/songSuggestions.ts
import { supabase } from "@/lib/supabase";

function asString(v: unknown): string {
  return typeof v === "string" ? v : String(v ?? "");
}

function normalizeNullableString(v: unknown): string | null {
  if (v == null) return null;
  const s = typeof v === "string" ? v.trim() : String(v).trim();
  return s.length ? s : null;
}

export type CreateDeezerSongSuggestionInput = Readonly<{
  eventId: string;

  deezerTrackId: string;
  trackTitle: string;
  artistName: string;

  deezerArtistId?: string | null;
  deezerAlbumId?: string | null;
  albumTitle?: string | null;

  artworkUrl?: string | null;
  deezerLink?: string | null;

  reservationId?: string | null; // optional if your table has reservation_id
}>;

export type MySongSuggestion = Readonly<{
  id: string;

  deezerTrackId: string;
  trackTitle: string;
  artistName: string;

  deezerArtistId: string | null;
  deezerAlbumId: string | null;
  albumTitle: string | null;

  artworkUrl: string | null;
  deezerLink: string | null;

  createdAt: string;
}>;

export async function createDeezerSongSuggestion(
  input: CreateDeezerSongSuggestionInput
): Promise<void> {
  const eventId = asString(input.eventId).trim();
  if (!eventId) throw new Error("Missing eventId.");

  const deezerTrackId = asString(input.deezerTrackId).trim();
  if (!deezerTrackId) throw new Error("Missing deezerTrackId.");

  const trackTitle = asString(input.trackTitle).trim();
  if (!trackTitle) throw new Error("Missing trackTitle.");

  const artistName = asString(input.artistName).trim();
  if (!artistName) throw new Error("Missing artistName.");

  const payload: Record<string, unknown> = {
    event_id: eventId,
    deezer_track_id: deezerTrackId,
    track_title: trackTitle,
    artist_name: artistName,
    deezer_artist_id: normalizeNullableString(input.deezerArtistId),
    deezer_album_id: normalizeNullableString(input.deezerAlbumId),
    album_title: normalizeNullableString(input.albumTitle),
    artwork_url: normalizeNullableString(input.artworkUrl),
    deezer_link: normalizeNullableString(input.deezerLink),
  };

  const reservationId = normalizeNullableString(input.reservationId);
  if (reservationId) payload.reservation_id = reservationId;

  const { error } = await supabase.from("event_song_suggestions").insert(payload);

  if (error) {
    const msg = String(error.message ?? "");
    // Friendly duplicate handling (unique constraint)
    if (msg.toLowerCase().includes("duplicate") || msg.toLowerCase().includes("unique")) {
      throw new Error("You already suggested this song for this event.");
    }
    throw new Error(msg || "Failed to submit song suggestion.");
  }
}

export async function getMySongSuggestionsForEvent(
  eventId: string
): Promise<ReadonlyArray<MySongSuggestion>> {
  const id = asString(eventId).trim();
  if (!id) throw new Error("Missing eventId.");

  const { data, error } = await supabase
    .from("event_song_suggestions")
    .select(
      "id, deezer_track_id, track_title, artist_name, deezer_artist_id, deezer_album_id, album_title, artwork_url, deezer_link, created_at"
    )
    .eq("event_id", id)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  const rows = (data ?? []) as any[];

  return rows.map((r) => ({
    id: asString(r.id),
    deezerTrackId: asString(r.deezer_track_id),
    trackTitle: asString(r.track_title),
    artistName: asString(r.artist_name),
    deezerArtistId: normalizeNullableString(r.deezer_artist_id),
    deezerAlbumId: normalizeNullableString(r.deezer_album_id),
    albumTitle: normalizeNullableString(r.album_title),
    artworkUrl: normalizeNullableString(r.artwork_url),
    deezerLink: normalizeNullableString(r.deezer_link),
    createdAt: asString(r.created_at),
  }));
}

export async function deleteMySongSuggestionById(id: string): Promise<void> {
  const suggestionId = asString(id).trim();
  if (!suggestionId) throw new Error("Missing suggestion id.");

  const { error } = await supabase
    .from("event_song_suggestions")
    .delete()
    .eq("id", suggestionId);

  if (error) throw new Error(error.message);
}
