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

5. Initialize a clean repository in that directory, create the initial signed commit and `v1.4.0` tag, then publish it or replace the private remote only with explicit approval.
6. Enable `push`, `pull_request`, and weekly schedule triggers in the CodeQL workflow, plus the `pull_request` trigger in dependency review. They are manual-only while this repository is private because those checks require a public repository or GitHub Advanced Security.
7. Enable private vulnerability reporting, branch protection, required release-gate checks, Dependabot alerts, and secret scanning in repository settings.
8. Verify README links and issue contact links against the final public repository URL.

The source export includes the Apache-2.0 license, NOTICE, governance files, templates, documentation, tests, and screenshots, but excludes ignored runtime data by construction.
