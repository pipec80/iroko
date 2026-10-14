# Plan 012.3 — Inventario inicial de rate limiting

Fecha: 2026-10-13. Inspección estática y lectura Cloud, sin cambios de producto,
SQL ni proveedores. **Veredicto: no está ya resuelto; requiere corrección.**
Este informe desarrolla el primer paso de PR3 del [Plan012](../exec-plans/active/012-security-hardening-and-pricing-truth.md).

## Superficies y consumidores

| Superficie                       | Control existente                                        | Límite de la evidencia                                                       |
| -------------------------------- | -------------------------------------------------------- | ---------------------------------------------------------------------------- |
| GET `/api/v1/account`            | API key, verificación admin RPC y SELECT scoped a cuenta | Sin presupuesto propio de Route Handler.                                     |
| POST `/api/v1/webhooks/validate` | Identidad verificada y reserva SQL antes de DNS          | Presupuesto durable existente; no reemplazarlo.                              |
| Mutaciones PostgREST/RPC         | `public.check_request()`                                 | Cuenta por IP observada en Supabase, no identidad del cliente Next original. |
| Server Actions                   | Wrapper de errores y llamadas Supabase                   | No equivale a throttle general Next.                                         |
| Supabase Auth                    | GoTrue/CAPTCHA y configuración local                     | Límites efectivos Cloud de Auth [NO VERIFICADO].                             |
| Workers y callbacks billing      | Secretos/firmas, colas/leases                            | Separar de la cuota API key para preservar consumidores operativos.          |

Inventario de servicios en fuentes: Supabase local `saas-boilerplate`, GitHub
CI/nightly, Cloudflare en configuración de proxy, PostHog `/ingest`, Resend en
email, Sentry, Vercel, billing registry mock/Stripe/Mercado Pago. Configuración
no demuestra salud ni cobertura perimetral efectiva.

## Hallazgos y certeza

1. **P1 estático: API cuenta sin cuota por cliente/identidad.**
   `src/app/api/v1/account/route.ts` autentica y consulta sin throttling.
   `src/lib/api-keys/index.ts` calcula hash y llama `verify_api_key`;
   `supabase/schemas/api-keys.sql` actualiza `last_used_at` en cada uso válido.
   El GET público genera una RPC POST saliente. Los factories admin/server de
   Supabase no trasladan los headers de origen. La IP de egreso real del hosting
   y su agrupación siguen [NO VERIFICADO]; no declarar cobertura per-client.
2. **P1 estático y definición Cloud renovada: contrato 429 incorrecto.**
   `supabase/schemas/public.sql:206` construye `detail.headers` como array.
   El [contrato oficial PostgREST](https://docs.postgrest.org/en/stable/references/errors.html#add-http-headers-with-raise)
   exige objeto; errores de parseo corresponden a PGRST121/500. Resultado HTTP
   real todavía [NO VERIFICADO]. No modificar la migración histórica
   `20260818120000_fix_check_request_rate_limit.sql`; usar una nueva y espejo.
3. **Propiedad transaccional confirmada:** contador y mutación protegida
   comparten transacción. Si la operación falla, el contador revierte; también
   revierte el incremento de la solicitud bloqueada. El control no contabiliza
   todos los intentos fallidos. Esto no prueba bypass de escrituras exitosas.
4. **Exenciones confirmadas:** GET/HEAD, método/IP ausentes, IP malformada,
   redes privadas/loopback y transacción read-only. La confianza en CF/XFF es
   una dependencia de infraestructura a verificar; los comentarios SQL no son
   evidencia de headers sobrescritos. No copiar esa política a Next a ciegas.
5. **Hipótesis pendiente de concurrencia:** UPSERT serializa el mismo bucket,
   pero cinco buckets no tienen lock común por IP. Probar dos sesiones a ambos
   lados del minuto antes de declarar una carrera demostrada.

Cloud autenticado confirmó `authenticator.pgrst.db_pre_request=public.check_request`
y renovó su definición: 100 escrituras contabilizadas en cinco buckets de
minuto, con las exenciones y array anteriores. No se forzó un umbral Cloud.

## Protección webhook que se conserva

`supabase/schemas/webhooks.sql` reserva con locks advisory cuenta → actor:
20/min actor, 100/min cuenta, 10 tickets vigentes actor y 100 cuenta.
`src/lib/webhooks/registration.ts` reserva antes de DNS y emite después.
`src/app/api/v1/webhooks/validate/route.ts` limita body y devuelve 429 controlado.
Pruebas existentes verifican el orden de reserva y rechazo antes de DNS;
SQL45 conserva el cómputo de pruebas consumidas. No equivalen a probar todos
los umbrales bajo concurrencia HTTP real.

## Siguiente ejecución acotada

- [ ] Reproducir localmente por HTTP PostgREST el límite del hook: solicitud
      100 permitida, 101 rechazada, comprobar status/cuerpo y ausencia de mutación.
- [ ] Corregir el contrato 429 con migración nueva y espejo; RED/GREEN HTTP,
      pgTAP pertinente y conservación de grants/RLS/consumidores.
- [ ] Definir presupuesto durable de API cuenta y el contrato de identidad:
      aislamiento por cuenta/cliente, comportamiento al rotar claves, protección
      previa a verificación costosa y confianza IP respaldada por infraestructura.
      Fijar N/ventana antes de implementación; no inventarlos desde este inventario.
- [ ] Probar N/N+1, instancias concurrentes, claves inválidas y aislamiento.
      Fallo del limitador debe ser saneado y distinto de credenciales inválidas;
      hoy cualquier error de verificación RPC se transforma en 401.
- [ ] Probar rollback y dos conexiones reales en mismo minuto/frontera de
      minuto; documentar semántica exacta o resolver una carrera si se reproduce.
- [ ] Conservar regresiones webhook, workers y callbacks; ejecutar checks del
      árbol integrado sin atribuirles resultados históricos.

No se agregará middleware.ts ni un almacén nuevo por defecto. Una eventual
implementación respetará el stack actual y la excepción Windows de migraciones.
`src/env.ts` prevalece sobre referencias locales antiguas a env.js; TypeScript
strict, imports de tipos, validación de entradas y pruebas observables aplican
si se modifica código. No hay cambios React/Next visuales ni Realtime aquí.

## Validación y siguiente paso

El coordinador ejecutó los tests existentes de account, validate, API keys y
registration: **4 archivos / 27 pruebas aprobadas**. No contienen aceptación
N/N+1 de la API cuenta ni el parser HTTP del hook. Las pruebas completas de
012.2 mantienen su registro separado. Lecturas de normas: AGENTS, entradas de
docs, arquitectura, Plan012, TESTING-PLAN y las reglas locales aplicables.

Siguiente paso recomendado: empezar por la regresión HTTP del hook en el stack
local oficial y su corrección mínima; luego cerrar la política de cuotas API
con evidencia de identidad/IP antes de implementarla. Cloud permanece sin
modificaciones durante este inventario.
