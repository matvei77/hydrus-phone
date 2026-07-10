# Architecture

The browser speaks only to the same origin. Fastify serves the production React PWA and `/api/*`; the gateway translates validated application requests to the Hydrus Client API on `127.0.0.1:45869`. It obtains a renewable session key from a permanent key stored in ignored `.env`.

Search returns ordered file IDs. The browser requests visible metadata in batches up to 128 while the gateway enforces 256. A row virtualizer mounts only visible/overscan cells. Thumbnail responses are privately cached; original media is `no-store`. Media Range headers and `206`, `Content-Range`, `Accept-Ranges`, and length headers are relayed.

Tailscale Serve terminates tailnet HTTPS and proxies to the gateway at `127.0.0.1:47810`. Neither service binds publicly.
