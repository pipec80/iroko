# Plan 014 → 012.1 — Preparación de aplicación Cloud

Fecha: 2026-10-09. Estado histórico: **preparación completada**. Autorización recibida y aplicación posterior completada: véase [ejecución Cloud](2026-10-09-plan-012-1-cloud-application.md).
Proyecto único: iroko, ref `rgrxlygtmvavqzkjyywg`, región us-east-2.
Durante esta preparación no se aplicaron migraciones ni cambios de producto/configuración Cloud. Las secciones siguientes conservan el procedimiento previo a la autorización.

## Preflight observado en esta etapa

CLI Windows 2.110.0 autenticada y MCP Supabase autenticado. Proyecto
ACTIVE_HEALTHY, PostgreSQL17, imagen reportada17.6.1.141. Historial159, última
20260911140000; faltan exactamente014 y012. El dry-run raíz propone ambas en
orden, sin seeds ni roles. El dry-run del workspace stage-014 propone solo014.

Catálogo Cloud capturado exclusivamente en lectura:34 tablas propias,76 policies,
6 esquemas,29 defaults,2 secuencias,32 roles,22 membresías y128 funciones de
aplicación. Las128 funciones coinciden con el baseline159 ensayado en cuerpos
MD5, propietarios, configuración y modo DEFINER/INVOKER. No se infiere paridad
completa entre plataforma local y Cloud desde estos conteos.

Las11 policies ALTER de014 existen. La nueva policy Accounts can update their
own robot configs está ausente. Tablas propias y diez helpers objetivo son de
postgres. Se confirman105 privilegios administrativos efectivos anon/authenticated
y PUBLIC EXECUTE en las diez firmas (ACL nula se evalúa mediante acldefault,
no se interpreta como ausencia de privilegio). USAGE private authenticated
existente; anon sin USAGE.

Security Advisors Cloud renovados:57 WARN y3 INFO, igual baseline conocido:
53 RPC authenticated,2 RPC anon intencionales,1 search_path Billing,1 protección
de contraseñas filtradas desactivada y3 RLS sin policies. Se conserva la
[clasificación](2026-10-08-plan-012-1-grants-execution.md); no revocar RPC para
silenciar avisos. Referencia [SECURITY DEFINER autenticado](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable).

## Artefactos exactos revisados

| Orden | Archivo                                 | SHA256                                                           |
| ----- | --------------------------------------- | ---------------------------------------------------------------- |
| 1     | 20261008120000_robot_reference_rbac.sql | E5D488D7465BBE12718A71B09783DAB2B8DD3214FE5A1DAF13134751B6CED753 |
| 2     | 20261008130000_revoke_excess_grants.sql | C2496AC67D2E674B9A5933FDC774330CF69D9877E1EDB274EA335F00B325E313 |

Evidencia local ignorada en `.superpowers/012-cloud-prepare/`:project.json,
migrations.json,security.json,snapshot.json,catalog-baseline.json,
robot-definition-before.json,catalog-snapshot.sql,postflight-grants.sql,
manifest.json ystage-014-dry-run.log. Se capturó la definición previa de la RPC
Robot, además de policies/ACL/defaults, para revisión y reparación dirigida.
No se descargaron datos de usuarios ni secretos. Los workspaces stage-014 y
stage-012 contienen copias de160/161 migraciones originales; hashes contrastados,
configuración y templates requeridos por la CLI. El cache pooler no contiene
contraseña; no se copiaron start-secrets ni credenciales de stacks locales.

## Ejecución propuesta — requiere autorización previa

Revalidar identidad, versión de CLI, todos los hashes, historial y precondiciones
inmediatamente antes de empezar. Si cambió cualquier fuente o estado Cloud,
regenerar evidencia y detener la propuesta existente. No editar ledger, no
include-all, no include-seed, no include-roles, no migraciones ajenas.

1. Dry-run stage-014 debe listar únicamente20261008120000. Tras autorización:

   `supabase --workdir .superpowers/012-cloud-prepare/stage-014 db push --linked`

2. Detener el flujo y ejecutar postflight014 solo lectura. Historial160, nueva
   policy UPDATE Storage presente, once policies alteradas y RPC con autorización
   viva esperada, según metadata-after-20261008120000.jsonl del ensayo local.
   Firmas/propietarios/ACL de RPC preservados; comparar todos los objetos que no
   debían cambiar. Capturar catálogo y advisors de este punto.

3. Solo con gate014 aprobado, ejecutar dry-run stage-012: debe listar únicamente 20261008130000. Tras la misma autorización para ambas etapas:

   `supabase --workdir .superpowers/012-cloud-prepare/stage-012 db push --linked`

4. Postflight012 solo lectura: historial161, ambas versiones únicas, diez PUBLIC
   EXECUTE revocados; authenticated EXECUTE get_user_role/user_is_member y USAGE
   private conservados; anon EXECUTE get_user_role conservado, sin USAGE private.
   Cero TRUNCATE/REFERENCES/TRIGGER/MAINTAIN para anon/authenticated en34 tablas.
   Defaults modificados únicamente FOR ROLE postgres public/billing para esos
   privilegios/roles. Cero diferencias CRUD, policies, RLS, propietarios, cuerpos,
   config, roles, membresías, secuencias y defaults service_role/supabase_admin
   entre160 y161. Capturar y revisar advisors; cualquier aviso nuevo exige
   clasificación y no una revocación automática.

La implementación CLI fijada añade SQL y ledger al mismo batch implícitamente
transaccional por migración: [fuente ExecBatch](https://github.com/supabase/cli/blob/v2.110.0/apps/cli-go/pkg/migration/file.go).
014/012 no contienen COMMIT propio. La atomicidad de estos archivos también se
[ensayó localmente](2026-10-09-plan-012-1-history-rehearsal.md). No se afirma una
transacción única para ambas etapas ni para todo el historial.

## Gates de parada y reparación

Detener ante proyecto/hash/historial inesperado, una policy objetivo ausente,
la policy nueva existente con ledger ausente, un error SQL, una diferencia fuera
del alcance o un postflight sin evidencia suficiente. No saltar sentencias ni
convertir CREATE POLICY en IF NOT EXISTS para ocultar drift.

Si014 falla, verificar rollback e historial159. Si014 pasa y012 falla, conservar
014 e historial160, verificar rollback012 y detener. No reejecutar014 crudo ni
reparar versiones automáticamente. Preferir reparación hacia adelante con
firma/rol exactos, nunca PUBLIC/GRANT ALL ni restaurar policies inseguras.
Cualquier reversión SQL distinta requiere revisión y autorización propia.

SQL014 puede preceder al código web sin cambiar firmas. Clientes viewer antiguos
perderán escrituras; DELETE directo del dominio queda owner-only. El guard del
flag Robot es parte de la aplicación, no de esta ejecución SQL. No incluye Git
push, merge, deploy, cambios Auth ni corrección del search_path Billing.

## Verificación posterior y límites

Ejecutar catalog-snapshot.sql y cada SELECT de postflight-grants.sql separadamente
por MCP o CLI para conservar todos los resultados. No inferir éxito por exit0
sin revisar valores. Comparar contra el snapshotCloud de cada etapa, usando el
ensayo como referencia del delta aprobado; no exigir igualdad de toda la
plataforma local/Cloud. Renovar migrations y Security Advisors mediante MCP.

No ejecutar pgTAP, signup, webhooks, Billing ni otras fixtures/RPC mutantes en
Cloud, incluso con ROLLBACK: pueden tener efectos fuera de la transacción.
El postflight de catálogo no certifica aceptación funcional Cloud, tráfico
Realtime ni consumidores PostgreSQL externos. Una prueba funcional mutante
requeriría alcance y datos autorizados aparte. No se inspeccionó aquí la
configuración de backups/PITR: **[NO VERIFICADO]**; el snapshot de catálogo no es
un backup de datos. Este cambio no borra datos ni altera estructuras.

La autorización solicitada cubre exclusivamente aplicar estas dos migraciones,
en orden y con gate intermedio, y realizar postflight de lectura. La autorización fue recibida después de esta preparación; ambas aplicaciones y sus gates están documentados en el registro de ejecución enlazado. Siguiente paso actual: seguir las recomendaciones de ese registro.

## Revisión y checks de preparación

Revisión independiente: aprobada para solicitar autorización, sin bloqueos.
Exigir exactamente diez firmas objetivo y34 tablas en el postflight; cualquier
objeto adicional se clasifica como drift, no se revoca automáticamente. Los
stages160/161 tienen cero diferencias de hash respecto al manifiesto revisado.
Prettier focalizado exit0, check-docs exit0 (124 Markdown) y git diff --check exit0.
La preparación no incluye ni acredita ninguna aplicación Cloud.
