# Plan 004 — Align the Effective Next.js Version

- Priority: P0
- Status: Completed (2026-08-04)
- Production deployment: normal pull-request flow; no direct production action

## Problem

The inspected repository declared Next.js 16.2.12 in `package.json`, while workspace override and lock resolution kept the installed version at 16.2.11.

> **Revalidated 2026-08-03:** the override is not stale — it exists on purpose. `pnpm-workspace.yaml` fixes a single `next` version so `@react-email/ui` (which pins `next@16.2.6` as a direct dependency, used only by local `email:dev` preview) can't pull a second, older, unpatched copy into the tree. At this point the two plausible fixes looked equally likely: align `package.json` down to the override's `16.2.11`, or align the override up to `package.json`'s `16.2.12`.

> **Revalidated 2026-08-04 (with git history, corrects the note above):** the override was introduced at `16.2.11` in PR #71 ("bump next to 16.2.11") — at the time, that commit intentionally set _both_ `package.json` and the override to the same version. Nine days later, Dependabot's PR #82 bumped `next` in `package.json` from 16.2.11 to 16.2.12 (a docs/TypeScript-7-compat backport per the Next.js changelog, no breaking changes) but never touches `pnpm-workspace.yaml` — Dependabot doesn't watch `pnpm.overrides`. That's the actual root cause: not a deliberate pin at 16.2.11, but an override silently falling behind a routine automated bump. **Correct fix: raise the override to `16.2.12`, not lower the declaration.** This keeps the more recent, better-patched version and preserves the override's real purpose (single-version enforcement), confirmed by `pnpm why next` still reporting `Found 1 version of next` — now at 16.2.12 — with `@react-email/ui` correctly forced onto it.

## Desired outcome

`package.json`, workspace overrides, `pnpm-lock.yaml`, local install, CI and Vercel all use the same intentional Next.js version.

## Execution

1. Confirm current package manager and Node requirements from `package.json`, CI and Vercel.
2. Inspect every Next.js/React override and dependency grouping.
3. Determine why the override exists and whether its original incompatibility still applies.
4. Check current official Next.js and next-intl compatibility documentation before choosing the target version.
5. Select one supported patch version — default to keeping the override and raising it to match the higher, already-declared `package.json` version, not lowering the declaration.
6. Update `pnpm-workspace.yaml`'s override to match the resolved version.
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

## Closure note (2026-08-04)

Root cause traced with `git log -S` on both files: PR #71 set `package.json` and the `pnpm-workspace.yaml` override to `16.2.11` together; Dependabot's PR #82 later bumped only `package.json` to `16.2.12` (Next.js changelog: docs/TypeScript-7-compat backport, no breaking changes), since Dependabot doesn't track `pnpm.overrides`. Fixed by raising the override to `16.2.12` in `pnpm-workspace.yaml`, regenerating `pnpm-lock.yaml`. Verified: `pnpm why next` reports `Found 1 version of next` at `16.2.12`, with `@react-email/ui` correctly forced onto it (no second, older instance in the tree). `pnpm validate` (typecheck, lint, 590 unit tests) and `pnpm knip` pass clean; production build passes. See `docs/audits/2026-08-02-full-platform-audit.md` (AUD-006) for full evidence.
