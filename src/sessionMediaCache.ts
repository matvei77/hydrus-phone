export const SESSION_MEDIA_CACHE_LIMIT = 200 * 1024 * 1024;
export const SESSION_MEDIA_ITEM_LIMIT = 24 * 1024 * 1024;
export const SESSION_VIDEO_BUFFER_LIMIT = 8 * 1024 * 1024;

export const shouldBufferVideo = (bytes: number) =>
  bytes > 0 && bytes <= SESSION_VIDEO_BUFFER_LIMIT;

export type SessionMediaEntry = {
  url: string;
  bytes: number;
};

export class SessionMediaCache {
  private entries = new Map<number, SessionMediaEntry>();
  private totalBytes = 0;

  constructor(
    private readonly limit = SESSION_MEDIA_CACHE_LIMIT,
    private readonly createUrl = (blob: Blob) => URL.createObjectURL(blob),
    private readonly revokeUrl = (url: string) => URL.revokeObjectURL(url),
  ) {}

  has(fileId: number) {
    return this.entries.has(fileId);
  }

  get(fileId: number) {
    const entry = this.entries.get(fileId);
    if (!entry) return undefined;
    this.entries.delete(fileId);
    this.entries.set(fileId, entry);
    return entry;
  }

  put(fileId: number, blob: Blob, protectedFileIds: Iterable<number> = []) {
    if (!blob.size || blob.size > SESSION_MEDIA_ITEM_LIMIT) return undefined;
    const protectedSet = new Set(protectedFileIds);
    const previous = this.entries.get(fileId);
    if (previous) {
      this.entries.delete(fileId);
      this.totalBytes -= previous.bytes;
      this.revokeUrl(previous.url);
    }
    const entry = { url: this.createUrl(blob), bytes: blob.size };
    this.entries.set(fileId, entry);
    this.totalBytes += entry.bytes;
    while (this.totalBytes > this.limit) {
      const oldest =
        [...this.entries.entries()].find(
          ([candidateId]) => !protectedSet.has(candidateId),
        ) ??
        (this.entries.entries().next().value as
          | [number, SessionMediaEntry]
          | undefined);
      if (!oldest) break;
      this.entries.delete(oldest[0]);
      this.totalBytes -= oldest[1].bytes;
      this.revokeUrl(oldest[1].url);
    }
    return this.entries.has(fileId) ? entry : undefined;
  }

  stats() {
    return { count: this.entries.size, bytes: this.totalBytes };
  }

  clear() {
    this.entries.forEach((entry) => this.revokeUrl(entry.url));
    this.entries.clear();
    this.totalBytes = 0;
  }
}

export function protectedNavigationIds(
  fileIds: number[],
  position: number,
  radius = 2,
) {
  return fileIds.slice(
    Math.max(0, position - radius),
    Math.min(fileIds.length, position + radius + 1),
  );
}

export function surroundingFileIds(
  fileIds: number[],
  position: number,
  maximum = 160,
) {
  const result: number[] = [];
  for (let distance = 1; result.length < maximum; distance++) {
    const forward = position + distance;
    const backward = position - distance;
    if (forward >= fileIds.length && backward < 0) break;
    if (forward < fileIds.length) result.push(fileIds[forward]);
    if (distance === 1 && result.length < maximum)
      result.push(fileIds[position]);
    if (backward >= 0 && result.length < maximum)
      result.push(fileIds[backward]);
  }
  return result;
}

export const sessionMediaCache = new SessionMediaCache();
