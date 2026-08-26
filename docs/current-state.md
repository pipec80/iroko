# Current State

Last static verification: **2026-08-20**
Repository baseline inspected: `fe4b90ae59acf1105569b2edf6bfd705b548e6fe`

This is the operational entry point for humans and coding agents. It answers
what Iroko is today, which work is active, and which claims have actually been
verified. It does not replace execution plans, architecture documents, or
their evidence.

## Product position

Iroko is currently an **internal-first, reusable SaaS foundation**. It is being
built to a quality level that may later support a commercial boilerplate or
market kit, but it is not yet an installable, supported, customer-ready
product. Commercialization remains an option, not a present-tense claim.

## Current technical baseline

- Next.js 16 App Router, React 19, strict TypeScript and React Compiler.
- Locale-prefixed routes for `es`, `en`, `pt`, and `fr`; `es` is the default.
- Supabase provides authentication, PostgreSQL, RLS, migrations, and Edge
  Functions.
- Vitest covers unit/component tests and Playwright covers end-to-end flows.
- Sentry, Pino, and PostHog provide the current observability foundations.
- Plan 010 tenant-isolation remediation is completed with regression evidence.
  Billing Platform v2 remains active work, not a completed capability.

## Active work and order

Plan 011 is the remaining P0 behavior plan. Its internal dependency order is
authoritative; coordinate overlapping database, authorization, and billing
changes before implementation.

| Order | Work                                                                                                  | Priority | Current meaning                                                          |
| ----- | ----------------------------------------------------------------------------------------------------- | -------- | ------------------------------------------------------------------------ |
| 011   | [Billing Platform v2](exec-plans/active/011-billing-correctness.md)                                   | P0       | Active multi-phase billing redesign and certification                    |
| 012   | [Security hardening and pricing truth](exec-plans/active/012-security-hardening-and-pricing-truth.md) | P1       | Starts after the relevant P0 behavior is stable                          |
| 013   | [Launch-readiness roadmap](exec-plans/active/013-launch-readiness-roadmap.md)                         | P2       | Commercial-readiness roadmap; not yet decomposed into implementation PRs |

Plan 010 closed on 2026-08-26 through PRs #139, #140, #147 and #149. Its
final PR passed the full GitHub CI and Vercel Preview after the independent
toolchain repair in #150. This is implementation and disposable-preview
evidence, not a fresh certification of every external provider or Cloud
runtime.

Plans 001–009 are filed as completed evidence records. Their historical status
was not re-certified against a live runtime or cloud environment during this
documentation pass.

## Verification boundary

This document was checked against the repository tree, configuration, and
versioned plans. The application runtime, linked Supabase project, Vercel,
payment providers, Sentry, PostHog, and email delivery were not revalidated on
2026-08-20. Treat current external or runtime behavior as **[NO VERIFICADO]**
until a plan or runbook records fresh evidence.

A passing focused test proves only the exercised scope. It does not close a
plan, certify a provider, or establish launch readiness by itself.

### Evidence from the 2026-08-20 documentation audit

| Check                                                     | Result                                         | Meaning                                                                                     |
| --------------------------------------------------------- | ---------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `pnpm typecheck`                                          | Pass                                           | Current TypeScript tree type-checks                                                         |
| `pnpm lint`                                               | Pass                                           | Current ESLint rules pass                                                                   |
| Full `pnpm test`                                          | Not green in this run: 766 passed, 1 timed out | The timed-out billing test passed 7/7 in isolation; full-suite stability remains unverified |
| Versioned/new Markdown internal links                     | Pass: 0 broken links detected                  | Does not validate external URLs or runtime behavior                                         |
| Documentation checker unit tests                          | Pass: 4/4                                      | Covers internal targets, URL-encoded paths and forbidden stale references                   |
| Build, E2E, pgTAP, linked Supabase and external providers | Not run                                        | **[NO VERIFICADO]**                                                                         |

## Maturity and the path from 7/10 to 10/10

The earlier **7/10** was a qualitative assessment of documentation structure
and onboarding, not a product-release score. Once reviewed and versioned, this
alignment pass fixes the central contract and the main truth conflicts,
bringing that documentation layer closer to **8/10**. No numeric score is a
release gate.

A trustworthy 10/10 documentation and handoff system requires all of these
outcomes:

| Area                       | Current position                                                                         | Remaining gate                                                                       |
| -------------------------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Shared entry point         | `AGENTS.md`, thin `CLAUDE.md`, this file and `docs/index.md` are prepared in this change | Commit/merge them and keep them synchronized                                         |
| Status authority           | Priority and evidence order declared                                                     | Prevent stale secondary status files from being treated as current                   |
| Architecture and decisions | Overview and ADR process exist                                                           | Add ADRs only for material decisions and keep architecture coverage current          |
| Plans and evidence         | Active/completed split exists                                                            | Remove placeholders and require exact closure evidence                               |
| Module documentation       | Eight guides curated and prepared for version control                                    | Keep them synchronized with module contracts and refresh runtime evidence separately |
| Design system              | Poppy/Cobalt/Geist root accepted; generated and historical material classified           | Keep specification/runtime parity and add fresh visual evidence per material change  |
| Documentation automation   | Dedicated checker and workflow prepared in this change                                   | Merge it and require the `Documentation` check on protected branches                 |
| Operational truth          | Dated evidence register exists; current Cloud rows are unverified                        | Re-run runtime/Cloud checks before making current claims                             |

Product or commercial readiness is a separate gate. It additionally requires
closing Plans 010 and 011, stabilizing the complete test/runtime path, and—if
commercialization is chosen—finishing installation, licensing, upgrade,
support and buyer-onboarding work from Plan 013.

## Known documentation and tooling debt

- `ROADMAP.md` contains product direction and historical execution detail;
  active plans and accepted ADRs take precedence for current work.
- `docs/estado-fases.md` is local/ignored and stale; it is not authoritative.
- The canonical design-system root is accepted in ADR 0002. The generated
  handoff and historical previews remain intentionally preserved; full PDF
  visual inspection and per-screen production parity are **[NO VERIFICADO]**.
- The eight guides in `docs/modules/` are current at static-code level as of
  2026-08-20; their runtime and Cloud behavior remains **[NO VERIFICADO]**.
- In the platform-wide audit table, initial data is cross-account, but filters
  and `Cargar más` still call `getAccountAuditLogs`; remediation is not yet
  planned.
- The documentation workflow exists in this worktree but is not enforced until
  it is merged and selected as a required branch-protection check.

Fresh operational status and expiry rules live in the
[operational evidence register](quality/operational-evidence.md).

## How this file stays current

Update this file in the same pull request when any of these change:

- product position or supported deployment model;
- active-plan priority, status, or dependency order;
- a material architecture boundary;
- the verification status of a previously unverified capability.

Do not copy task-level checklists here. Link to the bounded execution plan and
put exact commands and evidence there.
