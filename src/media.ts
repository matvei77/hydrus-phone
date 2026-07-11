import type { Media } from "./types";

export type MediaKind = "image" | "video" | "audio" | "other";

const hydrusRenderedImageExtensions = new Set(["jxl"]);

export function needsHydrusRender(media: Pick<Media, "ext">) {
  return hydrusRenderedImageExtensions.has(
    media.ext.replace(/^\./, "").toLowerCase(),
  );
}

export function mediaFileUrl(media: Pick<Media, "fileId" | "ext">) {
  return `/api/media/${media.fileId}/${needsHydrusRender(media) ? "render" : "file"}`;
}

export function classifyMedia(media: Pick<Media, "ext">): MediaKind {
  const extension = media.ext.replace(/^\./, "").toLowerCase();
  if (
    [
      "jpg",
      "jpeg",
      "png",
      "apng",
      "webp",
      "gif",
      "bmp",
      "avif",
      ...hydrusRenderedImageExtensions,
    ].includes(extension)
  )
    return "image";
  if (["mp4", "webm", "m4v", "ogv"].includes(extension)) return "video";
  if (["mp3", "ogg", "opus", "wav", "m4a", "aac", "flac"].includes(extension))
    return "audio";
  return "other";
}
