# Reparación de acceso/cuenta — ejecución17Nov2026

Rama: `codex/fix-access-account`. Base: `91840bad4931a60a06d346c811671b8af89473a7`.
Commit local de código: `7448aee108011268071e05df99e8da93a57b96e0`
(18archivos: fuente, SQL, tipos y pruebas).
[Plan](../exec-plans/active/2026-11-17-access-account-remediation.md) e
[informe inicial](2026-11-17-access-and-account-audit.md). Cambios documentales
previos preservados. Este registro distingue implementación de aceptación.

## Decisión MFA y rulings

Ruling: no activar recoveryCodes experimental del SDK — requiere soporte y
configuración del servidor no demostrados; conservar recuperación de aplicación
con APIs Auth estables evita introducir esa dependencia en este cambio.

Ruling: recuperar significa restablecer los TOTP verificados del caller y pedir
nuevo login. El servidor obtiene el token de sesión y valida ese token exacto
con getUser. Exige confirmación de `admin.signOut(token, 'global')` antes del
primer borrado; no usa el logout de usuario para ese ACK porque el SDK puede
filtrar errores401/403. No se atribuye revocación al borrado del factor: docs
y GoTrue presentan diferencias y el runtime actual no fue observado. El cierre
local posterior limpia cookies; si su respuesta falla, no pide reutilizar un
código ya completado. No se concede AAL2 artificialmente ni se exceptúa dashboard.
No se garantiza invalidación instantánea de access tokens ya emitidos.

Ruling: una autorización durable guarda el snapshot de factores y expira a15min.
La RPC `begin_mfa_recovery(code)` exige identidad y código propio, marca usado
y devuelve el mismo snapshot al reintentar una operación pendiente. No añade
factores nuevos al reintento. El servidor usa identidad validada por getUser;
la API administrativa recibe exclusivamente ese userId y los factores autorizados.
`complete_mfa_recovery(userId,recoveryId)` sólo permite service_role y cierra
la autorización. Los códigos completados no inician otra recuperación. Generar
otro lote se bloquea durante un reset vigente y no elimina snapshots pendientes,
incluso vencidos: una operación Auth en vuelo puede necesitar confirmación.

Ruling: tras nuevo login se conserva el next seguro, incluida la invitación;
sin next específico el destino es Seguridad. MFA sigue opcional en la oferta
general. No se simula continuidad con parámetros reenroll/next que nadie consume.
Los errores de generación usan claves traducidas de una whitelist; los mensajes
SQL desconocidos no se muestran al usuario.

Ruling: exigir AAL2 y TOTP verificado para generar códigos es requisito de esta
reparación, no una mejora opcional. La RPC anterior permitía generarlos en AAL1;
activar su uso para quitar MFA sin corregir ese límite introduciría un bypass.
La migración invalida los códigos anteriores porque no acreditan ese requisito.
El usuario de prueba deberá generar nuevos códigos tras TOTP. No se aplicó la
migración en Cloud; ese efecto debe figurar en su aprobación antes de aplicarla.

Ruling: usar dos columnas en la tabla existente, en vez de otro servicio/tabla
de sesiones. Los grants directos de códigos se revocan; la UI usa RPC propias.
Windows: migración manual y espejo `public.sql` en el mismo cambio. Tipos
actualizados para compilar; regeneración exacta y SQL real pendientes del runner
CI. No afirmar paridad del esquema ni aceptación sólo por el typecheck.

Ruling: conservar casos TDD y evidencia en el repo. El sondeo inicial sigue
fechado; los tests estables verifican cookies con sus opciones/cache headers,
identidad, código inválido, fallo parcial, retry y finalización del reset.

## Superficie implementada

- Cookies: `src/lib/supabase/middleware.ts` copia writes del SDK a cada redirect;
  no copia indiscriminadamente headers internos de Next. Guards conservados.
- MFA: `src/lib/auth/recover-mfa.ts`, acción Auth y navegación documental a login;
  mensajes localizados de reautenticación/reintento. Ningún código/token se loguea.
- SQL: `20261117180000_mfa_recovery_claims.sql`, espejo y test pgTAP focal18
  assertions declarado. Requiere migración compatible antes de app nueva.
- E2E: `mfa-recovery.spec.ts`, fixture local reutilizable por Actions; GoTrue
  real→código→UI recovery→login→contenido de cuenta visible tras reload; otra
  sesión anterior no renueva. Un TOTP nuevo permanece tras rechazar el código
  usado. Guard de destino Cloud sin override y cleanup propio.
  No se convierte este fixture local en un runner Cloud.

## Evidencia disponible

| Comprobación                                        | Resultado observado                                                                                                            |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Regresión cookies antes de corregir                 | 6FAIL/28PASS, exit1; seis redirects sin cookie                                                                                 |
| Cookies/proxy corregidos                            | 72/72PASS, exit0                                                                                                               |
| Helper MFA antes de crearlo                         | Import no resuelto, exit1; no tests ejecutados. El fallo funcional original procede del sondeo de auditoría, no de este import |
| Helper MFA implementado                             | 6/6PASS, exit0, SDK/RPC simulados                                                                                              |
| Lote Auth/helper/cookies/proxy                      | 120/120PASS, exit0                                                                                                             |
| Lote final Auth/cuenta/helper/cookies/proxy/retorno | 193/193PASS, seis archivos, exit0                                                                                              |
| Revisión independiente final                        | Apto para CI; casos P1/P2 de revisión corregidos en fuente, no aceptación SQL/browser/Cloud                                    |
| SQL/GoTrue/E2E real                                 | [NO VERIFICADO]; scripts escritos, no ejecutados aquí                                                                          |
| GitHub CI y despliegue candidato                    | [NO VERIFICADO]; no push/merge/deploy por esta ejecución                                                                       |

Checks finales: `pnpm typecheck` PASS; ESLint focal PASS sin errores/warnings;
formato/diff PASS. Commit local con hooks normales typecheck y lint-staged PASS,
sin bypass. No se repitió el conjunto global ni se ejecutaron proveedores.

Ejecución local serial, un worker y sin cobertura/build/Docker/browser. Memoria
libre al comenzar~5001MiB de16123. El heap del runner no limita memoria total.

## Alcance de cierre de esta ejecución

Implementación y controles de lógica preparados para CI. No se declara completo
el plan entero ni MVPv1. A-ACCESS-01 conserva aceptación funcional pendiente
de migración, tipos generados y GoTrue/Playwright del candidato. A-ACCESS-02
tiene corrección local de respuesta; Cloud separado. Los casos adicionales de
revisión pertenecen al mismo mecanismo, sin otra auditoría general o cola duplicada.

Revisión independiente: conservación de claims en rotación, revocación explícita,
errores reintentables/traducidos y E2E que distingue resultado de una URL.
Fuentes: [GoTrue v2.195.0](https://github.com/supabase/auth/blob/v2.195.0/internal/api/admin.go#L587-L611)
y SDK instalado; versión/runtime Cloud actual [NO VERIFICADO].

## Entrega y siguiente retorno

Lectura SSH con permisos adecuados confirmó main91840bad al cerrar el lote.
El fallo inicial en sandbox no acredita un problema de credenciales. Rama y
commits locales: sin push, PR ni CI del candidato. La autorización siguiente
es publicar rama/PR y ejecutar Actions; merge, migración/despliegue y pruebas
Cloud conservan su alcance propio. No se inicia lote3. El propietario pidió
terminar esta entrega y luego ordenar auditoría y reparación para reducir contexto.

Revisión independiente de seguridad/corrección y checks finales antes de preparar
publicación. Actualizar aquí su resultado, SHA/PR cuando existan y estado por ID.
No cerrar A-ACCESS-01 por mocks: SQL y recorrido real siguen siendo necesarios.
A-ACCESS-02 tiene evidencia local de respuesta; refresh real Cloud sigue separado.

Antes de cualquier escritura Cloud: presentar migración, invalidación de códigos
anteriores, candidato, fixture/cleanup y operación exacta para autorización.
Los runners locales y guards se conservan; entrypoint Cloud debe verificarse con
destino/revisión propios. No ejecutar el workflow financiero para probar Auth.
