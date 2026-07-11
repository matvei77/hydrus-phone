import { afterEach, describe, expect, it } from "vitest";
import { loadConfig } from "./config.js";

const original = { ...process.env };

afterEach(() => {
  process.env = { ...original };
});

describe("gateway configuration", () => {
  it("accepts an intentionally blank optional app URL", () => {
    process.env = {
      ...original,
      HYDRUS_ACCESS_KEY: "a".repeat(64),
      APP_URL: "",
    };
    expect(loadConfig().APP_URL).toBeUndefined();
  });

  it("rejects a non-local low port", () => {
    process.env = {
      ...original,
      HYDRUS_ACCESS_KEY: "a".repeat(64),
      PORT: "80",
    };
    expect(() => loadConfig()).toThrow();
  });
});
