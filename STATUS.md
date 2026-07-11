# Status

Phase: v1.2.0 compact browse chrome validation and publication.

Completed: greenfield React/Fastify PWA; secure credential/session boundary; complete search composer, filters, sorts, limits, bounded/virtualized result flow, mixed-media viewer, tag editor, archive API, saved/recent searches, health/settings/offline states, PWA, tests, Windows deployment/auto-start, security/operations documentation.

Active defects: none confirmed. Real Hydrus search/autocomplete/metadata/thumbnail/JPEG XL render/video/Range paths pass. Production is installed at `https://desktop-gtpsl86-1.tailddb64.ts.net` with tailnet-only Serve, per-user auto-start, bounded logs, and verified crash restart. Physical Pixel visual/landscape/TalkBack and longer remote-network gates remain. Manual hardening: remove the unused URL, notes, and ratings permissions retained by Hydrus during approval.

Release gates: lint, typecheck, 36 Vitest unit/integration tests, 21 mocked Playwright browser workflows, live read-only Playwright verification, production PWA build, dependency audit, secret scan, real read-only integration, HTTPS, tested rollback/restore, crash recovery, and GitHub Actions enforcement passed or are configured. Automated Axe WCAG A/AA checks report no serious or critical findings in Android, desktop, or dark-mode layouts. Real mutation and physical Android/accessibility gates remain pending.
