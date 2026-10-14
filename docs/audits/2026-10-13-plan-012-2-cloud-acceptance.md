# Plan 012.2 — Aceptación Cloud del MVP

Fecha: 2026-10-13, America/Santiago. **Alcance operativo cerrado**;
integración Git pendiente. Plan 012 continúa activo por sus otros frentes.
Este registro supera los estados de preparación sin autorización/deploy de
012.2 publicados el 9 y 11 de octubre; conserva sus evidencias históricas.

## Autorización y destinos

El propietario autorizó reconstrucción local, aplicación/despliegue de 012.2
y aceptación Cloud, y confirmó que todos los servicios son MVP/test.
Autorizó por separado y explícitamente la reasignación del dominio estable
al deployment indicado cuando la revisión automática la requirió.

- Local oficial: `saas-boilerplate`, definido por `supabase/config.toml`.
- Supabase Cloud: `rgrxlygtmvavqzkjyywg`.
- Hosting: `https://project-a89lv.vercel.app`.
- Deployment aceptado: `dpl_4SXbR25CKn6VpdTzxm95LvvaGKQt`, estado READY.
- Worker efectivo: Node 24, timeout de hosting 60 segundos.

Se retiraron seis contenedores de ensayo, su volumen y tres redes vacías.
La [consolidación MVP](2026-10-13-plan-012-mvp-consolidation.md) registra el
inventario previo de servicios y el reset del único entorno local oficial.
No hubo instalaciones locales, commit, push ni merge; cambios ajenos preservados.

## Paquete aplicado

El paquete Node selectivo se verificó contra 972 fuentes; Vercel recibió 970
archivos, excluyendo metadatos locales. Todos los hashes del dry-run coincidieron.
Archivo sellado C81, SHA256:
`c81ef6c05504513e5fcb89054a4f9390d9c9ad271dc2b4fc13236e7bbefad1d7`.

Migraciones aplicadas individualmente mediante `supabase db push --linked --yes`,
con dry-run y destino comprobados:

| Versión          | Propósito                                                    | SHA256                                                             |
| ---------------- | ------------------------------------------------------------ | ------------------------------------------------------------------ |
| `20261009180000` | Transporte Node, tickets y leases                            | `aa0547befb12a69cf7a3bd87434f0667c79b527e71b737fe51b2ec6186d78a7b` |
| `20261013143645` | Lookup de edición: SELECT de tres columnas para service_role | `e97bb832505d98af868d38284803d6c9abd7b3f7dda34a8eb45cccb43181a2e5` |

La corrección posterior concede solo `SELECT(id, account_id, version)` sobre
`webhook_endpoints`; no concede URL, referencia Vault, wildcard ni CRUD.
No cambia firmas/estructuras expuestas ni requiere otro build Node.
Espejo actualizado en la misma entrega. Ledger local y Cloud: **163**, última
`20261013143645`. No se reescribieron migraciones aplicadas de 014/012.1.

## Pruebas y revisión

Resultados ejecutados el 13 de octubre durante esta continuación; no se
presentan como nuevas ejecuciones de tests en el último paso documental.

| Comando/control                                                                                                  | Resultado                                                                    |
| ---------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Reset mediante stop sin backup y start del proyecto oficial                                                      | 162 migraciones y seed desde cero; posteriormente aplicada la corrección 163 |
| `supabase test db --local supabase/tests/database/46_webhook_validation_context_grants.test.sql` antes del grant | RED: 3 aserciones fallidas de 9 observadas; plan18 interrumpido por ACL      |
| `pnpm supa:test` después de la corrección                                                                        | GREEN: 46 archivos, 950 pruebas; las18 nuevas completas                      |
| `pnpm test --maxWorkers=1`                                                                                       | 111 archivos, 1250 pruebas aprobadas                                         |
| `pnpm typecheck`                                                                                                 | Aprobado                                                                     |
| `pnpm lint`                                                                                                      | Cero errores, cuatro warnings previos de MP                                  |
| Build remoto Vercel del paquete revisado                                                                         | READY; worker Node24/60s verificado                                          |
| Receptor WebCrypto local                                                                                         | Ocho pruebas aprobadas                                                       |
| Revisión independiente de grant, espejo, tests y cambios CI                                                      | Sin hallazgos de código bloqueantes; cierre documental exigido               |

Los intentos Windows de build se cancelaron por límites temporales; **no son
GREEN**. Los primeros runs Vitest sufrieron timeouts de workers y no se aceptaron.
ESLint recorría candidatos y bundles de `.superpowers`; se excluyeron únicamente
`.superpowers` y `.worktrees`, sin desactivar reglas del producto.
El diagnóstico CI autenticado ya no usa `curl -v` ni imprime headers.

## Aceptación funcional observada

- Smoke Cloud de Auth administrativo/hook JWT, perfiles, RPC de cuentas,
  Storage y notificaciones privadas Realtime: **14 controles aprobados**.
  Se esperó readiness de replicación antes de insertar la notificación.
- Registro por la ruta desplegada, ticket de un uso, replay rechazado,
  ticket de edición y edición RPC: aprobados con identidad fixture propia.
- SQL emitter → worker Node desplegado → receptor HTTPS temporal:
  **14 controles y nueve limpiezas aprobadas**; una entrega, un intento,
  HTTP200, lease liberado y sin request SQL a URL del cliente.
- Log independiente `function_logs`, 14:46:29.493 UTC: HMAC válido,
  240 bytes, delivery `6c6c3f4d-0c82-4a55-9890-0a67b032f872`.
  SHA256 del cuerpo registrado por el receptor:
  `9964273546fbe4eda78380a9ebedd8b05226d86447cea238600e221e8fdd1e1f`.

El receptor verifica HMAC sobre bytes recibidos, timestamp e identidad exacta;
no se afirma una comparación independiente del cuerpo completo fuera del receptor.
El smoke usa el emisor SQL privado y entitlement `mock`: no acredita el trigger
de negocio `account.updated`, pagos Mercado Pago ni signup/login público con CAPTCHA.

## WAF, ACL y advisors

El primer wake real recibió HTTP429 por Bot Protection. Se añadió una excepción
exclusiva para ruta `/api/internal/webhooks/worker`, método POST y Authorization
igual al bearer dedicado. La autenticación Node sigue siendo obligatoria.
El wake posterior `118118` respondió HTTP200 sin timeout/error.

La operación REST `rules.insert` activó la regla inmediatamente en este proyecto;
la suposición inicial de draft era incorrecta. No hubo publicación adicional.
Verificación posterior: regla nueva coincide con Vault en RAM; estructura de
reglas anteriores, managed rules, IPs y demás protecciones conservadas. La
igualdad de valores históricos de headers redactados no puede demostrarse.
El inventario guardado fue redactado tras una salida inicial que incluyó un
valor de autenticación de Billing; no se reproduce aquí.
Rotar el secreto worker exige coordinar Vault, variable Vercel y condición WAF.

Postflight SQL: 18 combinaciones RPC esperadas, cero discrepancias; tabla de
tickets con RLS y sender SQL sin `net.http` a destinos de clientes.
Advisors normalizados por finding, excluyendo timestamps: **57 WARN/3 INFO →
59 WARN/4 INFO**. Únicas adiciones: dos RPC validated autenticadas necesarias
y la tabla privada de tickets con RLS sin policies/direct grants. Se clasifican
por contrato; no se revocan consumidores para ocultar avisos.

## Limpieza y activación final

Comprobados nuevamente al cerrar: cero funciones temporales `1013-a/1013-b`,
cero secretos `IROKO_0122_TEST_*`, cero cuentas/clientes/tickets de los fixtures,
cero endpoints y entregas. El primer fixture fallido se recuperó eliminando
su estado de reconciliación antes del cliente y la cuenta. Auditoría y eventos
inmutables de prueba conservan identificadores por diseño.

`node .superpowers/012-2-ssrf/net-exposure-check-1013.mjs`: **PASS**,
HTTP406/PGRST106 con selección `id`, `limit=0` y perfil `net`.
Los headers de pg_net siguen sujetos a su frontera de confianza de login SQL;
no se modificaron grants administrados de `net`.

Reactivado el job existente mediante `cron.alter_job`, sin duplicarlo:

- Job9 `process-webhook-deliveries`, frecuencia `* * * * *`.
- Activación: **19:19:45.064416 UTC / 16:19 Chile**.
- Ejecución programada312227: inicio19:20:00.034903 UTC,
  fin19:20:00.057665 UTC, estado `succeeded`.
- HTTP118454: creado19:20:00.050877 UTC, **200**, sin timeout/error;
  firma de campos de respuesta del worker y `claimed:0` comprobadas.
  Se distinguió de otras respuestas HTTP200 de Billing/email del mismo minuto.

Snapshot final a las **19:24:26.650906 UTC**: cinco ejecuciones programadas,
cero fallos y cinco respuestas del worker (`118454`, `118456`, `118457`,
`118459`, `118462`), todas HTTP 200, sin timeout ni error de transporte y con
`claimed: 0`. Job activo; endpoints, entregas y leases en cero. Ledger de
163 migraciones, última `20261013143645`.

La ejecución programada demuestra el wake con cola vacía; la entrega firmada
anterior demuestra el transporte a un receptor legítimo. No se confunden ambos.

Siguiente paso recomendado: revisión e integración selectiva de los cambios Git;
continuar los demás frentes de Plan012 por su estado propio. No ampliar este
cierre a certificación de pagos, callbacks de negocio o toda la plataforma.
