# ADR 0003: Mercado Pago reliability boundaries

- Status: Accepted
- Date: 2026-09-09
- Parent: [Billing Platform v2](../architecture/billing-platform-v2-design.md)
- Design: [Mercado Pago reliability](../architecture/mercadopago-reliability-design.md)

## Context

Hosted subscription checkout can succeed remotely while local confirmation
is incomplete. Retrying creation risks duplicate subscriptions, while merely
logging an uncorrelated payment or financial divergence loses actionable work.
The existing billing architecture already has a provider-neutral reducer and
a planned reconciliation phase. These are the ownership boundaries to retain.

## Options considered

1. Extend existing billing services with durable checkout coordination and
   recovery through the existing reducer.
2. Move billing processing into a new Edge Function runtime.
3. Change to provider-managed subscription plans as part of remediation.

## Decision

Choose option 1. PostgreSQL owns local coordination and durable recovery
records; Mercado Pago owns collection and remote state; the existing reducer
owns normalized local transitions. The UI cannot authorize activation.

Keep pending hosted subscriptions without associated plans. Do not advertise
a Mercado Pago trial until it is actually implemented and tested. Record
financial divergences durably with alerts and manual resolution, without
automatically altering access or mapping a refund to `past_due`.

Checkout reservation precedes remote creation. Unknown remote outcomes block
blind recreation. Reconciliation repairs only unambiguous, authorized resource
mappings and uses the same reducer as webhooks. Scheduling remains a Phase 6
concern, with its runtime/authentication contract reviewed before activation.

## Consequences

- Adds persistence and recovery work rather than relying on logs or a browser
  retry to establish correctness.
- Preserves current provider abstraction, hosted payment UX and plan slugs.
- Requires an operator procedure for unresolved financial anomalies; alerting
  is not full automated refund handling.
- Defers remote plan migration, card-entry UX and automatic entitlement
  changes until separately justified by product requirements.
- Requires separate approval for Cloud migrations and provider configuration.

## Acceptance boundary

The linked design and sequential implementation plan were approved on
2026-09-09. Existing ADRs are not superseded. Acceptance authorizes the local
implementation boundary; it does not establish implementation completion,
current Cloud health, deployment authorization, or provider certification.
