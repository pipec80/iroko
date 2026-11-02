# Supabase local / Cloud — inspección de solo lectura, 2026-10-30

## Actualización2026-11-02 — migraciones sincronizadas

El mantenedor autorizó sincronizar Cloud. Se aplicaron las ocho migraciones
existentes mediante CLI, con revisión/preflight, recovery pausado sin trabajos
en vuelo y cron restaurado. Repo/local/Cloud177, dry-run final sin pendientes.
[Operación y límites](2026-11-02-plan-012-integration-and-disposition.md).
Persisten RL-F03 (grants accounts) y reconciliation429; no es paridad exhaustiva.
Los apartados inferiores son el diagnóstico histórico del2026-10-30.

Solicitud del mantenedor: comprobar Docker, retomar012.5 y verificar si faltan
migraciones en Cloud. Se preservan los cambios pendientes de
`feat/012-5-pricing-truth`, HEAD `71c04ccdaee8c013627f45c927d50d34c5212291`.
No se aplicaron migraciones ni cambios de configuración/datos en Cloud.

## Veredicto

**Cloud responde, pero no está sincronizado con el repositorio ni con la DB
local.** La paridad por versiones es 169/177, con ocho migraciones pendientes.
Esto no es una comparación exhaustiva de esquema. Las consultas de presencia
confirman además tres diferencias reales de contratos, no solo del historial.
El último resumen de reconciliation tiene un caso fallido; no se declara salud
operacional completa de billing a partir de HTTP200.

## Destinos y método comprobados ahora

- MCP `get_project`: proyecto `iroko`, ref `rgrxlygtmvavqzkjyywg`, región
  `us-east-2`, `ACTIVE_HEALTHY`, PostgreSQL17.
- `supabase/.temp/project-ref` coincide con ese proyecto; no se cambiaron vínculos.
- Repo:177 archivos de migración. DB local:177 versiones, última
  `20261026113000`. MCP `list_migrations`:169 versiones, última
  `20261016015800`. No hay versiones Cloud ajenas al repositorio.
- Docker CLI29.9.2 y Supabase CLI2.110.0 instalados. Docker ya estaba activo
  al comprobar con permisos suficientes; el sandbox inicial rechazaba acceso
  al pipe. No confundir ese rechazo con daemon detenido.
- Contenedor local: `supabase_db_saas-boilerplate`, running y label de proyecto
  `saas-boilerplate`; configuración oficial `supabase/config.toml`, API54321 y
  DB54322. Auth/Storage/Realtime/Kong/Studio también levantados. Edge Runtime
  existente detenido; no se necesita para pricing y no se arrancó sin motivo.
- No se tocaron contenedores detenidos del proyecto ajeno `portal-cms-pax3`.

## Migraciones pendientes en Cloud

| Versión        | Migración                             | Alcance e implicación                                                                   |
| -------------- | ------------------------------------- | --------------------------------------------------------------------------------------- |
| 20261020100000 | `api_key_quota_serialization`         | Serialización de admisión de cuotas API keys                                            |
| 20261020101000 | `membership_invitation_serialization` | Reservas de seats/invitaciones y cambios concurrentes                                   |
| 20261020102000 | `document_project_account_integrity`  | Integridad documento/proyecto/cuenta                                                    |
| 20261020103000 | `last_owner_serialization`            | Concurrencia al cambiar o retirar el último owner                                       |
| 20261020104000 | `robot_replace_serialization`         | Guard de concurrencia Robot, vertical diferida                                          |
| 20261020110000 | `billing_recovery_fencing`            | Leases y RPC `apply_billing_recovery_result` requerido por el código actual de recovery |
| 20261020174000 | `document_revision_cas`               | Columna revisión y contrato CAS del editor diferido                                     |
| 20261026113000 | `get_admin_account`                   | RPC administrativo de detalle por identidad exacta                                      |

Consultas Cloud de presencia ejecutadas: `get_admin_account(uuid)` ausente;
`public.documents.revision` ausente; `billing.recovery_jobs.lease_token` ausente;
`apply_billing_recovery_result` tampoco figura en `pg_proc`. Si se despliega el
código actual de recovery contra ese esquema, falta un contrato que el código
invoca. No se verificó en esta inspección qué SHA ejecuta Vercel; es un riesgo
de compatibilidad confirmado entre árbol y esquema, no diagnóstico del origen
del429 observado.

Ninguna de estas ocho migraciones cambia el catálogo público/precios MP. La
aceptación local de012.5 puede continuar sin aplicar Cloud ni ejecutar017.
Aplicar estas migraciones exige autorización explícita y revisión del candidato
desplegado; no se repara el ledger para simular paridad.

## Billing y catálogo Cloud observados

Refresh de solo lectura tras retomar:2026-10-31 01:55UTC (2026-10-30 en Chile),
Cloud conserva169 migraciones y última `20261016015800`. Recovery volvió a
completar con HTTP200/claimed0; reconciliation de01:00UTC sigue HTTP200 con
scanned1/failed1. No se infiere una reparación por el paso del tiempo.

Los tres precios MP activos son Free/Plus/Pro, mensual CLP0/19990/102990. El
catálogo coincide con los fixtures versionados; esto no renueva aceptación del
checkout ni de cuotas Cloud.

`private.billing_worker_health`:

- Recovery: último resumen observado a2026-10-30 21:50UTC, HTTP200, claimed0.
  Una corrida sin casos no acredita la reparación por el contrato nuevo.
- Reconciliation: último resumen observado a21:00UTC, HTTP200, scanned1/failed1.
  `billing.reconciliation_state` tiene una fila con
  `last_error_code=provider_fetch_failed:429`, failure_count10 y último éxito
  el2026-10-22 21:00:03UTC. Otras tres filas conservan failure_count0.
- La causa del429 en MP y la renovación pendiente no se diagnosticaron contra
  el proveedor en esta inspección. No se forzaron reintentos ni pagos, no se
  cambiaron cuotas, límites, credenciales o cron. Un job cron succeeded no prueba
  que todos los casos procesados hayan tenido éxito.

## Advisors Cloud

Inspección MCP actual, sin autocorrecciones:

- Una función con search_path mutable: `billing.assert_provider_price_matches_plan`.
  La definición local versionada también carece de fijación; deuda existente,
  distinta de las ocho migraciones pendientes.
- Dos funciones SECURITY DEFINER anon y55 authenticated marcadas por advisors.
  `get_active_plans` es pública intencionalmente; las RPC autenticadas requieren
  revisar sus guards, no revocar en bloque por el aviso genérico.
- Seis tablas con RLS sin policies, clasificadas INFO. No significa por sí solo
  exposición; revisar grants/consumidores de cada una antes de alterar acceso.
- Protección de contraseñas filtradas desactivada: WARN; no se cambiaron planes
  ni configuración. Se conserva la restricción de servicios gratuitos.
- Performance:37 índices sin uso eINFO por ausencia de PK en
  `private.rate_limits`. No se eliminaron índices por estadísticas de poco uso.

Referencias oficiales de interpretación:
[search_path](https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable),
[RLS sin policies](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy),
[funciones públicas](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable),
[contraseñas](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).

## Continuación local y límites

La [evidencia012.5](2026-10-30-plan-012-5-local-execution.md) conserva comandos,
browser, fixtures y cleanup. Esta inspección no crea un entorno Cloud ni retira
guards, no certifica los otros proveedores, no despliega y no ejecuta planes
vecinos. Revisión independiente `/root/pricing_review`: ocho diferencias
compatibles con continuar pricing local; potencial incompatibilidad recovery
confirmada estáticamente y sin autorización implícita para migrar Cloud.
