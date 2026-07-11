# Testing

`npm run check` runs ESLint, TypeScript checks for browser/server, Vitest unit and gateway integration tests, and the production PWA build. `npm run check:release` adds mocked Android, desktop, and dark-mode Playwright workflows plus the production dependency audit. `npm run test:e2e:live` runs the read-only suite against the deployed tailnet URL.

GitHub Actions runs `npm run check:release` for every pull request and every push to `main`. The live suite is intentionally local because it requires access to this machine's private tailnet and Hydrus archive.

Automated coverage includes predicate/filter translation, OR/negative tags, URL restoration, limits/sort/cache keys, search chip keyboard behavior, session acquisition, and byte Range relay. Real-instance verification uses `/api/health`, a bounded search, metadata, thumbnail, and Range request without mutating tags/files. Tag and archive mutation tests require a designated sacrificial file and explicit operator choice.

Final physical-device checks remain: Android Wi-Fi, Android remote tailnet path, portrait/landscape, PWA install, seek, TalkBack pass, and unstable network simulation.
