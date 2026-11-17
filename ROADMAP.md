# Iroko MVP Freeze Roadmap

## Salida técnica016 y cola vigente — 2026-11-17

**016 completado en su alcance enmendado por el propietario.**
[Decisión](docs/adr/0005-replicable-saas-mvp-and-bounded-acceptance.md),
[cierre](docs/exec-plans/completed/016-nextjs-supabase-code-review.md) e
[inventario completo de planes](docs/exec-plans/README.md).
001–010,012,014,015 y padre017 conservan sus cierres acotados; se suma016.
No queda otro plan de implementación activo por defecto.011 conserva aceptación
de pasarelas pendiente como frente independiente;013 distribución comercial
sigue diferido. Hijos/referencias no se cuentan como planes nuevos activos.

Billing, precios, planes y apertura de checkout permanecen habilitados, sin
cambios de código ni configuración. Se separan sus pruebas, no la funcionalidad.
La recepción oficial MP, pago/activación y recuperación conservan [NO VERIFICADO]
en011; no se aceptan mediante el cierre técnico016 ni por configurar keys.
La obligación anterior de resolver ese gate dentro016 queda sustituida por la
enmienda expresa; antes de confiar dinero real permanece la aceptación PSP.

Siguiente: mantenimiento P2 en sus retornos; sesión visual011 con el propietario
cuando acuerde sandbox/cuentas/ventana y autorización de cada operación.
Luego evaluar el MVP monetizado con esa evidencia.013 requiere decisión de venta;
Robot/editor y nuevos proveedores no se activan. La auditoría futura de la idea
original se hará en otra conversación, sin iniciar ahora una nueva ronda.

El núcleo técnico y la réplica acotada tienen evidencia, pero este cierre no
declara un producto comercial instalable ni toda la integración financiera
certificada. Los exit gates de abajo conservan seguridad/integridad y usan la
asignación de aceptación PSP de17Nov. Los checkpoints anteriores son históricos.

Checkpoint2026-11-16: PR252/main118fedf delivered with full CI gates green
and canonical deployment READY. Current MP-01 passed hosted-checkout opening
without payment; historical paid/callback evidence retains its dated boundaries.
Current authenticated provider ingress and the original impersonation bearer
expiry remain acceptance gates. The interrupted TTL trial cleaned its own
fixtures; a bounded evidence-writer repair passed local tests before a new
authorized trial. Plan016 remains active/partial; no new plan or vertical.

Later20:07Z: FOLLOW-TTL accepted from observed natural expiry after the
documented tolerance, fresh positive control and cleanup0. The runner exit1
remains recorded for a late browser-release diagnostic, with independent
process-absence evidence. Only current official authenticated Mercado Pago
ingress remains mandatory and unverified; notification authorized without pay,
pending owner session/OAuth. Do not close016 from the historical payment alone.

Checkpoint2026-11-12: [016 execution remains partial](docs/audits/2026-11-12-nextjs-supabase-code-review.md).
Local team-quota race repaired and SQL gate renewed; DB intake classified.
Cloud/local180 after two specifically authorized migrations and definition/ACL
readback; offered billing and remaining runtime gates prevent closure.
No additional plan, integration or deployment is authorized by this checkpoint.

Iroko is an internal-first reusable SaaS foundation built with Next.js and
Supabase. The current objective is a solid MVP candidate that demonstrates the
capabilities already present with clear evidence, safe defaults and a coherent
path for reuse. It is not yet accepted as an installable customer product.

Direction accepted 2026-10-28: [ADR 0005](docs/adr/0005-replicable-saas-mvp-and-bounded-acceptance.md).
Deliver the replicable SaaS core before a Robot/client vertical. Editor R02 and
its development runner are outside the MVP critical path; effective exclusion
has local guards/unit evidence and bounded browser acceptance as of2026-10-29.
Plan015 accepted the bounded local reusable core on2026-11-10: public pages,
signup/access, useful tenant record with private file, adaptation, update and
recovery. Plan016 owns integrated acceptance and explicit operational/provider
limits. See the dated current state and register.

## Authority boundary

This roadmap owns product direction, the freeze boundary and execution order.
It does not prove implementation or operational health. For current facts and
dated evidence, read [Current State](docs/current-state.md); when sources
conflict, apply the hierarchy in [AGENTS.md](AGENTS.md) and
[ADR 0001](docs/adr/0001-documentation-authority-and-agent-contract.md).

## Feature freeze

Entrada vigente2026-11-10: **015 cerrado localmente →016 aceptación integrada**.
[Resultados y límites de015](docs/quality/reusable-foundation-evidence.md).
No repetir pruebas vigentes; ejecutar sólo gaps del candidato y conservar
gates de pago real, operación programada y Cloud donde correspondan.

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

Historical execution entry,2026-11-10: [existing Plan016](docs/exec-plans/completed/016-nextjs-supabase-code-review.md), in four blocks:

1. Identify the current candidate, offered capabilities and reusable evidence.
2. Verify Next/Supabase integration and repair only confirmed defects in the offered scope.
3. Validate the integrated circuit using the existing runbook, including backend negatives and concurrency where applicable.
4. Consolidate dispositions and issue a bounded acceptance verdict.

T0/T1 remain historical completed reviews; T2/T3 remain pending. Preserve the central register and inherited IDs. Actual PSP acceptance, scheduled worker/alert recovery, Cloud parity and elapsed signed-URL expiry require their own evidence when applicable to the offered configuration. Conditional/deferred cases do not become automatic MVP blockers.

### Historical sequence and completed milestones

**Checkpoint histórico2026-11-05:**014 completó su aceptación local de imágenes y
auditoría, conservando T1 histórico. [Evidencia y límites](docs/audits/2026-11-05-plan-014-t2-t3-execution.md).
Siguiente **015 reutilización/configuración →016 aceptación final**. No se
declara MVP ni Cloud aceptados. Secuencia inferior conservada como trazabilidad.

**Checkpoint histórico2026-11-04:** 017 completó sus dos lotes bajo el contrato acotado,
con [evidencia y límites](docs/audits/2026-10-20-017-p1-execution.md#cierre-acotado-del-017--2026-11-04).
Siguiente **014-T2/T3**, después015 y016. Se conserva la cola histórica inferior
para trazabilidad; los dieciséis IDs transferidos siguen pendientes en016 y
editor/Robot continúan diferidos. No se acepta el MVP por este hito.

The following sequence preserves the historical task ownership; completed stages are not a new execution queue:

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
9. **Plan 017 — bounded remediation completed2026-11-04.** Repair Auth/privacy/client identity,
   data/membership invariants and recovery/discovery in the offered configuration using
   the [bounded child plans](docs/exec-plans/completed/017-freeze-remediation.md).
   Fixture safety work may advance when required to test these tasks safely.
   Record local P1 acceptance using the shared 017 contract, then proceed to
   step 10; final integrated acceptance is deliberately reserved for step 14.
   The scope prerequisite **015-T1/RS-05 may advance here first**: implement and
   verify excluded-module boundaries and the offered configuration. The rest of
   015's replication/update drill remains at step13; no dependency on editor acceptance.
10. **Plan 012.5 — pricing truth: accepted locally2026-11-02.** Keep its own
    [execution plan](docs/exec-plans/completed/012-5-pricing-truth.md): align catalogue,
    labels, limits, landing, pricing, checkout and evidence-based copy. It is not
    split into 017 or merged with 015.
11. **Security triage before P2 —017.1-T9/017.2-T6.** Receive RL-F01 (Data API IP trust) and RL-F03 (Cloud accounts grants) from completed012. Inventory and decide risk; any confirmed offered-surface P0/P1 is repaired first. Do not repeat accepted017 core repairs.
12. **Offered corrections —014 T2/T3, then remaining017.** Start with trusted image origins and platform audit interaction as two bounded tasks/PRs. Group subsequent web/privacy evidence by subsystem without merging IDs. Close remaining
    security/integrity and essential usability findings in offered web, privacy
    and CI/fixture surfaces. Explicitly defer secondary capabilities; do not run
    the editor development harness or expand Robot. Preserve completed repairs.
    Record the bounded017 closure and each disposition before015. The November2
    contract allows017 completion after its security/privacy lots; functional
    evidence transfers explicitly to016, without PASS or Cloud acceptance.
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
