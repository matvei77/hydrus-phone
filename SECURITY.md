# Security policy

## Supported versions

Security fixes are provided for the latest release. Update before reporting or reproducing an issue.

## Reporting a vulnerability

Do not open a public issue. Use GitHub's private vulnerability reporting feature after the repository becomes public. While the repository remains private, contact the repository owner through their GitHub profile and include only the minimum information needed to establish a private channel.

Never attach a real Hydrus access/session key, Tailscale auth key, `.env`, private DNS name, raw personal-media metadata, or unredacted logs. A maintainer should acknowledge a complete report within seven days and coordinate disclosure after a fix is available.

## Threat model

Hydrus Pocket protects a localhost Hydrus Client API from direct browser access:

- The gateway binds to `127.0.0.1` by default.
- Tailscale Serve terminates HTTPS and is the supported remote-access boundary.
- The permanent Hydrus key remains in the ignored host `.env` file.
- The gateway exchanges it for a server-side session key and redacts credential headers.
- The browser receives only the same-origin application API.
- Routes are fixed-purpose, schema validated, body bounded, rate limited, and protected by CSP/security headers.
- Original media and API responses use private, non-service-worker caching behavior.

Hydrus Pocket does not provide separate user accounts. Every member of the tailnet who can reach the Serve URL should be treated as authorized to use the application's enabled operations, including local tag changes and archive/unarchive. Tailnet membership and ACLs are therefore part of the security model.

## Unsupported and unsafe deployment

Do not:

- Bind the gateway to `0.0.0.0` on an untrusted network.
- Expose it through router port forwarding, Tailscale Funnel, a public reverse proxy, or public DNS.
- Put the Hydrus key in browser code, query strings, screenshots, logs, or issue reports.
- Grant Hydrus permissions beyond search/fetch, tag editing, and the add-files permission required for archive/unarchive.
- Share the Serve URL with untrusted tailnet members without restrictive Tailscale ACLs.

## Key rotation

1. Remove or revoke the Hydrus Pocket credential in Hydrus.
2. Delete the local `.env`.
3. Open Hydrus Client API permission registration.
4. Run `scripts/request-hydrus-access.ps1` and approve the new request.
5. Restart the Hydrus Pocket scheduled task or supervisor.

Rotate the key immediately if `.env`, a host backup, or a key-bearing log may have been exposed. Removing a Git commit is not a substitute for key rotation.

## Public-release procedure

Before changing repository visibility, run the release checklist, scan the entire Git history for secrets, verify no private hostname is tracked, and rotate the production Hydrus key as a precaution.
