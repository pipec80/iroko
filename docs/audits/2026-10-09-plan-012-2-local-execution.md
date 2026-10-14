# Plan 012.2 — Implementación y aceptación local

Fecha: 2026-10-09. Rama: `codex/014-t1-robot-permissions`.
Estado: implementación y aceptación locales verificadas. Este registro no declara aplicación Cloud ni cierre de Plan 012.

## Autorización y alcance

El usuario aprobó explícitamente sender Node y tickets para alta/edición después de explicar el cambio de contrato RPC. La autorización cubre implementación, pruebas y revisión locales. Se preserva el árbol pendiente; sin instalaciones, commits, push, merge, deploy ni escrituras Cloud para 012.2.

Referencias: [plan de ejecución](../exec-plans/active/012-2-webhook-ssrf.md), [decisión de transporte](2026-10-09-plan-012-2-transport-design.md) y [ensayo T2](2026-10-09-plan-012-2-t2-transport-spike.md).

La autorización Cloud anterior se consumió exclusivamente en [014 → 012.1](2026-10-09-plan-012-1-cloud-application.md). El coordinador registra Cloud con 161 migraciones y local con 162; no se declara paridad para esta nueva implementación.

## Implementación revisada

La migración manual `20261009180000_webhook_safe_node_delivery.sql` y el espejo `supabase/schemas/webhooks.sql` incorporan versiones de endpoints, reservas/tickets privados, leases y RPCs validadas. Se actualiza `src/types/database.ts` por el cambio de contrato expuesto.

`src/lib/webhooks/destination.ts` canonicaliza HTTPS y aplica una política versionada conservadora de direcciones públicas. Cada intento con hostname consulta A y AAAA; las IPv4 literales se clasifican directamente. una respuesta prohibida invalida todo el conjunto. DNS vacío o indeterminado falla cerrado. IPv4 alternativo, destinos especiales y representaciones IPv6 de traducción no reciben excepciones.

`transport.ts` conecta a la dirección validada mediante lookup fijado, preservando hostname, SNI y validación de certificado. Cada intento usa agent propio, sin sockets reutilizados, sesión TLS cacheada ni proxy implícito. No sigue redirecciones. Envía bytes UTF-8 firmados sin volver a serializar JSON, admite solamente los cinco headers del protocolo y construye Content-Length. El deadline global es 5 segundos, con respuesta limitada a 64 KiB y headers de respuesta a 16 KiB; no almacena contenido remoto.

`registration.ts` verifica identidad, reserva presupuesto durable mediante service_role antes de DNS y emite la prueba después de validar. SQL vuelve a comprobar autorización viva al consumirla. El ticket dura 60 segundos, es de un uso y liga actor, cuenta, operación, URL canónica exacta, policy_version y endpoint/version cuando corresponde. Consumo y mutación comparten transacción: un rollback también revierte el consumo.

La reserva impone 20 solicitudes/minuto por actor y 100 por cuenta, contando reservas consumidas del último minuto; limita pruebas vigentes a 10 por actor y 100 por cuenta. El límite de endpoints se comprueba antes de reservar para create y nuevamente al crear. La corrección incorporó además un índice sobre la FK endpoint_id de la tabla privada. Sus ACL excluyen acceso directo de anon, authenticated y service_role; las operaciones necesarias se exponen mediante funciones SECURITY DEFINER con search_path vacío y grants explícitos. RLS sin policies en esta tabla privada es deliberado y debe clasificarse como tal si aparece en advisors.

## Contrato para clientes directos

La interfaz administra automáticamente la validación. Un cliente RPC directo debe:

1. Autenticarse y llamar `POST /api/v1/webhooks/validate` con accountId, operation, url y endpointId para update. Se acepta sesión o Bearer JWT verificado; no se acepta un actor elegido por el cliente.
2. Recibir url canónica, ticket y version; este resultado no acredita la seguridad de futuras resoluciones DNS.
3. Invocar `create_webhook_endpoint_validated` o `update_webhook_endpoint_validated` con su identidad autenticada, URL/ticket y versión recibidos, junto con eventos y configuración.

Las antiguas RPC create/update rechazan con `webhook_validation_required`; no hay fallback sin prueba. La ruta de validación limita el cuerpo a 4096 bytes y no devuelve DNS ni secretos de otros tenants. Fallos externos se convierten en códigos controlados.

## Entrega y operación

Los triggers de negocio encolan trabajo sin conectar a URLs de clientes. El antiguo sender SQL ya no llama pg_net para entregarlas. La migración retira solamente solicitudes históricas identificadas por request_id de entregas webhook; no puede retirar una petición ya en vuelo. Antes de una futura aplicación se deberá pausar el worker antiguo y verificar el drenaje.

SQL conserva Vault y genera HMAC-SHA256 sobre timestamp.body_text. Claim retorna cuerpo y headers firmados, nunca el signing secret. El worker Node procesa hasta cinco claims concurrentes con presupuesto de invocación de 40 segundos y lease de 60 segundos. `FOR UPDATE SKIP LOCKED` y token de fencing protegen claims y completions; un outcome atrasado no puede sobrescribir un lease posterior. Reservar un intento lo consume aunque el proceso caiga. Se conservan hasta cuatro intentos y backoff de 1/5/30 minutos.

La semántica es al menos una vez: una caída después de la recepción remota puede provocar duplicados. El receptor debe deduplicar mediante delivery ID estable. Cambiar/deshabilitar un endpoint no cancela una petición ya en vuelo; su snapshot siempre recibe validación de destino.

`POST /api/internal/webhooks/worker` exige Bearer con secreto dedicado y comparación constante; no admite URL o datos de entrega del caller. El cron SQL existente únicamente despierta esa ruta configurada por el operador. Necesita `WEBHOOK_WORKER_SECRET` en runtime y secretos Vault `webhook_worker_url` / `webhook_worker_secret` coherentes. Sin configuración, no produce egress. No se configuraron estos valores en Cloud.

## Evidencia actual y correcciones

Se revisaron directamente los archivos modificados y nuevos; revisión independiente estática sin bypass SSRF/ACL confirmado. Se corrigió la ausencia inicial del límite de endpoints antes del DNS y el índice FK requerido por la suite general.

El registro `.superpowers/012-2-ssrf/vitest-full.log` contiene ejecución actual de **111 archivos y 1249 tests aprobados**. El coordinador informa 130 controles focalizados de transporte, incluidos 16 de red real; el cierre debe conservar su comando y resultado final. La prueba integrada usa DNS UDP y HTTPS reales con política productiva. Solo adapta el servidor DNS, la CA del laboratorio y el mapping de IP posterior a clasificación; no reemplaza el clasificador por un mock que permita destinos privados. Incluye comparador vulnerable con conexión observada y control positivo seguro con SNI, HMAC y bytes preservados.

El baseline RED SQL observado incluye aceptación indebida por la antigua RPC sin ticket. La primera suite general detectó el índice FK ausente y una expectativa de capacidad del fixture45; se corrigieron antes de repetir. Los logs históricos RED se conservan y no deben presentarse como GREEN final.

Resultados finales del coordinador:

- `pwsh -NoProfile -File .superpowers/012-2-ssrf/run-sql-suite.ps1`: 45 archivos, 932 aserciones TAP, cero fallos, cero planes inválidos y cero cambios de hashes de fixtures. Incluye fixture45 con 48 aserciones. Endpoint exacto aislado `supabase_db_iroko-012-history-20261009`, red interna, sin mounts y cron desactivado. Fixtures transaccionales; metadatos Storage para 16/29/32 se inyectan únicamente en el input y fixture42 adapta dblink al loopback del contenedor exacto. HBA y autenticación postgres restaurados y comparados exactamente.
- `pnpm test`: 111 archivos / 1249 tests aprobados antes de la última regresión de capacidad. Los 130 tests de transporte se repitieron después de corregir lint; las regresiones backend añadidas se registran separadamente.
- `pnpm test src/lib/webhooks/__tests__/registration.test.ts`: 1 archivo / 9 tests aprobados después del ajuste final. La regresión nueva comprueba que `endpoint_limit_reached` no invoca DNS ni emite ticket. No se suma este conteo a la suite anterior porque comparte ocho tests.
- `pnpm typecheck`: exit0; artefacto `typecheck-final.log`.
- `pnpm lint`: cero errores, cuatro advertencias preexistentes de non-null assertion en `mercadopago-cloud-acceptance.spec.ts`; artefacto `lint-final.log`.
- Formato focalizado de código, tipos y documentos aprobado; `node scripts/check-docs.mjs`: 129 Markdown válidos; `git diff --check`: exit0.
- Prueba scratch con dos conexiones psql independientes: un claim, segundo claim vacío durante el bloqueo, recuperación del lease vencido, token antiguo rechazado y completion actual aceptada. Cleanup de IDs propios comprobado con cero filas restantes. No acredita entrega exactamente una vez ni capacidad productiva.

Artefactos locales: `sql-suite/totals.json`, `sql-suite-final.log`, `concurrency-results.json`, `production-transport-network-results.json` y logs de checks bajo `.superpowers/012-2-ssrf/`. El primer RED SQL se conserva en los registros previos; la repetición GREEN sustituyó los logs por fixture. Los archivos ignorados son evidencia local, no entregables ni secretos operativos.

## Límites y siguiente paso

**[NO VERIFICADO]:** entrega funcional Cloud, límites efectivos del hosting desplegado, configuración del worker en producción y drenaje de solicitudes antiguas. No hubo pruebas de explotación contra destinos internos reales ni metadata Cloud. No se ejecutó una entrega funcional de extremo a extremo a través de un hosting desplegado.

El mantenimiento de leases expirados/endpoints deshabilitados previo a claim actualiza el conjunto elegible global. Debe observarse su coste al escalar; no se afirma throughput productivo por una prueba local de cinco entregas. La política IP conservadora puede rechazar rangos especiales globalmente alcanzables; es una decisión explícita, no una clasificación universal de conectividad pública.

Revisión independiente final aprobada sin bloqueantes, contrastando artefactos SQL, concurrencia, TypeScript, lint y unitarias. Las precisiones sobre DNS de hostnames y semántica al menos una vez quedaron incorporadas.

En la preparación posterior se detectó y corrigió un caso histórico adicional:
entregas failed con request_id retenido. El ensayo de migración completa observó
RED/GREEN y preservó backoff e intentos. También se declaró maxDuration60 y se
alineó wake45s con worker40s. Véase el [registro de transición](2026-10-09-plan-012-2-cloud-preparation.md)
para la evidencia posterior y los límites de activación; el cierre local inicial
no cubría ese escenario de datos anteriores.

Siguiente paso recomendado: preparar un paquete de transición Cloud separado que incluya pausa/drenaje, configuración coordinada Node/SQL, compatibilidad de clientes RPC y postflight; su aplicación y deploy requieren autorización explícita aparte.
