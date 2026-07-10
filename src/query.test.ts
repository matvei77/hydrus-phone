import { describe, expect, it } from "vitest";
import {
  activeFilterCount,
  filtersToPredicates,
  queryKey,
  restoreQuery,
  serializeQuery,
  toSearchPayload,
  tokensToPredicates,
} from "./query";
import { defaultFilters, defaultQuery } from "./types";

describe("Hydrus query construction", () => {
  it("builds positive, negative, raw system, and nested OR predicates", () => {
    expect(
      tokensToPredicates([
        { id: "1", kind: "include", value: "creator:sam" },
        { id: "2", kind: "exclude", value: "spoiler" },
        { id: "3", kind: "or", value: "red|blue", values: ["red", "blue"] },
        { id: "4", kind: "system", value: "system:inbox" },
      ]),
    ).toEqual(["creator:sam", "-spoiler", ["red", "blue"], "system:inbox"]);
  });
  it("translates ordinary filters into Hydrus predicates", () => {
    const f = {
      ...defaultFilters,
      media: "video",
      state: "archive",
      duration: "long",
      orientation: "landscape",
      minWidth: "1920",
      maxSizeMb: "500",
      audio: "yes",
      durationMin: "45",
      durationMax: "120",
      aspectMin: "1.2",
      aspectMax: "2.4",
    };
    expect(filtersToPredicates(f, new Date("2026-07-10T12:00:00Z"))).toEqual(
      expect.arrayContaining([
        "system:filetype is video",
        "system:archive",
        "system:duration > 5 minutes",
        "system:duration < 30 minutes",
        "system:ratio wider than 1:1",
        "system:width > 1919",
        "system:filesize < 500MB",
        "system:has audio",
        "system:ratio wider than 6:5",
        "system:ratio taller than 12:5",
      ]),
    );
  });
  it("translates custom duration bounds", () => {
    expect(
      filtersToPredicates({
        ...defaultFilters,
        duration: "custom",
        durationMin: "45",
        durationMax: "120",
      }),
    ).toEqual([
      "system:duration > 45 seconds",
      "system:duration < 120 seconds",
    ]);
  });
  it("serializes and restores deterministic URL-safe state", () => {
    const q = {
      ...defaultQuery,
      tokens: [{ id: "a", kind: "include" as const, value: "series:one" }],
      limit: 900,
    };
    expect(restoreQuery(serializeQuery(q))).toEqual(q);
    expect(queryKey(q)).toBe(queryKey({ ...q }));
  });
  it("includes result limit and sort in the gateway payload", () =>
    expect(
      toSearchPayload({
        ...defaultQuery,
        limit: 500,
        sort: 2,
        ascending: false,
      }),
    ).toMatchObject({ limit: 500, sort: 2, ascending: false }));
  it("counts only active filter controls", () =>
    expect(
      activeFilterCount({ ...defaultFilters, state: "inbox", media: "video" }),
    ).toBe(2));
});
