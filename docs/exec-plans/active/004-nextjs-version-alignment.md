# Plan 004 — Align the Effective Next.js Version

- Priority: P0
- Status: Open
- Production deployment: normal pull-request flow; no direct production action

## Problem

The inspected repository declared Next.js 16.2.12 in `package.json`, while workspace override and lock resolution kept the installed version at 16.2.11.

## Desired outcome

`package.json`, workspace overrides, `pnpm-lock.yaml`, local install, CI and Vercel all use the same intentional Next.js version.

## Execution

1. Confirm current package manager and Node requirements from `package.json`, CI and Vercel.
2. Inspect every Next.js/React override and dependency grouping.
3. Determine why the override exists and whether its original incompatibility still applies.
4. Check current official Next.js and next-intl compatibility documentation before choosing the target version.
5. Select one supported patch version.
6. Remove or update the stale override.
7. Regenerate the lockfile using the repository's pinned pnpm version.
8. Confirm the resolved version with `pnpm why next` and an executable version check.
9. Run full typecheck, lint, unit, E2E and production build.
10. Deploy a preview and confirm the build reports the intended version.
11. Update README/runtime requirements if needed.

## Constraints

- Do not re-enable `cacheComponents` as part of this plan.
- Do not combine unrelated dependency upgrades.
- Do not bypass `--frozen-lockfile` failures in CI.
- Keep React/Next peer compatibility intact.

## Acceptance criteria

- one version is declared and resolved;
- no stale override silently downgrades Next.js;
- frozen install succeeds;
- full CI and Vercel preview succeed;
- runtime/build output confirms the intended version;
- release notes and compatibility risks are summarized in the PR.

## Rollback

Revert the dependency/lockfile commit. Restore the previous override only with a comment explaining the exact compatibility requirement and an expiry/review condition.
