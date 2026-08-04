# Plan 004 — Align the Effective Next.js Version

- Priority: P0
- Status: Open
- Production deployment: normal pull-request flow; no direct production action

## Problem

The inspected repository declared Next.js 16.2.12 in `package.json`, while workspace override and lock resolution kept the installed version at 16.2.11.

> **Revalidated 2026-08-03:** the override is not stale. `pnpm-workspace.yaml:34-37` fixes `next: 16.2.11` with an explicit comment: `@react-email/ui` depends on `next@16.2.6` exactly, and 16.2.11 is the lowest version compatible with both that constraint and the rest of the stack. `package.json:101` still declares `16.2.12`, so it is the declaration — not the override — that is out of sync with what actually resolves and runs. The likely fix is aligning `package.json` down to `16.2.11`, not removing the override; step 3 below must re-confirm the `@react-email/ui` constraint still holds before deciding either way.

## Desired outcome

`package.json`, workspace overrides, `pnpm-lock.yaml`, local install, CI and Vercel all use the same intentional Next.js version.

## Execution

1. Confirm current package manager and Node requirements from `package.json`, CI and Vercel.
2. Inspect every Next.js/React override and dependency grouping.
3. Determine why the override exists and whether its original incompatibility still applies.
4. Check current official Next.js and next-intl compatibility documentation before choosing the target version.
5. Select one supported patch version — default to keeping the override and aligning `package.json` down to `16.2.11` unless the `@react-email/ui` constraint no longer applies.
6. Update `package.json` to match the resolved version (or remove the override only if step 3 proves it is no longer required).
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
