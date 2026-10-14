# Inventario de webhooks y consumidores — Iroko

Fecha: 2026-10-09. Inspección de código y lecturas autenticadas de Supabase,
Vercel y Mercado Pago. No se invocaron workers, reenviaron pagos, alteraron
secretos ni modificaron recursos Cloud. Se preservó el árbol pendiente.

## Confirmación del usuario — 2026-10-11

El usuario confirmó estos destinos y solicitó conservarlos en memoria:

- Notificaciones entrantes Mercado Pago: `https://project-a89lv.vercel.app/api/webhooks/mercadopago`.
- Origen público Vercel: `https://project-a89lv.vercel.app`.
- Proyecto Supabase: `https://rgrxlygtmvavqzkjyywg.supabase.co`.

Esta confirmación identifica los destinos declarados por el usuario; no renueva
las lecturas Cloud del 9 de octubre ni verifica valores runtime, entrega de
notificaciones o acceso Supabase → worker. La ruta Mercado Pago es distinta del
worker saliente de 012.2, `/api/internal/webhooks/worker`. La aceptación de Billing
sigue separada; no se modificó configuración de ningún proveedor.

## Resultado

| Circuito                      | Entrada o destino                                                   | Evidencia actual                                                                                                                                                    | Relación con 012.2                                 |
| ----------------------------- | ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| Mercado Pago entrante         | Next.js `/api/webhooks/mercadopago`                                 | Ruta y verificación implementadas; Vercel tiene las tres variables de integración en production/preview; Cloud registra 12 eventos Billing de proveedor mercadopago | Preservar; no migra al sender nuevo                |
| Recuperación Billing          | Supabase cron → Next.js `/api/internal/billing/worker`              | Cron activo cada cinco minutos; último registro recovery 2026-10-09 22:55:01 UTC, completado HTTP200                                                                | Preservar                                          |
| Conciliación Billing          | Mismo worker, modo reconciliation                                   | Cron activo cada hora; último registro 2026-10-09 22:00:01 UTC, completado HTTP200                                                                                  | Preservar                                          |
| Correo                        | Supabase cron → Edge Function `process-email-queue`                 | Única Edge Function desplegada listada, ACTIVE; cron activo por minuto                                                                                              | Preservar                                          |
| Webhooks salientes de cuentas | Tabla `public.webhook_endpoints` y cola `public.webhook_deliveries` | Cero endpoints, cero entregas; cron legacy activo y cuatro triggers propios habilitados                                                                             | Este es el circuito que modifica 012.2             |
| Auth hook local               | PostgreSQL `public.custom_access_token_hook`                        | Configuración local habilitada; hook SQL, no URL de Mercado Pago                                                                                                    | Preservar; configuración Cloud de Auth no renovada |

Los timestamps/HTTP200 de Billing prueban registros de ejecución del worker,
no éxito económico completo ni recepción reciente del webhook entrante.
Los 12 eventos Billing no demuestran que todos llegaron por webhook: recovery
y reconciliation también pueden aplicar eventos mediante el reducer.

## Código y configuración comprobados

La ruta `src/app/api/webhooks/[provider]/route.ts` deriva el proveedor de la URL.
Para Mercado Pago recibe x-signature, x-request-id y data.id; el adapter en
`src/lib/billing/providers/mercadopago.ts` verifica HMAC y construye
notification_url desde `MERCADOPAGO_WEBHOOK_URL`. La integración se registra
solo cuando existen token, secreto y URL. La persistencia utiliza idempotencia
por provider/external_event_id en Billing.

Vercel registra `MERCADOPAGO_ACCESS_TOKEN`, `MERCADOPAGO_WEBHOOK_SECRET` y
`MERCADOPAGO_WEBHOOK_URL` para production y preview. También registra el secreto
del worker Billing en production. Se leyeron metadatos sin imprimir valores.
El conector no devolvió el valor de la URL marcada sensitive; su URL efectiva
queda **[NO VERIFICADO]**. La ruta esperada en el dominio confirmado es
`https://project-a89lv.vercel.app/api/webhooks/mercadopago`.

Supabase Vault contiene billing_worker_url y billing_reconciliation_secret.
Una consulta sanitizada confirmó que billing_worker_url es el origen HTTPS
`project-a89lv.vercel.app`: la función SQL agrega `/api/internal/billing/worker`.
No comparar ese valor base con una URL que ya incluya el path para concluir
erróneamente una configuración divergente. Los secretos no fueron mostrados.

No aparecen triggers de Database Webhooks basados en supabase_functions.http_request
ni triggers con llamada directa net.http en su propia función. Los triggers
propios de salientes llaman helpers privados y sí pertenecen al sender legacy;
el conteo anterior no significa ausencia de envíos indirectos.
Cloud sigue en 161 migraciones, última 20261008130000; no tiene aplicada 012.2.

## Consumidores de altas/ediciones salientes

La inspección productiva de src encontró únicamente las server actions
`src/app/[locale]/dashboard/org/settings/actions-webhooks.ts` como consumidoras
de create/update; el árbol pendiente ya usa RPCs validated. No aparecieron
clientes adicionales en scripts ni Edge Functions del repositorio.
Esto no prueba ausencia de clientes mantenidos fuera del repositorio, ni de
credenciales SQL compartidas con otros servicios. Su inventario sigue pendiente.

## Mercado Pago y límite de acceso

El MCP Mercado Pago autenticado lista una aplicación: iroko, id2362506445185072.
La consulta de historial de notificaciones fue rechazada por validación de
ownership OAuth: el token conectado no pertenece a una aplicación OAuth
compatible con ese método. No se intentó cambiar autenticación ni configuración.
Por ello, URL y eventos seleccionados en el panel del proveedor, entregas
recientes y errores de notificación permanecen **[NO VERIFICADO]**.

## Decisión y siguiente paso

El usuario aclaró después del inventario que Mercado Pago utiliza credenciales
de prueba y que su integración aún está pendiente de cierre. Se conserva como
aceptación separada de Billing; encontrar su panel o cerrar pagos no es un gate
de la preparación local de 012.2. Esto no autoriza cambiar credenciales, reenviar
eventos ni tratar secretos de prueba como datos públicos.

Mercado Pago y los workers Billing/correo existentes quedan fuera del cambio
012.2. El otro enlace Supabase → Next.js identificado es el worker Billing,
no un segundo endpoint saliente registrado por una cuenta. No hay evidencia
de un receptor Mercado Pago adicional desplegado como Edge Function.

Siguiente paso recomendado: verificar en el panel Mercado Pago la URL configurada
y las últimas entregas, sin reenviar eventos; confirmar si existen consumidores
externos de los RPC salientes o accesos SQL. Después cerrar release/hosting y
autorizar la transición 012.2 según el [paquete](2026-10-09-plan-012-2-cloud-preparation.md).
