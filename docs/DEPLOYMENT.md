# Deployment

## Supported production host

The initial supported host is Windows 10/11 running Hydrus and Tailscale. Node.js 22–24 and npm must be available to the installing user.

Hydrus Pocket uses this path:

```text
tailnet browser → Tailscale Serve HTTPS → 127.0.0.1:47810 → Hydrus Client API
```

The gateway must remain on localhost. Do not use Tailscale Funnel, router port forwarding, or a public reverse proxy.

## First installation

1. Run `npm ci`.
2. Open Hydrus Client API permission registration.
3. Run `scripts/request-hydrus-access.ps1` and approve Hydrus Pocket.
4. Run `scripts/install-windows.ps1`.

The access script discovers the current Tailscale DNS name when available. The installer performs a locked install and release check, builds production output, configures auto-start, starts the crash-restarting supervisor, and maps Tailscale Serve to the configured localhost port. It prints the device-specific HTTPS URL; no hostname is stored in source control.

If Scheduled Task creation is unavailable without elevation, the installer uses a hidden per-user `HKCU Run` entry. Tailscale setup is skipped with a warning when its CLI is unavailable.

## Configuration overrides

`request-hydrus-access.ps1` accepts:

```powershell
scripts/request-hydrus-access.ps1 `
  -HydrusUrl http://127.0.0.1:45869 `
  -EnvironmentFile .env `
  -AppUrl https://your-host.your-tailnet.ts.net
```

Normally `-AppUrl` should be omitted so Tailscale discovery supplies it. Custom `PORT` values in `.env` are respected by install, health, rollback, and uninstall scripts.

## Updating and rollback

Pull or check out the desired release, retain the ignored `.env`, and rerun `scripts/install-windows.ps1`. The installer saves the previous `dist` as `.hydrus-pocket/rollback/dist` and restores it automatically if installation checks fail.

Run `scripts/rollback-windows.ps1` to restore the immediately previous build. The replaced build is retained at `.hydrus-pocket/failed-dist`. Run `scripts/uninstall-windows.ps1` to remove auto-start and reset Tailscale Serve without modifying Hydrus data or repository source.

## Live verification

```powershell
$env:HYDRUS_POCKET_URL = "https://your-host.your-tailnet.ts.net"
npm run test:e2e:live
```

The live test is read-only. Without `HYDRUS_POCKET_URL`, it targets the local gateway at `http://127.0.0.1:47810`.
