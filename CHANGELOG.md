# Changelog

## 1.2.2 — 2026-07-11

- Protect the current media and the two nearest files in both directions from eviction by speculative preload traffic.
- Make late downloads from an older viewer position sacrifice unprotected entries instead of recently viewed navigation history.

## 1.2.1 — 2026-07-11

- Buffer videos up to 24 MB into the existing 200 MB page-session cache before playback, eliminating repeated Tailnet range fetches during replay and seeking.
- Warm nearby eligible videos alongside images and retain them across viewer close/reopen within the same page session.

## 1.2.0 — 2026-07-11

- Removed the permanent browse branding masthead and moved connection health beside the result count.
- Compressed search/result chrome and replaced the desktop top navigation with a compact bottom-right dock, returning the full viewport height to the gallery.

## 1.1.0 — 2026-07-11

- Replaced uniform square gallery cells with virtualized justified rows that preserve portrait, landscape, and square media proportions.
- Retained chronological/search order, edge-to-edge row packing, natural final-row width, density controls, and exact Back/reload scroll restoration.

## 1.0.0 — 2026-07-11

- Established the final monochrome Hydrus-inspired interface with neutral utility surfaces, blue focus/selection, and semantic-only status color.
- Promoted the complete private browsing/search/filter/tag workflow, JPEG XL rendering, Android zoom, and 200 MB bidirectional session cache from release candidate to v1.

## 0.1.0-rc.7 — 2026-07-11

- Replaced viewer-local forward-only lookahead with a page-session 200 MB LRU media cache that survives viewer close/reopen.
- Added bidirectional proximity ordering, current-file retention, six concurrent warmers, wider metadata lookahead, and visible cached megabytes.

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
