# Performance

Release defaults: 500 search results, 128 browser metadata batch, 256 gateway ceiling, four virtualized overscan rows, three portrait columns, and 20-second Hydrus timeout. The service worker precaches only the 328 KiB app shell. Thumbnail cache is bounded to 300 entries and seven days; original media is never cached.

Production browser bundle (2026-07-10): 324.38 KiB application JavaScript / 102.29 KiB gzip, 5.81 KiB update helper / 2.40 KiB gzip, and 14.81 KiB CSS / 4.16 KiB gzip. The PWA precache is 337.70 KiB. Target-phone frame pacing, video-start latency, and gateway long-stream memory still require the physical Android verification recorded in the release checklist.
