# Iroko Engineering Documentation

Continuación2026-11-13: [016 sigue activo](audits/2026-11-12-nextjs-supabase-code-review.md).
Reporte Cloud con credenciales eliminado; sustitutas Supabase/Vercel y consumidores
preparados con autorización. Revocación anterior pendiente de despliegue automático
Git READY y comprobación posterior. Reparación de capturas33/33; navegación pública
real1/1 y cleanup PASS, tipos PASS. Esto no certifica WAF, pagos ni cierre016.
Dependabot:0PR abiertos; alerta135 deepmerge conserva mitigación y seguimiento.

Ejecución vigente2026-11-12: [016 parcial](audits/2026-11-12-nextjs-supabase-code-review.md),
cuota equipos reparada localmente, SQL1189 PASS y clasificación DB-01…20.
Cloud/local180 tras dos migraciones autorizadas y readback; evidencia operacional
y del proveedor ofrecido aún pendiente impide cierre integrado.

Estado vigente2026-11-10: [015 completado localmente](exec-plans/completed/015-reusable-foundation-acceptance.md)
para el núcleo reutilizable; [evidencia y límites](quality/reusable-foundation-evidence.md).
El siguiente gate es [016](exec-plans/active/016-nextjs-supabase-code-review.md): candidato/evidencia, integración y brechas confirmadas, circuito integrado y veredicto. Es la única entrada de ejecución; T1 y los hijos017 conservan referencias históricas. No se acepta Cloud ni pagos reales por este cierre.

This directory is the versioned knowledge base for current status, architecture,
execution plans, evidence, runbooks and durable technical decisions.

## Start here

Direction accepted 2026-10-28: [replicable SaaS MVP and bounded acceptance,
ADR0005](adr/0005-replicable-saas-mvp-and-bounded-acceptance.md). Core first,
then optional verticals. Editor runner is not on the MVP critical path; its
effective exclusion now has local guards/unit and bounded browser acceptance
(2026-10-29); composition and independent reuse were accepted within the bounded local015 drill on2026-11-10. Integrated acceptance remains in016; see the dated current state.

1. [Current state](current-state.md) — implemented behavior, dated evidence,
   operational gaps and verification boundaries. The [freeze progress table](current-state.md#freeze-work-status) summarizes completed scopes and remaining work.
2. [MVP freeze roadmap](../ROADMAP.md) — allowed work, the single execution
   order, exit gates and deferred scope.
3. [Capability inventory](capabilities.md) — the declared SaaS surface and the
   evidence boundary for each capability.
4. [Execution-plan lifecycle](exec-plans/README.md) — active, deferred and
   completed plan locations and their meaning.
5. [Documentation history](history/README.md) — superseded versioned material,
   including the exact pre-freeze roadmap; non-authoritative.

## Checkpoints históricos — 2026-11-05

014 aceptado localmente: imágenes, auditoría global, SQL19 y navegador con
cleanup verificado. [Cierre y límites](audits/2026-11-05-plan-014-t2-t3-execution.md).
Siguiente015 →016. Los párrafos siguientes conservan checkpoints previos del día.

Actualización de ejecución: T2 corregido con unit20/20; T3 implementado, con
SQL/browser pendientes por destino Docker y presupuesto local.014 sigue activo.
[Evidencia y límites](audits/2026-11-05-plan-014-t2-t3-execution.md).

[014 actualizado para revisión](exec-plans/completed/014-reference-surface-correctness.md):
T1 conserva su aceptación local; T2/T3 pendientes, sin autorización de implementación
en esta actualización. El plan explicita servicios Free, fixtures en el stack oficial,
pruebas secuenciales con recursos acotados y separación del gate integrado016.
Orden conservado:014-T2/T3 →015 →016. La revisión documental no acepta runtime.

## Cierre histórico registrado — 2026-11-04

017 completó su contrato acotado de seguridad/configuración y privacidad.
[Cierre, revisión y límites](audits/2026-10-20-017-p1-execution.md#cierre-acotado-del-017--2026-11-04).
Supabase repo/local/Cloud178; candidato desplegado4917f6e, mock general bloqueado.
Los dieciséis IDs recibidos por016 siguen pendientes y los hijos técnicos no
adquieren aceptación global por el cierre del padre. Siguiente **014-T2/T3**,
después015 y016. No se declara cerrado el MVP ni Cloud exhaustivo.

## Entrada histórica — 2026-11-02

012 cerrado por entregables; Supabase177 migraciones repo/local/Cloud.
[Integración y pendientes](audits/2026-11-02-plan-012-integration-and-disposition.md).
Siguiente: triage017 RL-F01/F03,014 y resto017; después015 reutilización y016
aceptación final. No duplicar los cierres históricos ni reactivar editor/Robot.

Acotación posterior del mismo día:017 conserva dos lotes finitos de seguridad
y privacidad; dieciséis IDs funcionales pasan a016 con estados pendientes.
Puede cerrar su remediación antes de015/016 al cumplir el contrato actualizado;
no se exige mantenerlo abierto por el gate final ni se declaran casos PASS.

## Historical freeze remediation — 2026-10-20

Execution simplification, 2026-10-27: the existing 017 parent owns the shared
model-independent contract and re-entry queue; its five children own technical
task outcomes. The CSV remains the single disposition register. Local repair
milestones are separate from final integrated freeze acceptance; no additional
plan directory or parallel status inventory is introduced.

- [Code/documentation revalidation](audits/2026-10-19-freeze-code-and-documentation-revalidation.md) — 53 historical IDs revalidated with evidence boundaries.
- [017 specification and child plans](exec-plans/completed/017-freeze-remediation.md) and [central disposition register](exec-plans/active/freeze-remediation-register.csv) — P1 and P2 local implementation in progress; [execution evidence](audits/2026-10-20-017-p1-execution.md) records task results and pending acceptance separately. [Environment triage](audits/2026-10-27-017-environment-triage.md) distinguishes local candidate checks from Cloud acceptance.
- [012.5 pricing execution plan](exec-plans/completed/012-5-pricing-truth.md) — accepted locally and integrated through PR241 on2026-11-02; parent012 completed by deliveries. This does not close015/016 or certify real payments.
- [Final candidate validation](runbooks/freeze-candidate-validation.md) — local, SQL, browser, provider and documentary gates after the final product changes. The root roadmap owns the sequence.
- [Planning review and delivery](audits/2026-10-20-freeze-remediation-planning-review.md) — independent review, corrections to the plans and documentary checks; product implementation remains pending.

## Product and architecture

- [Product strategy](architecture/product-strategy.md) — target promise,
  minimal complete integrations, adaptation boundaries and evidence required
  before making product claims.
- [System overview](architecture/system-overview.md) — system context,
  architectural boundaries and change map.
- [External services/connector map follow-up](exec-plans/deferred/external-services-map.md) — deferred until after 012.4; consolidate actual services, connections, automation and verification evidence.
- [ADR index](adr/README.md) — accepted decisions and trade-offs.
- [Module catalog](modules/README.md) — detailed implementation guides and
  their verification boundaries.
- [Canonical design system](design-system/README.md) — Poppy, Cobalt, Geist,
  tokens and generated/historical boundaries.
- [Proposed IoT pilot](architecture/iot-vertical-pilot.md) — a deferred
  vertical reference used to reason about core/extension boundaries; runtime
  and Cloud integration remain **[NO VERIFICADO]**.

## Evidence and operations

- [MVP Cloud acceptance target](runbooks/mvp-cloud-acceptance.md) — owner decision 2026-10-19: use `project-a89lv.vercel.app` for all Cloud tests; preview/production separation is not required during construction. Renew deployed revision/configuration before acceptance.

- [Git consolidation and Dependabot review](audits/2026-10-14-git-consolidation-and-dependabot.md) — exact updates, checks and integration state before 012.4.
- [Next.js 16.4.1 security update](audits/2026-10-15-next-16-4-1-security-update.md) — critical advisory remediation and local verification.
- [Operational evidence](quality/operational-evidence.md) — dated runtime,
  Cloud and release observations with validity rules.
- [Plan 012.3 closure and follow-ups](audits/2026-10-14-plan-012-3-follow-ups.md) — accepted scope, unexecuted checks and criteria for resuming pending work.
- [Plan 012.4 execution plan](exec-plans/completed/012-4-csp-and-secrets.md), [static inventory](audits/2026-10-14-plan-012-4-readiness.md) and [local execution evidence](audits/2026-10-15-plan-012-4-local-hardening.md) — implementation integrated in PR #229; bounded local/Cloud acceptance and exceptions are recorded in the [closure audit](audits/2026-10-19-plan-012-4-cloud-closure.md).
- [Plan 012.4 Cloud rollout readiness](audits/2026-10-16-plan-012-4-cloud-rollout-readiness.md), [DB execution](audits/2026-10-16-plan-012-4-cloud-db-execution.md) and [candidate execution](audits/2026-10-16-plan-012-4-candidate-execution.md) — SQL postflight passed, [authorized mock recovery](audits/2026-10-16-plan-012-4-preview-mock-key-recovery.md) executed and second candidate READY. These dated attempts precede the fixed-domain Git deployment and completed bounded acceptance recorded in the closure audit.
- [Reusable SaaS investigation — 2026-09-24](audits/2026-09-24-reusable-saas-readiness.md)
- [SaaS template competitive landscape — 2026-10-05](audits/2026-10-05-saas-template-competitive-landscape.md)
- [Full platform audit — 2026-08-02](audits/2026-08-02-full-platform-audit.md)
- [Sentry browser observability audit — 2026-08-03](audits/2026-08-03-sentry-audit.md)
- [Definition of Done](quality/definition-of-done.md)
- [Testing strategy](quality/testing-strategy.md)
- [Local synchronization and Codex runbook](runbooks/local-sync-and-codex.md)
- [Billing recovery and reconciliation runbook](runbooks/billing-reconciliation.md)
- [Email queue worker runbook](runbooks/email-queue.md)
- [Webhook safe delivery transition runbook](runbooks/webhook-safe-delivery.md)
- [Sentry tunnel Cloud smoke check runbook](runbooks/sentry-tunnel-smoke.md)

## Execution support

- [Codex remediation orchestrator](prompts/codex-remediation-orchestrator.md)
- [Codex follow-up operations prompt](prompts/codex-follow-up-operations.md)
- [Codex task template](prompts/codex-task-template.md)

## Authority when sources disagree

Use this order: executable code; tests and observed evidence; configuration and
database migrations; [current state](current-state.md); accepted ADRs and
current architecture; active execution plans; the root roadmap; then audits,
completed plans and ignored/local notes as historical evidence.

Iroko is currently an internal-first reusable SaaS foundation, not a
customer-ready installable product. [ADR 0001](adr/0001-documentation-authority-and-agent-contract.md)
defines the authority model and [AGENTS.md](../AGENTS.md) defines repository
working rules.

## Directory policy

Versioned, maintained documentation:

- `architecture/` and `adr/` — durable boundaries and decisions;
- `audits/` — dated investigations, not implementation authorization;
- `exec-plans/active/` — bounded work in the current freeze;
- `exec-plans/deferred/` — preserved work outside the freeze or waiting for an
  explicit condition;
- `exec-plans/completed/` — plans whose acceptance criteria have recorded
  evidence;
- `history/` — superseded versioned material, never current authority;
- `modules/`, `quality/`, `runbooks/` and `prompts/` — implementation guides,
  evidence rules, operational procedures and execution support;
- `design-system/` — the canonical visual specification plus explicitly
  classified generated and historical references.

Intentionally local and ignored:

- `local/` — working history, plan archives, database notes and vendored
  reference material;
- `private/`, `drafts/`, `generated/` and `exports/`;
- local/private/draft Markdown suffixes, PDFs and non-allowlisted screenshots.

Do not place credentials, connection strings, service-role keys, customer
data, signed URLs or private incident material in versioned documentation.

Directory placement does not authorize execution or prove completion. Update
current state when verified behavior changes, update the roadmap when scope or
order changes, and move a plan only under the lifecycle rules in the
[execution-plan index](exec-plans/README.md).
