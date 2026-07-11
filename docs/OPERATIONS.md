# Operations

Restart gateway: `Restart-ScheduledTask -TaskName "Hydrus Pocket Gateway"`. Restart Hydrus normally; the gateway reports the outage and renews its session when Hydrus returns. Recreate Serve with `tailscale serve --bg http://127.0.0.1:47810`.

Logs are `.hydrus-pocket/logs/gateway.log` and `gateway-error.log`. The supervisor enforces a 10 MiB ceiling while the process is running, rotates each stream on restart, and retains five generations. Health is `Invoke-RestMethod http://127.0.0.1:47810/api/health`.

For unavailable media, check Hydrus is open, health reports permission `3`, the file still exists, and its MIME is browser-compatible. Clear a broken PWA from Settings → Clear local data, or Chrome site storage, then reload. To recover a revoked key, follow `SECURITY.md`. Tailscale failure is distinguished from a local gateway failure by testing the local health URL first.
