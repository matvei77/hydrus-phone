# Changelog

## 0.1.0-rc.6 — 2026-07-10

- Added full JPEG XL viewing through Hydrus' native render endpoint, producing a quality-95 browser-compatible image while preserving zoom, swipe navigation, and bounded lookahead.
- Added real-instance JXL render validation plus gateway, media-routing, and browser regression coverage.

## 0.1.0-rc.5 — 2026-07-10

- Fixed Android double-tap zoom by separating touch-pointer detection from the browser's synthesized double-click event.
- Added visible `BUFFERING` / `N READY` lookahead status in the viewer so phone-side prefetch behavior can be verified directly.

## 0.1.0-rc.4 — 2026-07-10

- Added volatile, byte-bounded lookahead for the next 16 small images and metadata/poster warming for upcoming videos.
- Added a persistent viewer tag ribbon with actions to refine the current collection or explore a tag in a new Back-restorable search.
- Chips, filters, sorts, and limits now apply immediately while previous results and metadata remain visible during refinement.
- Moved archive/inbox management out of the primary viewer controls and into file information.

## 0.1.0-rc.3 — 2026-07-10

- Opening an image now requests original quality immediately, while retaining its thumbnail only as a loading placeholder.

## 0.1.0-rc.2 — 2026-07-10

- Corrected real Hydrus tag/archive mutations to use hashes rather than search-local file IDs.
- Added file/tag domains, explicit limits, custom duration/aspect filters, storage-tag autocomplete, image zoom/pan/HQ loading, Back-aware viewer URLs, and exact scroll restoration.
- Added bounded metadata caching, cancelled stale batches, animated indicators, audio fallback artwork, dark mode, raster PWA icons, strict readiness, and continuously bounded logs.
- Added rollback tooling plus 28 unit/integration tests and 18 Android/desktop/dark Playwright workflows with WCAG A/AA auditing.

## 0.1.0-rc.1 — 2026-07-10

- Added private mobile Hydrus search with display-tag autocomplete, exclusions, OR groups, system predicates, filters, sorting, and limits.
- Added virtualized mixed-media grid, image/video/audio viewer, Range seeking, unsupported fallback, tag editing, and archive gateway operations.
- Added saved/recent searches, starter shortcuts, connection diagnostics, installable/offline PWA behavior, and responsive accessible UI.
- Added hardened same-origin Fastify gateway, Windows auto-start/Tailscale deployment, automated tests, and operations documentation.
