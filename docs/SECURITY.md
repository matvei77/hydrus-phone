# Security

- Gateway binds to localhost and is reachable remotely only through Tailscale Serve.
- `.env` and runtime logs are ignored. Access/session/authorization headers are redacted.
- There is no browser CORS allowance, generic proxy, dynamic upstream URL, secret URL parameter, or delete route.
- Zod validates bodies/queries; bodies are limited to 256 KiB; rate limit is 180 requests/minute per remote address.
- Helmet supplies CSP and browser security headers. Originals use `private, no-store`.
- Production dependency audit on 2026-07-10: zero known vulnerabilities.

Rotate a key by deleting the Hydrus Pocket credential in Hydrus, deleting `.env`, reopening permission registration, rerunning the access script, and restarting the scheduled task. Tailnet membership remains the application access boundary.
