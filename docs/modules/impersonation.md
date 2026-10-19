# Impersonation — "Ver como" (`impersonation_sessions`)

Updated locally on 2026-10-15 under [Plan 012.4](../exec-plans/active/012-4-csp-and-secrets.md).
The original F3-C2 implementation was integrated through [PR #64](https://github.com/pipec80/iroko/pull/64).
Current local changes are not deployment or Cloud acceptance. Real-browser admin
MFA/aal2 acceptance remains **[NO VERIFICADO]**; see the
[local hardening evidence](../audits/2026-10-15-plan-012-4-local-hardening.md).

## Behavior and authorization

A platform admin with verified MFA/aal2 starts a real target session through
`generateLink` and `verifyOtp`; RLS continues to see the target identity.
`begin_impersonation_session` checks the live admin/MFA authorization and target
eligibility, records the reason and opens a 30-minute SQL row. Self-impersonation,
another platform admin, an unknown target and a second active row for the same
admin are rejected. Existing audit attribution is preserved.

The proxy implementation is `src/proxy.ts`, with session checks in
`src/lib/supabase/middleware.ts`; there is no repository `middleware.ts` entry.
The dashboard banner exposes the manual return action. The signed return cookie
has a 35-minute lifetime to allow restoration around the SQL session boundary;
that does not extend the 30-minute impersonation cap.

## Return cookie and recovery contract

`src/lib/impersonation-cookie.ts` signs a canonical two-segment HMAC-SHA256
cookie using a dedicated server-only `IMPERSONATION_COOKIE_SECRET`, validated
in `src/env.ts`. It does not fall back to a Supabase key. The strict v2 envelope
binds purpose, admin, target and SQL session IDs, server issue/expiry times and
the admin restoration tokens. Legacy, malformed, expired and rotated cookies
fail closed. Cookie flags are HttpOnly, Secure, SameSite=Lax and path `/`.
Tokens and signed cookie values must never enter logs, screenshots or Git.

Start verifies the admin identity before opening the row. Failures after opening
trigger owner-authorized compensation. If OTP may already have changed the
identity, restore and verify the real admin first; never close an unexpired row
as the target to compensate a failed swap. A failed restoration signs out locally
and requires authenticated owner recovery. SQL close failure is reported rather
than presented as successful cleanup.

Manual return verifies the cookie/session binding and current target or admin
identity, restores and verifies the signed admin, and only then closes that
admin's SQL row. Failed closure remains a recovery condition.

Expiry attempts SQL closure through the authenticated target only when target,
signed `app_metadata.impersonated_by`, expired reason and elapsed SQL expiry
all match under the row lock. It signs out locally and clears return/session and
current-project auth cookies even when backend closure fails. Safe return targets
lead through a localized login/dashboard flow rather than back into expiry.
Clearing a browser session does not prove the SQL row is closed.
Cleanup requires an auxiliary impersonation cookie or signed impersonation
marker. A top-level GET with a normal verified identity and no such evidence
preserves that session and redirects to the safe dashboard destination.

The shipped SQL function preserves its existing ACL: `authenticated` may invoke
it, while `anon` and `service_role` have no EXECUTE grant. The backend body branch
requires both the caller role and JWT role to be `service_role`; its positive
pgTAP case uses a temporary grant inside a rolled-back test transaction. That
case does not establish a callable backend path in the shipped ACL.

## Recovery and dedicated-key rotation runbook

1. Identify the exact environment and the affected admin/session IDs using
   metadata only. Preserve credentials and pending sources. Local authorization
   does not authorize linked SQL writes, secret changes or deployment.
2. Before introducing or rotating the dedicated key in an authorized target,
   have each active owner manually return and verify that the corresponding SQL
   row has `ended_at` set. Check active rows explicitly; waiting for `expires_at`
   or deleting cookies alone does not mark a row closed.
3. If the signed cookie is unavailable, invalid or rotated, clear the local target
   identity and sign in again as the original admin, including required MFA.
   Use the existing owner-authorized `end_impersonation_session(session_id,
'manual')` RPC for that exact row through an authenticated operational path.
   Verify closure and the single end-audit record. Do not grant generic backend
   EXECUTE or accept an unsigned cookie UUID to bypass authorization.
4. If owner login, restoration or SQL closure fails, stop the rotation/deployment
   until the failure and directed recovery are resolved. Record the affected row
   and error category without tokens. A signed-in admin with a stale active row
   may remain blocked from starting another impersonation until closure succeeds.
5. After all affected rows are closed, apply the specifically authorized secret
   configuration and compatible code. Previously signed cookies are intentionally
   invalid; do not re-sign them using the old Supabase server key.
6. Verify real MFA start, manual return, expiry, backend-failure logout and fixture
   cleanup in the authorized environment. Rollback must retain compatibility with
   the dedicated secret; it must not restore Supabase-key cookie signing.

The application can report that directed recovery is required; this runbook does
not claim an additional recovery UI or an executed Cloud recovery drill.

## Verification boundary

Unit tests cover cookie parsing, rotation, compensation/restoration ordering,
identity binding and expiry failures. SQL tests independently cover role/claim
and expiry authorization. Focused tests, SQL body tests and static review do not
substitute for real-browser MFA, session/cookie persistence or Cloud execution.
The dated execution audit records actual commands and unresolved acceptance gates.
