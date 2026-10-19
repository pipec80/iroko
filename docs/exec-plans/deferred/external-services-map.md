# External services and connector map

- Status: deferred follow-up, requested 2026-10-19.
- Resume after Plan 012.4 acceptance and closure; not an additional 012.4 gate.
- Purpose: one readable inventory of the third-party services Iroko actually
  uses and how their Git, deployment, runtime and observability connections fit.

## Starting material

Reuse the [system overview](../../architecture/system-overview.md),
[capability inventory](../../capabilities.md) and
[MVP deployment/acceptance flow](../../runbooks/mvp-cloud-acceptance.md).
These already describe architectural roles and parts of the delivery flow;
they are not a current audit of installed provider connectors or delivery health.

## Bounded future deliverable

Document GitHub Actions/Git integration, Vercel, Supabase, Sentry, PostHog,
Resend, Cloudflare Turnstile and the billing providers actually consumed.
For each, record purpose, project/account identity without secrets, actual
producer/consumer, connector direction, triggering event, endpoint or route,
and dated evidence of configuration and runtime behavior. Distinguish code
presence, configured connector, successful deployment, migration and delivered
event. Mark missing evidence **[NO VERIFICADO]**.

Include one relationship diagram and an operational table showing what happens
on PR, merge, deployment, authentication, email delivery, errors, analytics and
payment callbacks. Explain which operations are automatic and which remain
manual; do not infer Cloud migration execution from a Supabase connector or
Sentry event receipt from a successful build.

Keep the single construction-stage MVP target
`https://project-a89lv.vercel.app/` and the existing Free/card-free boundary.
Do not create another environment or require paid capacity. Reference
`src/env.ts` as the variable contract rather than duplicating its inventory.
The mapping work starts with read-only inspection; provider changes are separate.

## Completion criterion for this follow-up

A reader can identify every verified active service, follow its connections and
triggers, and locate the evidence and unresolved gaps without searching across
historical audits. This follow-up does not reopen or delay unrelated 012.4 gates.
