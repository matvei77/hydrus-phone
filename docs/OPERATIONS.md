# Operations

## Health and readiness

Run `scripts/health.ps1`; it reads a custom `PORT` from `.env`. Manual checks are available at `/api/health` and `/api/ready` on the configured localhost port.

Test local health before diagnosing a tailnet failure. If local health succeeds but the HTTPS URL fails, inspect `tailscale status` and `tailscale serve status`.

## Restart

For a Scheduled Task installation:

```powershell
Restart-ScheduledTask -TaskName "Hydrus Pocket Gateway"
```

For a per-user startup installation, stop the supervisor process or sign out/in. The supervisor restarts a failed gateway automatically. Hydrus can be restarted normally; the UI reports the outage and the gateway renews its session after Hydrus returns.

Recreate a missing Serve mapping with the port from `.env`:

```powershell
tailscale serve --bg http://127.0.0.1:47810
```

## Logs

Logs are `.hydrus-pocket/logs/gateway.log` and `gateway-error.log`. The supervisor enforces a 10 MiB ceiling, rotates on restart, and retains five generations. Credential headers are redacted, but logs should still be treated as private and sanitized before sharing.

## Recovery

- Media unavailable: verify Hydrus is open, health reports permission `3`, the file still exists, and the browser supports its MIME.
- Revoked key: follow the rotation procedure in root [SECURITY.md](../SECURITY.md).
- Broken PWA state: use Settings → Clear local data or clear the site's Chrome storage, then reload.
- Failed update: run `scripts/rollback-windows.ps1`.
- Remove installation: run `scripts/uninstall-windows.ps1`.

Never paste `.env`, access/session keys, private DNS names, hashes, tags, filenames, or personal media into public issues.
