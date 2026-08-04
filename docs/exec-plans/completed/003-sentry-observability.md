# Plan 003 — Complete Sentry Browser Observability

- Priority: P0
- Status: Completed (2026-08-04, PR #91)
- Production merge/deploy: requires human approval

## Closure note (2026-08-04)

PR #91 rebased clean on current `main`, full CI green (11/11 checks). Two new
regression tests added (`src/proxy.test.ts`, `src/test/e2e/sentry-tunnel.spec.ts`)
that fail against the original bug and pass with the fix — neither existed before.
Manually verified on the Vercel preview: a controlled browser exception landed in
Sentry as issue `IROKO-7` with full metadata, an attached Session Replay, and a
trace/span — proof the tunnel delivers events end-to-end. `IROKO-8` (a CSP report
for `vercel.live`, unrelated) further confirms the `/sentry-tunnel` pipeline is
intact. Server-side capture unaffected (this PR never touches
`sentry.server.config.ts`/`instrumentation.ts`). Privacy decision documented in
`docs/audits/2026-08-03-sentry-audit.md`: Session Replay and Vercel
Analytics/SpeedInsights still run without a consent gate — tracked as acceptance
criteria in plans 005/006, not blocking this fix. See
`docs/audits/2026-08-02-full-platform-audit.md` (AUD-005) for full evidence.

## Problem

The browser SDK sends events through `/sentry-tunnel`, but the inspected `main` proxy matcher allowed next-intl to intercept and localize that POST. Browser errors, replays and traces could be redirected to a route where the Sentry rewrite does not exist.

Draft PR #91 proposes:

- excluding `sentry-tunnel` from the proxy matcher;
- migrating client initialization to `src/instrumentation-client.ts`;
- exporting App Router transition instrumentation;
- documenting optional privacy/logging improvements.

## Desired outcome

Browser and server telemetry arrive reliably with a documented privacy posture, without proxy localization, CSP breakage or duplicate instrumentation.

## Execution

1. Rebase or update PR #91 against current `main`.
2. Review every changed file and confirm no unrelated code is included.
3. Verify `/sentry-tunnel` is excluded from every relevant matcher.
4. Confirm old client configuration is removed and exactly one client initializer remains.
5. Confirm `onRouterTransitionStart` is exported using the installed SDK API.
6. Run the complete CI suite.
7. Use the Vercel preview and browser DevTools to verify:
   - `POST /sentry-tunnel` does not receive a locale redirect;
   - successful tunnel response;
   - a controlled client exception reaches Sentry;
   - an App Router navigation produces the intended span;
   - server exception capture remains operational.
8. Decide and document:
   - user association with UUID only;
   - automatic IP/cookie/body collection;
   - Replay sampling and consent;
   - Pino-to-Sentry logs on the free plan.
9. Verify CSP allows only required Sentry endpoints and worker behavior.
10. Update the audit matrix with evidence.

## Privacy baseline

- Never attach email, name, payment information or arbitrary metadata to `Sentry.setUser`.
- Use `{ id: user.id }` only when user association is approved.
- Clear user context on logout and impersonation transitions.
- Do not capture request bodies containing auth, payment, document or profile form data.
- Keep Replay text/input masking enabled.
- Make an explicit decision about whether optional analytics consent governs Replay/performance telemetry.

## Acceptance criteria

- PR #91 is current and mergeable.
- all required CI checks pass.
- preview browser tunnel returns success without 307/404.
- controlled browser and server events are visible in the correct environment.
- no duplicate client initialization exists.
- privacy and quota decisions are documented.
- rollback steps are recorded.

## Rollback

Revert the PR and disable the browser tunnel or client telemetry temporarily if events fail after deployment. Preserve server-side error capture where possible.
