# Plan 012.3 — Cierre y seguimientos pendientes

Actualizado: 2026-10-15. Registro documental; no autoriza cambios Cloud.

## Qué está cerrado

El alcance aprobado de 012.3 está implementado, aceptado localmente, aplicado
en Supabase Cloud y desplegado en `project-a89lv.vercel.app`. Ledger 166;
deployment `dpl_4AK3JX5bMMkgtavTnteEnr77Fcoe`; WAF versión 6. La evidencia y
los harness se integraron mediante PR #221, squash commit `3bac4f9b`.

La [ejecución Cloud](2026-10-14-plan-012-3-cloud-execution.md) registra siete
comprobaciones RPC y las mismas cinco comprobaciones HTTP repetidas mediante
CLI, candidato público y dominio estable. Las dos últimas ejecuciones fueron
HTTPS sin bypass. La [aceptación local](2026-10-13-plan-012-3-local-execution.md)
conserva sus pruebas RED/GREEN, concurrencia y suites completas.

Cerrar ese alcance no certifica todo el proyecto ni resuelve los puntos de la
tabla siguiente. No se registran como fallos demostrados las pruebas que no se
ejecutaron; tampoco se presentan como verificadas.

## Tabla para retomar

| ID        | Pendiente y estado real                                                                                                                                                                                                                                                     | Cuándo retomarlo                                                                                                                             | Evidencia necesaria para cerrar                                                                                                                                                                                                             |
| --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| RL-F01    | **[NO VERIFICADO]**: confianza Cloud de CF/XFF y exenciones de IP del hook SQL heredado. El parser 429 y la concurrencia tienen RED/GREEN HTTP local; las fuentes aplicadas coinciden. La identidad Vercel del endpoint cuenta sí resistió el spoof ensayado.               | Seguimiento específico de rate limiting, antes de afirmar protección general por IP del Data API. No queda asignado automáticamente a 012.4. | Inventariar acceso directo/proxies y probar HTTP real con headers ausentes, privados y falsificados, correlacionando el bucket efectivo. Cualquier corrección requiere migración nueva y regresiones de consumidores.                       |
| RL-F02    | **[NO VERIFICADO]**: provocar 503 del limitador y 500 de lectura posterior a través de Next desplegado. Hay pruebas locales/unitarias y reserva persistente frente a un fallo REST real en Cloud. No se retiraron grants ni se detuvo Supabase para simular fallos.         | Ampliación de aceptación con inyección aislada de fallos, si se necesita evidencia end-to-end Cloud de esas ramas.                           | 503 distinguible de 401; 500 después de una admisión confirmada; reservas conservadas. Ensayo aislado, sin provocar indisponibilidad global ni agregar un bypass desplegable.                                                               |
| RL-F03    | **Diferencia confirmada y preservada**: Cloud conserva SELECT/CRUD amplios históricos de `service_role` sobre `accounts`; local tiene lectura por columnas. La migración de cuatro columnas no revoca los permisos Cloud anteriores.                                        | Seguimiento propio de grants, con inventario de consumidores antes de decidir una reducción. No es una revocación autorizada por 012.4.      | Matriz de permisos/consumidores y decisión explícita de conservar o reducir. Si se reduce: migración/espejo y regresiones funcionales. No ejecutar las negativas locales del test49 como si el baseline Cloud fuera idéntico.               |
| RL-F04    | **[NO VERIFICADO]**: contrastar la IP externa observada contra una segunda fuente independiente. Lo aprobado demuestra correlación con DB, bucket estable y resistencia a headers falsificados.                                                                             | Ampliación de evidencia de identidad de red; especialmente si cambia hosting, proxy o Cloudflare.                                            | Correlación controlada de orígenes de red conocidos con sus buckets, sin publicar IPs ni confiar en headers del cliente. No contratar servicios para este ensayo.                                                                           |
| RL-F05    | **Fuera de esta ejecución**: no se renovó aceptación funcional de todos los proveedores, callbacks de pago ni triggers de negocio. El webhook entrante Mercado Pago y la entrega saliente firmada son protocolos distintos.                                                 | Plan de aceptación correspondiente a cada integración; Mercado Pago conserva sus escenarios propios de Plan 011.                             | Pruebas específicas del protocolo y consumidor con evidencia fechada. Un PASS del endpoint cuenta o del worker saliente no certifica pagos, email, analytics u observabilidad completos.                                                    |
| RL-F06    | **Restricción operativa vigente**: la excepción WAF omite managed rules solo para GET/ruta/hosts exactos. Comparte regla con el worker porque el plan permite tres reglas custom. Las condiciones originales y protecciones globales se preservaron.                        | Al cambiar el deployment de prueba, dominios, secreto del worker o managed rules; incluir este inventario en 012.4.                          | Revisar grupos OR y hosts; actualizar los que correspondan con autorización, conservar autenticación del worker y comprobar diff/readback. Repetir HTTPS público sin bypass y las negativas de alcance. No desactivar WAF globalmente.      |
| RL-F07    | **Cerrado (integración Git)**: PR [#221](https://github.com/pipec80/iroko/pull/221) merged por squash en `3bac4f9b` el 2026-10-15; su contenido incluye código previo y evidencia Cloud. Las cuatro DB accidentales de `%SystemDrive%/` permanecen preservadas y excluidas. | No requiere retomarse. La selección de código está en `main`; mantener cualquier material accidental fuera del repositorio.                  | Evidencia: workflow `38752265343` completo; E2E 82 passed/2 skipped; `main` local/remoto en `3bac4f9b`, árbol limpio al verificar; no quedaron PR abiertos tras cerrar los Dependabot reemplazados. El siguiente frente es 012.4.           |
| NEXT-0124 | **Plan aprobado; implementación pendiente**: el Plan 012.4 concreta el trabajo de CSP/secretos desde PR4 del Plan 012. Existe alcance y aceptación documentados; todavía no es una ejecución terminada. El gate local de Sentry ya implementado no cierra todo 012.4.       | Siguiente frente del freeze, desde rama nueva basada en `main`.                                                                              | Implementar el inventario/decisiones de CSP, Vault, impersonación, secretos dedicados, protocolos de enlaces y consumidores Sentry/PostHog; ejecutar regresiones locales y aceptación Cloud posterior cuando corresponda y esté autorizada. |

Los seguimientos mantienen este registro como punto de entrada hasta que se
asignen a una ejecución concreta. Al retomarlos, crear o enlazar su plan/ticket
desde la fila correspondiente y cerrar únicamente con evidencia; no convertir
la fecha de este documento en una nueva verificación de proveedores.

NEXT-0124 ya cuenta con [plan ejecutable aprobado](../exec-plans/active/012-4-csp-and-secrets.md)
e [inventario estático](2026-10-14-plan-012-4-readiness.md), preparados el
2026-10-14. Ninguna casilla de implementación se cierra con esa documentación.
Los seguimientos RL-F01–RL-F06
mantienen sus propios límites y no se dan por corregidos al redactar 012.4.

## Límites de operación

- El usuario confirmó el 2026-10-14 que todos sus servicios usan planes
  gratuitos, sin pagos ni tarjetas asociadas. Es una declaración del usuario,
  no una auditoría independiente de billing. Comprobar capacidades, cuotas y
  retención antes de elegir herramientas; no introducir upgrades ni servicios
  pagados sin autorización.
- El Supabase local oficial es `saas-boilerplate`, definido por
  `supabase/config.toml`. No se necesita crear otro stack para retomar estos
  puntos; renovar identidad y estado antes de pruebas con efectos.
- Los fixtures de cuentas/claves y eventos de cuenta se limpiaron. Los eventos
  de IP real compartida se conservaron para TTL/mantenimiento; no se afirma
  limpieza global de buckets ni se borran eventos de otros consumidores.
- Robot y los otros frentes del freeze conservan sus propios estados. El
  candidato selectivo 012.3 no despliega por sí mismo todo el HEAD local.

## Referencias

- [Estado actual](../current-state.md).
- [Plan 012 padre y PR4](../exec-plans/active/012-security-hardening-and-pricing-truth.md).
- [Plan 012.3 y ejecución por etapas](../exec-plans/active/012-3-rate-limiting.md).
- [Ejecución Cloud y recuperación](2026-10-14-plan-012-3-cloud-execution.md).
