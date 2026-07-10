# Testing

`npm run check` runs ESLint, TypeScript checks for browser/server, Vitest unit and gateway integration tests, and the production PWA build. `npm run test:e2e` is reserved for the Playwright installed-app/device workflow.

Automated coverage includes predicate/filter translation, OR/negative tags, URL restoration, limits/sort/cache keys, search chip keyboard behavior, session acquisition, and byte Range relay. Real-instance verification uses `/api/health`, a bounded search, metadata, thumbnail, and Range request without mutating tags/files. Tag and archive mutation tests require a designated sacrificial file and explicit operator choice.

Final physical-device checks remain: Android Wi-Fi, Android remote tailnet path, portrait/landscape, PWA install, seek, TalkBack pass, and unstable network simulation.
