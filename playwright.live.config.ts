import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  testMatch: "live.spec.ts",
  reporter: "list",
  use: {
    baseURL: process.env.HYDRUS_POCKET_URL ?? "http://127.0.0.1:47810",
    trace: "retain-on-failure",
  },
  projects: [{ name: "live-chrome", use: { ...devices["Desktop Chrome"] } }],
});
