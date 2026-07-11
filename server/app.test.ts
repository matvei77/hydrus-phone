import { describe, expect, it } from "vitest";
import {
  buildTagMutationBody,
  isAssetRequest,
  isTrustedBrowserRequest,
  normalizeMetadata,
} from "./app.js";

describe("gateway normalization", () => {
  it("distinguishes missing assets from client-side routes", () => {
    expect(isAssetRequest("/assets/missing.js")).toBe(true);
    expect(isAssetRequest("/icon-192.png?v=2")).toBe(true);
    expect(isAssetRequest("/saved")).toBe(false);
  });

  it("rejects cross-origin writes while allowing same-origin and non-browser clients", () => {
    const config = { APP_URL: "https://phone.example.ts.net", PORT: 47810 };
    expect(
      isTrustedBrowserRequest(
        "POST",
        "https://phone.example.ts.net",
        "same-origin",
        config,
      ),
    ).toBe(true);
    expect(
      isTrustedBrowserRequest("POST", "https://evil.example", "cross-site", config),
    ).toBe(false);
    expect(isTrustedBrowserRequest("POST", undefined, undefined, config)).toBe(
      true,
    );
    expect(
      isTrustedBrowserRequest("GET", "https://evil.example", "cross-site", config),
    ).toBe(true);
  });

  it("normalizes Hydrus extensions, timestamps, and display/storage tags", () => {
    expect(
      normalizeMetadata({
        file_id: 7,
        hash: "a".repeat(64),
        size: 10,
        mime: 1,
        ext: ".JPG",
        width: 100,
        height: 80,
        is_inbox: true,
        time_imported_ms: 1_700_000_000_000,
        tags: {
          service: {
            display_tags: { "0": ["creator:display"] },
            storage_tags: { "0": ["creator:storage"] },
          },
        },
      }),
    ).toMatchObject({
      fileId: 7,
      ext: "JPG",
      inbox: true,
      archived: false,
      timeImported: 1_700_000_000,
      displayTags: { service: ["creator:display"] },
      storageTags: { service: ["creator:storage"] },
    });
  });

  it("builds safe add/remove payloads without creating phantom deletion mappings", () => {
    expect(
      buildTagMutationBody({
        hash: "b".repeat(64),
        serviceKey: "a".repeat(64),
        add: ["series:test"],
        remove: ["old"],
      }),
    ).toEqual({
      hashes: ["b".repeat(64)],
      service_keys_to_actions_to_tags: {
        ["a".repeat(64)]: { "0": ["series:test"], "1": ["old"] },
      },
      override_previously_deleted_mappings: true,
      create_new_deleted_mappings: false,
    });
  });
});
