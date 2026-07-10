# Deployment

Primary deployment is native Windows because Hydrus and Tailscale already run on this host. `scripts/install-windows.ps1` performs a locked install and full release check, then tries a Scheduled Task. If Windows denies task creation without elevation, it installs a hidden per-user `HKCU Run` startup entry backed by a crash-restarting supervisor. It also sets Tailscale Serve to the localhost gateway.

Production URL: `https://desktop-gtpsl86-1.tailddb64.ts.net`. Local health: `scripts/health.ps1`. No router change is required.

Update: pull the new source, retain `.env`, and run the installer again. The installer stops duplicate supervisors, saves the current production `dist` as the single local rollback release, runs all build gates, and restarts production. Roll back with `scripts/rollback-windows.ps1`; the replaced build is retained as `.hydrus-pocket/failed-dist`. Uninstall with `scripts/uninstall-windows.ps1`; optionally delete this directory after confirming `.env` removal.
