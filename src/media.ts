import type { Media } from "./types";

export type MediaKind = "image" | "video" | "audio" | "other";

export function classifyMedia(media: Pick<Media, "ext">): MediaKind {
  const extension = media.ext.replace(/^\./, "").toLowerCase();
  if (
    ["jpg", "jpeg", "png", "apng", "webp", "gif", "bmp", "avif"].includes(
      extension,
    )
  )
    return "image";
  if (["mp4", "webm", "m4v", "ogv"].includes(extension)) return "video";
  if (["mp3", "ogg", "opus", "wav", "m4a", "aac", "flac"].includes(extension))
    return "audio";
  return "other";
}
