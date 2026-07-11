import { describe, expect, it } from "vitest";
import { SessionMediaCache, surroundingFileIds } from "./sessionMediaCache";

describe("session media cache", () => {
  it("keeps recently used blobs and evicts the least recently used entry", () => {
    const revoked: string[] = [];
    let nextUrl = 0;
    const cache = new SessionMediaCache(
      10,
      () => `blob:${++nextUrl}`,
      (url) => revoked.push(url),
    );
    cache.put(1, new Blob(["1234"]));
    cache.put(2, new Blob(["5678"]));
    cache.get(1);
    cache.put(3, new Blob(["abcd"]));
    expect(cache.has(1)).toBe(true);
    expect(cache.has(2)).toBe(false);
    expect(cache.has(3)).toBe(true);
    expect(cache.stats()).toEqual({ count: 2, bytes: 8 });
    expect(revoked).toEqual(["blob:2"]);
  });

  it("prioritizes the next item, current item, and then both directions", () => {
    expect(surroundingFileIds([10, 11, 12, 13, 14], 2)).toEqual([
      13, 12, 11, 14, 10,
    ]);
  });
});
