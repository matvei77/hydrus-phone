# Deployment

Primary deployment is native Windows because Hydrus and Tailscale already run on this host. `scripts/install-windows.ps1` performs a locked install and full release check, then tries a Scheduled Task. If Windows denies task creation without elevation, it installs a hidden per-user `HKCU Run` startup entry backed by a crash-restarting supervisor. It also sets Tailscale Serve to the localhost gateway.

Production URL: `https://desktop-gtpsl86-1.tailddb64.ts.net`. Local health: `scripts/health.ps1`. No router change is required.

Update: copy/pull the new source, retain `.env`, run the installer again. Rollback: keep the prior source directory or Git tag, stop the task, switch to that version, run `npm ci && npm run build`, then start the task. Uninstall with `scripts/uninstall-windows.ps1`; optionally delete this directory after confirming `.env` removal.
