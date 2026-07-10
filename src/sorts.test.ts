import { describe, expect, it } from "vitest";
import { sortLabel, sortOptions } from "./sorts";

describe("Hydrus sort translation", () => {
  it("uses the supported Hydrus sort enum values", () => {
    expect(sortOptions.map(([id]) => id)).toEqual([
      2, 14, 19, 18, 0, 1, 5, 6, 8, 7, 9, 3, 4,
    ]);
    expect(sortLabel(2)).toBe("Import date");
    expect(sortLabel(999)).toBe("Import date");
  });
});
