# Plan 012.2 — SSRF saliente: implementación y aceptación Cloud

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans para implementar tareas posteriores al gate de diseño. El inventario usa agentes especializados en paralelo y revisión del coordinador.

**Goal:** Impedir conexiones webhook hacia destinos internos, incluso ante DNS rebinding y redirecciones, preservando entregas legítimas.

**Architecture:** PostgreSQL conserva endpoints, secretos y estado durable. El transporte final conecta exclusivamente a una IP validada, conservando hostname/TLS. El usuario aprobó explícitamente sender Node, tickets para alta/edición RPC y su aplicación/despliegue en el Cloud de pruebas.

**Tech Stack:** Supabase PostgreSQL, pg_net 0.20.3 observado en Cloud, Next.js/Node TypeScript strict, Vitest y pgTAP.

**Spec:** [Plan 012, PR 2](012-security-hardening-and-pricing-truth.md#pr-2--fixwebhook-ssrf-dns-rebinding).

Fecha inicial: 2026-10-09. Actualización: 2026-10-13. Estado: **alcance operativo 012.2 cerrado**. T1–T5 aceptados; migraciones aplicadas, candidato desplegado en Cloud de pruebas, entrega HTTPS/HMAC y ejecución programada del cron observadas. Integración Git pendiente: sin commit, push ni merge; el archivo conserva su ubicación actual hasta actualizar el lifecycle de integración. Evidencia y límites en el [cierre Cloud](../../audits/2026-10-13-plan-012-2-cloud-acceptance.md). Plan 012 sigue activo por sus otros ítems.

## Límites globales

- Preservar todo el árbol pendiente en codex/014-t1-robot-permissions y credenciales; sin instalaciones, commits, push ni merge. El reset autorizado afecta solo datos de prueba del stack oficial `saas-boilerplate`, definido por `supabase/config.toml`, y el retiro de ensayos de Iroko; preservar proyectos ajenos.
- La limitación inicial de solo lectura Cloud quedó superada por autorización explícita posterior para aplicar/configurar/desplegar 012.2; el usuario autorizó además reasignar `project-a89lv.vercel.app` al deployment aprobado `dpl_4SXbR25CKn6VpdTzxm95LvvaGKQt`. No extender esta autorización a otros planes o proveedores.
- Todos los entornos actuales son MVP/prueba, incluso si el proveedor los etiqueta `production`. Inventariar servicios y consumidores existentes antes de crear entornos o modificar integraciones.
- No ampliar a Billing entrante, email, Realtime, pricing o reparaciones de emisión de eventos.
- ROADMAP coloca 012.3 antes de 012.2. Se realiza este inventario de 012.2 por instrucción explícita del usuario; no se reordena el resto de la cola.
- Migración manual nueva y espejo simultáneo por excepción Windows; no modificar migraciones 014/012.1 aplicadas. Tipos solo si cambia el contrato expuesto.

## Evidencia inicial y archivos — 2026-10-09

Verificado nuevamente: rama y git status con cambios pendientes preservados; Cloud consultado solo en lectura: 161 migraciones, última 20261008130000. pg_net instalado 0.20.3; las extensiones http/plpython3u/plv8 no aparecen instaladas en la consulta acotada.

| Superficie        | Fuente                                                                                                   | Observado                                                                         |
| ----------------- | -------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| Alta y edición    | supabase/schemas/webhooks.sql, create_webhook_endpoint / update_webhook_endpoint                         | assert_safe_webhook_url(text) textual IMMUTABLE, sin DNS                          |
| Entrega común     | mismo espejo, send_webhook_delivery(uuid)                                                                | Feature gate, Vault/HMAC y net.http_post hacia URL del cliente; sin revalidar URL |
| Eventos y retries | emit_webhook_event / trg_send_webhook_delivery / process_webhook_deliveries                              | Comparten sender; no se encontró envío manual en Next                             |
| UI y acciones     | src/app/[locale]/dashboard/org/settings/actions-webhooks.ts                                              | Administración y consulta de logs; RPCs autenticadas                              |
| Validación web    | src/lib/validation/webhooks.ts                                                                           | Zod + URL; defensa textual superficial                                            |
| SQL pruebas       | supabase/tests/database/10_webhooks.test.sql                                                             | 15 aserciones declaradas; cinco rechazos URL; no prueba destino conectado         |
| Unitarias         | src/lib/validation/**tests**/webhooks.test.ts; dashboard/org/settings/**tests**/actions-webhooks.test.ts | 13 y 9 casos declarados; mocks no certifican egress                               |
| Planes            | supabase/tests/database/15_plan_limits.test.sql                                                          | Feature gate y agotamiento; conservar                                             |

Conteos de pruebas obtenidos por lectura, **no ejecutados en esta etapa**. assert_safe_webhook_url y send_webhook_delivery consultados en Cloud coinciden con el flujo observado en el árbol. No se leyeron URLs de clientes ni secretos Vault.

## Hallazgo que corrige la premisa del plan padre

Resolver DNS al crear y antes de encolar en pg_net no elimina el intervalo entre comprobación y conexión: pg_net envía después del commit. La firma SQL observada solo acepta url/body/params/headers/timeout, sin fijación de IP o control de redirects. El código oficial del tag v0.20.3 habilita FOLLOWLOCATION; atribuirlo al binario Cloud es una inferencia del tag y extversion, no una prueba de tráfico Cloud.

Fuentes primarias: [pg_net y ejecución posterior al commit](https://supabase.com/docs/guides/database/extensions/pg_net), [transporte v0.20.3](https://raw.githubusercontent.com/supabase/pg_net/v0.20.3/src/core.c), [API SQL v0.20.3](https://raw.githubusercontent.com/supabase/pg_net/v0.20.3/sql/pg_net.sql).

No aceptar doble resolución como cierre de 012.2. Sustituir hostname por IP y añadir Host tampoco basta: debe preservarse SNI y validación de certificado.

## Orden de tareas y ownership

### T1 — Inventario cruzado y brechas

Owners: auditor de seguridad, arquitecto de consumidores y auditor de pruebas en paralelo; coordinador revisa el cruce. Sin archivos compartidos de implementación.

- [x] Verificar árbol, plan, arquitectura y consumidores create/update/evento/retry.
- [x] Consultar catálogo Cloud sin mutaciones: historial, extensión y definiciones acotadas.
- [x] Separar pruebas textuales, encolado y evidencia real de conexión.
- [x] Registrar limitación técnica y retirar doble DNS como solución suficiente.

Salida: este inventario y gate de diseño. Siguiente paso recomendado: T2, prueba técnica del transporte local.

### T2 — Prueba técnica local y decisión de arquitectura

Owner: agente backend; auditor de seguridad revisa. Scratch local ignorado, sin dependencias nuevas ni Cloud. Antes de usar Docker, renovar identidad, aislamiento, mounts, red y estado del destino; no asumir que la DB de 012.1 sigue utilizable.

- [x] Verificar runtime Node instalado, capacidades HTTPS/lookup y restricciones del hosting existente mediante documentación oficial; contrastar con patrón Node interno de Billing sin modificarlo.
- [x] Preparar DNS y receptores HTTPS controlados localmente; certificado confiable para el ensayo, conservando validación TLS.
- [x] Demostrar baseline vulnerable o limitación con conexión observada; no usar destinos reales internos ni metadata Cloud.
- [x] Demostrar candidato que valida A/AAAA y conecta a una IP validada manteniendo hostname/SNI/certificado; no sigue redirects. Receptor prohibido: cero conexiones; receptor permitido: cuerpo y HMAC válidos.
- [x] Comparar dos opciones: sender Node en infraestructura existente (recomendado a evaluar) o relay autenticado como destino fijo de pg_net (requiere infraestructura adicional).
- [x] Escribir decisión con contratos exactos: validación DNS en alta/edición incluso por RPC directo, claim/lease de entregas, HMAC sobre bytes, estado durable, retry, auth de worker, timeout y límite de respuesta. Resolver explícitamente cómo bloquear bypass SQL y evitar que un endpoint inseguro aborte una mutación de negocio.

Salida: [ensayo de 28 HTTPS /6 DNS](../../audits/2026-10-09-plan-012-2-t2-transport-spike.md) y [propuesta de diseño](../../audits/2026-10-09-plan-012-2-transport-design.md). GO de viabilidad mecánica; integración DNS/HTTPS y clasificador productivo pendientes. Gate de cambio de arquitectura y contrato RPC aprobado explícitamente por el usuario después de explicar los tickets. Sender Node y protocolo de validación quedan autorizados localmente; Cloud no. Siguiente paso: T3 y T4 con aceptación observable.

### T3 — Implementación acotada después del gate

Ownership separado: SQL posee migración nueva y supabase/schemas/webhooks.sql; backend posee sender/ruta Node; pruebas posee fixtures y tests del transporte. Los nombres de módulos y firmas nuevas se fijarán en la decisión T2, antes de delegar código.

- [x] Escribir regresiones y observar RED sobre el baseline exacto.
- [x] Aplicar protección en alta, edición y cada intento, con fallo cerrado ante DNS inválido, sin dejar rutas alternativas al transporte inseguro.
- [x] Preservar Vault, secretos, aislamiento tenant, feature gate, catálogo, headers, bytes firmados y backoff; impedir claims duplicados simultáneos y rechazar outcomes obsoletos; la entrega conserva semántica al menos una vez.
- [x] Observar GREEN SQL, unitarias y tráfico local real. Un attempts=1 o test rollback solo prueba encolado, nunca protección del destino final.

Salida: diff y evidencia local; no aplicación Cloud. Siguiente paso recomendado: T4, revisión independiente.

### T4 — Aceptación y cierre local

- [x] Rebinding controlado entre validación y conexión; mezcla A/AAAA pública/privada; IPv4 alternativo, IPv6 loopback/link-local/ULA/mapped; DNS vacío, error y timeout: cero conexiones prohibidas.
- [x] 301/302/307/308 hacia privados o HTTP: no seguir; comprobar también control positivo HTTPS y TLS inválido rechazado.
- [x] Cambiar URL/DNS entre intentos; comprobar revalidación, estado durable, HMAC y aislamiento tenant.
- [x] Ejecutar pgTAP completo contra destino aislado comprobado, tests del transporte, pnpm test, pnpm typecheck, pnpm lint, formato focalizado, node scripts/check-docs.mjs y git diff --check; registrar conteos reales y cleanup.
- [x] Revisión independiente, actualizar Plan 012/current-state y registrar aceptación local; separar cualquier propuesta de aplicación Cloud futura.

Salida: evidencia de seguridad observable y limitaciones explícitas. Siguiente paso recomendado: paquete Cloud separado si procede; 012.3 sigue pendiente según su estado propio.

## Foco de revisión y reglas

Revisar especialmente: rebinding dentro del mismo intento, redirects, IPs mixtas/IPv6, bypass RPC directo y concurrencia/retries. Cada clase tiene controles en T2/T4. No confundir ausencia de tráfico por una red rota con protección: exigir control positivo.

Leídas las ocho reglas locales: TS strict, import type, Zod en fronteras, logger redactado y JSDoc de contratos aplicarán si se añade Node. React/Next visual y Realtime no cambian en el inventario; cualquier ruta Node futura sigue proxy.ts, nunca middleware.ts. src/env.ts prevalece sobre referencia antigua env.js; excepción Windows prevalece sobre generación automática. CREATE OR REPLACE no se considera prueba de ACL: verificar privilegios efectivos y preservar mínimos de 012.1.

La [ejecución T3/T4](../../audits/2026-10-09-plan-012-2-local-execution.md) acredita transporte local. El [cierre del 2026-10-13](../../audits/2026-10-13-plan-012-2-cloud-acceptance.md) añade despliegue, entrega HTTPS/HMAC y wake real de Cloud. **[NO VERIFICADO]:** explotación contra destinos internos reales, pago Mercado Pago y aceptación de emisión mediante cada trigger de negocio; no son resultados inferibles de la prueba controlada del sender.

## Contratos fijados para T3

La reserva service_role reserve_webhook_url_validation(account,actor,operation,endpoint,version,url) autoriza y limita antes del DNS; issue_webhook_url_validation(reservation_id) valida la misma reserva después de DNS. RPC create/update validated exige ticket de un uso y mantiene autorización viva. Ruta autenticada /api/v1/webhooks/validate acepta sesión o Bearer verificado; no actor suministrado por cliente. El worker /api/internal/webhooks/worker acepta Authorization Bearer con secreto dedicado. Claim devuelve cuerpo y headers firmados por SQL, nunca secreto Vault.

## T5 — Aplicación y aceptación Cloud

- [x] Renovar identidad, ledger, cron y cola mediante lectura autenticada.
- [x] Preparar runbook, preflight/postflight seguros y revisar compatibilidad de release/RPC.
- [x] Ensayar transición de entregas históricas failed conservando attempts/backoff; corregir request_id obsoleto tras RED y observar GREEN.
- [x] Declarar duración de ruta y alinear wake con presupuesto del worker; registrar frontera de confianza pg_net.
- [x] Delimitar y empaquetar candidato selectivo preservando cambios ajenos; registrar tests, tipos, lint y límite de compilación por memoria en el [registro](../../audits/2026-10-09-plan-012-2-release-candidate.md).
- [x] Compilar y desplegar el candidato selectivo en Vercel: deployment `dpl_4SXbR25CKn6VpdTzxm95LvvaGKQt` READY, Node 24 y duración worker 60 s. Los ensayos Windows interrumpidos siguen sin acreditar build local; el gate de hosting lo satisface el build Vercel.
- [x] Resolver dominio/release, hosting y consumidores; obtener autorización concreta de aplicación/configuración/deploy y de reasignación del dominio de pruebas.
- [x] Aplicar `20261009180000` y corrección de privilegios de contexto `20261013143645`; comprobar ledger Cloud con 163 migraciones. Preservar la historia 014/012.1.
- [x] Observar entrega HTTPS controlada con HTTP 200, bytes exactos y HMAC válido mediante log independiente; comprobar wake `pg_net` → worker con HTTP 200 y limpieza de fixtures.
- [x] Comprobar que `net` no está expuesto por Data API: HTTP 406 / `PGRST106`.
- [x] Reactivar cron después de la aceptación y observar una ejecución programada: job 9 activo, run `312227` succeeded, wake `118454` HTTP 200 y `claimed: 0`; cola y leases vacíos.

Salida: [paquete de preparación histórico](../../audits/2026-10-09-plan-012-2-cloud-preparation.md) y [aceptación Cloud del 2026-10-13](../../audits/2026-10-13-plan-012-2-cloud-acceptance.md).
Siguiente paso recomendado: preparar revisión de integración Git del diff selectivo, sin push ni merge automáticos; retomar 012.3 según su inventario y aceptación propios. El cierre operativo de 012.2 no cierra Plan 012 completo.

Antecedente 2026-10-11, superado por la autorización y ejecución del 2026-10-13: [revisión de cierre y preflight renovado](../../audits/2026-10-11-plan-012-closure-review.md).
El usuario pospuso el receptor HTTPS externo para el final. Se renovó la
emulación local: ocho archivos / 167 pruebas aprobadas, sin tráfico Cloud.
Mercado Pago entrante no sustituye la aceptación del sender saliente. Este
orden permite avanzar la preparación; no elimina el gate de entrega observable
antes de activar cron ni autoriza aplicación Cloud o deploy.

### Aceptación renovada — 2026-10-13

El stack oficial `saas-boilerplate` se reconstruyó desde cero con 162 migraciones y posteriormente se aplicó la corrección 163; se retiraron los entornos de ensayo de Iroko. Suite SQL: 46 archivos / 950 aserciones aprobadas. El seguimiento de privilegios observó RED de la nueva prueba 46 (18 previstas, nueve ejecutadas y tres fallos antes del corte) y GREEN de sus 18 controles tras conceder únicamente las tres columnas de contexto necesarias a `service_role`. Aplicación: 111 archivos / 1250 tests con `--maxWorkers 1`, typecheck aprobado y lint sin errores, con cuatro warnings previos.

El despliegue selectivo usa el candidato C81: 972 archivos fuente y 970 archivos de upload. La aceptación funcional Cloud registra 14 controles de Auth/Storage/Realtime aprobados. La entrega saliente registra 14 controles, nueve de limpieza y prueba independiente del receptor: HMAC válido sobre 240 bytes. El evento se generó mediante emisor privado controlado; no prueba todos los triggers de negocio ni un pago Mercado Pago.

El wake real pasó de HTTP 429 a HTTP 200 después de una excepción WAF restringida al método POST, ruta del worker y Bearer autorizado. Advisors: 59 WARN / 4 INFO frente a 57 WARN / 3 INFO; el incremento corresponde a la tabla privada de validación y dos RPC necesarias, clasificados explícitamente, sin revocación automática. El [registro Cloud](../../audits/2026-10-13-plan-012-2-cloud-acceptance.md) mantiene los comandos, evidencias y límites; estos resultados no cierran 012.3, 012.4, pricing ni integración Git.

Cron reactivado el 2026-10-13 a las 19:19:45 UTC. Se observó el run `312227`, iniciado a las 19:20:00 UTC y finalizado con `succeeded`, junto al wake `118454` HTTP 200 y `claimed: 0`. Esta ejecución acredita el disparo programado con cola vacía; la entrega firmada se probó por separado. Postflight: cero endpoints, entregas y leases; cero cuentas, clientes y tickets fixture; función receptora temporal y sus cuatro secretos de prueba retirados. `net` continúa sin exposición por Data API (406 / `PGRST106`).
