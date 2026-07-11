import { describe, expect, it } from "vitest";
import { classifyMedia, mediaFileUrl, needsHydrusRender } from "./media";

describe("media classification", () => {
  it.each([
    [".jpg", "image"],
    ["gif", "image"],
    ["jxl", "image"],
    ["MP4", "video"],
    ["webm", "video"],
    ["mp3", "audio"],
    ["flac", "audio"],
    ["pdf", "other"],
  ])("classifies %s as %s", (ext, expected) => {
    expect(classifyMedia({ ext })).toBe(expected);
  });

  it("routes JPEG XL through Hydrus' browser-compatible renderer", () => {
    expect(needsHydrusRender({ ext: ".JXL" })).toBe(true);
    expect(mediaFileUrl({ fileId: 42, ext: "jxl" })).toBe(
      "/api/media/42/render",
    );
    expect(mediaFileUrl({ fileId: 42, ext: "jpg" })).toBe(
      "/api/media/42/file",
    );
  });
});
