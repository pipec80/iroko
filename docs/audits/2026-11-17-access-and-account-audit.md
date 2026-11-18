# Auditoría básica: acceso y cuenta de usuario

Fecha: 2026-11-17. Candidato: `main` en
`91840bad4931a60a06d346c811671b8af89473a7`, con cambios documentales previos
preservados. Auditoría de selección, uso y suficiencia; sin reparación de
producto, cambios SQL/configuración, instalaciones, envíos ni operaciones Cloud.

## Pregunta y respuesta

**¿La selección de Supabase Auth y datos de cuenta, integrada con Next.js,
resuelve el acceso y control de cuenta que Iroko ofrece actualmente?**

**Selección alineada e implementación real; suficiencia parcial.** Existen
consumidores de Auth, perfil, cuenta personal, equipos, sesiones y correo.
La evidencia local histórica demuestra recorridos concretos. Esta pasada
confirma dos defectos de composición: recuperación MFA sin acceso alcanzable
(P1 funcional) y cookies renovadas perdidas al redirigir (P2). No se acepta el
conjunto de acceso/cuenta al 100%; tampoco se concluye que todo Auth esté roto.
No se encontró un bypass nuevo en estas comprobaciones.

La respuesta esperada era una matriz que separase función elegida, consumidor,
resultado, suficiencia y evidencia pendiente. Esa matriz sigue abajo. Un test
existente, un SDK instalado o una plantilla configurada no son prueba de entrega
ni de configuración efectiva del proveedor.

## Alcance, autoridad y método

Se aplican [ADR0005](../adr/0005-replicable-saas-mvp-and-bounded-acceptance.md),
[estrategia](../architecture/product-strategy.md),
[protocolo](../quality/capability-audit-protocol.md) y contratos de AGENTS y
TESTING-PLAN. La preparación documental previa de este chat incluyó la tabla
000–017, comprensión de raíz/.superpowers y evaluación de skills; esos documentos
de trabajo no se convierten en evidencia funcional. Sus conclusiones de alcance
se incorporaron al protocolo. No se afirma haber leído cada línea de todos los
Markdown derivados ni auditado todos los módulos del repositorio.

Tres agentes revisaron en paralelo Auth/Next, datos/perfiles y correo/evidencia.
El integrador contrastó las dos causas con código y pruebas discriminantes;
una segunda lectura independiente con Astra corroboró causas y límites. Se usaron
Superpowers para ejecución/revisión/verificación, Supabase y buenas prácticas
Postgres para fuentes y límites, y guías Next/Auth como apoyo. Las instrucciones
de Iroko prevalecen: `src/proxy.ts`, ninguna creación de `middleware.ts`, ninguna
migración automática. No se instalaron skills ni se actualizó el stack.

Versiones locales inspeccionadas: Next16.4.6, React19.3.1,
supabase-js2.119.0, SSR0.12.7, Vitest4.1.12; Node24.18.0 y pnpm11.22.0.
Se consultaron guías oficiales y changelog el17Nov; una novedad opcional no
se convierte en requisito ni justifica actualizar dependencias por esta auditoría.

No se volvió a ejecutar016/017 ni se alteraron sus cierres históricos. Un defecto
actual descubierto después de su cierre requiere disposición actual; no cambia
retrospectivamente el escenario que aquellos documentos demostraron. Billing
mantiene011 y comercialización013. SSO empresarial, proveedores adicionales,
IoT/Robot y editor diferidos no son faltantes de este lote. Storage/Realtime
completos, diseño visual y seguridad web ampliada quedan fuera; sí se revisan
los límites Next y datos necesarios para el recorrido de identidad.

## Matriz de selección, uso y suficiencia

«Sí implementado» describe código. «Local histórico» conserva fecha/candidato
de su fuente. `[NO VERIFICADO]` identifica runtime o proveedor no observado hoy.
Las filas no tienen peso equivalente: no se calcula un porcentaje de avance.

| Capacidad disponible / selección Iroko                               | Consumidor y límite efectivo                                                                                             | Resultado y suficiencia actual                                                                                              | Evidencia / siguiente comprobación necesaria                                                                                                                 |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Email/password, confirmar y reenviar: necesaria                      | `(auth)/actions.ts`, `auth/click`, `auth/confirm`; GoTrue emite/consume OTP y Next gestiona retorno/cookies              | Sí implementado; registro/confirmación local histórico. Suficiencia del conjunto limitada por refresh+redirect              | 015,10Nov: Mailpit→confirmación→onboarding→dashboard. SMTP y entrega Cloud actuales [NO VERIFICADO]                                                          |
| Login/logout y retorno seguro: necesaria                             | Acciones Auth; POST `auth/logout/route.ts`; `src/lib/auth/safe-redirect.ts`; clientes browser/server separados           | Sí implementado; contratos focales actuales PASS. No prueba todo el recorrido en navegador                                  | Lote unit199/199 abajo. No atribuirle aceptación de cada callback externo                                                                                    |
| Magic link: seleccionada                                             | `signInWithOtp`, `shouldCreateUser:false`; plantilla `magic_link.html` y confirmación OTP                                | Sí consumidor; resultado runtime específico [NO VERIFICADO]                                                                 | Auth/QA: un enlace local recibido/consumido y token inválido/reusado rechazado si se requiere cerrar esta fila                                               |
| Recuperación de contraseña: seleccionada                             | `resetPasswordForEmail`, `recovery.html`, confirmación tipo recovery y `updateUser` en reset-password                    | Sí implementado; diferente de recuperar MFA. Runtime específico actual [NO VERIFICADO] en este lote                         | Existe `recovery.spec.ts`; su existencia no es PASS. Reusar artefacto equivalente o focalizar un recorrido Mailpit                                           |
| Google OAuth/PKCE: seleccionada                                      | Botón Google, acción `signInWithOAuth`, callback con intercambio de code; configuración local declarada                  | Sí consumidor; proveedor/allowlist e ingreso Google real [NO VERIFICADO]                                                    | Auth/operación: callback positivo con cuenta de prueba en destino identificado; no sumar proveedores por catálogo                                            |
| SSO empresarial, teléfono y otros proveedores: no seleccionados aquí | Que existan opciones/plantillas del proveedor no crea una oferta Iroko                                                   | No aplica como deuda automática                                                                                             | Volver sólo ante una necesidad aceptada; no se habilitaron ni contrataron productos                                                                          |
| TOTP: seleccionada                                                   | `mfa-setup.tsx`, desafío/verify en acciones; hook deriva `mfa_enrolled`; guard AAL en proxy                              | Sí implementado; password/MFA/invitación tiene evidencia local016. No certifica AAL2 en toda API/RLS                        | Conservar guard. La recuperación ofrecida en la fila siguiente impide aceptar toda seguridad de cuenta                                                       |
| Códigos de recuperación MFA: ofrecidos por Iroko                     | RPC de aplicación `consume_recovery_code`, acción y enlace `reenroll=1`                                                  | **No suficiente: A-ACCESS-01 P1**, código válido aceptado pero destino vuelve a desafío MFA en composición local            | Reproducción de contrato abajo; GoTrue/navegador [NO VERIFICADO]. Auth/seguridad: resolver antes de aceptar recuperación sin dispositivo                     |
| SSR/refresco/cookies: necesaria                                      | `src/lib/supabase/{client,server,middleware}.ts`, `src/proxy.ts`                                                         | **Parcial: A-ACCESS-02 P2**, cookies presentes en respuesta normal y ausentes en dos redirects probados                     | Reparar propagación en respuestas alternativas y comprobar refresh real tras recarga; no hay prueba de fuga de caché                                         |
| Perfil separado de Auth: necesaria                                   | Trigger `auth.users`→`private.handle_new_user`→`public.profiles`; FK Auth con cascade; `update_my_profile` filtra caller | Sí implementado, sin duplicar credenciales. **DB-01 P2 existente**: columnas internas propias aún modificables directamente | 016,12Nov: probe autenticado5/5; ajeno denegado, sin escalada de membresía/admin. Sin nuevo ID por la misma causa                                            |
| Cuenta personal y onboarding: necesaria / wizard opcional            | Trigger de perfil crea cuenta personal y owner; RPC de onboarding, acciones con refresh y omisión                        | Sí implementado; evidencia local015. Cookies en redirect afectan también este recorrido                                     | No reabrir cuotas/concurrencia reparadas. Error de refresh ignorado en una acción es hipótesis pendiente, no tercer defecto confirmado                       |
| Equipos, membresías y cuenta activa: seleccionada                    | `switch_account`, hook y `get_my_account_role`; RLS/RPC comprueban membership vigente, no sólo claim de UI               | Sí implementado; suficiencia básica estructural con evidencia histórica SQL/016                                             | No nueva ejecución SQL ni prueba exhaustiva de autorización hoy. Revocación con token anterior sigue su contrato específico                                  |
| Listar/revocar sesiones y cerrar otras: seleccionada                 | `list_my_sessions`, `revoke_my_session`, acciones y `sessions-tab`                                                       | Sí implementado; browser016,12Nov8/8 histórico. Borrar sesión no promete invalidar instantáneamente todo JWT                | Cloud actual [NO VERIFICADO]. No extrapolar FOLLOW-TTL de impersonación a cada sesión                                                                        |
| Exportar/eliminar cuenta: seleccionada                               | `gdpr.sql` export caller, bloqueo único owner, soft-delete y borrado de filas de sesión; purga90d programada             | Sí implementación; runtime actual/purga90d [NO VERIFICADO]                                                                  | No afirmar borrado físico inmediato ni invalidación instantánea de bearer. Datos/Auth: comprobar recurso sensible sólo si el contrato exige cierre inmediato |
| Correos de cuenta y bienvenida: seleccionados según productor        | Tres circuitos distintos descritos abajo                                                                                 | Sí implementación; correo sencillo útil basta. No está probado todo envío actual                                            | Separar confirmación, bienvenida, invitación y worker; dominio pendiente limita destinatarios externos afectados, no el circuito local completo              |

Ubicaciones en la tabla son rutas relativas al repositorio. El inventario estable
sigue en [capabilities](../capabilities.md); esta tabla es evidencia fechada de
ese inventario, no otra lista independiente de pendientes.

## Hallazgos confirmados y disposición

Dueños asignados y deduplicación realizada antes del alta en el
[registro central](../exec-plans/active/freeze-remediation-register.csv).
Los IDs nuevos representan causas distintas; sus estados abiertos no reparan
ni reabren automáticamente familias históricas. Este informe posee el detalle
del lote, y el registro posee el estado de remediación.

### A-ACCESS-01 — recuperación MFA no permite recuperar el acceso

**P1 funcional; dueño Auth/seguridad. Confirmado en composición local, certeza
alta del defecto de lógica; recorrido GoTrue/browser aún [NO VERIFICADO].**

La UI ofrece acceder si se pierde el dispositivo (`messages/es.json:104,213`).
`src/app/[locale]/(auth)/actions.ts:369-400` acepta el resultado verdadero de
`consume_recovery_code` y redirige a cuenta con `reenroll=1`. La función SQL
(`supabase/schemas/public.sql:249-272`) sólo marca `used_at`; no cambia AAL ni
factores. El hook mantiene `mfa_enrolled` por factor verificado (:344-353).
El guard (`src/lib/supabase/middleware.ts:136-143`) devuelve AAL1+MFA a login.
No se encontró consumidor del parámetro que complete el re-enrolamiento.

Esperado: un código válido permite un recorrido de recuperación seguro y
alcanzable. Observado con acción y guard reales, RPC/claims simulados:
`/es/dashboard/account?tab=security&reenroll=1` termina en
`/es/login?tab=security&reenroll=1&mfa=required`. No se ejecutó la RPC en DB;
su efecto de consumo se establece por lectura SQL, no por el mock. Se demuestra
incompatibilidad de los componentes, no consumo real de un código Cloud.

La revisión inicial Auth propuso P2 estático; la integración asigna P1 por el
bloqueo del recorrido explícitamente ofrecido al perder TOTP, corroborado por
la segunda lectura de datos y la prueba discriminante. No es una escalada
de permisos demostrada. N-18/017-R03 corresponden a enrolamiento tardío/reintento,
no a este recorrido. La recuperación de contraseña tampoco lo sustituye.

Retorno: antes de aceptar seguridad de cuenta/recuperación. Criterio de reparación:
fixture propio con factor verificado, sesión nueva AAL1 y código válido alcanza
recuperación durable tras recarga; código malo/reusado falla, TOTP normal funciona,
y no se debilitan guard ni RLS. Diseñar el mecanismo dentro del contrato Auth;
no basta con retirar la redirección del test o conceder AAL2 mediante un claim
editable. Producto sin modificar en esta entrega.

### A-ACCESS-02 — cookies renovadas perdidas en redirecciones

**P2; dueño Auth/Next. Confirmado en respuesta local; impacto de sesión en
navegador real pendiente.**

`setAll` guarda cookies y headers de refresh en `supabaseResponse`
(`src/lib/supabase/middleware.ts:83-92`). Varias ramas retornan otra respuesta
`NextResponse.redirect` sin copiarlas (:120-226). `src/proxy.ts:279-280` devuelve
el redirect; la copia normal :282-283 no se ejecuta para él.

Esperado: una renovación conserva cookies al devolver la respuesta al navegador.
Observado: pass-through mantiene `audit-session=refreshed`; redirect a onboarding
y redirect desde login autenticado tienen ubicación correcta pero cookie ausente.
El control usa el callback `setAll` del adaptador real con SDK simulado; no
demuestra frecuencia de refresh ni una caída de sesión GoTrue en producción.
La [guía SSR oficial](https://supabase.com/docs/guides/auth/server-side/creating-a-client?framework=nextjs&queryGroups=framework)
exige transferir cookies/headers al sustituir la respuesta. El guard no-store
del proxy permanece: **no se deduce fuga de caché entre usuarios**.

Retorno: próximo cambio de sesión/proxy o antes de aceptar persistencia de
sesión del recorrido. Preservar cookies con opciones y headers pertinentes en
todas las respuestas alternativas; probar controles normales y redirects sin
abrir rutas protegidas. Los mocks de los tests existentes no ejercitan `setAll`:
su PASS no contradice este fallo. No se halló un alias exacto de esta causa
entre los casos de caché/identidad ya registrados.

### Deuda existente y evidencia faltante

DB-01 conserva P2 y su dueño/retorno histórico; no se añade otro hallazgo por
UPDATE de columnas internas propias. Grants efectivos requieren leer revokes
finales, además de declaraciones iniciales: no se presenta como vigente un
grant ya retirado. No se confirmó otro P0/P1 en el alcance revisado.

Google real, magic link consumido, doble confirmación de cambio de email,
recepción de bienvenida y SMTP Cloud actual quedan [NO VERIFICADO] donde no
se identificó evidencia específica. Son faltantes de evidencia, no cinco
defectos confirmados ni una exigencia de comprar servicios. La
[guía de usuarios](https://supabase.com/docs/guides/auth/managing-user-data)
recuerda que borrar una identidad no invalida antes de expirar el JWT emitido;
los comentarios sobre revocar sesiones no se amplían a esa garantía.

## Qué correo tenemos realmente

| Circuito        | Productor/transporte/template                                                                                       | Evidencia útil y límite                                                                                                                                                          |
| --------------- | ------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Auth            | GoTrue, SMTP local Mailpit, HTML en `supabase/templates/`; signup, magic link, recovery y email change              | Confirmación local015 reutilizable. SMTP Resend/hook en config local están comentados: no prueban configuración Cloud                                                            |
| Aplicación Next | `src/lib/email/index.tsx`: HTTP Mailpit si `MAILPIT_URL`, o SDK Resend; React Email welcome/invitation/notification | Bienvenida tras signup confirmado; invitación de equipo inline con conteo de fallos. Unit focales actuales cubren contratos, no recepción humana                                 |
| Cola asíncrona  | Alerta admin→RPC→pgmq/cron→Edge `process-email-queue`, API Resend y HTML del mensaje                                | 016,12Nov: entrega de prueba, rechazos, archive tras readcount5 y alerta/fallo/recuperación. No usa automáticamente el transporte Mailpit ni los templates React del módulo Next |

La plantilla GoTrue `invite.html` existe; no se localizó un productor
`inviteUserByEmail` de producto. La invitación de equipo es del circuito Next.
Notificaciones in-app no implican email: éste requiere `emailDelivery`; el
consumidor localizado de activación billing sólo se inventarió, sin auditar pagos.
El cron/worker sano tampoco certifica que Auth envíe correctamente su OTP.

Free/free-tier es declaración del propietario, no auditoría de cuota/cuenta.
No se verificaron credenciales, consumos, dominio ni DNS. La falta de dominio
no impide Mailpit ni explica los dos defectos de lógica descubiertos.

## Validación ejecutada y evidencia reutilizada

- **Fresca local:** ocho archivos Vitest, **199/199 PASS**, exit0, un worker,
  sin cobertura; Auth actions, middleware, proxy, safe redirect, validación
  Auth/perfil y envío/templates de email. Se usó Node directo sobre el runner
  instalado para evitar instalaciones o hooks adicionales.
- **Sondeo discriminante:** cinco casos, **2 controles PASS y3 FAIL**, exit1:
  dos fallos de cookies de una misma causa y uno de recuperación MFA. Se
  conservaron assertions y producto sin cambios; no se convierte RED en PASS.
- **Histórica reutilizada:** [015,10Nov](../quality/reusable-foundation-evidence.md)
  para signup/confirmación/onboarding y reutilización local;
  [016,12Nov y continuaciones](2026-11-12-nextjs-supabase-code-review.md)
  para sus escenarios de sesiones, MFA/invitación, SQL y worker. Reuso documental
  delimitado; no comparación exhaustiva de todos los hashes de aquellos candidatos
  ni certificación fresca del runtime actual.

Comandos, resultados, fixture sintético y límites están en el
[anexo reproducible](2026-11-17-access-and-account-evidence.md). El primer intento
de sondeo heredó por error el include general de Vitest y fue detenido después
de un archivo ajeno; no se cuenta como prueba de este lote. Se sustituyó por
config independiente y se verificó selección de cinco casos antes del run válido.

No hubo build, suite global, SQL, Docker, browser, llamadas a proveedores ni
envíos. No se usaron secretos. Esos límites no se ocultan tras los199 PASS.

## Orden de continuación

1. Auth/seguridad: resolver A-ACCESS-01 y demostrar recuperación real conservando
   controles negativos; es el bloqueo de mayor impacto del lote.
2. Auth/Next: resolver A-ACCESS-02 con propagación correcta y navegación real
   bajo refresh. Ambos se pueden tratar en un cambio acotado de acceso/cuenta,
   con aceptación independiente por causa; esta auditoría no implementa ese cambio.
3. Auth/operación: cerrar sólo la evidencia faltante necesaria del recorrido
   ofrecido, primero local y después Cloud si se pretende aceptarlo allí.
   Configuración/ingreso Google y SMTP se verifican en el destino pertinente.
4. Continuar la matriz por datos/autorización y luego Storage/Realtime/worker;
   mantener aceptación financiera en011 y los bloques frontend posteriores.

La hipótesis Supabase-first queda apoyada para esta selección: Iroko usa Auth y
Postgres con consumidores concretos. Su suficiencia funcional integral aún no
queda demostrada. No hace falta agregar más productos de Supabase para corregir
estos dos problemas; hace falta completar y probar la integración seleccionada.
