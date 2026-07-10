# Hydrus Pocket

Hydrus Pocket is a phone-first PWA for privately searching, filtering, sorting, browsing, viewing, and lightly organizing a mixed-media Hydrus archive over Tailscale. A localhost-only Node gateway owns the Hydrus credential; browsers never receive it.

## Current machine quick start

1. In Hydrus, open **services → review services → client api**, then open the permission-registration dialog.
2. Run `powershell -ExecutionPolicy Bypass -File scripts/request-hydrus-access.ps1` and approve **Hydrus Pocket**. It requests only search/fetch, tag editing, and add-files (required by Hydrus for archive/unarchive).
3. Run `npm install`, then `npm run dev` for development.
4. Run `powershell -ExecutionPolicy Bypass -File scripts/install-windows.ps1` for the production build, auto-start task, and Tailscale Serve mapping.
5. Open `https://desktop-gtpsl86-1.tailddb64.ts.net` on a tailnet device and install it from Chrome.

Useful commands: `npm run check`, `scripts/health.ps1`, `Get-Content .hydrus-pocket/logs/gateway.log -Tail 100`.

See [deployment](docs/DEPLOYMENT.md), [operations](docs/OPERATIONS.md), and the [release checklist](docs/RELEASE_CHECKLIST.md).
