import type { Media } from "./types";

export const METADATA_CACHE_LIMIT = 768;

export function mergeMetadataCache(
  current: Map<number, Media>,
  incoming: Media[],
  limit = METADATA_CACHE_LIMIT,
) {
  const next = new Map(current);
  for (const media of incoming) {
    next.delete(media.fileId);
    next.set(media.fileId, media);
  }
  while (next.size > limit) {
    const oldest = next.keys().next().value;
    if (oldest === undefined) break;
    next.delete(oldest);
  }
  return next;
}
