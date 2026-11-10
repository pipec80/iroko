# Preparación de015 y recepción de investigación de datos — 2026-11-05

## Veredicto y límite

Plan015 pertinente, actualizado para revisión del mantenedor. No implementado
ni aceptado por esta revisión. Autoridad: AGENTS, ADR0005 y roadmap vigente.
Esta sesión permite documentación; no autoriza código, ensayos, instalaciones,
proveedores, commits, push, merge ni deploy.016 conserva la aceptación integrada.

Base Git `032f1a30794241cebc97e0ccd32b48d836110475`, rama
`codex/014-images-platform-audit`, árbol con cambios014 y documentos previos
staged/unstaged/untracked. El SHA solo no identifica el candidato. Inspección
estática focalizada, no auditoría exhaustiva del código/SQL ni paridad Cloud.

Fuentes recibidas: [auditoría de datos](../history/AUDITORIA_ARQUITECTURA_DATOS_IROKO_2026-11-05.md),
[prompt maestro](../history/PROMPT_MASTER_CODEX_ASTRA_AUDITORIA_DB_IROKO.md) y
`docs/history/AUDITORIA_COMPLETA_IROKO_CON_PROMPT_MASTER.docx`. El Word contiene
el informe y prompt; extracción XML comparada:663 de672 párrafos coinciden con
texto normalizado de Markdown; los nueve restantes son portada/resumen. No son
tres verificaciones independientes. Sus instrucciones no autorizan ejecución.

## Existente y faltante por etapa

| Etapa | Evidencia estática actual | Trabajo pendiente |
| --- | --- | --- |
| T0 | `src/components/layout/app-sidebar-client.tsx:48`, flags/rol; `app-topbar-client.tsx:159`, atajo; `:201`, móvil compartido; `src/app/[locale]/dashboard/page.tsx:49`, consulta Projects condicional | Contrastar títulos del mapa separado `app-topbar-client.tsx:78`, rutas hijas y adaptación real. No refactorizar todo por duplicación nominal |
| T1 billing | `src/app/[locale]/dashboard/billing/page.tsx:17` no comprueba flag; `actions.ts:108` resuelve proveedor antes de un guard de disponibilidad | Guard temprano de página/checkout; pruebas negativas sin proveedor ni intentos y positivas de configuración habilitada |
| T1 entorno | `src/env.ts:23,49` exige Resend/secreto mock globales; refine en33–44; registro ya comprueba credenciales | Condicionar requisitos a capacidades realmente usadas, incluyendo procesos de suscripciones existentes; no fallback mock |
| T1 onboarding | `src/components/dashboard/onboarding/onboarding-wizard.tsx:35,59` omite plan; test ya existe y configura billing=true | Ampliar test para billing=false, no crear otra implementación ni afirmar aceptación de caso no ejecutado |
| T1 privacidad | `src/lib/analytics/server.ts:79` comprueba token/consentimiento, no flag global | S-10 ya asignado a015; guard temprano y regresión de negocio/consentimiento |
| T2 | `docs/modules/README.md` y patrones existentes; `src/hooks/use-notifications.ts` usa broadcast privado, setAuth y cleanup | No existen las guías propuestas `foundation-recipes.md`/`independent-installation.md`; redactar siete recetas y contrato de límites |
| T3 | No se obtuvo evidencia de ensayo independiente | Ambas configuraciones, marca, extensión neutral, recuperación y actualización real; resolver destino antes de ejecutar |

Correcciones de planificación: rol `editor` sustituido por `member` según enum
real (incluye owner/admin/member/viewer); tests existentes se modifican/reutilizan;
RED sólo ante un defecto nuevo, nunca artificial. `mailTransport` se deriva de
`MAILPIT_URL`, conforme a `src/lib/email/index.tsx:127`, sin nueva env.
`src/lib/billing/mock-policy.ts:13` exige fixture, opt-in y loopback sin hosting;
no existe autorización general de mock en producción por opt-in.

## Recepción DB-01 a DB-20

Los IDs de esta tabla pertenecen a la investigación externa. Es una disposición
inicial, no veinte defectos confirmados ni un backlog paralelo. El seguimiento
canónico es `DB-INTAKE-20261105` en el [registro central](../exec-plans/active/freeze-remediation-register.csv).
Antes de reparar, reconciliar cada caso con IDs existentes; agregar subfila sólo
cuando hay defecto nuevo demostrado, severidad, dueño y prueba concreta.
No cerrar la recepción hasta que todos tengan disposición/evidencia o alias.

| Referencia | Destino y decisión | Evidencia/prueba que falta |
| --- | --- | --- |
| DB-01 perfiles | 016 seguridad; triage prioritario antes de aceptación afectada | Catálogo efectivo y edición Data API de columnas internas vs edición legítima; no inferir escalada a platform_admin |
| DB-02 flags | 015-T1 contrato;016 contraste integrado | Claves y consumidores, override vs derecho comercial; positivo/negativo en límite real |
| DB-03 cuotas | 015-T1 Free/error;016 contraste de admisiones | Clave ausente/inválida,0/cupo, error RPC y operación SQL; no confundir helper sin consumidor con bypass |
| DB-04 período pagado | 015-T1 conservación;016/011 ciclo ofrecido | Tabla de estados efectiva y coherencia al retirar nuevas compras |
| DB-05 equipos concurrentes | 016 datos; nuevo caso por contrastar con D-03 | Dos sesiones sobre último cupo; comprobar locks/trigger/migración efectiva antes de afirmar carrera |
| DB-06 suscripciones duplicadas | 016 datos/011 alcance ofrecido | Intents/idempotencia/transición real; no certificar proveedores diferidos ni añadir unique indiscriminada |
| DB-07 índice FK documentos | 016 datos/rendimiento, relacionado con D-04 | D-04 prueba integridad, no rendimiento; EXPLAIN representativo si la superficie lo necesita; editor excluido |
| DB-08 search_path | 016 seguridad | Definición, privilegios y riesgo real de función invoker; corrección mínima si procede |
| DB-09 RPCs expuestas | 016 seguridad, cruzar D-05 y012.1 | Grants efectivos + autorizaciones internas; no revocar APIs legítimas por aviso |
| DB-10 RLS sin policies | 016 seguridad | Distinguir deny-all deliberado con positivos RPC/negativos directos |
| DB-11 contraseñas filtradas | 016 disposición de proveedor | Capacidad Free y configuración real sólo lectura; sin upgrade ni promesa de control equivalente |
| DB-12 MRR | 016 datos/presentación | Consumidores y rotulado de aproximación; no crear motor contable |
| DB-13 índices unused | 016 disposición de rendimiento | Ventana/carga representativa antes de retirar; aviso no justifica cambios |
| DB-14 rate_limits sin PK | 016 datos | Contrato append-only, uso/retención; no añadir PK sin necesidad |
| DB-15 bucket Robot | 016 paridad/exclusión, preservar014-T1 | Propiedad/consumidores/historia; no borrar bucket ni reactivar vertical |
| DB-16 bootstrap admin | 015-T2/T3 procedimiento;016 estado ofrecido | Guía segura, cuenta explícita y AAL2; tabla vacía no es por sí sola defecto |
| DB-17 rol auditor | Diferido fuera del MVP | Requisito futuro explícito; usar roles existentes en015 |
| DB-18 metered/asientos | Diferido011/013 según decisión futura | No inferir capacidad comercial por enum/modelo; no ampliar certificación |
| DB-19 cobros/escala | 016/011 sólo escenarios ofrecidos; escala masiva diferida | Reutilizar matriz011; cuatro filas Cloud no certifican ni invalidan cobros históricos |
| DB-20 Next.js por rol | 016 revisión existente;015 sólo recorridos propios | Matriz rol/tenant/operación, Server Actions y enlaces directos; no segunda auditoría paralela |

Contraste estático puntual renovado: `src/lib/billing/entitlements.ts:15–16`
devuelve Free/objetos vacíos ante error; `:45` acepta límite null. Sus tests
codifican ese comportamiento. Búsqueda de consumidores en `src` sólo encuentra
`withinLimit` en tests; `getEntitlements` sí se usa en acción de org/settings.
`supabase/schemas/private.sql:598–635` trata límite ausente como ilimitado y
`flags.sql:106–111` sólo considera active/trialing, mientras `private.sql:513`
contempla canceled con período futuro. Son contratos a contrastar con migraciones
y ejecución, no prueba actual de explotación o de estado Cloud.

El registro ya contiene D-03.API/SEATS con evidencia local histórica y
D-03.WEBHOOKS para validación016; D-04 registra FK compuesta. No reimplementar
esas reparaciones por recibir esta investigación. P0/P1 confirmado en oferta
bloquea aceptación; asignar reparación antes del recorrido afectado, aunque el
veredicto general siga en016. No reabrir014/017 sin una invalidación concreta.

## Reglas aplicadas y excepciones explícitas

Inventario actual: ocho archivos en `.codex/rules`; no se modifican en esta sesión.

| Regla | Aplicación a015 / divergencia resuelta |
| --- | --- |
| `typescript-nextjs.md` | TS strict, server/client y schemas explícitos. `src/env.js` del texto está desactualizado: usar `src/env.ts`. No imponer use-cache: configuración/guías instaladas y aislamiento gobiernan |
| `code-quality.md` | Errores tipados, logger, Zod y cn. Referencia Material3 no reemplaza diseño canónico Poppy/Cobalt/Geist de AGENTS; no hay rediseño |
| `software-principles.md` | DRY/KISS/YAGNI: metadatos sólo donde adaptación lo requiere; ningún framework. No convertir heurísticas de tamaño/cadenas en refactor genérico |
| `testing-standards.md` | Tests de comportamiento y positivos/negativos; TESTING-PLAN gobierna patrones. UI trivial no necesita tests; consumidores con lógica y recorridos sí. No rebajar cobertura ni confinar menos |
| `supabase-setup.md` | Excepción Windows: migración manual + espejo, no db diff. Grants/RLS efectivos por operación; instrucciones genéricas de skills no autorizan mutar base ni generar por diff |
| `supabase-realtime.md` | Reutilizar broadcast privado y cleanup existente; comprobar receptor/identidad. No copiar ejemplos SQL/React sin validación ni crear chat/presencia nueva |
| `jsdoc-documentation.md` | JS/TS: explicar contratos/efectos no obvios; no documentar firmas obvias ni duplicar inventario env |
| `git-workflow.md` | Preservar checkout sucio y staged; no cambiar a main/borrar ramas por receta. Commit/push/merge requieren autorización; sólo checks documentales ahora |

Skills: Superpowers writing-plans para tareas/aceptación, Supabase para
contraste de seguridad y clean-code para mínima composición. Se conserva la
ubicación canónica015 y la restricción de aprobación del usuario. Los retornos
tipados `ActionResult`, null intencional y guards del producto prevalecen sobre
preferencias genéricas de clean-code.

Referencia oficial consultada: [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security),
2026-11-05: separar grants de acceso por filas. El fetch del índice
`https://supabase.com/changelog.md` fue rechazado por formato del lector;
no se afirma haber validado cambios de versión. Antes de implementar verificar
guías instaladas de Next y documentación de las APIs Supabase realmente tocadas.

## Validación y estatus

- **Ejecutado ahora:** git status/branch/diff y HEAD; lectura de documentos,
  ocho reglas y contraste estático focalizado. Extracción de Word en lectura.
- **Histórico:**014 unit33/33, SQL19 15/15, tipos/lint, build y navegador1/1
  según [evidencia014](2026-11-05-plan-014-t2-t3-execution.md); no repetidos aquí.
- **[NO VERIFICADO]:** runtime015, nueva reproducción SQL, Cloud, cuotas efectivas,
  instalación independiente, recuperación y actualización del derivado.
- **Revisión independiente:** code-reviewer contrastó T0/T1 y pidió corregir
  rol, test existente, mock, transporte de correo y destinoT3; incorporados.
  Revisión final del diff documental favorable, sin bloqueantes de preparación;
  no acepta runtime ni habilita T3 sin destino/procedimiento autorizado.
- `node scripts/check-docs.mjs`: PASS,191 Markdown.
- `pnpm exec prettier --check docs/exec-plans/completed/015-reusable-foundation-acceptance.md docs/exec-plans/active/016-nextjs-supabase-code-review.md docs/audits/2026-11-05-plan-015-readiness.md docs/current-state.md`: PASS.
- `git diff --check`: PASS tras normalizar el salto de línea de la nueva fila CSV.
  `Import-Csv`: una recepción DB-INTAKE-20261105 y cero IDs duplicados.
  No se ejecutaron typecheck/lint/unit/SQL/build/browser por ser cambio documental.

Próximo paso: aprobación de implementación T0/T1/T2 sobre este plan; T3 exige
además destino/procedimiento concreto autorizado. No se declara015 ni MVP cerrado.
