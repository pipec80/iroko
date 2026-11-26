# Execution Plan Lifecycle

[Cierre del QA humano de acceso y cuenta](active/2026-11-26-cierre-qa-acceso-cuenta.md)
organiza las correcciones propuestas para la próxima sesión y sus comprobaciones
pendientes.

## Inventario autoritativo de cierre — 2026-11-17

La [enmienda ADR0005](../adr/0005-replicable-saas-mvp-and-bounded-acceptance.md)
cierra016 por el núcleo técnico. No queda otro plan de implementación activo
por defecto. Las carpetas contienen también referencias históricas y documentos
de una misma familia; un archivo en active/ no equivale a una tarea abierta.

| Familia                         | Estado vigente                           | Alcance / siguiente condición                                              |
| ------------------------------- | ---------------------------------------- | -------------------------------------------------------------------------- |
| 001 — deriva Supabase           | Completado                               | Mantenimiento ante cambios/regresión de migraciones                        |
| 002 — worker Cloud              | Completado                               | Operaciones ante incidentes o cambios                                      |
| 003 — Sentry                    | Completado acotado                       | Observabilidad ante regresión; no certificación global                     |
| 004 — alineación Next           | Completado                               | Plataforma en próximas actualizaciones                                     |
| 005 — calidad                   | Completado acotado                       | QA/operaciones conservan seguimientos registrados                          |
| 006 — PostHog                   | Completado acotado                       | Analítica ante cambios de contrato                                         |
| 007 — túnel Sentry Cloud        | Completado acotado                       | Observabilidad ante fallos del túnel                                       |
| 008 — salud email               | Completado acotado                       | Operaciones ante alarmas/incidentes                                        |
| 009 — RBAC/miembros             | Completado                               | Backend ante regresión de autorización                                     |
| 010 — aislamiento tenant        | Completado                               | Backend ante regresión/ampliación                                          |
| 011 — pasarelas                 | Pendiente/diferido, frente independiente | Billing/propietario; sesión visual, sandbox/cuentas y escenario autorizado |
| 012 — hardening/pricing         | Completado por entregables               | Hijos012.2/.3/.4/.5 conservan límites; RL-F según retorno                  |
| 013 — preparación comercial     | Diferido                                 | Propietario decide vender/distribuir boilerplate; no activación automática |
| 014 — superficies de referencia | Completado local acotado                 | QA ante cambios que invaliden evidencia                                    |
| 015 — base reutilizable         | Completado local acotado                 | Plataforma/QA ante nueva adaptación o evidencia invalidada                 |
| 016 — revisión integrada        | Completado, alcance enmendado            | Núcleo técnico; aceptación PSP transferida a011, billing sigue habilitado  |
| 017 — remediación               | Padre completado acotado                 | Sólo los dos lotes aprobados; cada pendiente conserva su dueño             |

### Referencias y auxiliares que no crean otra cola

- [Organización inicial e invitaciones, 20Nov](active/2026-11-20-organizacion-inicial-e-invitaciones.md):
  propuesta acotada de alta, retiro del asistente y continuidad de la
  invitación. Su aceptación es el punto de retorno a la compra visual de 011f.
  El [seguimiento de correcciones de QA](../quality/iroko-qa-corrections-tracker.md)
  ordena los FIX y vincula sus pruebas con el plan y la bitácora existentes.
- [Reparación acceso/cuenta,17Nov](active/2026-11-17-access-account-remediation.md):
  propuesta solicitada tras el piloto de auditoría, sin implementación iniciada.
  Mantiene A-ACCESS-01/02 en el registro central; no crea familia018 ni reabre017.
- 016-T1: revisión estática histórica cerrada08/10; no se reabre.
- 017.1–017.5: referencias técnicas en active/, con evidencia, transferencias y
  diferidos. No se marcan sus alcances enteros como completados. Editor avanzado
  sigue diferido y efectivamente excluido; Robot conserva la frontera aceptada.
- 011: una familia, no17 iniciativas nuevas. Fase1/corev2 cerrado; Mercado Pago
  fases2/6 y matrices con aceptación parcial; Stripe/Paddle/Lemon certificaciones
  diferidas.011a–g son desgloses/referencias de esa familia, no ejecución aprobada.
- Reorganización documental: completada en su alcance fechado.
- Mapa de servicios externos: auxiliar diferido; operaciones/propietario lo
  priorizan expresamente. La dependencia histórica012.4 satisfecha no lo ejecutó.

### Orden siguiente y significado de «MVP»

1. Mantener cerrado016 y sus pruebas válidas; atender P2 sólo en su retorno.
2. Retomar011 visualmente con el propietario cuando acuerde ventana, cuentas,
   configuración y operaciones. Mantener precios/checkout visibles y funcionales.
3. Con esa evidencia, decidir aceptación del uso monetizado. Configurar claves
   o abrir checkout no certifica pago/callback/recuperación.
   4.013 sólo si se decide distribución comercial. Auditoría de idea original e
   implementación se propone para otra conversación; no se ejecuta aquí.

Núcleo técnico aceptado no significa todos los proveedores certificados, MVP
monetizado aceptado ni producto comercial instalable. Los criterios generales de
seguridad y los [125IDs](active/freeze-remediation-register.csv) conservan vigencia.
Los listados y checkpoints históricos siguientes se leen con esta actualización.

Execution plans translate approved scope into bounded work and acceptance
criteria. Their directory records lifecycle; it does not by itself authorize
execution or prove a result.

## Lifecycle

- **Active** — bounded work in the current MVP freeze. The
  [roadmap](../../ROADMAP.md) owns its execution order.
- **Deferred** — preserved work outside the freeze or waiting for an explicit
  product decision, provider condition, credential or operational window.
  Deferred does not mean completed or rejected.
- **Completed** — the plan's Definition of Done and acceptance criteria were
  satisfied with recorded evidence. A directory move alone cannot establish
  completion.

The [current state](../current-state.md) owns verified implementation and
operational status. Plans may describe intended work and historical evidence,
but they do not override newer executable code, tests, configuration,
migrations or dated observations.

## Historical freeze checkpoints

Entrada vigente2026-11-10: [015](completed/015-reusable-foundation-acceptance.md)
cierra el núcleo reutilizable local con circuito útil, extensión, actualización
y recuperación verificadas. [Evidencia y límites](../quality/reusable-foundation-evidence.md).
Siguiente016; pagos reales/operación programada/Cloud conservan sus gates.

Checkpoint histórico2026-11-05: [014](completed/014-reference-surface-correctness.md)
aceptado localmente; [evidencia](../audits/2026-11-05-plan-014-t2-t3-execution.md).
Siguiente015 y después016. Cloud/MVP no se aceptan por este cierre.
Las entradas fechadas inferiores conservan la secuencia de su checkpoint.

Checkpoint histórico2026-11-04: el [padre017](completed/017-freeze-remediation.md)
completó sus dos lotes acotados; siguiente014-T2/T3, después015/016. Se conservan
los hijos técnicos para resultados históricos, alcances diferidos y recepción
en016. No se promueven sus pendientes por el movimiento del padre ni se cierra
el MVP o Cloud exhaustivo. Véase la [evidencia](../audits/2026-10-20-017-p1-execution.md#cierre-acotado-del-017--2026-11-04).

Direction 2026-10-28: [ADR0005](../adr/0005-replicable-saas-mvp-and-bounded-acceptance.md).
The base must be replicable before a Robot/client vertical. Historical queue,2026-11-02:
triage017.1-T9/017.2-T6 →014-T2/T3 →remaining offered017 →015 reuse proof
→016-T2/T3 final acceptance. The exclusion prerequisite of015-T1 passed locally;
012 is completed by its approved deliveries. Editor017.4 is deferred, with preserved tests
and no runtime acceptance. Its development runner is not a freeze prerequisite.
Keep deferred child scope identifiable; do not move its failed checks to completed.

Plan012 está cerrado por entregables2026-11-02; [disposición de seguimientos](../audits/2026-11-02-plan-012-integration-and-disposition.md). No acepta todo el MVP.

No product implementation plan is active by default after the17Nov closure.

- [Plan016 — completed technical scope](completed/016-nextjs-supabase-code-review.md)

Completed bounded remediation:

- [Plan 015 — reusable-foundation acceptance](completed/015-reusable-foundation-acceptance.md) — núcleo local aceptado2026-11-10; límites operativos explícitos en016/011.
- [Plan 014 — reference-surface correctness](completed/014-reference-surface-correctness.md) — cierre local2026-11-05; Cloud y gate integrado separados.
- [Plan 017 — freeze remediation](completed/017-freeze-remediation.md) — sólo el padre y su contrato acotado; hijos técnicos/diferidos y pendientes016 conservados.

The [central disposition register](active/freeze-remediation-register.csv)
preserves all historical IDs, partial splits, aliases and follow-ups. Detailed
[012.5](completed/012-5-pricing-truth.md) is completed locally2026-11-02 under Plan012, after the P1
remediation phase. Final technical016 validation completed after015 under the17Nov amendment,
using the [candidate runbook](../runbooks/freeze-candidate-validation.md).

Read the root roadmap for the single ordered queue. Maintenance records that
change documentation structure live with completed plans after their own
validation contract passes.

For historical 017 evidence, read its completed parent, the relevant child
reference and CSV rows; these are not a new execution entry. Local repair acceptance permits the next roadmap phase;
technical integrated acceptance closed after015 under016; provider acceptance remains011. 017 may close its bounded remediation independently under the November2
contract;016 owns the transferred final evidence and integrated acceptance. Evidence belongs in the existing dated audit
for its subsystem; a rerun alone does not require another plan or audit file.

### Entrada histórica de ejecución; referencias conservadas

[016](completed/016-nextjs-supabase-code-review.md) organizó la ejecución histórica en
cuatro bloques: candidato/oferta/evidencia; integración y brechas confirmadas;
circuito integrado; veredicto y consolidación. Conserva los IDs T0–T3 y el
[registro central](active/freeze-remediation-register.csv), sin crear otra cola.
Su preparación documental no constituye autorización para ejecutar el producto.

El [desglose016-T1](active/016-t1-security-integrity-critical-flows.md) es una
referencia histórica: la revisión estática cerró el2026-10-08. Sus checklists de
planificación no reabren esa cobertura ni aceptan cambios posteriores.
Los cinco hijos017 conservados en `active/` son referencias técnicas de Auth,
datos, billing, editor y web; su ubicación no los convierte en planes activos.
Los casos transferidos quedaron dispuestos en016 y sus filas existentes; la aceptación PSP pendiente pertenece a011;
editor/Robot y los demás casos diferidos requieren su condición de retorno.
No se mueven a completed porque sus alcances completos no fueron aceptados.

Plan 012 PR4 has a [completed bounded execution record](completed/012-4-csp-and-secrets.md)
and [Cloud closure evidence](../audits/2026-10-19-plan-012-4-cloud-closure.md).
The implementation merged through PR #229; actual provider/browser acceptance
and cleanup retain the audit's explicit exceptions. That historical012.4 closure
did not close pricing or its parent; both subsequently closed within the bounded
012 integration recorded above. The earlier [static inventory](../audits/2026-10-14-plan-012-4-readiness.md)
is historical evidence, not a fresh runtime check.

## Deferred and completed records

- [Plan 011 billing family](deferred/011-billing/README.md)
- [Plan 013 — commercial preparation](deferred/013-launch-readiness-roadmap.md)
- [Documentation freeze reorganization](completed/documentation-freeze-reorganization.md)
- [Completed plans](completed/)

Reactivate deferred work only through an explicit product decision and matching
roadmap/current-state update. Preserve scenario-specific evidence and its date
when changing lifecycle.
