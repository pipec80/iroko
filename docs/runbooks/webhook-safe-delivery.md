# Transición a entregas webhook seguras — Plan 012.2

Estado actualizado el 2026-10-13: transición Cloud y deploy ejecutados con
autorización explícita en el MVP. La [aceptación Cloud](../audits/2026-10-13-plan-012-2-cloud-acceptance.md)
registra la entrega HTTPS/HMAC, acceso al worker y cierre operativo; prevalece
sobre los preflights históricos de octubre 9/11. La aceptación
[local](../audits/2026-10-09-plan-012-2-local-execution.md) sigue siendo evidencia
separada. Cambios posteriores de Cloud, deploy o alias requieren autorización
para su alcance. No contiene credenciales.

Dominio confirmado por el usuario: `https://project-a89lv.vercel.app`.
URL exacta del worker: `https://project-a89lv.vercel.app/api/internal/webhooks/worker`.
Vercel lo reporta verificado y asociado al proyecto Iroko, sin redirect de dominio.
El deployment aprobado `dpl_4SXbR25CKn6VpdTzxm95LvvaGKQt` sirve el alias estable
por autorización explícita del usuario. La raíz respondió HTTP429 en el preflight
histórico; el wake pg_net al worker respondió HTTP200 el 2026-10-13 después de
la excepción WAF acotada descrita abajo. El estado de la raíz no sustituye el
control de esa ruta.

## Estado aplicado y operación del WAF

Cloud tiene 163 migraciones, última `20261013143645`. La migración original
`20261009180000` conserva su hash y se complementa con un grant mínimo de
`service_role SELECT (id, account_id, version)` para consultar el contexto de
validación al editar. No concede lectura de URL, secretos ni CRUD adicional.
El release usa Node24 y `maxDuration = 60`; consultar el registro fechado para
los resultados del deployment y las limitaciones del build local Windows.

El cierre verificó cero funciones receptoras/secrets de prueba, tickets y
cuentas/clientes de fixture, endpoints y entregas. `net` respondió nuevamente
HTTP406/PGRST106 por Data API. El job existente 9 quedó activo el 2026-10-13
a las 19:19:45 UTC (16:19 Chile), con frecuencia `* * * * *`. La primera ejecución
programada, run 312227 a las 19:20 UTC, terminó `succeeded`; su wake webhook
correlacionado 118454 respondió HTTP200 sin timeout/error de transporte y con
cero entregas claimed. No confundir otros HTTP200 de Billing/email con este
control ni atribuir entrega HTTPS a una ejecución con cola vacía: el receptor
firmado se probó en el smoke separado.

La regla WAF permite el wake solamente al path exacto
`/api/internal/webhooks/worker`, método POST y Authorization Bearer con el
secreto dedicado. Se conservaron las demás reglas y managed rules. La llamada
API `rules.insert` observada activó la regla directamente: **no asumir que crea
un borrador**. Revisar el comportamiento y la configuración efectiva antes de
cualquier operación posterior. No copiar la condición secreta a logs o docs.

La rotación del secreto debe coordinar Vault, el entorno Vercel y la condición
secreta de esta regla WAF; actualizar solo dos de esos tres destinos rompe el
wake. Pausar cron durante el cambio, desplegar el entorno coherente, probar una
invocación autorizada y observar el HTTP y estado durable antes de reactivarlo.
Conservar las demás reglas y confirmar que una petición sin autorización sigue
sin acceso al worker. Un allow del WAF no sustituye la autenticación de la ruta.

## Frontera de confianza de pg_net

Los headers del wake contienen el secreto dedicado. Supabase concede acceso a
la cola mediante PUBLIC: los roles que pueden conectarse directamente por SQL
pueden leerlos mientras esperan. Vault no elimina esa exposición transitoria.
No intentar revocar grants administrados de `net` ni habilitar RLS allí; son
una restricción de plataforma documentada por
[Supabase](https://supabase.com/docs/guides/troubleshooting/database-roles-can-read-request-headers-queued-by-pg_net-ad6357).

Gate: `net` debe permanecer fuera de los esquemas expuestos por Data API y
todo login SQL debe pertenecer a un servicio confiable. Si hay consumidores SQL
no confiables, detener la activación y rediseñar el wake; no distribuirles el
secreto ni presentar esta arquitectura como aislada frente a ellos. Renovar
una lectura pública con `Accept-Profile: net`, selección `id` y `limit=0`;
se espera HTTP406/PGRST106, sin descargar filas. Esta preparación comprobó esa
respuesta en Cloud. Repetir antes de activar porque la configuración puede cambiar.

## Contrato y condiciones de entrada

PostgreSQL conserva cola, Vault, autorización, HMAC y leases. Node valida todos
los resultados DNS de cada hostname y fija la dirección de conexión conservando
hostname/SNI/TLS. El sender SQL antiguo queda sustituido por encolado y un wakeup
a una ruta fija del operador. No se envían URLs de clientes mediante pg_net.

Antes de aprobar la ejecución, completar un registro fechado con:

- Proyecto Supabase exacto, rama/revisión del release y hash de
  `supabase/migrations/20261009180000_webhook_safe_node_delivery.sql`.
- Ledger remoto actual y ausencia de versiones divergentes. La última
  observación del 2026-10-13 fue 163 migraciones, última `20261013143645`; renovar
  esta lectura, sin asumir que sigue vigente.
- URL HTTPS estable del hosting, propiedad y resolución verificadas, terminada
  exactamente en `/api/internal/webhooks/worker`, sin redirecciones de dominio,
  login, protección de previews o locale. No usar una URL de un cliente.
- Runtime Node con HTTPS nativo, DNS A/AAAA y conectividad Supabase disponibles.
  La ruta declara `runtime = 'nodejs'`. Su presupuesto interno es 40 segundos,
  cada intento tiene deadline global de 5 segundos y el lease dura 60 segundos.
  Verificar y, si hace falta, configurar el límite efectivo del hosting con
  margen superior a 40 segundos. La ruta declara `maxDuration = 60`; comprobar
  que el plan del hosting respeta ese valor, además de la declaración en código.
- `service_role` disponible exclusivamente en el servidor Node conforme a
  `src/env.ts`. Nunca entregarlo al navegador ni usarlo como identidad del
  cliente en create/update.
- Inventario de clientes directos y ventana de mantenimiento acordada para
  altas/ediciones. La migración cambia el protocolo: no admite coexistencia
  transparente entre clientes tokenless y clientes nuevos.
- Baseline de cola, cron, triggers, ACL, advisors y errores; responsable de
  reconciliar entregas históricas que puedan quedar en cuarentena.

Renovar el estado efectivo de hosting, secretos, drenaje y consumidores externos
antes de otra transición. La aceptación del 2026-10-13 acredita exclusivamente
sus controles y escenarios registrados; no constituye una garantía permanente.

## Preflight de lectura y paquete de release

Ejecutar mediante MCP autenticado o CLI ya instalado el
[preflight SQL](../../scripts/sql/0122-webhook-cloud-preflight.sql), verificar
identidad antes de continuar y guardar únicamente resultados sin secretos.
Revisar definiciones activas y todos sus invocadores: el cron de reintentos y el
trigger `webhook_deliveries_send` pueden iniciar el sender antiguo.

Preparar un release consistente que incluya migración, espejo, tipos, transporte,
registro, worker, rutas y acciones UI. Revisar el diff completo preservando los
cambios pendientes ajenos. No ejecutar un `db push` que aplique incidentalmente
otras migraciones. La aprobación debe identificar esta migración y este release.

## Secuencia de aplicación autorizada

1. Abrir mantenimiento de altas/ediciones webhook en todos los consumidores y
   establecer una barrera de escritura efectiva para las operaciones que emiten
   eventos, incluidas llamadas RPC directas. Una pantalla de mantenimiento no
   bloquea por sí sola escrituras API. Inventariar qué flujos deben pausarse y
   mantener esa barrera hasta sustituir el sender y verificar el drenaje.
   Pausar los invocadores del sender antiguo: desactivar sus jobs cron y
   deshabilitar de forma acotada el trigger `webhook_deliveries_send`, conservando
   su definición. Inventariar y bloquear cualquier invocador directo adicional.
   Conservar los eventos durables ya generados; no deshabilitar indiscriminadamente
   triggers de negocio, Auth, Billing ni otros jobs. Registrar los estados
   originales para su restauración controlada.
2. Esperar a que terminen transacciones iniciadas antes de la pausa y solicitudes
   ya despachadas. Comprobar que no aparecen nuevas solicitudes del sender
   antiguo y registrar cola, ejecuciones cron y evidencia disponible del receptor.
   Una cola vacía **no demuestra** ausencia de tráfico en vuelo. PostgreSQL no
   puede retirar HTTP ya iniciado; si no se puede demostrar quiescencia, mantener
   la pausa y no aplicar todavía. El operador define el intervalo de drenaje
   según los timeouts reales inventariados; no asumir un número fijo.
3. Aplicar únicamente `20261009180000` mediante el mecanismo de migraciones
   aprobado, con transacción y registro de ledger coherentes. La migración borra
   solicitudes de `net.http_request_queue` ligadas a `request_id` de entregas
   webhook y marca las históricas pendientes con request ID como
   `exhausted/worker_failed`. No tocar requests de otros módulos. Comparar
   conteos antes/después y registrar la cuarentena; no reencolarla automáticamente.
   Las entregas históricas `failed` liberan su `request_id` conservando estado,
   intentos y backoff, para que el nuevo claim pueda retomarlas cuando corresponda.
4. Mantener cron inactivo. Desplegar el release Node/UI consistente y verificar
   que ya sirve ambas rutas nuevas. Durante el intervalo SQL → Node, mantener
   el mantenimiento: el cliente viejo recibirá `webhook_validation_required`.
   Restaurar el trigger acotado solo después de verificar que su sender efectivo
   es queue-only y que no existe un camino alternativo al sender SQL antiguo.
5. Configurar mediante el gestor de secretos autorizado un secreto dedicado de
   al menos 32 caracteres: `WEBHOOK_WORKER_SECRET` en Node y el mismo valor en
   Vault bajo `webhook_worker_secret`. Configurar `webhook_worker_url` con la URL
   estable verificada. Comparar coherencia sin mostrar valores, hashes ni headers
   en logs. No copiar secretos a comandos versionados o capturas. Estos tres
   nombres describen el contrato de esta transición; el inventario general de
   variables sigue siendo `src/env.ts`.
6. Ejecutar postflight de lectura y smoke controlado antes de activar cron.
   Una invocación autorizada del worker usa `POST`, JSON `{}` y
   `Authorization: Bearer <secreto dedicado>`; no acepta destinos del caller.
   **Puede procesar hasta cinco entregas elegibles existentes**: inventariarlas y
   obtener aprobación para ese efecto, o realizar primero el smoke en un destino
   aislado del release. No tratar el worker como un endpoint dry-run.
7. Solo con todos los gates aprobados, reactivar el job inventariado con su
   frecuencia aceptada, sin crear un duplicado. Levantar mantenimiento de
   altas/ediciones para clientes migrados. Registrar observación posterior de
   cola, outcomes, retries y errores; reconciliar separadamente la cuarentena.

La implementación del wakeup pg_net tiene timeout de 45 segundos mientras Node
puede trabajar 40 segundos y la ruta declara `maxDuration = 60`. Un timeout del wakeup no acredita que el worker haya
fallado ni cancela necesariamente su trabajo. Verificar el comportamiento del
hosting ante desconexión del caller y observar el estado durable de las entregas.
La activación queda bloqueada si el hosting termina la invocación antes de
completar su presupuesto. No inferir éxito de entrega del HTTP del wakeup.
La declaración de duración sigue el contrato documentado de
[Vercel Functions](https://vercel.com/docs/functions/configuring-functions/duration);
el timeout asíncrono sigue el contrato de
[pg_net](https://supabase.com/docs/guides/database/extensions/pg_net).

## Compatibilidad de clientes directos

La UI del release ejecuta el protocolo automáticamente. Un integrador directo
usa la misma identidad autenticada en estos dos pasos, sin `service_role`:

```http
POST /api/v1/webhooks/validate
Authorization: Bearer <JWT de usuario>
Content-Type: application/json

{"accountId":"<uuid>","operation":"create","url":"https://<receptor-controlado>/hooks"}
```

La respuesta es `{ "url": "<url canónica>", "ticket": "<uuid>", "version": null }`.
Invocar después `create_webhook_endpoint_validated` con `p_account_id`, `p_url`
igual al resultado, `p_events`, `p_description` y `p_validation_ticket`.
Para editar, validar con `operation: "update"` y `endpointId`; usar
`update_webhook_endpoint_validated` con `p_endpoint_id`, `p_url`, `p_events`,
`p_enabled`, `p_description`, `p_expected_version` igual a `version` recibida y
`p_validation_ticket`.

El ticket expira a los 60 segundos y se consume una vez, dentro de la misma
transacción de la mutación. Ante expiración, conflicto de versión o cambio de URL,
validar de nuevo. No reutilizar tickets ni añadir fallback a las RPC antiguas.
Estas devuelven `webhook_validation_required` después de sus controles previos.
El endpoint devuelve errores controlados, incluido 429 por presupuesto de
validación; el cliente debe evitar retries inmediatos ilimitados.

## Postflight y evidencia para aceptar Cloud

Ejecutar el [postflight SQL](../../scripts/sql/0122-webhook-cloud-postflight.sql).
Registrar proyecto, revisión, fecha, ledger, ACL efectivas, sender queue-only,
configuración por existencia sin valores, jobs/triggers y diferencias de advisors.
Clasificar RLS sin policies en la tabla privada de tickets y los SECURITY DEFINER
con grants explícitos; no revocar automáticamente funciones necesarias.

El smoke autorizado debe demostrar:

- Registro y edición con ticket para un administrador permitido; rechazo sin
  ticket, con identidad distinta y con versión obsoleta. No incluir secretos de
  endpoint en el registro de evidencia.
- Entrega HTTPS positiva a un receptor controlado por el operador, certificado
  válido, bytes recibidos y HMAC sobre `timestamp + '.' + body` correctos.
  Comparar `X-Iroko-Delivery-Id` con la fila durable y el outcome final.
- Rechazo de redirects y destinos prohibidos mediante laboratorio controlado,
  con cero conexiones al receptor prohibido y control positivo en la misma prueba.
  No probar contra metadata real ni servicios internos de producción.
- Retry permitido y lease/fencing observados sin duplicar claims simultáneos;
  reconexión y timeout no deben sobrescribir un resultado de lease posterior.
- Cero regresiones atribuibles de ACL y advisors frente al baseline, y ausencia
  de sender antiguo activo. Separar tests locales ya registrados de los controles
  ejecutados en Cloud.

La entrega conserva semántica **al menos una vez**. Si el proceso cae después de
la recepción remota puede repetirse el envío; el receptor deduplica por delivery
ID estable. Un cambio o desactivación del endpoint no retira una petición en vuelo.

## Si falla la transición

Mantener cron pausado y registro en mantenimiento. Conservar cola, cuarentena y
evidencia sin borrar entregas. Corregir hacia adelante SQL/Node/configuración y
repetir gates antes de reactivar. Si ya hay workers activos, pausar nuevas
invocaciones y esperar sus leases; no completar manualmente tokens obsoletos.

**No restaurar el sender SQL inseguro ni habilitar RPC tokenless como rollback.**
Un rollback de aplicación a una revisión incompatible exige mantener el bloqueo
operativo; no equivale a recuperar la seguridad del transporte. Decidir por
separado qué entregas inciertas se reconcilian o repiten, con consentimiento para
posibles duplicados y deduplicación del receptor.

Siguiente paso recomendado: consultar el cierre fechado y mantener observación
del cron, HTTP del wake y outcomes durables. Para futuras modificaciones, renovar
preflight y autorización del cambio concreto; no repetir la migración ya aplicada.
