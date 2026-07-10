# Performance

Release defaults: 500 search results, 128 browser metadata batch, 256 gateway ceiling, four virtualized overscan rows, three portrait columns, and 20-second Hydrus timeout. The in-memory metadata cache is capped at 768 most-recently-used files; older entries are refetched if revisited. Thumbnail Cache Storage is capped at 300 entries and seven days. Original media and API responses are `no-store` and never enter the offline cache.

RC3 production browser bundle (2026-07-10): 331.99 KiB application JavaScript / 104.64 KiB gzip, 5.81 KiB update helper / 2.40 KiB gzip, and 17.14 KiB CSS / 4.60 KiB gzip. The PWA precache is 347.40 KiB. Target-phone frame pacing, video-start latency, and gateway long-stream memory still require the physical Android verification recorded in the release checklist.
