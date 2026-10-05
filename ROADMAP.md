# Iroko MVP Freeze Roadmap

Iroko is an internal-first reusable SaaS foundation built with Next.js and
Supabase. The current objective is a solid MVP candidate that demonstrates the
capabilities already present with clear evidence, safe defaults and a coherent
path for reuse. It is not yet accepted as an installable customer product.

## Authority boundary

This roadmap owns product direction, the freeze boundary and execution order.
It does not prove implementation or operational health. For current facts and
dated evidence, read [Current State](docs/current-state.md); when sources
conflict, apply the hierarchy in [AGENTS.md](AGENTS.md) and
[ADR 0001](docs/adr/0001-documentation-authority-and-agent-contract.md).

## Feature freeze

Until the MVP exit gates below are satisfied, work is limited to:

- repairing defects in existing capabilities;
- reviewing and verifying maintained code, configuration and migrations;
- making existing modules coherently configurable;
- documenting current behavior, evidence, extension points and limitations;
- removing or correcting surfaces that imply unsupported behavior.

Do not add providers, verticals, commercial modules or catalogue features
during this freeze. A new finding belongs in the plan that owns the affected
surface; it does not silently expand the product.

## Ordered queue

This is the single execution sequence for the freeze:

1. **Plan 011 freeze scope satisfied; remaining scenarios deferred.** Preserve
   the scenario-specific billing evidence without treating deferred provider
   or operational work as completed.
2. **Plan 016 T0/T1.** Fix the review candidate and inventory, then complete the
   read-only Next.js, Supabase security and data-architecture review.
3. **Plan 014 T1.** Correct the robot route, action and RLS permission boundary.
4. **Plan 012.1 — Grants.** Close exposed-schema grant risks.
5. **Plan 012.3 — rate-limiting investigation.** Establish the evidence and
   implementation boundary before changing behavior.
6. **Plan 012.2 — SSRF.** Close outbound request risks.
7. **Plan 012.4 — CSP and secrets.** Align browser policy and secret handling
   with the deployed configuration.
8. **Plan 012.5 — pricing truth.** Make plan names, limits and product surfaces
   consistent with current configuration.
9. **Plan 014 T2/T3.** Correct trusted image origins and platform audit
   interaction.
10. **Plan 016 T2/T3.** Validate the corrected candidate and consolidate review
    evidence plus remaining owned findings.
11. **Plan 015.** Prove independent installation, configuration, extension and
    update of the reusable foundation.
12. **Solid MVP candidate.** Evaluate the exit gates as a whole; reaching the
    end of the list alone is not acceptance.

The bounded acceptance criteria live in the
[execution plans](docs/exec-plans/active/). This roadmap does not duplicate
their task checklists.

## MVP exit gates

A candidate exits the freeze only when all of the following are true:

- Plans 012, 014, 015 and 016 satisfy their own Definitions of Done with fresh
  evidence for the candidate revision.
- No known P0 defect remains in the offered auth, accounts, membership, RBAC,
  storage, email, billing, observability or reference-product paths.
- The capability inventory distinguishes implemented, verified, partial,
  deferred and `[NO VERIFICADO]` behavior without relying on intent as proof.
- The selected local/runtime checks pass, and required Cloud or provider
  evidence is either current or explicitly marked unavailable.
- The independent reuse drill proves the documented setup, configuration,
  extension and update path from a clean consumer context.
- Current state, capabilities, plans, runbooks and the repository entry points
  agree on the offered scope and evidence boundary.

Passing a focused test, completing a task list or moving a plan does not by
itself satisfy these gates.

## Deferred scope

The following work is preserved outside the freeze queue:

- remaining Plan 011 Mercado Pago scenarios that depend on provider timing,
  productive credentials or later operational drills;
- Stripe, Paddle and Lemon Squeezy certification;
- Plan 013 commercial distribution, licensing, buyer onboarding, landing-page
  work and support packaging;
- new AI, IoT or other vertical product capabilities;
- any new provider or catalogue expansion.

Deferred work returns to active only through an explicit product decision that
updates this roadmap and current state. Provider-dependent work also requires
the needed credentials, timing and authorization; commercial work requires a
decision to sell the boilerplate.

## Navigation

- [Current implementation and evidence](docs/current-state.md)
- [Capability inventory](docs/capabilities.md)
- [Product strategy](docs/architecture/product-strategy.md)
- [Active execution plans](docs/exec-plans/active/)
- [Documentation index](docs/index.md)
- [Preserved roadmap history](docs/history/README.md)
