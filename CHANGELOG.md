# Changelog

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
