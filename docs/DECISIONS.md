# Decisions

## Open-source license

Hydrus Pocket uses Apache License 2.0. Hydrus Network currently uses WTFPL v3, but Hydrus Pocket is independent code that communicates through the public Client API and includes no Hydrus source. Apache-2.0 provides a conventional permissive license and explicit patent terms. The README and NOTICE attribute Hydrus and state that this project is not affiliated with or endorsed by its maintainers.

1. Native Windows Scheduled Task over Docker: matches the running Hydrus/Tailscale desktop and avoids a container-to-host networking/security exception.
2. Same Fastify process serves UI and API: guarantees same-origin credentials and simpler operations.
3. URL-safe JSON query state: deterministic, local/shareable inside the app, and secret-free.
4. File IDs first, metadata on demand: stable Hydrus order with bounded phone memory.
5. No deletion route: Hydrus bundles archive permission with add/delete, but Pocket exposes only archive/unarchive.
6. One memorable visual device—the virtual contact sheet—while controls stay restrained and legible.
