# Release checklist

## Passed

- [x] Same-origin architecture; key absent from browser bundle
- [x] Client API v83 / Hydrus v649 discovered on localhost
- [x] Typed validation, timeout, session renewal, redacted logs, security headers
- [x] Bounded search/metadata, virtualization, cancellation, Range streaming
- [x] Search/filter/sort/saved/view/tag/archive implementation
- [x] Installable PWA with bounded thumbnail cache and uncached originals
- [x] Typecheck and production build
- [x] Production dependency audit: zero known vulnerabilities
- [x] Real Hydrus search, autocomplete, metadata, thumbnail, video, and unsupported-file responses
- [x] Real byte Range request returned 206 with correct Content-Range
- [x] Tailnet-only HTTPS health returned 200
- [x] Startup supervisor recovered a killed gateway process within five seconds

## Awaiting external/manual verification

- [ ] Remove the unused URL, notes, and ratings permissions retained by the Hydrus approval dialog
- [ ] Android Wi-Fi and remote-Tailscale portrait/landscape/PWA tests
- [ ] TalkBack and slow-network checks
- [ ] Safe test-file tag add/remove and archive/unarchive

Release candidate is not final until the unchecked device/operator gates pass.
