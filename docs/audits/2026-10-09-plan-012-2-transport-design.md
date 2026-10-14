# Plan 012.2 — T2: diseño de transporte seguro

Fecha: 2026-10-09. Estado: diseño aprobado explícitamente por el usuario; implementación y aceptación locales verificadas; Cloud pendiente. [Plan y gates](../exec-plans/active/012-2-webhook-ssrf.md).

## Decisión propuesta

Usar un sender Node en la aplicación existente. PostgreSQL conserva endpoints, Vault, tickets y estado durable; el sender es dueño de DNS, conexión fijada y TLS. pg_net deja de enviar a URLs controladas por clientes y solo puede despertar una ruta interna fija autenticada. No se modifica Billing.

Esto cambia el transporte y el protocolo de alta/edición directa por RPC. El Plan 012 conserva la restricción «P1-1 no toca RLS ni arquitectura»; trasladar el transporte y exigir tickets excede ese límite. El usuario aceptó explícitamente este cambio después de explicar los tickets; no se presenta como una corrección SQL compatible sin cambios. T3/T4 incorporaron los cambios de aplicación aprobados y la migración local; no se han realizado escrituras Cloud para 012.2, instalaciones ni deploy.

El relay controlado queda como alternativa si el ensayo Node o las restricciones de hosting impiden fijar la dirección. Añadir infraestructura no es necesario para ensayar Node y requeriría alcance aparte. Doble resolución SQL descartada como cierre: no controla la conexión posterior de pg_net.

## Contrato de transporte

Módulos propuestos: src/lib/webhooks/destination.ts, transport.ts y worker.ts; ruta src/app/api/internal/webhooks/worker/route.ts con runtime=nodejs. Tests junto a esos módulos y ruta.

Interfaces TypeScript propuestas:

~~~typescript
type ValidatedDestination = Readonly<{
  hostname: string;
  port: number;
  address: string;
  family: 4 | 6;
}>;
type DeliveryOutcome =
  | { kind: 'success'; statusCode: number }
  | { kind: 'retryable'; code: string; statusCode?: number }
  | { kind: 'rejected'; code: string; statusCode?: number };

resolveWebhookDestination(url: URL, signal: AbortSignal): Promise<ValidatedDestination>;
sendWebhookRequest(input: {
  url: string;
  bodyText: string;
  headers: Readonly<Record<string, string>>;
  signal: AbortSignal;
}): Promise<DeliveryOutcome>;
~~~

Las firmas finales serán funciones exportadas con tipos explícitos, import type y validación en fronteras. El resultado validado se crea dentro del sender; un consumidor no puede suministrar una IP arbitraria a una ruta pública.

- Resolver A y AAAA en cada intento. ENODATA de una familia es admisible si la otra tiene respuestas válidas; NXDOMAIN, timeout, SERVFAIL u otro fallo indeterminado rechaza el intento. Todas las direcciones retornadas deben ser públicas según política versionada; una sola dirección prohibida invalida el conjunto.
- Clasificar direcciones canónicas con net.isIP y máscaras IPv4/IPv6: bloquear loopback, privadas, link-local, ULA, multicast, unspecified, reservadas/no globales y representaciones IPv4 mapped/translation que eludan la política. La lista completa debe fijarse con fuentes primarias antes de T3. No depender de paquetes transitivos ni instalar un paquete sin autorización.
- Conectar exclusivamente a una IP ya validada mediante lookup fijado; hostname, Host, SNI y validación del certificado conservan la identidad original. No usar rechazos TLS desactivados, header Host arbitrario ni sustitución simple de URL por IP.
- Agent dedicado por intento, sin proxy implícito ni reutilización de sockets. Destruirlo al terminar. No confiar en globalAgent ni en configuración NODE_USE_ENV_PROXY.
- Headers permitidos exclusivamente: Content-Type, X-Iroko-Event, X-Iroko-Delivery-Id, X-Iroko-Timestamp y X-Iroko-Signature. Rechazar Host, Authorization, Proxy-Authorization, Connection y cualquier header no contemplado; Host/Content-Length los construye el transporte.
- No seguir ninguna redirección; 301/302/303/307/308 se registran como rechazo controlado. No reenviar payload o firma a Location.
- Deadline global de intento 5000 ms para DNS + conexión + TLS + respuesta; límite de respuesta 64 KiB, sin almacenar contenido remoto. DNS timeout es transitorio; destino prohibido, TLS inválido y redirect son rechazos permanentes.

La compatibilidad con Node24 se apoya en [HTTPS](https://nodejs.org/docs/latest-v24.x/api/https.html), [DNS](https://nodejs.org/docs/latest-v24.x/api/dns.html) y [Vercel Node runtime](https://vercel.com/docs/functions/runtimes/node-js). El repo exige engines24.x y ya declara runtime=nodejs en Billing. Hosting productivo y sus límites efectivos **[NO VERIFICADO]**: no se desplegó un spike.

## Alta/edición sin bypass RPC

SQL no dispone hoy de resolución DNS en el guard. Un control solo en la server action sería evadible por PostgREST directo. Propuesta: ticket privado aleatorio, de un uso, TTL60 s impuesto por SQL, ligado a actor autenticado, cuenta, operación, URL canónica exacta, policy_version=1 y endpoint/version para update.

Node verifica sesión, cuenta/rol vivo y límites antes del DNS; tras validar emite ticket mediante service_role. SQL vuelve a autorizar al consumirlo atómicamente con la mutación. Un rollback revierte también su consumo. Ticket no acredita la IP futura: cada entrega resuelve y fija nuevamente.

Firmas propuestas (nombres distintos para transición explícita):

~~~sql
-- Solo service_role; issue revalida permisos de actor y contexto.
public.reserve_webhook_url_validation(
  p_account_id uuid, p_actor_id uuid, p_operation text,
  p_endpoint_id uuid default null, p_expected_version bigint default null,
  p_canonical_url text default null
) returns uuid;
public.issue_webhook_url_validation(p_reservation_id uuid) returns uuid;

-- authenticated, requieren ticket; autorización viva y feature/límite en SQL.
public.create_webhook_endpoint_validated(
  p_account_id uuid, p_url text, p_events text[],
  p_description text, p_validation_ticket uuid
) returns table(id uuid, secret text);

public.update_webhook_endpoint_validated(
  p_endpoint_id uuid, p_url text, p_events text[], p_enabled boolean,
  p_description text, p_expected_version bigint, p_validation_ticket uuid
) returns void;
~~~

La UI conserva sus resultados mediante actions-webhooks.ts, incorporando validación Node + ticket + RPC autenticada. Clientes directos necesitarán un endpoint autenticado de validación y luego la nueva RPC. Las firmas antiguas rechazarán con webhook_validation_required; no se conserva fallback sin ticket. Esta transición debe aprobarse y documentarse antes de implementar. La ruta de validación y su contrato JSON se fijarán en el desglose T3; no existe aún.

Antes de DNS, reservar presupuesto durable de validación mediante RPC service_role ligada a actor/cuenta: máximo20 solicitudes/minuto por actor y100/minuto por cuenta; fail closed al exceder. La emisión debe consumir esa reserva una sola vez. Máximo10 tickets vigentes por actor y100 por cuenta; TTL60s, limpieza acotada de expirados al emitir y mantenimiento del worker. Esta reserva y sus tests se incorporarán al desglose T3, sin rate limit únicamente en memoria de una instancia.

Tabla propuesta private.webhook_url_validations sin grants a anon/authenticated, RLS de defensa; emisión, claim y complete solo service_role. Toda RPC nueva lleva REVOKE EXECUTE FROM PUBLIC y grants explícitos, verificados con has_function_privilege; no confiar en defaults ni en CREATE OR REPLACE. Ticket consume bajo bloqueo y compara auth.uid(), rol vivo, URL exacta, expiración, política y versión. No devolver direcciones DNS, secretos o contexto de otro tenant. Persistir errores controlados, sin URLs completas en logs.

## Cola, leases y HMAC

Trigger de webhook solo inserta trabajo; ninguna conexión de red dentro de la transacción de miembros/cuenta. Retirar el camino directo de send_webhook_delivery y el procesador cron antiguo; nunca habilitar dos senders simultáneamente. Endpoints existentes se revalidan por el sender en cada entrega, sin excepciones heredadas.

~~~sql
-- Solo service_role. SQL firma con Vault y devuelve bytes exactos, no whsec_.
public.claim_webhook_deliveries(
  p_worker_id uuid, p_batch_size integer, p_visibility_seconds integer
) returns table(
  delivery_id uuid, lease_token uuid, endpoint_version bigint,
  canonical_url text, body_text text, headers jsonb, attempt integer
);

public.complete_webhook_delivery(
  p_delivery_id uuid, p_lease_token uuid, p_outcome text,
  p_http_status integer, p_error_code text
) returns void;
~~~

Claim con FOR UPDATE SKIP LOCKED y fencing token; lote máximo5, concurrencia5, lease60 s y presupuesto de worker40 s. Un intento se reserva e incrementa al claim, incluso si el proceso cae antes de enviar; evita retries ilimitados. Al expirar el lease sin outcome, el intento reservado permanece consumido; liberar el lease y programar failed/backoff o exhausted al cuarto intento. Outcome usa lista cerrada success/retryable/rejected y errores controlados, nunca texto remoto. Agotamiento tras cuatro intentos; conservar backoff1m/5m/30m. No afirmar exactamente una vez: caída tras recepción remota puede producir duplicados; ID de delivery estable permite deduplicar al receptor.

Claim snapshot de URL/version. Una edición/deshabilitación posterior no cancela una petición ya en vuelo; nunca se omite validación de destino del snapshot. Complete acepta solo lease vigente y no pisa resultados de otro claim. Pruebas fijarán carreras de update, expiración y outcomes atrasados.

SQL construye una sola vez body_text y firma HMAC-SHA256 sobre timestamp.body_text con el secreto de Vault. Node envía esos bytes UTF-8 sin JSON.parse/stringify. Preservar los cinco headers existentes, ID de evento/delivery y formato sha256=. No retornar whsec_ mediante claim.

Worker interno usa secreto dedicado WEBHOOK_WORKER_SECRET validado en src/env.ts y comparación constante. No reutiliza secreto Billing ni signing secrets de clientes. Cron despierta solo URL fija de confianza; sin destino arbitrario recibido en el body. Provisionar secretos/cron Cloud queda fuera de esta etapa; fallo cerrado si no está configurado. Rollback seguro pausa entregas conservando cola y Vault, sin restaurar egress inseguro.

## Archivos y validación posteriores

SQL owner: supabase/schemas/webhooks.sql, nueva migración manual y fixtures de tickets/ACL/leases. Backend owner: módulos Node, ruta interna, ruta autenticada de validación y actions-webhooks.ts. Tests owner: Vitest, fixture10, nueva fixture y harness de tráfico. Regenerar tipos por nuevas RPC/columnas; no instalar herramientas para hacerlo.

T3 se desglosará después de aprobar transporte y cambio de contrato: primero RED real, luego implementación y GREEN, con identidad aislada renovada. T4 ejecutará checks completos apropiados. Este documento aún no es autorización Cloud ni aceptación funcional.

Siguiente paso recomendado: completar/revisar la evidencia experimental T2 y aprobar o ajustar este cambio concreto de transporte y RPC antes de T3.

## Resultado experimental T2

[Registro de ejecución](2026-10-09-plan-012-2-t2-transport-spike.md):28 controles HTTPS y 6 DNS UDP aprobados, rerun por coordinador. Revisión independiente: GO para viabilidad mecánica T2, no aceptación de producto. DNS wire y HTTPS se ensayaron separadamente; clasificación IP y mapeo de sockets son fixtures. El gate de cambio de arquitectura/contrato fue aprobado por el usuario; aceptación local T3/T4 pendiente.
