# Release checklist

## Passed

- [x] Same-origin architecture; key absent from browser bundle
- [x] Client API v83 / Hydrus v649 discovered on localhost
- [x] Typed validation, timeout, session renewal, redacted logs, security headers
- [x] Bounded search/metadata, virtualization, cancellation, Range streaming
- [x] Search/filter/sort/saved/view/tag/archive implementation
- [x] Installable PWA with bounded thumbnail cache and uncached originals
- [x] Lint, typecheck, 43 Vitest tests, and production build
- [x] 21 mocked Playwright workflows across Android, desktop, and dark mode
- [x] Axe WCAG A/AA scan: no serious or critical findings
- [x] Live deployed read-only Playwright workflow
- [x] Production dependency audit: zero known vulnerabilities
- [x] Real Hydrus search, autocomplete, metadata, thumbnail, video, and unsupported-file responses
- [x] Real byte Range request returned 206 with correct Content-Range
- [x] Tailnet-only HTTPS health returned 200
- [x] Startup supervisor recovered a killed gateway process within five seconds
- [x] Previous-build rollback and current-build restore exercised successfully
- [x] Apache-2.0 license, notice, third-party license inventory, and non-affiliation statement
- [x] Generic configuration with no tracked private hostname or credential
- [x] Public README, support, security, contribution, conduct, and GitHub templates
- [x] Dependabot configuration plus public-launch CodeQL/dependency-review workflows
- [x] Pull requests and `main` run the automated release-gate workflow

## Post-v1 operational follow-ups

- [ ] Enable required branch protection and private vulnerability reporting after public launch or a GitHub plan upgrade
- [ ] Remove the unused URL, notes, and ratings permissions retained by the Hydrus approval dialog
- [x] Android remote-Tailscale portrait/PWA, JPEG XL, zoom, and slow-path cache checks
- [ ] Android landscape, TalkBack, and extended video-seek checks
- [ ] Safe test-file tag add/remove and archive/unarchive

The unchecked items are documented operational follow-ups outside the browsing-first v1 acceptance boundary.
