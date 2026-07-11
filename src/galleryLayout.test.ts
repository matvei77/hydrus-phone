import { describe, expect, it } from "vitest";
import { buildJustifiedRows, mediaAspectRatio } from "./galleryLayout";
import type { Media } from "./types";

const item = (fileId: number, width: number, height: number) =>
  ({ fileId, width, height }) as Media;

describe("justified gallery layout", () => {
  it("preserves portrait and landscape proportions while closing full rows", () => {
    const media = new Map([
      [1, item(1, 1600, 900)],
      [2, item(2, 800, 1200)],
      [3, item(3, 1000, 1000)],
    ]);
    const rows = buildJustifiedRows([1, 2, 3], media, 400, 150, 8);
    expect(rows).toHaveLength(1);
    expect(rows[0].items.map((entry) => entry.ratio)).toEqual([
      1600 / 900,
      800 / 1200,
      1,
    ]);
    expect(
      rows[0].items.reduce((sum, entry) => sum + entry.width, 0) + 16,
    ).toBeCloseTo(400);
  });

  it("leaves the final incomplete row at its natural target height", () => {
    const media = new Map([[1, item(1, 1600, 900)]]);
    const [row] = buildJustifiedRows([1], media, 400, 150, 8);
    expect(row.height).toBe(150);
    expect(row.items[0].width).toBeCloseTo(266.67, 1);
  });

  it("uses a square fallback and bounds pathological ratios", () => {
    expect(mediaAspectRatio()).toBe(1);
    expect(mediaAspectRatio({ width: 1, height: 100 })).toBe(0.35);
    expect(mediaAspectRatio({ width: 100, height: 1 })).toBe(4);
  });
});
