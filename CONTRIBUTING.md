# Contributing

Thanks for improving Hydrus Pocket. Contributions should preserve its core boundary: Hydrus and its permanent credential stay on the host, the gateway binds to localhost, and remote access remains private to the user's tailnet.

## Before opening a change

- Search existing issues and pull requests.
- For significant product or architecture changes, open a proposal issue first.
- Do not include personal media, Hydrus keys, Tailscale auth keys, private DNS names, logs containing identifiers, or screenshots of private collections.
- Keep destructive Hydrus operations out of scope unless they have an approved design and explicit safety review.

## Development setup

Requirements are Windows, Node.js 22–24, npm, Hydrus Client API v83+, and optionally Tailscale for remote testing.

```powershell
npm ci
Copy-Item .env.example .env
# Replace HYDRUS_ACCESS_KEY only in the ignored .env file.
npm run dev
```

Prefer `scripts/request-hydrus-access.ps1` over manually copying a key.

## Pull requests

1. Branch from current `main`.
2. Keep unrelated changes out of the branch.
3. Add or update tests for behavior changes.
4. Run `npm run check:release`.
5. For UI changes, include Android and relevant desktop screenshots in the PR description.
6. Document configuration, security, API, or operational changes.
7. Confirm that `git diff --check` and the secret scan in the release checklist are clean.

By submitting a contribution, you agree that it is licensed under Apache License 2.0 and that you have the right to submit it.

## Design expectations

Hydrus Pocket is dense, monochrome, mobile-first, and optimized for enjoying a collection rather than administering it. Maintain 44 px minimum touch targets, keyboard access, reduced-motion support, and the viewer-first network policy.

## Reporting security issues

Do not open public issues for vulnerabilities. Follow [SECURITY.md](SECURITY.md).
