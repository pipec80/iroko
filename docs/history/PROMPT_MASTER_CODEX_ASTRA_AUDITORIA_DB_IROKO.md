# PROMPT MAESTRO — Auditoría y corrección del modelo de datos SaaS de Iroko

> **Uso:** copiar este archivo completo como nuevo requerimiento a Codex (preferentemente un modelo de alta capacidad de razonamiento). Adjunto de referencia: `AUDITORIA_ARQUITECTURA_DATOS_IROKO_2026-11-05.md`.
>
> **Fecha y baseline de referencia:** 2026-11-05; `pipec80/iroko`, `main` observado `032f1a30794241cebc97e0ccd32b48d836110475`, Supabase Cloud `iroko` en organización Free, PostgreSQL 17.6, 178 migraciones. **Vuelve a comprobar todo al iniciar; esta instantánea puede quedar obsoleta.**

## Rol y misión

Actúa como **arquitecto principal de bases de datos, DBA PostgreSQL/Supabase, ingeniero de seguridad RLS, arquitecto SaaS multi-tenant y revisor independiente de software**. Tu misión no es redactar otro análisis superficial: **inspecciona el código y la base real, reproduce los hallazgos, corrige los defectos confirmados dentro del alcance vigente y entrega evidencia comprobable**.

El producto es un **SaaS Boilerplate reutilizable basado en Supabase + Next.js**, con Auth, perfiles, organizaciones, memberships/RBAC, billing multiproveedor, cuotas y entitlements, Storage, Realtime, Edge Functions, colas, auditoría y verticales futuras. La arquitectura debe permitir ofrecer el template a un tercero para construir, por ejemplo, un sistema de gestión con planes Free, Pro y Enterprise, sin perder aislamiento entre organizaciones ni depender de un producto vertical específico.

**Alcance de esta entrega: PostgreSQL, SQL, RLS, grants, triggers, RPCs, migraciones, tests de base y contratos de servidor directamente afectados.** No hagas aún la auditoría integral de vistas/componentes/UX Next.js por rol. Deja su contrato y backlog listos para una segunda fase. Corrige consumidores TypeScript mínimos si es necesario para preservar el funcionamiento de cambios reales en DB.

## Reglas innegociables del repositorio

1. Lee, en este orden, `AGENTS.md`, `docs/index.md`, `docs/current-state.md`, ADR vigente (`docs/adr/0005-replicable-saas-mvp-and-bounded-acceptance.md`), `ROADMAP.md`, planes `014/015/016` pertinentes y `TESTING-PLAN.md` **antes de editar o ejecutar tests**. Respeta la jerarquía de autoridad del repositorio: código y tests prevalecen sobre documentación histórica.
2. Respeta el **feature freeze** vigente: prioriza reparar y demostrar capacidades ya ofertadas. **No agregues** chat, roles arbitrarios, plugins, metered billing, otra pasarela, vertical Robot ni herramientas nuevas solo por ampliar catálogo. Si un requisito excede el freeze, clasifícalo y difiérelo con propietario explícito.
3. **Inspección Cloud solo lectura.** No uses `db push`, `db reset --linked`, `config push`, migraciones, deletes, cambios de grants, secretos, despliegues ni alteraciones remotas sin autorización explícita del mantenedor. Nunca ejecutes queries destructivas en Cloud. Una migración se desarrolla y valida primero en el stack local oficial `saas-boilerplate`.
4. En Windows, **`supabase db diff` está roto para el flujo actual**; no lo uses para producir migraciones. Escribe cada migración **a mano** en `supabase/migrations/` y actualiza **en el mismo commit** el archivo espejo pertinente de `supabase/schemas/*.sql`; respeta excepciones de objetos gestionados por Supabase (p. ej. políticas `storage.objects`). `pg-delta` sigue siendo experimental/no debe aplicarse sin revisión de grants.
5. RLS de recursos multi-tenant usa identidad actual, **`(select auth.uid())`** en policies, nunca `auth.uid()` desnudo. Protege cada operación con `account_id` y membership/rol efectivos. No tomes `raw_user_meta_data` ni claims JWT de rol obsoletos como única fuente de autorización. `SECURITY DEFINER`: `SET search_path = ''`, referencias SQL calificadas y `REVOKE EXECUTE ... FROM PUBLIC`, grants mínimos por rol. Verifica acceso directo a tablas, RPCs y Storage.
6. Código TS: `strict`, **sin `any`**, SOLID/DRY/KISS/YAGNI, early returns, funciones pequeñas, logger Pino (sin `console.log`). `src/env.ts` es la fuente autorizada de variables. No crees `middleware.ts`; el proyecto usa `src/proxy.ts`.
7. No arranques builds, bases, suites pesadas ni workers en paralelo: el host Windows tiene 16 GB con Docker Desktop. Ejecuta tests focalizados primero; guarda el resultado exacto.
8. Antes de cualquier commit: **`pnpm typecheck && pnpm lint`**. Usa conventional commits (`fix:`, `test:`, `docs:`), PR coherente y, si se autoriza merge y CI está verde, `gh pr merge --squash --delete-branch`. No sobrescribas cambios preexistentes ni alteres proyectos vecinos. Si descubres un bug existente en la rama afectada, arréglalo en esa misma rama si pertenece al alcance.
9. No declares PASS porque exista SQL, un test escrito o una función instalada: diferencia `IMPLEMENTADO`, `VERIFICADO LOCAL`, `VERIFICADO CLOUD`, `NO VERIFICADO`, `DIFERIDO`.

## Fuente de evidencia inicial — no asumir que está vigente

- En Cloud se observaron **43 tablas propias**: `public` 20, `billing` 14, `private` 8 y `audit` 1. `auth.users` es administrada por Supabase; `public.profiles` la extiende con FK `ON DELETE CASCADE`.
- `public.accounts` y `public.accounts_memberships` modelan tenants y usuarios N:M. Enum `membership_role`: `owner`, `admin`, `member`, `viewer`. `public.platform_admins` y `private.assert_platform_admin()` implementan administración global con requisito AAL2; la tabla Cloud estaba vacía.
- El modelo de suscripciones usa `billing.plans`, `provider_prices`, `customers`, `subscriptions`, `subscription_items`, `invoices`, `invoice_line_items`, `payment_methods`, `payment_attempts`, `events`, `checkout_intents`, `recovery_jobs`, `reconciliation_state`, `financial_anomalies`.
- Catálogo observado: `free` US$0 mensual; `pro`/Plus US$29 mensual y US$290 anual; `scale`/Pro US$99 mensual y US$990 anual. Son precios de catálogo internos; los proveedores pueden tener precios/monedas propios. No hay Enterprise registrado. Cuotas `seats_max`, `teams_max`, `api_keys_max`, `webhook_endpoints_max`.
- `pg_cron`, `pgmq`, `pg_net`, `pg_stat_statements`, `pg_trgm`, `vector`, `postgis`, `pg_partman`, `pgcrypto` y Vault estaban instaladas. No agregues extensiones sin necesidad verificada.
- Todas las tablas `public` inspeccionadas tenían RLS habilitado; `billing.*` también. Los grants son restrictivos en tablas críticas. Había 49 triggers, 52 foreign keys de aplicación inspeccionadas, una vista en `billing` y una en `audit`.
- El asesor Cloud reportó un `search_path` mutable (`billing.assert_provider_price_matches_plan`, invoker), 2 RPC `SECURITY DEFINER` invocables por `anon`, 56 por `authenticated`, 6 tablas RLS sin policies (potencialmente _deny-all_), una advertencia de leaked-password protection, 1 FK sin índice compuesto (`documents_project_account_fkey`), `private.rate_limits` sin PK y 37 índices sin uso. **Son advertencias a clasificar, no 104 defectos demostrados.**
- `public.profiles` tenía `UPDATE` concedido a `authenticated` sobre **todas las columnas** de su propia fila, incluyendo `onboarding_completed`, `created_at`, `deleted_at`, `active_account_id` y `metadata`. RLS protege la fila, no las columnas. Impacto exacto por demostrar.
- La función `private.resolve_flag()` busca `p.features -> p_flag_name` y los flags globales se llaman `webhooks`/`api_keys`, mientras el JSONB de planes usa `webhooks_enabled`/`api_keys_enabled`; otra función (`private.account_has_feature`) busca directamente las claves `*_enabled` y se usa para gating de webhooks. **Divergencia funcional confirmada; investigar consumidores antes de cambiar nombres.**
- `get_account_entitlements()` y `private.get_account_plan_row()` admiten `active`/`trialing` y `canceled` pagado-hasta; `private.resolve_flag()` solo `active`/`trialing`. Verificar semántica de acceso paid-through y downgrade.
- `private.get_account_limit()` puede devolver NULL para clave ausente; `private.within_plan_limit()` trata NULL como ilimitado. `src/lib/billing/entitlements.ts` vuelve a Free/JSON vacío ante error y `withinLimit()` interpreta ausencia como ilimitado. Verifica si hay bypass actual, y define un contrato que no eleve cuotas accidentalmente.
- `public.create_team()` verifica `teams_max` con `count()` pero en la definición observada no se veía serialización de esa admisión. Debes reproducir o descartar carrera por concurrencia: no declarar bug sin test.
- `public.invite_members()`, `public.accept_invitation()` y `public.create_api_key()` incluyen controles reales de cuotas, locks y/o serialización. No deshagas esas protecciones ni apliques un «fix» genérico.
- `billing.subscriptions` no tiene una restricción trivial que garantice «una activa por cuenta» entre múltiples proveedores (la relación con `account_id` pasa por `customers`). Investiga serialización, intents, idempotencia y lifecycle; una unique indiscriminada puede romper transiciones legítimas. En la muestra Cloud había 4 suscripciones (3 `canceled`, 1 `paused`) y ninguna activa: **no es prueba de checkout real**.
- `documents(project_id, account_id)` referencia `projects(id, account_id)`: buen aislamiento físico. Asesor indicó ausencia de índice que cubra la FK compuesta. La tabla `private.rate_limits` sin PK puede ser deliberadamente append-only.
- `billing.v_mrr_by_plan` calcula un MRR simplificado desde el precio actual del plan; no representa finanzas conciliadas, impuestos, descuentos ni todas las monedas/estados.
- `robot_contacts`, `robot_memories`, `robot_routines` siguen en `public` y el bucket privado `robot_configs` apareció en Cloud pero no en los tres buckets declarados en `config.toml`. Vertical Robot diferida: validar exclusión y drift, **no borrar ni mover datos automáticamente**.
- Hay tablas `public.notifications` y `announcements` para notificaciones y avisos; **no existe chat conversacional** y no es parte de este requerimiento.

## Procedimiento obligatorio

### Fase 0 — Baseline y contrato

- Lee instrucciones, planes, árbol de esquemas, historial y estado de Git. Identifica `HEAD`, rama, modificaciones ajenas y baseline de migraciones locales/Cloud.
- Emite una matriz `hallazgo | evidencia | severidad | estado | superficie ofrecida | plan dueño | prueba requerida`. Si hay hallazgos ya asignados, continúa el plan existente: **no abras un backlog competidor ni inventes un segundo roadmap**.
- Determina si el objetivo actual admite reparaciones en `014/015/016`; si alguno no pertenece al freeze, deja propuesta diferida y explica por qué.

### Fase 1 — Reconstrucción de entidades y seguridad

1. Inspecciona DDL de `auth.users` únicamente en términos de integración, triggers `private.handle_new_user`/`private.handle_new_profile`, PK/FK y constraints de `profiles`, `accounts`, `accounts_memberships`, invitaciones y cuentas personales/team.
2. Reconstruye el mapa de `billing.*`, claves externas, unicidades, check constraints, índices, tipos enum, triggers, máquinas de estado, idempotencia, acceso paid-through, suscripciones múltiples y billing por proveedor.
3. Audita desde `pg_catalog`, `information_schema`, `pg_policies`, `pg_proc`, `pg_default_acl`, `pg_indexes` y `pg_trigger`: GRANT/REVOKE, RLS, `SECURITY DEFINER`, `search_path`, ejecución `anon`/`authenticated`/`service_role`, vistas y funciones expuestas, schema search path, FKs, constraints y referencias entre tenants.
4. Distingue las tablas operadas por Supabase (`auth`, `storage`, `realtime`) de las nuestras. No edites estructuras gestionadas por Supabase directamente.
5. Compara migraciones versionadas, archivos `supabase/schemas/*.sql` y estado Cloud (solo lectura) con evidencia de divergencia exacta.

### Fase 2 — Pruebas que deben fallar/funcionar

Construye o amplía pgTAP y tests focalizados con **positivos y negativos**, conservando fixtures seguras:

- Alta y borrado: Auth → profile → cuenta personal → membership owner; rechazo de FK rota y limpieza controlada.
- `profiles`: usuario A puede editar solo atributos autorizados de A; no puede cambiar `onboarding_completed`, timestamps, estado interno ni forzar una cuenta activa ajena si el contrato no lo permite; usuario B jamás modifica A.
- RBAC en dos cuentas separadas: owner/admin/member/viewer, lectura/escritura/borrado, cambios de rol, transferencia/último owner, auditoría y restricciones de administración global. `platform_admin` requiere sesión realmente AAL2 para RPCs sensibles.
- Billing: Free fallback, `active`, `trialing`, `canceled` pagado-hasta, `past_due`, `paused`, `unpaid`, `incomplete`; transición entre proveedores, duplicados de eventos, retries, recovery, idempotencia de checkout y concurrencia. Define expectativa explícita para cada estado, no inventes semántica.
- Entitlements/flags: matriz por plan, `features` vs `limits`, override operacional, faltante/inválido, errores de consulta, cuotas 0, límite cumplido, downgrade y derechos vigentes tras cancelación.
- Concurrencia: dos `create_team` sobre último cupo, dos invitaciones/aceptaciones, dos API Keys, dos endpoints webhook, dos checkouts distintos del mismo account/provider, varios proveedores. Usa sesiones separadas y aislamiento transaccional correcto.
- Seguridad: solicitudes `anon`, `authenticated` de tenant ajeno, sesiones obsoletas, Data API directa, SQL/RPC y Storage para recursos críticos, incluyendo rollback sin efectos parciales.
- Rendimiento: `EXPLAIN (ANALYZE, BUFFERS)` sobre fixtures representativas y pruebas del índice compuesto de `documents`; no borres índices por el lint «unused» de una base pequeña.

### Fase 3 — Correcciones focales (no solo documentación)

- Corrige problemas **confirmados y dentro del alcance** en la misma rama, de menor a mayor superficie; acompaña cada corrección con un test que fallaba antes y pasa después.
- Para `profiles`, elige el mínimo de column-level grants / RPCs / trigger, teniendo en cuenta flujo de onboarding, cuenta activa y consentimiento; documenta por qué no rompe el perfil ni Auth.
- Para flags y cuotas, establece contratos separados: **feature comercial** vs **flag operacional**; define claves canónicas y criterios temporales; evita escalación por `NULL`, errores o claims desactualizados. Preserva `seats_max`, `teams_max`, `api_keys_max`, `webhook_endpoints_max` y escenarios pagados actuales.
- Para cualquier corrección de concurrencia, usa lock/índice/constraint acorde al invariante real. No sobre-generalices para modelos que el producto no ofrece (metered/Enterprise/custom roles).
- Cada migración debe ser manual y tener espejo SQL, pruebas, tipo generado si cambia superficie API y estrategia de rollback. Nunca alteres `auth.users` administrada.
- Antes de corregir una advertencia de linter, demuestra si es real o intencional. `get_active_plans()` anónima puede ser una API pública legítima; tables RLS sin policies pueden ser deny-all. Mantén los grants necesarios para los flujos ofrecidos.

### Fase 4 — Verificación y entrega

- Ejecuta **tests focalizados** primero (pgTAP; tests de RPC/surface/TypeScript). No dispares suites pesadas en paralelo. Verifica schema reset local solo tras proteger el entorno y confirmar que no hay cambios/fixtures ajenas que se perderán.
- Antes de commits: `pnpm typecheck && pnpm lint`; además usa los tests y chequeos locales relevantes. Registra comando, resultado, fecha, SHA y entorno.
- No escribas en Cloud sin autorización; si hace falta una migración remota, entrega preflight, lista exacta de objetos afectados, propuesta de SQL, impacto, rollback y petición explícita de autorización, **sin ejecutarla**.
- Deja cambios versionados en PR(s) pequeños y auditables. No fusiones unilateralmente un PR no autorizado; si se autoriza merge y CI verde, `gh pr merge --squash --delete-branch`.
- Actualiza la documentación canónica sin borrar hallazgos pendientes ni reutilizar PASS obsoletos.

## Entregables exigidos

1. **Informe DBA verificable** en `docs/audits/` con: inventario de entidades, relaciones, catálogo, matriz tenant/rol/acción, diagramas de flujo, esquema lógico, invariantes, seguridad, índices y resultados de prueba. Cada afirmación incluye archivo:línea y/o SQL con resultados sanitizados, entorno, fecha, SHA y certeza.
2. **Remediaciones reales** del alcance ofrecido: migraciones manuales + espejo SQL + pgTAP + cambios TS mínimos; no aceptar un PR únicamente documental si existen defectos confirmados corregibles.
3. **Plan de ejecución actualizado** en el plan dueño (014/015/016 o el que corresponda), con IDs, severidad, criterios de aceptación y dependencias. Sin duplicar backlog.
4. **Reporte de paridad** repo/local/Cloud, grants/DDL/migraciones, y del estado real de las extensiones que usa el producto.
5. **Matriz de capacidades comerciales**: qué funciona hoy en un producto derivado Free/Plus/Pro; qué requeriría Enterprise, asientos facturables o consumo medido (diferido). Diferenciar una instalación por cliente de un hipotético catálogo multi-producto compartido (no asumido).
6. **Handoff para fase 2 (Next.js)**: lista precisa de Server Actions, hooks, rutas, componentes y pruebas E2E que deberán verificar UI y restricciones de roles. No realizar esa fase ahora, salvo ajustes técnicos mínimos indispensables.
7. **Resumen final**: hallazgos corregidos, pendientes con dueño, pruebas PASS/FAIL/NO VERIFICADO, archivos modificados, commits/PR y riesgos residuales.

## Criterios de aceptación («Definition of Done»)

- **Ninguna** operación de usuario puede leer/escribir datos de otro tenant mediante cambiar un UUID, llamar directamente RPC/Data API o usar sesión obsoleta.
- `viewer` no ejecuta acciones de escritura; `member`, `admin`, `owner` reciben sus acciones exactamente según contrato; `platform_admin` no se convierte automáticamente en miembro de cualquier cuenta.
- Un usuario no puede modificar atributos internos de su perfil si estos dependen de un flujo controlado; la edición de datos personales legítimos sigue funcionando.
- Plan, flags, cuotas y derechos de acceso son coherentes con el mismo estado de suscripción y no se amplían por error o clave JSONB ausente.
- Cuotas e invariantes relevantes resisten solicitudes concurrentes y eventos duplicados.
- Los tests que prueban el defecto fallan sobre baseline o demuestran claramente la condición antes de la corrección, y pasan después; pruebas de regresión previas continúan funcionando.
- No quedan fallos críticos confirmados de DB en el alcance ofrecido sin tratar. Las limitaciones reales se marcan y asignan, no se declaran «solucionadas» por escribir una nota.
- `pnpm typecheck && pnpm lint` PASS antes de commits; migraciones SQL y espejo en el mismo commit; Cloud intacto hasta autorización.
- Se entrega una **interfaz de verificación para la fase 2 de Next.js**, sin mezclarla en este requerimiento.

## Formato de la respuesta de Codex al finalizar

Entrega en español neutro, conciso y técnico:

**Baseline** (rama/SHA/stack); **Hallazgos** (P0/P1/P2, confirmado vs hipotético); **Cambios** (rutas y SQL); **Pruebas** (comandos exactos y resultados); **Cloud** (solo lectura, divergencias); **Riesgos residuales**; **PR/commits**; **Handoff Next.js**. Si algo no pudo verificarse, marca `[NO VERIFICADO]`, especifica la causa y el siguiente test reproducible.

**No cierres el MVP por haber terminado esta auditoría.** Respeta los gates actuales de planes 014/015/016 y obtén evidencia de replicación, aceptación local/Cloud y funcionalidad de los módulos ofertados.
