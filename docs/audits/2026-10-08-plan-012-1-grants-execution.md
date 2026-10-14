# Plan 012.1 — Grants: registro de ejecución

Inicio: 2026-10-08. Reanudación: 2026-10-09. Rama: `codex/014-t1-robot-permissions`.
Estado: implementación, aceptación e integración SQL locales completadas; ensayo posterior del historial enlazado al cierre. La aplicación Cloud posterior fue autorizada y completada el 2026-10-09; véase [registro Cloud](2026-10-09-plan-012-1-cloud-application.md). El cuerpo conserva evidencia histórica de la etapa local.

## Ownership y límites

SQL: migración nueva y espejos private/public/billing; pruebas: fixtures 05/44;
entorno: solo proyecto desechable exacto; coordinador: matriz, evidencia y revisión.
Se preserva el trabajo pendiente de 014/016 y el material local ajeno.
Sin instalaciones, escrituras Cloud, commits, push, merge ni deploy.

## Baseline y decisiones

Git actual y documentos obligatorios leídos. Shell estándar falla antes de ejecutar;
lectura local/Git mediante Node y comandos de aceptación mediante aprobación de
ejecución local. No se declara ausencia de herramientas por fallo del lanzador.

Cloud MCP autenticado: proyecto iroko confirmado con el ref vinculado.
159 migraciones; última `20260911140000_billing_financial_anomaly_ingress`.
014 permanece solo local; no hay paridad Cloud del árbol pendiente.
48 funciones privadas, diez con EXECUTE heredado de PUBLIC.
105 permisos administrativos anon/authenticated sobre 16 tablas públicas.
USAGE private authenticated se conserva; get_user_role y user_is_member
requieren EXECUTE explícito por llamadas directas RLS/Realtime.

Ruling: reducir ACL cambia autorización y puede romper consumidores aunque RLS
no cambie; retirar la afirmación histórica sin riesgo funcional.
Ruling: defaults solo FOR ROLE postgres public/billing; preservar service_role
y supabase_admin. UPDATE de secuencias queda como seguimiento separado.
Ruling: reutilizar checkout pendiente autorizado sin checkout/stash/reset;
separar el diff de este lote al revisar integración.

## Reglas y prácticas

Ocho reglas locales releídas por superficie. SQL: firmas exactas, privilegios
efectivos, pruebas negativas y controles positivos. TS/JS/React/Next: no cambios
de aplicación; Realtime: conservar contratos existentes. env.ts prevalece sobre
recetas env.js; Windows exige migración manual más espejo. CREATE OR REPLACE
no reotorga PUBLIC universalmente; inspeccionar ACL real. Sin adoptar paletas,
caching ni recetas Realtime ajenas al alcance.

## Gates

RED/GREEN, pgTAP completo y checks de aplicación ejecutados en el primer destino.
Su captura local previa de advisors sigue históricamente ausente. El ensayo
posterior enlazado al cierre renueva la comparación antes/después en otra DB
desechable, reproduce el historial y completa la aceptación SQL local.

Siguiente paso recomendado: preparar la etapa Cloud 014 → 012 para autorización
explícita; no se declara paridad ni aplicación remota.

## Consumidores y excepciones

| Canal                 | Consumo                                                                             | Decisión                                                 |
| --------------------- | ----------------------------------------------------------------------------------- | -------------------------------------------------------- |
| authenticated directo | perfiles, proyectos/documentos, Robot, announcements/notifications, Storage         | Preservar CRUD y RLS                                     |
| authenticated RPC     | cuentas/MFA/GDPR/equipos/billing/admin/Robot                                        | Preservar wrappers y autorización viva                   |
| authenticated RLS     | private.get_user_role y private.user_is_member; Storage/presence                    | GRANT EXECUTE explícito a ambos y USAGE private          |
| anon RLS Storage      | policy existente TO PUBLIC evalúa private.get_user_role para denegar con cero filas | EXECUTE explícito solo get_user_role; sin USAGE private  |
| service_role directo  | SELECT accounts/profiles/accounts_memberships; INSERT notifications                 | Preservar ACL existente; comprobar antes/después         |
| service_role RPC      | API keys, catálogo, checkout/reducers/recovery/reconciliation                       | Preservar wrappers y defaults service_role               |
| supabase_auth_admin   | custom_access_token_hook y dependencias                                             | Preservar hook y ACL operacional                         |
| Email worker          | conexión PostgreSQL directa pgmq.read/archive/delete                                | Rol operacional [NO VERIFICADO]; no inferir service_role |
| Triggers/cron/DEFINER | signup, audit, Billing, webhooks, Realtime                                          | No conceder API EXECUTE por dependencia interna          |

Firmas sin PUBLIC: apply_updated_at_trigger(regclass), deny_mutation(),
get_user_role(uuid,uuid), handle_new_profile(), handle_new_user(),
rls_auto_enable(), set_updated_at(), slugify(text), user_is_member(uuid,uuid),
sync_billing_checkout_intent(). Las dos firmas de rol/membresía son las únicas
excepciones authenticated nuevas; get_user_role también conserva EXECUTE anon
por evaluación Storage. Las ocho restantes quedan para ejecución interna.

Matriz Cloud de 105 permisos efectivos en
[CSV](2026-10-08-plan-012-1-table-grants-matrix.csv). Inventario estático de
34 tablas: 20 public / 14 billing; revocar un permiso ya ausente es intencional.

## Divergencias observadas durante RED

05 inicial falló 1/5: anon sí tiene USAGE billing, explícito desde
20260709140000 para resolver tipos de firmas RPC PostgREST. La prueba histórica
role_usage_grants no lo acreditaba. Expectativa corregida al contrato vigente,
sin revocar USAGE ni modificar RLS. Repetición actual 05: 5/5 aprobadas.

44 inicial: 75 TAP, 39 fallos, exit 0, ROLLBACK. 36 negativas esperadas y 3 positivos
service_role SELECT accounts/profiles/accounts_memberships fallidos antes de 012.1.
Cloud tiene esos SELECT; bootstrap local no. No agregar CRUD para satisfacer la
fixture. Esos permisos dependen del baseline: se comprueba su preservación mediante
snapshot antes/después y se retiran las tres expectativas universales del nuevo44.
El circuito operacional de esos tres consumidores en local no se certifica por este
lote. El historial de migraciones aislado está ausente por bootstrap manual; no
inventar una paridad desde el conteo.014 se contrasta por definición y policies.

## Reanudación y checks de aplicación

2026-10-09: Docker Desktop estaba apagado; se autorizó recuperar la aplicación
instalada sin instalación ni cambios de configuración. No inferir estado SQL
desde un log de aplicación vacío. Identidad y ACL se comprueban al recuperar
el motor antes de aplicar la migración.

| Check observado durante este trabajo    | Resultado                                                                             |
| --------------------------------------- | ------------------------------------------------------------------------------------- |
| pnpm test                               | exit 0; 104 archivos / 1092 pruebas; 201.88 s                                         |
| pnpm typecheck                          | exit 0                                                                                |
| pnpm lint                               | exit 0; cero errores, cuatro warnings previos en mercadopago-cloud-acceptance.spec.ts |
| node scripts/check-docs.mjs             | exit 0; 122 Markdown                                                                  |
| Prettier focalizado de plan y registro  | exit 0                                                                                |
| git diff --check                        | exit 0                                                                                |
| Revisión independiente inicial y fresca | aprobación estática delimitada; sin blockers de código                                |

Los checks de aplicación no sustituyen pgTAP ni certifican consumidores Cloud.
La fixture final 44 tiene 72 aserciones y whitelist de 34 tablas; la inicial
75/39 se conserva como evidencia de investigación. RED final almacenado:
72 TAP / 36 fallos esperados. Logs locales ignorados en .superpowers/012-validation.

## Regresión detectada por pgTAP completo

Primera ejecución completa: 44 archivos, 848 TAP observados, tres fallos TAP y
dos errores SQL. 16/29 fallan por buckets org-assets/documents ausentes; 32
se interrumpe por la misma FK. El bootstrap se preparó para Robot apagado, no
para todos los módulos Storage. Se preparan únicamente buckets de prueba en
transacciones del runner aislado, sin copiar seed ni datos del mantenedor.

43 se interrumpe después de 216/240: anon lee Storage y su policy TO PUBLIC
evalúa private.get_user_role. Revocar PUBLIC sin una excepción anon cambia
la denegación esperada de cero filas por un error de permisos. Es una regresión
real de 012.1, no un fallo previo. La revisión inicial queda superada por esta
evidencia; la aprobación final depende de corregirla y reejecutar.

Ruling: conceder EXECUTE get_user_role(uuid,uuid) explícito a anon, conservando
PUBLIC revocado y anon sin USAGE private. Mantiene la evaluación de la policy
existente sin modificar RLS. No hay evidencia para conceder user_is_member a
anon. Fixture 44 debe reflejar esta excepción y 05 conserva el cierre del schema.

## Advisors y lint SQL locales

CLI Supabase 2.110.0 existente, destino aislado55322 comprobado. Advisors y
lint local conectaron con sslmode=disable: la conexión SSL predeterminada fallaba.
No se reinició la DB ni cambió configuración para resolverlo. No usar esta
excepción de SSL local como recomendación de conexiones Cloud.

Advisors finales:42 hallazgos (41 INFO y1 WARN):1 no_primary_key,37 unused_index,
3 rls_enabled_no_policy y1 function_search_path_mutable. El WARN corresponde a
billing.assert_provider_price_matches_plan, también observado en el baseline
Cloud read-only y no modificado por012.1.
[Referencia](https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable).
No hay avisos específicos sobre las firmas privadas corregidas.

Advisors locales antes de aplicar: **[NO VERIFICADO]**. El resultado Cloud previo
y el catálogo local no son una comparación estricta del mismo entorno; no
declarar cero avisos globales ni una comparación local antes/después observada.
La preservación de código, policies y roles se acredita separadamente por
snapshots. Lint SQL local: exit0; resultados completos quedan en artefactos ignorados.

## Aceptación SQL final — 2026-10-09

Destino verificado: `supabase_db_iroko-014-20261008`, proyecto Docker
`iroko-014-20261008`, puerto PostgreSQL 55322. Bridge dedicado con
`internal=false`: no se afirma aislamiento de egress. Baseline 014 contrastado
por definiciones y policies; el bootstrap manual no tiene historial de migraciones.

Comando reproducible: `pwsh -NoProfile -File .superpowers/012-validation/run-suite.ps1`.
El runner verifica la etiqueta exacta y ejecuta cada fixture con
`docker exec -i supabase_db_iroko-014-20261008 psql -U postgres -d postgres -X -qAt -v ON_ERROR_STOP=1`.
No se utilizó `pnpm supa:test` contra el stack del mantenedor.

| Evidencia final observada     | Resultado                                                                                                                                                                        |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Suite pgTAP completa          | 44 archivos, 884 aserciones, cero fallos y errores SQL; 44 exit 0 y planes coincidentes                                                                                          |
| Fixtures 05 / 43 / 44         | 5/5, 240/240 y 72/72                                                                                                                                                             |
| ACL administrativas efectivas | 105 retiradas; 34 tablas revisadas                                                                                                                                               |
| ACL de funciones              | Exactamente diez firmas cambiadas                                                                                                                                                |
| Preservación antes/después    | Cero diferencias en CRUD de anon/authenticated/service_role/supabase_auth_admin, policies, RLS, propietarios, cuerpos/configuración de funciones, roles, membresías y secuencias |
| Defaults preservados          | service_role y supabase_admin sin cambios                                                                                                                                        |
| Limpieza final                | Cero jobs activos, secretos Vault, solicitudes net pendientes, usuarios, perfiles, cuentas, membresías y objetos de prueba                                                       |

Para 16/29/32, el runner incorpora únicamente metadata de buckets org-assets y
documents declarados en config.toml dentro de las transacciones de prueba,
revertida al terminar. Las fixtures originales permanecen intactas. La corrección
Storage descrita arriba quedó validada por 43 completo y la excepción positiva en 44.
Esto acredita regresiones SQL locales; no certifica tráfico Realtime, conexiones
operacionales externas ni los tres SELECT service_role ausentes en este bootstrap.

Artefactos locales ignorados en `.superpowers/012-validation/`: runner,
`20261009-final-summary.json`, logs por fixture, snapshots before/final,
`20261009-preservation-summary.log`, `20261009-final-isolation.log` y advisors.

Revisión independiente del código: sin blockers, con excepción anon justificada
y alcance delimitado. El criterio de comparación local previa de advisors queda
abierto por ausencia de captura anterior; no se declara cumplimiento total del plan
ni paridad Cloud.

Siguiente paso recomendado: revisión de integración del diff acotado y de esta
limitación de advisors. Una aplicación Cloud y su aceptación requieren una etapa
autorizada aparte; después puede iniciarse el inventario de Plan 012.2 (SSRF).

## Revisión de integración y Security Advisors Cloud — 2026-10-09

Consulta nueva exclusivamente de lectura por CLI 2.110.0 y MCP autenticado al
proyecto rgrxlygtmvavqzkjyywg. Ambos coinciden: 57 WARN y 3 INFO, sin cambios
en los conteos del baseline registrado. No se aplicaron migraciones.

| Advisor Cloud                             | Cantidad | Clasificación y decisión                                                                                                                                                                                                 |
| ----------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| anon SECURITY DEFINER ejecutable          | 2 WARN   | check_request es hook de rate limit; get_active_plans es catálogo público activo. Definiciones Cloud consultadas y search_path vacío. Conservar EXECUTE intencional.                                                     |
| authenticated SECURITY DEFINER ejecutable | 53 WARN  | RPC expuestas deliberadamente; requieren controles internos de autorización por función. No revocar en bloque ni considerar el aviso por sí solo una vulnerabilidad. Esta renovación no reaudita individualmente las 53. |
| function_search_path_mutable              | 1 WARN   | billing.assert_provider_price_matches_plan, trigger SECURITY INVOKER con billing.plans calificado y sin search_path fijo. Deuda separada, no excepción por API pública; fuera de Grants.                                 |
| auth_leaked_password_protection           | 1 WARN   | Protección de contraseñas filtradas desactivada. Configuración Auth separada, no consecuencia de funciones públicas. No se modificó.                                                                                     |
| rls_enabled_no_policy                     | 3 INFO   | api_keys, webhook_deliveries, webhook_endpoints. RLS sin policies no abre acceso a roles ordinarios; revisar RPC/roles operacionales, sin crear policies para silenciar el aviso.                                        |

Referencias: [anon SD](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable),
[authenticated SD](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable),
[search_path](https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable),
[contraseñas](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).

El hardening 012.1 afecta helpers privados y privilegios administrativos de
tablas; no elimina deliberadamente las advertencias de RPC públicas. El objetivo
no es obtener cero avisos. Capturas ignoradas: 20261009-cloud-security-advisors.json
y 20261009-cloud-advisor-functions.json en .superpowers/012-validation.

Revisión independiente de integración: orden 20261008120000 (014 Robot) seguido
de 20261008130000 (012 Grants), sin firmas ni tipos nuevos. La primera cambia
policies/RPC; la segunda preserva sus helpers y reduce ACL. Aplicar por archivo
transaccionalmente en una futura etapa autorizada; verificar historial primero,
pues 014 incluye CREATE POLICY y no admite reejecución SQL cruda indiscriminada.
SQL antes de la app restringe escrituras viewer de clientes antiguos con 42501;
el guard web de disponibilidad llega con la aplicación. No afirmar aceptación
del historial completo desde el bootstrap manual usado.

Reversión: preferir conservar hardening y reparar el consumidor con firma/rol
exactos; no restaurar PUBLIC o GRANT ALL ni policies antiguas automáticamente.
Un rollback de aplicación no requiere deshacer SQL. Una reversión SQL excepcional
requiere snapshots y autorización propia.

Siguiente paso recomendado: ensayo del historial completo en otra DB desechable,
con captura de advisors antes/después y verificación transaccional del mecanismo
de aplicación. Después preparar la etapa Cloud para autorización explícita.

## Actualización — ensayo del historial completo, 2026-10-09

El [ensayo posterior](2026-10-09-plan-012-1-history-rehearsal.md) reproduce
161 migraciones originales desde cero en otra DB desechable, con plataforma
oficial Storage/Auth/Realtime. Captura local antes/después renovada: arrays
completos de advisors idénticos (66). Cierra la falta de comparación local para
este nuevo ensayo; la captura anterior sigue ausente históricamente. Los tres
SELECT service_role ausentes en el bootstrap manual sí están presentes y
preservados en el historial reconstruido. No se infiere aceptación operacional
externa o paridad Cloud. La integración SQL y rollback están revisados; pgTAP
del nuevo destino y recomendación vigente se registran en el ensayo posterior.
