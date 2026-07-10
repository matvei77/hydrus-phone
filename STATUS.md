# Status

Phase: release candidate; physical-device verification blocked by offline phone.

Completed: greenfield React/Fastify PWA; secure credential/session boundary; complete search composer, filters, sorts, limits, bounded/virtualized result flow, mixed-media viewer, tag editor, archive API, saved/recent searches, health/settings/offline states, PWA, tests, Windows deployment/auto-start, security/operations documentation.

Active defects: none confirmed. Real Hydrus search/autocomplete/metadata/thumbnail/video/Range paths pass. Production is installed at `https://desktop-gtpsl86-1.tailddb64.ts.net` with tailnet-only Serve, per-user auto-start, bounded logs, and verified crash restart. External blocker: the Pixel 10 Pro XL is offline in Tailscale, so physical install/portrait/landscape/remote-network/TalkBack gates cannot run. Manual hardening: remove the unused URL, notes, and ratings permissions retained by Hydrus during approval.

Release gates: lint, typecheck, 9 automated tests, production PWA build, dependency audit, secret scan, real read-only integration, HTTPS, and crash recovery passed. Real mutation and physical Android/accessibility gates remain pending.
