import { describe, expect, it } from "vitest";
import { classifyMedia } from "./media";

describe("media classification", () => {
  it.each([
    [".jpg", "image"],
    ["gif", "image"],
    ["MP4", "video"],
    ["webm", "video"],
    ["mp3", "audio"],
    ["flac", "audio"],
    ["pdf", "other"],
  ])("classifies %s as %s", (ext, expected) => {
    expect(classifyMedia({ ext })).toBe(expected);
  });
});
