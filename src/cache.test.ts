import { describe, expect, it } from "vitest";
import { mergeMetadataCache } from "./cache";
import type { Media } from "./types";

const media = (fileId: number) => ({ fileId }) as Media;

describe("bounded metadata cache", () => {
  it("refreshes recent entries and evicts the oldest", () => {
    const current = new Map([
      [1, media(1)],
      [2, media(2)],
      [3, media(3)],
    ]);
    const result = mergeMetadataCache(current, [media(2), media(4)], 3);
    expect([...result.keys()]).toEqual([3, 2, 4]);
  });
});
