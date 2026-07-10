import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  test: { environment: "jsdom", setupFiles: "./vitest.setup.ts" },
  plugins: [
    react(),
    VitePWA({
      registerType: "prompt",
      includeAssets: ["icon.svg"],
      manifest: {
        name: "Hydrus Pocket",
        short_name: "Pocket",
        description: "Private mobile access to your Hydrus archive",
        theme_color: "#081f2d",
        background_color: "#f2f5f3",
        display: "standalone",
        orientation: "any",
        icons: [
          {
            src: "/icon.svg",
            sizes: "any",
            type: "image/svg+xml",
            purpose: "any maskable",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg}"],
        navigateFallback: "/index.html",
        runtimeCaching: [
          {
            urlPattern: /\/api\/media\/[^/]+\/thumbnail/,
            handler: "CacheFirst",
            options: {
              cacheName: "hydrus-thumbnails-v1",
              expiration: { maxEntries: 300, maxAgeSeconds: 60 * 60 * 24 * 7 },
              cacheableResponse: { statuses: [200] },
            },
          },
        ],
      },
    }),
  ],
  server: {
    host: "127.0.0.1",
    port: 5173,
    proxy: { "/api": "http://127.0.0.1:47810" },
  },
  build: { outDir: "dist/client", sourcemap: true },
});
