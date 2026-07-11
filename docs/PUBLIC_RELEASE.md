# Public release procedure

The current private repository contains development history, including an obsolete private Tailscale DNS name in old commits and release tags. No real Hydrus access key is tracked, but changing this repository's visibility would disclose that historical machine identifier.

Do not force-rewrite the private repository as part of ordinary release work. For the public launch:

1. Rotate the production Hydrus access key as a precaution.
2. Run `scripts/audit-public-release.ps1 -ForbiddenText '<private hostname>'` locally.
3. Run the complete release gate and physical-device acceptance checklist.
4. Export the tracked release source without `.git` or ignored files:

   ```powershell
   scripts/export-public-source.ps1 -Destination ..\hydrus-pocket-public
   ```

5. Initialize a clean repository in that directory, create the initial signed commit and a tag matching the exported package version, then publish it or replace the private remote only with explicit approval.
6. Confirm the public-aware CodeQL and dependency-review workflows activate after visibility changes; they skip automatically while a repository is private without GitHub Advanced Security.
7. Enable private vulnerability reporting, branch protection, required release-gate checks, Dependabot alerts, and secret scanning in repository settings. These controls are unavailable to this private repository on its current GitHub plan; the prepared workflows and templates do not substitute for required-check enforcement.
8. Verify README links and issue contact links against the final public repository URL.

The source export includes the Apache-2.0 license, NOTICE, governance files, templates, documentation, tests, and screenshots, but excludes ignored runtime data by construction.
