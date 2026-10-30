# Iroko MVP Freeze Roadmap

Iroko is an internal-first reusable SaaS foundation built with Next.js and
Supabase. The current objective is a solid MVP candidate that demonstrates the
capabilities already present with clear evidence, safe defaults and a coherent
path for reuse. It is not yet accepted as an installable customer product.

Direction accepted 2026-10-28: [ADR 0005](docs/adr/0005-replicable-saas-mvp-and-bounded-acceptance.md).
Deliver the replicable SaaS core before a Robot/client vertical. Editor R02 and
its development runner are outside the MVP critical path; effective exclusion
has local guards/unit evidence and bounded browser acceptance as of2026-10-29.
The exclusion prerequisite of015-T1 is satisfied locally; composition/billing,
reuse and remaining017 tasks stay open. See the dated current state and register.

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
   with the deployed configuration. Bounded acceptance completed 2026-10-19;
   [closure and exceptions](docs/audits/2026-10-19-plan-012-4-cloud-closure.md).
8. **Plan 016 T3 — initial disposition.** The
   [revalidation](docs/audits/2026-10-19-freeze-code-and-documentation-revalidation.md)
   and [central register](docs/exec-plans/active/freeze-remediation-register.csv)
   assign the findings. This is documented planning, not implementation or final T3 closure.
9. **Plan 017 — offered-core remediation.** Repair Auth/privacy/client identity,
   data/membership invariants and recovery/discovery in the offered configuration using
   the [bounded child plans](docs/exec-plans/active/017-freeze-remediation.md).
   Fixture safety work may advance when required to test these tasks safely.
   Record local P1 acceptance using the shared 017 contract, then proceed to
   step 10; final integrated acceptance is deliberately reserved for step 14.
   The scope prerequisite **015-T1/RS-05 may advance here first**: implement and
   verify excluded-module boundaries and the offered configuration. The rest of
   015's replication/update drill remains at step13; no dependency on editor acceptance.
10. **Plan 012.5 — pricing truth.** Keep its own
    [execution plan](docs/exec-plans/active/012-5-pricing-truth.md): align catalogue,
    labels, limits, landing, pricing, checkout and evidence-based copy. It is not
    split into 017 or merged with 015.
11. **Plan 014 T2/T3.** Correct trusted image origins and platform audit interaction.
12. **Plan 017 — offered-surface closure and dispositions.** Close remaining
    security/integrity and essential usability findings in offered web, privacy
    and CI/fixture surfaces. Explicitly defer secondary capabilities; do not run
    the editor development harness or expand Robot. Preserve completed repairs.
    Record the local milestone and each nonblocking disposition before 015. Neither local milestone
    moves 017 to completed or claims Cloud acceptance.
13. **Plan 015 — replicable core.** Verify effective exclusion of deferred modules,
    then prove independent installation, brand/configuration changes, one neutral
    business extension and one real update preserving data and customization.
    Reuse the catalogue from 012.5. Robot, cosmetics and tarot are possible later
    consumers, not three verticals to build for this gate.
14. **Plan 016 T2/T3 — final re-audit and acceptance.** Re-audit the final source
    inventory with independent review, reproducible findings and explicit certainty
    under ADR 0005; repair confirmed blockers and retest affected surfaces. Run the
    [candidate-validation protocol](docs/runbooks/freeze-candidate-validation.md)
    after the last changes from 015, then refresh the consolidated disposition.
15. **Solid MVP candidate.** Evaluate the exit gates as a whole; reaching the
    end of the list alone is not acceptance. Subsequent Robot/editor work is deferred,
    without being represented as accepted MVP functionality.

The bounded acceptance criteria live in the
[execution plans](docs/exec-plans/active/). This roadmap does not duplicate
their task checklists.

## MVP exit gates

A candidate exits the freeze only when all of the following are true:

- Plans 012, 014, 015, 016 and 017 satisfy their own Definitions of Done with
  applicable evidence for the offered MVP scope. Explicitly deferred child scope
  is not completed, but does not block once exclusion is verified. Reuse dated evidence only when
  tested content, dependencies, configuration and scenario remain valid; a new
  SHA alone does not require rerunning unchanged surfaces.
- No known P0 or unresolved P1 security/integrity defect remains in the offered auth, accounts, membership, RBAC,
  storage, email, billing, observability or reference-product paths.
- The capability inventory distinguishes implemented, verified, partial,
  deferred and `[NO VERIFICADO]` behavior without relying on intent as proof.
- The selected local/runtime checks pass, and required Cloud or provider
  evidence is either current or explicitly marked unavailable.
- The independent reuse drill proves the documented setup, configuration,
  extension and update path from a clean consumer context.
- Deferred modules are unavailable in the offered configuration at route/action
  boundaries, not merely hidden in navigation. An accessible offered P1 still blocks.
- Current state, capabilities, plans, runbooks and the repository entry points
  agree on the offered scope and evidence boundary.

Passing a focused test, completing a task list or moving a plan does not by
itself satisfy these gates.

The sequence update was approved by the owner on **2026-10-20** after the
directed code/documentation audit. It advances remediation before pricing and
moves final integrated validation after the last product changes. The
acceptance of this documentation does not establish that any new repair,
fixture, Cloud operation or provider test has run.

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
