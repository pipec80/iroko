# Plan 012.2 — Preparación de transición Cloud

Fecha: 2026-10-09. Estado: paquete local preparado; aplicación, configuración y
deploy no ejecutados. La autorización anterior cubrió 014 → 012.1; esta etapa
renovó únicamente lecturas Cloud y preparó artefactos locales revisables.

## Estado renovado

Proyecto `rgrxlygtmvavqzkjyywg` (iroko). MCP autenticado y CLI Windows 2.110.0.
Ledger Cloud: 161 migraciones, última `20261008130000`. Cero endpoints webhook,
cero entregas; job `process-webhook-deliveries` id9 activo. No existen los dos
secretos Vault del nuevo worker. Este snapshot no garantiza que siga vacío al
aplicar: renovar antes de cualquier escritura.

`supabase db push --linked --dry-run` exit0 propone únicamente
`20261009180000_webhook_safe_node_delivery.sql`, sin seeds ni roles. No se
ejecutó push real. Hash SHA256 del artefacto preparado:
`AA0547BEFB12A69CF7A3BD87434F0667C79B527E71B737FE51B2EC6186D78A7B`.
Revalidar el hash si cambia cualquier fuente.

Security Advisors renovados: 57 WARN / 3 INFO, misma clasificación del baseline:
53 RPC authenticated, dos RPC anon intencionales, un search_path Billing,
protección de contraseñas filtradas desactivada y tres tablas RLS sin policies.
No se revocaron consumidores para silenciar advertencias. La futura aplicación
añadirá RPC validadas y una tabla privada deliberadamente sin policies: clasificar
los nuevos avisos por contrato; no exigir conteos idénticos de forma ciega.

## Correcciones de transición y evidencia

La revisión independiente encontró un caso fuera de la aceptación inicial:
el reconciliador antiguo conserva `request_id` al marcar una entrega `failed`,
pero el nuevo claim exige ausencia de ese campo. La migración ahora libera esa
referencia preservando estado, attempts y backoff. Las `pending` históricas
mantienen cuarentena; no se reintentan automáticamente.

Ensayo transaccional de migración completa en DB desechable exacta:
RED previo por entrega failed detenida; GREEN después. Se comprobó espera del
backoff, siguiente claim attempt3, cuarentena pendiente y preservación de una
solicitud de otro módulo. ROLLBACK y cleanup confirmados: cero usuarios, cuentas,
entregas, tickets y requests de prueba. No se enviaron solicitudes HTTP.
Artefactos locales ignorados: `transition-red.log` y `transition-green.log` bajo
`.superpowers/012-2-ssrf/`.

La ruta Node declara `maxDuration = 60`, el worker cancela a 40 segundos y el
wakeup SQL espera hasta 45 segundos. El cambio local de ruta pasó cinco pruebas;
typecheck pasó. La duración efectiva del hosting desplegado sigue
**[NO VERIFICADO]**, pese a la declaración compatible con
[Vercel](https://vercel.com/docs/functions/configuring-functions/duration).

Después de estas correcciones se repitió pgTAP completo: 45 archivos / 932
aserciones, cero fallos, cero planes inválidos y cero hashes de fixtures
modificados. HBA y credenciales temporales restaurados exactamente. Artefacto:
`transition-sql-suite.log`. ESLint focalizado de ruta pasó; formato y
`git diff --check` pasaron. `node scripts/check-docs.mjs`: 131 Markdown válidos.
No se repitió Vitest completo en esta preparación: las 1249 pruebas pertenecen
a la aceptación inicial, complementadas con las nueve de registro y cinco de
ruta ejecutadas después, sin sumarlas como si fueran casos distintos.

## Frontera pg_net

Se verificó por ACL que anon/authenticated/service_role heredan lectura sobre
colas y respuestas `net`. Es una restricción administrada de plataforma:
[Supabase documenta la exposición de headers a conexiones SQL](https://supabase.com/docs/guides/troubleshooting/database-roles-can-read-request-headers-queued-by-pg_net-ad6357).
No se cambiaron esos grants. El secreto del wake no equivale a una service key,
pero debe considerarse legible por roles con conexión SQL directa.

Con clave pública vigente y consulta `select=id&limit=0`, `Accept-Profile: net`
respondió HTTP406/PGRST106: `net` no está expuesto por Data API en el snapshot.
No se descargaron filas ni headers. El primer intento con la clave del entorno
local respondió 401 y no se usó como evidencia; la comprobación válida utilizó
la clave pública del proyecto autenticado sin imprimirla.

Gate: mantener `net` fuera de Data API y verificar que todos los consumidores
con login SQL son confiables. La identidad y uso efectivo de credenciales de
servicios externos no se deducen del catálogo y siguen **[NO VERIFICADO]**.

## Paquete revisable y autorización pendiente

El usuario informó una integración Mercado Pago y solicitó inventario real.
La [revisión de consumidores](2026-10-09-webhook-consumer-inventory.md) confirma
el receptor entrante Next.js, los dos crons Billing hacia el worker Node y correo
como Edge Function. Ninguno pertenece al cambio de entregas salientes 012.2.
Cloud sigue sin endpoints salientes; consumidores RPC externos aún no se deducen
del repositorio. El panel/historial Mercado Pago no se pudo renovar por el límite
OAuth del conector, sin modificar su configuración.

Lectura Vercel autenticada: el archivo local `.vercel/project.json` coincide con
proyecto `iroko`, id `prj_gEe5cFBOgMxmCCNisaRzZW2xZBiL`. Configura Node24.x;
la última deployment reportada tiene estado READY y target production, pero no
es el árbol pendiente de esta etapa. Los aliases incluyen
`iroko-pipec80-labs.vercel.app` y `project-a89lv.vercel.app`. El usuario confirmó
`https://project-a89lv.vercel.app` como destino. Una nueva lectura autenticada
del dominio confirma `verified=true`, proyecto Iroko y `redirect=null`.
URL worker seleccionada: `https://project-a89lv.vercel.app/api/internal/webhooks/worker`.
No se configuró en Vault ni se invocó. Una lectura HEAD HTTPS de la raíz
respondió HTTP429 sin Location: disponibilidad y posible intervención WAF/rate
limit siguen pendientes de diagnóstico; no se interpreta como éxito funcional.
La protección SSO reportada se
aplica a previews. Esto identifica el destino candidato, sin acreditar el límite
efectivo de duración, conectividad o salud del release futuro.

- [Runbook operativo](../runbooks/webhook-safe-delivery.md): barrera de emisiones,
  pausa/drenaje, mantenimiento, SQL y release Node coordinados, secretos, smoke,
  activación final y recuperación segura conservando queue-only.
- [Preflight SQL](../../scripts/sql/0122-webhook-cloud-preflight.sql): lectura sin
  payloads, URLs, secretos ni datos de clientes; ejecutado local y Cloud.
- [Postflight SQL](../../scripts/sql/0122-webhook-cloud-postflight.sql): contratos,
  ACL, RLS, cola, retries históricos, trigger habilitado y sender sin llamada
  pg_net por inspección de fuente; ejecutado únicamente local en transacción
  READ ONLY. La comprobación textual no sustituye tráfico observable.

Revisión independiente final de la preparación aprobada sin bloqueantes locales
nuevos. El árbol contiene cambios pendientes de otras tareas: no desplegarlo
indiscriminadamente ni asumir que el hash de una migración identifica el release
Node completo. Seleccionar y revisar el artefacto de release antes de autorizarlo.

El [candidato selectivo](2026-10-09-plan-012-2-release-candidate.md) delimita
27 archivos sobre HEAD, con artefacto de fuentes y hashes comprobados: 1190
tests, typecheck y lint aprobados. El build fue interrumpido por presión de
memoria; compilación y aceptación del release siguen pendientes. El HTTP429
observado incluye X-Vercel-Mitigated: challenge; no demuestra bloqueo de pg_net.
Mercado Pago de prueba conserva su aceptación separada de Billing.

**[NO VERIFICADO]:** compilación del release, acceso M2M efectivo, hosting efectivo,
secreto runtime/Vault coherente, drenaje real, consumidores RPC externos y
entrega funcional Cloud. No se autoriza activar con esos gates sin resolver.
No se restaura el sender vulnerable como rollback.

Siguiente paso recomendado: resolver el HTTP429, confirmar el release y consumidores,
autorizar de forma específica la ventana de mantenimiento, aplicación SQL,
configuración y deploy, y ejecutar el runbook con postflight observable. Plan012
sigue activo; esta preparación no cierra 012.3 ni el resto de sus PRs.
