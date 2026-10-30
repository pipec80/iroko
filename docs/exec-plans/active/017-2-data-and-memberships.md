# 017.2 — Data and memberships implementation plan

**Alcance vigente 2026-10-28:** [ADR0005](../../adr/0005-replicable-saas-mvp-and-bounded-acceptance.md).
Cuotas/roles/invitaciones/aislamiento del núcleo siguen obligatorios. D03 es un
agregado a disponer desde subfilas, no otra implementación. Conservar FK y
regresiones SQL ya incorporadas aunque editor se difiera. T5/Robot conserva
su evidencia corrected-local; no ampliar ni repetir su vertical como gate de
la base. La exclusión efectiva de referencias pertenece a015-T1.

> **Ejecución:** aplicar el [contrato común de 017](017-freeze-remediation.md#contrato-de-ejecución-independiente-del-modelo--2026-10-27). No requiere plugins específicos.

**Goal:** Hacer cumplir cuotas, pertenencia documento/proyecto y transiciones de membresía bajo concurrencia real.

**Architecture:** Serialización transaccional por cuenta antes de leer invariantes; FK compuesta para integridad documental. Se conservan RPC públicas y reglas comerciales existentes; los permisos se vuelven a comprobar después del lock.

**Tech Stack:** PostgreSQL/Supabase, pgTAP, TypeScript strict, Vitest, Next.js 16.

**Spec:** [017 — Freeze remediation](017-freeze-remediation.md).

**Status:** T1–T4 tienen evidencia local registrada el2026-10-22 en
[SQL/revisión](../../audits/2026-10-20-017-2-p1-execution.md) y
[gates fechados](../../audits/2026-10-21-017-p1-final-checks.md). El CSV conserva
la disposición por tarea; D06/T5 ya está corrected-local. No se reejecuta Robot
por esta replanificación; revalidar sólo evidencia invalidada por cambios.
Base a2feb3d sin commit; Cloud [NO VERIFICADO]. No cierra017/016 integrados.

## Cómo retomar este hijo

Leer las filas de su tarea en el [registro único](freeze-remediation-register.csv).
**Files/Interfaces** delimitan el cambio; **Resultado y límite** y los escenarios
fijan la aceptación. Los pasos RED/crear/implementar solo aplican a lo ausente o
regresado: primero inspeccionar lo ya existente. Dependencias, bloqueo, destinos,
gates compartidos y revisión por lote se rigen por el padre. Evidencia pendiente
no implica falta de código. No ejecutar otro plan al cerrar este hijo.

## Global constraints

- Stack local oficial: `saas-boilerplate`, `supabase/config.toml`. No crear otro stack de ensayo.
- Preservar cambios fuente, secretos y proyectos ajenos. Reset solamente del entorno/fixtures previamente autorizados, identificados antes de ejecutar; este documento no autoriza reset.
- No instalar CLI, dependencias ni plugins. No Cloud, proveedores, push, merge ni deploy.
- Migraciones manuales y espejo SQL en el mismo cambio; `supabase db diff` deshabilitado en Windows. Regenerar `src/types/database.ts` si cambia esquema expuesto.
- T1–T4 del núcleo conservan su evidencia y preceden012.5/014; exclusión015-T1
  puede adelantarse porADR0005. T3 sigue siendo dependencia técnica del editor
  cuando vuelva a ofrecerse. T5 ya tiene evidencia local y no bloquea015 como
  nueva vertical. Gate integrado016 después de015.
- Mantener Free/Plus/Pro, slugs `free/pro/scale`, precios CLP, restricciones de proveedor y cuotas de catálogo. Ninguna tarea crea una oferta nueva.
- Cada tarea exige contrato y pruebas focales; revisión y gates son compartidos por lote según el padre. Cualquier P1 propio abierto impide aceptarla. No copiar conteos históricos como ejecución nueva.

## Rules applied and exceptions

Leídas las ocho fuentes `.codex/rules/{code-quality,git-workflow,jsdoc-documentation,software-principles,supabase-realtime,supabase-setup,testing-standards,typescript-nextjs}.md` y `TESTING-PLAN.md`.
SQL: esquema explícito, `search_path=''`, ACL exacta, invariantes dentro de transacción. TS/JS: sin `any`, imports de tipos, límites de entrada y errores observables; JSDoc para contratos no obvios. React/Next: no crear `middleware.ts`, no memoización manual con React Compiler, ninguna nueva caché para autorización. Realtime no cambia: no migrar canales como efecto colateral.
AGENTS prevalece sobre recetas incompatibles: `src/env.ts` frente al viejo `env.js`; migración manual frente a `db diff`; Poppy/Cobalt frente a Material; no ejecutar pull/merge/limpieza de ramas por una receta de workflow. Tests usan resultados persistidos y actores reales; no toman una respuesta mock como prueba de RLS/concurrencia.

## Review focus

1. Dos solicitudes por el último cupo: exactamente una admisión (T1/T2).
2. Invitación expirada/revocada o aceptada dos veces: no crear membresía adicional (T2).
3. UUID de proyecto válido perteneciente a otra cuenta: rechazo antes de persistir (T3).
4. Dos owners que abandonan/degradan simultáneamente: siempre queda un owner (T4).
5. Configuración Robot vacía y reemplazos distintos: resultado completo A o B, nunca mezcla (T5).

## Shared execution and concurrency protocol

Las migraciones listadas ya existen en el candidato. Inspeccionarlas antes de
actuar; no generar otra por encontrar ocupado su timestamp. Solo un cambio SQL
nuevo necesita nueva migración versionada y espejo, preservando historia existente.
Las pruebas concurrentes nuevas viven en `supabase/tests/database/53_freeze_data_concurrency.test.sql`. Se amplía ese archivo secuencialmente por tarea; no se implementan simultáneamente las tareas que lo comparten.
Usar dos conexiones reales con barrera explícita, no sleeps como prueba de exclusión. Resolver la conexión de la instancia local desde configuración/runtime confirmado; no copiar `host.docker.internal:54322` de test 42 ni imprimir credenciales. El harness comprueba identidad `saas-boilerplate` antes de fixtures. Fixtures con UUID propios, limpieza en ruta normal y excepción, rollback de conexiones abiertas y segunda comprobación de residuos después del fallo inducido. No reutilizar ni borrar cuentas ajenas. D-09 del test antiguo queda separado, pero ningún test nuevo debe repetirlo.

Comandos planificados por tarea: `pnpm supa:status`, `pnpm supa:migration:up`, `pnpm supa:test supabase/tests/database/53_freeze_data_concurrency.test.sql`, `pnpm supa:lint`, `pnpm typecheck`, `pnpm lint`, `git diff --check`. Si cambia esquema expuesto: `pnpm supa:gen:types`. Resultado requerido: TAP sin `not ok`, salidas cero, ninguna fila fuera de fixtures modificada. Registrar warnings existentes por separado. No ejecutar toda la suite DB antes de que el riesgo de test 42 tenga destino/cleanup seguro documentado. La precondición de fixtures de 017.5-T11 puede adelantarse antes de P1 para hacerlo posible.

### 017.2-T1 — API keys: último cupo (D-03)

**Resultado y límite:** Dos sesiones compiten por el último cupo de API keys: exactamente una crea clave. No cambiar cuotas ni ampliar permisos.

**Files:** modificar `supabase/schemas/api-keys.sql`; crear `supabase/migrations/20261020100000_api_key_quota_serialization.sql` y el test 53 anterior. Mantener `supabase/tests/database/09_api_keys.test.sql` y `15_plan_limits.test.sql` como regresiones.

**Interfaces:** conservar `public.create_api_key(p_account_id uuid,p_name text,p_expires_at timestamptz DEFAULT NULL) RETURNS TABLE(id uuid,key text)`. Consumir `private.assert_account_admin(uuid)` y `private.within_plan_limit(uuid,text,bigint,integer)` sin cambiar cuotas.

- [ ] Escribir caso `api_key_last_slot_two_sessions`: cuenta con cupo restante uno, dos owners/admins válidos; una clave creada y segunda operación `key_limit_reached`, count final igual al límite. Añadir `other_account_not_blocked`, clave revocada libera cupo según contrato existente, y usuario no miembro recibe `42501`.
- [ ] Ejecutar test 53 contra baseline; registrar fallo por dos admisiones, sin considerar un timeout evidencia suficiente.
- [ ] Adquirir advisory transaction lock `hashtextextended('api-key-account:' || p_account_id::text,0)` antes de comprobar rol/cupo y antes del INSERT. Mantener operación de revocación segura y comprobar que no existe otro camino autenticado de INSERT que eluda la cuota. Cerrar ese camino si existe dentro de esta tarea.
- [ ] Ejecutar protocolo común más `pnpm supa:test supabase/tests/database/09_api_keys.test.sql` y `pnpm supa:test supabase/tests/database/15_plan_limits.test.sql`; verificar clave en claro solo en respuesta original y hash en tabla.
- [ ] Revisor del lote comprueba bloqueo estable, revalidación de rol y bypass por DML/RPC. Registrar aceptación de T1; commit local convencional solo cuando ejecución/commit estén autorizados.

### 017.2-T2 — Cupos y transiciones de invitación (D-03 seats + D-07)

**Resultado y límite:** Invitaciones y aceptación/revocación concurrentes respetan seats, email y estado final. Mantener locks por cuenta y contratos de invitación.

**Files:** `supabase/schemas/public.sql`; nueva `supabase/migrations/20261020101000_membership_invitation_serialization.sql`; ampliar test 53 y `src/app/[locale]/dashboard/team/__tests__/actions.test.ts` si se altera traducción de errores.

**Interfaces:** conservar `invite_members(p_account_id uuid,p_emails text[],p_role public.membership_role DEFAULT 'member') RETURNS TABLE(email text,token text)`, `accept_invitation(p_token text) RETURNS TABLE(account_id uuid,invited_by uuid)` y `revoke_invitation(p_invitation_id uuid) RETURNS void`. Error de cupo: `seat_limit_reached`; hash y binding al email autenticado siguen obligatorios.

- [ ] Escribir `invite_last_slot_two_batches` y `accept_last_slot_two_users`: dos sesiones por último asiento; nunca exceder `seats_max`. Contar membresías y reservas de invitaciones pending no expiradas, por email normalizado distinto que aún no sea miembro. Duplicados del mismo batch/email no consumen asientos adicionales. Expiradas/revocadas no reservan.
- [ ] Escribir `accept_vs_revoke_linearizable`: revoke que gana impide membresía; accept que gana conserva membresía y revoke devuelve `invitation_not_pending`. Añadir aceptación repetida, token de otro email, expiración mientras espera el lock, y reducción de cuota posterior a emitir invitación: aceptar debe fallar por cupo sin consumirla si miembros actuales ya alcanzan límite.
- [ ] Ejecutar RED documentado; implementar orden único: obtener cuenta por lectura preliminar, lock de fila `public.accounts FOR UPDATE`, releer autorización/invitación `FOR UPDATE`, comprobar estado/cupo, aplicar transición y actualización de perfil en la misma transacción. La lectura preliminar nunca autoriza. Al aceptar, transformar su reserva en membresía sin contarla dos veces; validar límite contra miembros efectivos incluso si el plan bajó.
- [ ] Mantener todos los productores de membresías del flujo en ese orden; actualizar comentarios de contrato para reservas. No devolver tokens nuevos en errores ni registrar hash/token.
- [ ] Ejecutar protocolo común y `pnpm test "dashboard/team/__tests__/actions"` si se cambian consumidores. En cada escenario comprobar tabla invitations, memberships y active_account_id; comprobar limpieza de fixtures tras excepción.
- [ ] Revisor del lote inspecciona ambas intercalaciones y locks cuenta→invitación; rechazar mezcla de locks inversos, deadlocks no manejados o prueba solo secuencial. Registrar cierre conjunto D-03-seats/D-07.

### 017.2-T3 — Invariante documento/proyecto/cuenta (D-04)

**Resultado y límite:** INSERT/UPDATE no pueden relacionar documento con proyecto de otra cuenta; caso permitido funciona. Conservar FK compuesta; no fusionar con migración CAS.

**Files:** `supabase/schemas/public.sql`; nueva `supabase/migrations/20261020102000_document_project_account_integrity.sql`; test 53; `src/app/[locale]/dashboard/projects/[slug]/doc/actions.ts` y `__tests__/actions.test.ts` en ese directorio; `src/types/database.ts` generado.

**Interfaces:** `documents(project_id,account_id)` referencia `projects(id,account_id)`. Crear UNIQUE `projects_id_account_id_key` y FK `documents_project_account_fkey` con `ON DELETE CASCADE`. Mantener `project_id NOT NULL`; no introducir documentos sin proyecto como workaround. `createDocument(FormData)` conserva resultado `{error?:string;docId?:string}`.

- [ ] Escribir `document_other_account_project_rejected` para actor miembro de A y B: insertar cuenta A/proyecto B debe fallar `23503`; también UPDATE de project_id o account_id. Positivos misma cuenta y borrado cascada; `project_id=NULL` debe fallar `23502`, conservando el NOT NULL existente. Test de action comprueba error visible y cero documento creado.
- [ ] Ejecutar RED. Añadir preflight SQL que enumere solo IDs de filas inválidas; migración aborta si existen. La reparación de datos test se decide sobre esas filas identificadas mediante autorización específica; no borrar ni reasignar automáticamente.
- [ ] Añadir UNIQUE/FK compuesta y retirar FK simple redundante de project_id; mantener FK de cuenta. Validar constraint, espejo y tipos generados. La acción debe traducir `23503` en error de proyecto inválido, sin filtrar existencia de proyecto ajeno.
- [ ] Ejecutar protocolo común, `pnpm test "doc/__tests__/actions"`; comprobar también INSERT/UPDATE directos bajo JWT reales. Gate T3 debe pasar antes del CAS de editor 017.4-T2. Esta migración no añade revision ni altera save_document_revision; 017.4-T2 añade después ese contrato y regenera tipos sobre la FK compuesta ya integrada.
- [ ] Revisor del lote comprueba todas las vías DML, NOT NULL existente, cascada y ausencia de reparación silenciosa; registrar constraints validadas y resultado persistido.

### 017.2-T4 — Nunca perder el último owner (D-08)

**Resultado y límite:** Operaciones concurrentes no dejan una cuenta sin owner y revalidan autorización después de esperar. No cambiar modelo de roles.

**Files:** `supabase/schemas/private.sql`, `supabase/schemas/public.sql`; nueva `supabase/migrations/20261020103000_last_owner_serialization.sql`; ampliar test 53.

**Interfaces:** preservar `leave_team(uuid) RETURNS void`, `change_member_role(uuid,uuid,public.membership_role) RETURNS void`, `transfer_ownership(uuid,uuid) RETURNS void`, `remove_member(uuid,uuid) RETURNS boolean` y `private.enforce_single_owner_per_account() RETURNS trigger`.

- [ ] Escribir dos sesiones `two_owners_leave`, `leave_vs_demotion` y `leave_vs_transfer`: count(owner) de team activo nunca cero; perdedor recibe error estable del contrato y conserva membresía. Incluir usuario que pierde autorización mientras espera, team vs cuenta personal y eliminación autorizada de cuenta completa (cascada no bloqueada indebidamente).
- [ ] Ejecutar RED; bloquear fila de cuenta antes de leer roles o tocar membresías en las cuatro RPC. Trigger toma el mismo lock para DML directo y revalida invariantes; mantener la excepción de cascada cuando cuenta ya no existe. Orden cuenta→membresías para RPC; evaluar la vía DML directa en prueba concurrente y rechazar deadlocks evitables, sin quitar el trigger.
- [ ] Ejecutar protocolo común; comprobar transfer atómico y que usuarios sin permiso no obtienen owner. No interpretar error de contención como éxito de preservación: verificar miembros finales.
- [ ] Revisor del lote inspecciona trigger/RPC y cobertura de rutas de mutación; documentar último owner preservado con dos sesiones y cerrar T4.

### 017.2-T5 — Robot: reemplazo serializable (D-06, fase P2)

**Resultado y límite:** Reemplazos Robot concurrentes dejan un conjunto completo, sin mezcla ni escritura de rol insuficiente. No habilitar Robot ni ampliar su función.

**Files:** `supabase/schemas/public.sql`; nueva `supabase/migrations/20261020104000_robot_replace_serialization.sql`; ampliar test 53 y mantener `supabase/tests/database/43_robot_reference_rbac.test.sql`.

**Interfaces:** conservar `replace_robot_config(p_account_id uuid,p_routines jsonb,p_contacts jsonb,p_memories jsonb) RETURNS void` y los permisos owner/admin/member de 014-T1.

- [ ] Escribir `empty_robot_two_replacements`: dos sesiones con tres colecciones A/B distintas; resultado final corresponde completo a A o B, sin unión. Añadir reemplazo vacío, error de parseo en tercera colección (rollback de las tres) y revocación de rol mientras espera.
- [ ] Ejecutar RED y tomar lock de fila de cuenta antes del check de rol y DELETE/INSERT. No cambiar formato Excel, catálogo ni permisos.
- [ ] Ejecutar protocolo común y `pnpm supa:test supabase/tests/database/43_robot_reference_rbac.test.sql`; verificar aislación entre cuentas.
- [ ] Revisor del lote verifica atomicidad y serialización por separado; registrar D-06 cerrado solo con ambas evidencias. La aceptación previa 014-T1 no sustituye este gate.

## Completion record

Cada tarea actualiza el [registro central](freeze-remediation-register.csv) con
evidencia propia. D06/T5 conserva corrected-local; no inventar nueva ejecución
por checkboxes históricos sin marcar. Cierre MVP según alcance ofrecido y exclusión
verificada; no acepta Cloud ni carreras no ejecutadas. La decisión documental
no cambia código ni renueva los resultados históricos.
