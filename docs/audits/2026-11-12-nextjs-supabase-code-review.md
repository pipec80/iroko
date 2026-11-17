# Plan016 — candidato y veredicto integrado parcial, 2026-11-12

## Veredicto final enmendado — 2026-11-17

**Núcleo técnico016 aceptado y plan completado en su alcance acordado.**
El propietario aprobó mantener billing/precios/checkout y separar las pruebas
profundas de pasarelas en011. La enmienda ADR0005 sustituye expresamente el
gate PSP dentro016; no afirma que el ingreso oficial actual haya sido probado.
015-OPERATIONS conserva su evidencia ya aceptada y transfiere sólo el residuo
PSP a011; RL-F05 permanece pendiente allí. FREEZE-VALIDATION y RS-09 quedan
dispuestos por alcance y subfilas, sin PASS global de hardening/proveedores.
125IDs/20DB/16N y alias se conservan.

Se reutilizan fuentes del núcleo entregadas en916b525 y CI43984737759 completo
PASS; PR258/259 conservan despliegue automático exacto READY. Este cambio es
documental: no hay delta de aplicación, dependencias, SQL ni oferta efectiva.
Los controles reales worker/Storage/FOLLOW-TTL preservan sus resultados y límites,
incluido exit1 del harness con cierre posterior confirmado y cleanup0.

Readback programado44073438546 (17Nov11:22:29Z, event=schedule,916b525):
Production Smoke Tests134005200075, Email Worker Health134005200606 y
Database Advisors134005200531 PASS. Cierra el seguimiento del caller nightly;
no extrapolar a certificación global Sentry/WAF ni borrar el429 automatizado.

Pendientes: aceptación operativa PSP/011 con propietario+billing, sesión visual,
cuentas vendedor/comprador propias, sandbox/cuotas y escenarios acordados.
No se ejecutan pagos, notificaciones o pruebas nuevas ahora.013 requiere decisión
comercial posterior. QA conserva harness antes de próximo uso y N-27 ante
recurrencia; Datos/Auth conserva DB-01 ante cambios de lifecycle/grants o promesa
de inmutabilidad. Condicionales RL-F02/04/06 y N-15 conservan sus retornos.
Los resultados anteriores «parcial/abierto» siguen siendo checkpoints históricos.

Revisión documental independiente scope_closure_final_review favorable: sin P0/P1; verificó125IDs,20DB,16N/alias y recepción011. Se corrigió el P2 de orientación obsoleta en la tabla vigente y los índices, con checker documental y lectura focal. La revisión no acepta operaciones PSP/Cloud nuevas, Sentry/WAF universal o distribución comercial; esos límites y responsables quedan explícitos. Manifiesto y entrega se verifican por el ejecutor antes de integrar.

**Veredicto: parcial;016 permanece abierto.** Reparación local de cuota de equipos
demostrada RED→GREEN. No se acepta el MVP integrado: hay gates obligatorios
sin evidencia suficiente. La diferencia de dos migraciones Cloud quedó resuelta
con autorización específica y readback; el ensayo real del worker también pasó
(continuación al final). No se reabren T0/T1 históricos ni017. Al checkpoint12/11
no hubo reset, restauración, push, merge, deploy ni pago. Las escrituras externas
de aquel checkpoint fueron las dos migraciones y fixtures propios del worker;
la contención/rotación autorizada del13/11 se detalla abajo.

## Resultado vigente de la continuación

### Readback de entrega — 2026-11-16,23:57Z

PR258 MERGED a23:53:17Z; main8f13892fec103371b142a422ea69601725d5e7db.
Árbol idéntico a f196191: b633a926f94aafc4b359a51ff70f159f1b95aee5.
CI43949809330 todos los gates PASS (unit156archivos1756PASS/1skip,
cobertura91.25/84.79/96.23/93.73), Docs43949809340 y CodeQL43949809318 PASS.
Chromium90PASS/2skip y WebKit16PASS/1skip, sin flaky reportado en los resúmenes;
se conservan las disposiciones previas de los skips Cloud y unitario.
Vercel production dpl_8dxkjiiVYsh4ifhNC4jt9x8u6gqG READY del SHA exacto;
ningún deploy manual. Repo/Cloud180migraciones, última20261112173000.
0subagentes activos y0procesos remanentes propios; checkout entregado limpio.

Al integrar, GitHub marcó automáticamente alerta135 `fixed` a23:53:23Z,
sin dismiss y con first_patched_version null. No inferir release upstream
reparada ni retirar el parche local.0PRDependabot pendientes. La aceptación
runtime118fedf se reutiliza porque los cambios entregados son docs/workflow/test,
sin diferencias de aplicación, SQL o protocolo MP; no se ejecuta otra hora TTL.

Veredicto sigue parcial: único gate obligatorio pendiente, recepción oficial
autenticada Mercado Pago actual. Reenvío autorizado sin pago aún no ejecutado;
la conexión MCP rechaza OAuth y el panel integrado pide login del propietario.
El smoke nocturno reparado conserva retorno P2 al próximo cron, sin pase runtime
por CI ni certificación global Sentry/WAF. Los checkpoints previos se conservan.
Decisión posterior explícita del propietario: login/reenvío se hará después;
dejar el gate pendiente. Dueño billing/propietario, retorno con sesión lista
para la única notificación oficial autorizada, sin compra.016 permanece activo.

### Reparación focal del monitor nocturno — 2026-11-16

Lectura del nightly43848678892 (candidato5f68684): Email Worker Health
133235304593 PASS y Database Advisors PASS; Production Smoke133235304622
falló antes de los casos con `cloud_protection_requires_canonical_origin`.
El SITE_URL secreto no coincide exactamente con el origen permitido; su valor
no se recuperó y no se atribuye el fallo a una barra final ni a otra forma concreta.
El guard cerró correctamente: no demuestra caída o defecto del producto.

Reparación local mínima en nightly.yml: preflight y navegador usan el origen
MVP canónico literal; curl no sigue redirects y sólo envía el header de bypass,
sin setter de cookie. Este último usa redirect/Set-Cookie y corresponde al
bootstrap separado del navegador, que conserva guards/capturas y su contrato.
No se recomienda desactivar WAF. Otros jobs y secretos permanecen intactos.
Regresión de argumentos reales del workflow RED3→GREEN3; revisión independiente
focal favorable sin P0/P1 nuevo. No se ejecuta un smoke Cloud adicional con
envío Sentry: su resultado runtime tras esta reparación sigue [NO VERIFICADO],
P2 QA/operaciones con retorno en la próxima ejecución programada, sin inventar
un gate universal adicional al alcance016 ya observado.
[Comportamiento oficial del setter](https://vercel.com/docs/deployment-protection/methods-to-bypass-deployment-protection/protection-bypass-automation#advanced-configuration).

La consolidación se entrega en [PR258](https://github.com/pipec80/iroko/pull/258).
Los cambios posteriores a118fedf son documentación, workflow de monitorización
y su regresión: no cambian aplicación, SQL ni el protocolo MP. Se reutilizan
las observaciones Cloud del candidato118fedf con ese límite; no se repite TTL
por el cambio de SHA documental/CI.

### Resultado final FOLLOW-TTL — 2026-11-16

**Gate aceptado por evidencia observada, con diagnóstico P2 del runner.**
Ensayo636c3511 sobre main118fedf: cap SQL30m y navegación/cookies PASS a
19:36:52Z; bearer original todavía200 sólo target antes de su exp20:06:33Z.
Después de exp+tolerancia, el mismo bearer dio401 con razón de expiración a
20:07:15.870Z; control fresco del mismo target200 sólo su perfil, antes de
borrar fixtures. Cleanup0 de usuarios/perfiles/cuentas/miembros/grants/sesiones/
factores/impersonaciones, auditoría inmutable264/265 preservada.

Se conserva el **exit1 real** del supervisor2e4876b4 a20:07:20Z y la única
falla `BROWSER_RELEASE_UNCONFIRMED`: el timeout15s dejó un resultado inmutable,
aunque BrowserServer registró kill/close tardíos exitosos19:37:13Z. Windows
confirmó ausencia del PID propio30064 y sus hijos directos a19:39:32Z y de
nuevo al postflight; observador27360 y watchdog32232 también ausentes. No se
reescribió el ledger ni se convirtió el proceso en exit0. Disposición P2 QA:
reconciliar confirmación tardía antes del próximo uso del harness; no exige
otro ensayo Cloud ni modifica el contrato de seguridad observado.

Demora del observador verificada20:06:20.2555882Z→20:07:15.0176979Z,
NtResumeProcess0 y watchdog independiente listo. Relojes/TTL/JWT/app intactos;
la prueba demuestra rechazo natural después de exp+tolerancia, no exactamente
en exp ni revocación inmediata por cierre web. La revisión independiente
aprobó este método alternativo condicionado a los resultados ahora observados.
Evidencia privada saneada: ledger636c3511, supervisor2e4876b4,
ttl-browser-release-20261116.json y ttl-observer-delay-20261116.json.

**016 sigue parcial únicamente por corroboración actual del ingreso oficial
autenticado Mercado Pago**, ya autorizada sin pago y pendiente de acceso al
panel/OAuth. Readback20:07Z muestra21eventos: el nuevo975 es reconciliación
programada del pending de MP-01 a20:00:01Z, no callback entrante. No sustituye
ese gate ni certifica recuperación financiera. Se conservan5intents.

### Renovación del candidato — 2026-11-16

PR252 integrado en `118fedfe57bdbc17f23d7d2a7aca9fe407d61c11` tras
CI43914308776 verde, incluidos build, Chromium y WebKit. Producción
`dpl_573cBiowDKQfCdL4DHknDsRWPTRM` READY del mismo SHA. Se conserva la
preparación documental pendiente y el material ignorado de015. No se repite T1.
El ajuste del fixture de selección válida de archivos conserva negativas,
persistencia, bytes y cleanup; no demuestra una causa de hidratación del producto.
Next/analyzer/eslint16.4.6, Sentry10.78.0, next-intl4.15.1, Playwright1.65.0 y
Prettier3.10.1 quedaron integrados con override efectivo de Next comprobado en CI.
PR253–257 quedan supersedidos; alerta135 deepmerge conserva mitigación local,
sin versión upstream reparada ni cierre fingido.

CI automático de main43932958196 también PASS: Unit155archivos1753PASS/1skip,
cobertura91.25/84.75/96.23/93.73; SQL59archivos1192asserts PASS;
Chromium90PASS/2skip y WebKit16PASS/1skip, sin flaky reportado en sus resúmenes.
Build, Quality, DBtypes, Edge, auditoría de dependencias y Gitleaks PASS.
El árbol del candidato ae1377b y main118fedf es idéntico
(`71229d188b276c93bf3465323481554fec784d86`); no se renuevan pruebas por
copiar conteos históricos ni se interpretan skips como casos aceptados.
Los dos skips Chromium corresponden a MP Cloud (requiere workflow manual
protegido) y envío real al túnel Sentry (Cloud-only); WebKit smoke omite este
último. MP-01 tiene su run autorizado separado. El skip unitario de discovery
permanece explícito, sin convertirlo en certificación del worker financiero.

MP-01 **PASS sólo para apertura del checkout alojado**, run43933678786 sobre
ese candidato. El escenario se detuvo antes de login/pago del proveedor. Readback:
5intents totales,1nuevo desde18:53Z,20eventos y5suscripciones; el total de
suscripciones no prueba una compra de este ensayo. Artefactos publicados:0.
La reparación del parser distingue el `hashed_token` HTTP plano de la envoltura
del SDK;41tests focales PASS. No certifica compra, callback ni worker financiero.

El ensayo TTL del13/11 se interrumpió después del cap web: se conserva su
resultado SQL/cookies y auditoría229/230. El16/11 se verificó cleanup0 de sus
fixtures; borrar usuarios no prueba expiración natural del bearer anterior.
Nuevo ensayo autorizado sobre118fedf con exactamente dos usuarios propios,
MFA real y acceso RLS200 sólo al objetivo: **en curso**, sin PASS anticipado.
SQL inicia18:54:33.7516Z y expira19:24:33.7516Z; JWT original expira19:54:34Z
(lifetime3600s). Ledger privado sanitizado
`plan016-ttl-a229f7d0-ff97-45bb-b0a8-81608555e338.json`; supervisión persistente,
credenciales sólo en memoria/stdin y navegador Edge existente157.0.4341.60.
Resultado posterior19:00:27Z: supervisor terminó exit1 por
`EVIDENCE_WRITE_FAILED`, seguido de `INTERRUPTED`; no se registró el errno y
no se atribuye una causa todavía. Cleanup0 de usuarios/perfiles/cuentas/miembros/
grants/sesiones/factores/impersonaciones; auditoría246/248 preservada.
Liberación del navegador no confirmada dentro del timeout. No se alcanzó cap web
ni expiración natural. FOLLOW-TTL sigue **[NO VERIFICADO]** y016 parcial.

La reproducción local Windows con lector sin permiso Delete confirmó que un
lock de lectura provoca `EPERM/rename`, sin corromper el snapshot anterior.
No demuestra el errno del intento a229, que no se registró. Reparación acotada
del escritor: hasta5intentos de rename sólo para EACCES/EPERM/EBUSY,185ms de
espera máxima, flush y reemplazo atómico preservados; diagnóstico saneado.
Regresión lifecycle/supervisor12/12 PASS. Nuevo ensayo636c3511 autorizado en
curso con supervisor2e4876b4, separado del fracaso anterior; no anticipar PASS.

Corrección del método de observación: PostgREST documenta30s de tolerancia para
`exp`; el sondeo previsto a exp+5s era prematuro. Se programó una demora sólo
del observador propio27360, con identidad/creationtime comprobados, handle propio,
resume en finally y watchdog independiente32232 listo:20:06:20Z→20:07:15Z.
Self-test nativo con proceso desechable propio PASS. No se alteran reloj, TTL,
JWT, configuración, aplicación ni datos. La revisión independiente admite este
ajuste transparente; sólo probará rechazo después de exp+tolerancia, nunca el
borde exacto. [Contrato temporal oficial](https://docs.postgrest.org/en/stable/references/auth.html#time-based-claims-validation).

Revisión independiente final de integración/evidencia: sin nuevo P0/P1 ofrecido
confirmado;125IDs sin pérdidas/duplicados,20DB y16N conservados. Gates finitos:
FOLLOW-TTL natural/control fresco/cleanup y recepción autenticada oficial MP
actual. No exige repetir toda011 ni inventa Cloud Storage TTL/RL-F02/04 universal.
El propietario autorizó una notificación oficial sin pago; MCP historia rechaza
OAuth y el panel requiere sesión, pendiente de acceso del propietario.

### Entrega Git y CI — 2026-11-13

**Resultado posterior vigente:** PR251 MERGED en5f686841 a20:11:09Z,
CI43495317730 ALL GREEN: Unit155archivos1745PASS/1skip, SQL59/1192,
WebKit16PASS, Chromium89PASS/2skip/1flaky, confinados21/8/7 sin flaky y
Build PASS. Vercel dpl_3arqTZmHCJ7nh9sUTQgapPWLbyk4 READY exactmain.
El flaky logo falla habilitación inicial antes de upload (uploads-016:38),
retry PASS; P2 QA alias N-27, sin defecto P0/P1 producto confirmado ni causa
demostrada. Dueño QA/Next; retorno si recurre/cambia fixture, prueba focal
con readiness observable; no exige repetir suites válidas ni oculta el flaky.

Contención S-016.CLOUD-TRACE **resuelta** después de READY, según readback
privado rotation-revoked.json: vieja clave Supabase ausente y401, sustituta200;
bypass anterior ausente/nuevo presente vía API, conjuntos de otros IDs preservados.
Endpoint público responde404 tanto anónimo como con antiguo/nuevo: no prueba
rechazo diferencial del bypass, ni certifica WAF. RL-F06 conserva ese límite
condicional, sin cambios WAF. No se comprobó acceso por terceros al artefacto.

FOLLOW-TTL Cloud autorizado **en curso**: SQL T0 20:15:05Z, sesión exp20:45:05Z,
JWTexp21:15:06Z, lifetime3600; primer RLS200 sólo target. No hay PASS ni cleanup
final todavía. MP01retry autorizado43500143734 corre sobre main sin pago;
no anticipar resultado ni aceptación checkout/callback.016 permanece parcial.

El siguiente checkpoint de preparación conserva los intentos previos y queda
supersedido por el resultado posterior sólo en las superficies recién enumeradas.

PR251: commits72cc609 y cce9e3a. En CI43493924001 pasan SQL59archivos/1192asserts,
tipos DB, Edge, Quality, Gitleaks, Docs y CodeQL. Unit155archivos,
1745PASS/1skip; cobertura91.25/84.79/96.23/93.73. El primer fallo de formato se
corrigió con el ignore-path documental de CI. Gitleaks confundió el SHA real
5dd46f9 con una clave en CSV; excepción exacta SHA+archivo, sin excluir secretos.
WebKit falló antes de ejecutar los casos: runner ubuntu-latest pasó a26.04 y
la caché Linux conservaba un binario24.04 que exige libicudata.so.74. Reparación
acotada: job WebKit fijado en24.04 y caché separada por distro/arquitectura.
No cambia paquetes ni versiones; retest CI de esa reparación aún pendiente.
Estos resultados no acreditan merge, main READY ni revocación de credenciales.

### Incidente P1 confirmado — 2026-11-13

Registro único `S-016.CLOUD-TRACE`, dueño ejecución016/operaciones, **abierto en
este checkpoint previo; contención resuelta en actualización posterior arriba**.
La revisión independiente detectó que tracing de Playwright incluía los headers
de contextos API y que el workflow MP Cloud publicaba el informe HTML completo.
El scan privado del artefacto13999499918, run43343240727/job131616364223,
confirmó credenciales privilegiadas Supabase y bypass Vercel sin redactar:
6headers apikey,6Authorization y6bypass;12ocurrencias de secretos opacos,0JWT.
No se imprimieron valores ni se comprobó acceso por terceros.

El artefacto fue eliminado y la consulta posterior confirmó ausencia0. Es
contención parcial. La rotación fue explícitamente autorizada y su **preparación
se completó el13/11**: clave sustituta validada con RPC200, GitHub production
actualizado, bypass GitHub repo/production actualizado y Vercel production/preview
actualizado. Las credenciales anteriores aún no fueron revocadas. Evidencia
local privada sin valores: `rotation-prepared.json`; clave local y otro bypass
ajeno preservados. Reparación de captura/publicación preparada con33tests focales
PASS, lint0errores/5warnings y tsc0 final;
revisión final de captura favorable tras corregir loopback. Retorno obligatorio: concluir reparación/revisión,
entregar Git y esperar deploy automático READY con sustitutas, revocar
las anteriores y verificar salud. No revocar antes de READY ni repetir MP Cloud
antes de completar la contención. La reparación local del cliente Node no
deshabilita por sí sola las trazas de contextos API.016 y el incidente siguen
abiertos; borrar el artefacto no certifica revocación ni cierre.

Bootstrap real canónico posterior: tanto bypass anterior como sustituto devuelven
307 al locale de la app sin cookie `_vercel_jwt`. La excepción mínima revisada
admite ausencia de esa cookie sólo con307 y `Location` exactamente `/es`, `/en`,
`/pt` o `/fr`; persiste cookies/origins vacíos, descartando locale y autenticación.
Otros redirects o401/429 siguen rechazados y el request con secreto nunca sigue
redirects.33tests focales PASS; browser real home1/1 PASS y archivo de estado
eliminado por teardown. Inventario actualizado1220rutas con hashes por contenido,
sin otra auditoría exhaustiva. Esto
no certifica eficacia WAF/bypass ni sustituye comprobaciones de acceso a la app.

| Superficie               | Evidencia vigente y límite                                                                                                                                                                                                  |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Datos                    | Carrera de equipos RED→GREEN; SQL completo58/1189 más nuevo webhook independiente3/3; Cloud180 y dos definiciones/ACL iguales a local tras aplicación autorizada                                                            |
| Web/Auth                 | Sitemap real28URLs públicas; sesiones8/8; integrated-final productivo9/10 y retest dirigido root/logo2/2, sin skips/flaky. No se afirma una corrida única11/11                                                              |
| Reparaciones de producto | Cuota equipos; sitemap dinámico; retry global según Next instalado; continuación de invitación por petición de documento después de password/MFA. Root404 sólo corrige comentario; markup no cambió                         |
| Worker email             | Cron real,2entregas al destino oficial de pruebas,4rechazos422, archivo read_ct5, alerta Actions y recuperación verde. Fixtures0; no prueba recepción por personas/dominio propio                                           |
| MP-01                    | Run autorizado43343240727 falla Auth bootstrap401 antes de checkout;0intents/eventos nuevos. Cliente Node reparado localmente y6tests PASS; causa remota/retest pendientes de entrega Git                                   |
| Cierre                   | PR251 integrado y main READY; contención de credenciales resuelta. CI verde conserva1flaky logo P2. FOLLOW-TTL Cloud y MP01retry en curso, sin anticipar PASS/cleanup. Compra/callback PSP sigue pendiente; N15 condicional |

Las secciones de ingreso y los intentos conservan su fecha/resultado; las
continuaciones finales los superseden sólo donde hay evidencia nueva.

## Candidato y alcance efectivo

HEAD `5dd46f9d4e5463155754a592ca4e8febd745a39d`, rama
`codex/016-plan-readiness`. Al retomar el12/11 se conservaban los18 documentos
modificados y `plan-016-session-start.md` nuevo de la preparación10/11, sin
cambios de producto. Esa preparación es insumo autorizado, sigue sin integrar
y no se borra. Candidato = HEAD + preparación + migración/espejo SQL,
regresiones57/58, reparaciones Next/sitemap, aceptación browser, cliente MP-01,
runner/CI y documentación. El SHA solo no identifica ese árbol: usar manifiesto
y diff del candidato, sin atribuir al HEAD los cambios todavía no entregados.

El [manifiesto del candidato](2026-11-12-plan-016-candidate-manifest.csv) registra
contenido, categoría, dueño, diferencia histórica y límite de revisión; enlaza
el [manifiesto T1 histórico](2026-10-05-nextjs-supabase-code-review-manifest.csv).
Inventario/hash no significa lectura actual completa ni renovación automática
de las947 lecturas históricas. No se publican hashes de secretos/Vault.

Versiones instaladas: Node24.18.0, pnpm11.22.0, Next16.4.5, React19.3.1,
Supabase JS2.119.0, TypeScript6.0.3, Vitest4.1.12, Supabase CLI3.0.0,
Deno2.7.1, Docker29.9.3. No se solicitó actualización de versiones.

| Capacidad ofrecida                | Productor → consumidor Next                                       | Autorización y evidencia                                                | Gap / disposición                                                                                                                        |
| --------------------------------- | ----------------------------------------------------------------- | ----------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Público/Auth/onboarding           | GoTrue, triggers → signup/confirm/login/recovery y proxy          | Zod, destino seguro, cookies retornadas;015 y CI del HEAD               | OAuth Google visible/configurado: runtime externo [NO VERIFICADO]; no asumir Azure por acción sin botón                                  |
| Cuenta/perfil/sesiones            | profiles, RPC/Auth → account/actions y formularios                | Identidad, RLS, `current_password`; SQL de perfiles abajo               | DB-01 P2; N-16/17 aceptados localmente en settings8/8: actual fuera primera fila, revocar otra, recarga y feedback de error              |
| Cuentas/equipos/roles             | create_team, memberships → dashboard/actions, selector y miembros | RLS/grants y regresiones SQL; createTeam unit6/6                        | D-03.TEAMS reparado; migración Cloud autorizada aplicada y definición/ACL iguales a local. Sin extrapolar a concurrencia Cloud           |
| Datos útiles/archivo privado      | tabla/RLS/Storage → extensión neutral de015                       | Núcleo derivado015 aceptado con persistencia/bytes/roles                | Evidencia de extensibilidad, no feature Records ofrecida por original restaurado                                                         |
| Archivos públicos                 | Storage → avatar/logo y acciones                                  | pertenencia, tipo/tamaño y014 imágenes; multipart con bytes/recarga     | N-11/12/19/20 aceptados localmente: límites avatar2MiB/logo5MiB, exceso, selección inválida y dos guardados consecutivos; retest logo2/2 |
| Realtime                          | broadcast privado/presence → hooks/bell/members                   | setAuth, cleanup y descarte de identidad; caso productivo integrado     | N-07 aceptado localmente: notificación útil y presencia entrada/salida; no extrapolar Cloud                                              |
| Billing habilitado                | catálogo/registry/RPC → pricing/billing/actions                   | Admin de cuenta, intents, callback/worker autenticados                  | Compra/callback PSP real y operación programada [NO VERIFICADO]; no retirar oferta sólo documentalmente                                  |
| Admin/auditoría                   | RPC/AAL2 → admin/actions/tablas                                   | SQL lookup,014 audit y negativas de plataforma                          | N-21/23 aceptados localmente: lookup fuera primer lote, error genérico y reintento browser                                               |
| Projects/editor y Robot excluidos | app.config/product-modules → navegación, páginas y acciones       | projects=false/robot=false, notFound/module_disabled;015 y negativos CI | SQL/RLS conservados; no aceptación ni vertical nueva                                                                                     |

Oferta desde `src/config/app.config.ts`: billing/members/activityLog/analytics/
onboarding habilitados; projects/Robot deshabilitados. Se conserva configuración;
016 no decide ocultar compras para eludir su aceptación.

## Servicios, destino y restricciones

Inventario existente: Supabase Auth/DB/Storage/Realtime/Edge/pg_cron;
GitHub CI; Next alojado en Vercel; Cloudflare/Turnstile; PostHog; Resend/Sentry;
billing mock/Stripe/Mercado Pago implementados con límites propios. Consumidores:
`src/env.ts`, clientes Supabase, analytics/providers, email/worker, billing/registry,
handlers PSP y workers Node. Instalado/configurado no implica runtime verificado.

Docker Desktop existente se inició oculto tras renovar contexto/socket. Sólo
stack oficial `saas-boilerplate`; label del contenedor DB comprobado, API54321,
DB54322, Studio54323, Mailpit54324. DB/Auth/Storage/Realtime recuperados saludables.
Conteos antes:1 usuario/2 cuentas/1 objeto/179 migraciones; después de reparación:
1/2/1/180. No se iniciaron otros proyectos, ni se descargó otro stack.
Edge runtime local seguía detenido; no es evidencia de worker programado.

RAM libre medida durante arranque:464MB, después1270–1550MB de16123MB.
SQL serializado; no repetir build/cobertura/browser completos válidos en CI
por transición de plan. No se altera concurrencia/umbrales del producto.

Sólo Free. [Pricing oficial](https://supabase.com/pricing) consultado10/11;
no se crean recursos ni se consume proveedor de pago. DB-11:
[protección de contraseñas filtradas](https://supabase.com/docs/guides/auth/password-security)
documentada para Pro o superior, consultado12/11; no disponible como obligación
habilitada Free, sin upgrade ni sustituto equivalente inventado. La declaración
Free del propietario no se presenta como auditoría independiente de facturación.

## Evidencia reutilizada y diferencias que la limitan

[PR250](https://github.com/pipec80/iroko/pull/250) renovado en lectura: MERGED,
merge commit exacto HEAD,10/11. [CI main42866480336](https://github.com/pipec80/iroko/actions/runs/42866480336)
renovado en lectura con metadata de jobs y logs: success, mismo HEAD.
No se disparó otro workflow.

| Gate      | Resultado fechado10/11 reutilizado                                                             | Límite12/11                                                                                            |
| --------- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Calidad   | Quality PASS: tipos/lint/formato/knip                                                          | Código TS/config/lock sin cambios; documentos nuevos requieren checks propios                          |
| Cobertura | 153 archivos,1716 PASS/1 skip; statements91.24, branches84.78, functions96.23, lines93.72      | Skip en discovery-persistence preservado; no cobertura del nuevo SQL ni PSP                            |
| SQL/tipos | 57 archivos1184 asserts PASS; Database Types PASS                                              | SQL se renueva completo abajo tras reparación; firma expuesta no cambia, sin regeneración innecesaria  |
| Edge      | 10/10 PASS con proveedor simulado                                                              | No entrega real/programada, alertas ni recuperación con Resend                                         |
| Browser   | Chromium88 PASS/2 skips; WebKit16 PASS/1 skip; confinados21 y8, cero skips/flaky en esos lotes | No aceptar escenarios omitidos ni atribuir resultado individual sin evidencia; exclusiones conservadas |
| Build     | Build PASS; job60s; E2E1071s, Unit94s, DB134s, WebKit442s                                      | Entorno CI local sintético, sin certificar Cloud/PSP; no medir capacidad host desde tiempos CI         |

[015](../quality/reusable-foundation-evidence.md) conserva su núcleo local
acotado: signup/confirmación Mailpit, acción útil persistida, archivo/notificación,
marca/actualización y recuperación. Fuentes de esos contratos no cambiaron en
esta ejecución; se reutilizan. La reparación create_team se cubre por SQL y
su consumidor unitario, sin repetir el ensayo destructivo015. El derivado y
respaldos ignorados se preservan; Records no está instalado en el stack original.

## Defecto confirmado y reparación mínima

**D-03.TEAMS / alias DB-05, P1, reproducido en local.** Entrada: dos sesiones
del mismo owner con último cupo Free `teams_max=1`. `create_team` contaba antes
de bloquear; ambas insertaban y esperaban al final en UPDATE de profile.
SQL57 RED: B=`ok` en vez de `team_limit_reached`; persistidos2 en vez de1,
2/5 fallos. Control positivo A, negativas auth/nombre y cleanup atestado.

Reparación: `PERFORM ... public.accounts WHERE id=v_uid FOR UPDATE` antes del
conteo; misma función/contrato, sin alterar planes/cuotas/roles. Migración
`20261112173000_team_quota_serialization.sql` y espejo `public.sql` concordantes.
Referencia: [PostgreSQL17 row locks](https://www.postgresql.org/docs/17/explicit-locking.html).
Aplicada y registrada sólo localmente por `supabase migration up`; única pendiente.
Segundo lector backend_intake confirma causa, orden del lock y cleanup.
La conexión postgres con claims prueba concurrencia/checks internos; grants/RLS
se acreditan separadamente por la suite completa, no por fingir rol HTTP.

## Disposición DB-01…20

Una fila de intake no equivale a un defecto. El CSV central conserva IDs/alias;
esta tabla detalla su evidencia y retorno sin crear otro backlog.

| Referencia | Disposición, evidencia y límite                                                                                                                                                                                                                                                              | Dueño / retorno                                                                                                                                |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| DB-01      | Confirmado-local P2: grant UPDATE completo permite pending_deletion/created_at/onboarding propios. Ensayo authenticated5/5: RPC perfil positiva, update ajeno0, hook niega cuenta sin membresía, pending_deletion solo no cumple purge. No escalada a admin. Sin cambio preventivo de grants | Datos/Auth; antes de prometer columnas internas inmutables o modificar lifecycle/grants, acotar columnas preservando perfil/consentimiento/RPC |
| DB-02      | Deuda P2 del contrato dual flags/entitlements; isEnabled sólo wrapper/tests, sin consumidor productivo identificado                                                                                                                                                                          | Datos/producto; antes de usar flag como derecho comercial                                                                                      |
| DB-03      | Alias015 cuota fail-closed y D-03; SQL21 histórica y suite renovada; withinLimit TS sólo tests                                                                                                                                                                                               | Datos; cambio de consumidor/cuota; migración Cloud aplicada y función/ACL verificadas                                                          |
| DB-04      | get_account_plan_row conserva canceled+paid-through; resolve_flag diverge sin consumidor productivo                                                                                                                                                                                          | Billing/flags; antes de usar wrapper comercial; PSP real separado                                                                              |
| DB-05      | D-03.TEAMS corregido-local RED→GREEN; concurrencia independiente                                                                                                                                                                                                                             | Datos; aplicar/verificar Cloud sólo con autorización específica                                                                                |
| DB-06      | Alias checkout011/015-OPERATIONS: intents/cuenta+proveedor, SQL36; historia múltiple no obliga unique global                                                                                                                                                                                 | Billing; proveedor efectivamente ofrecido, no certificar múltiples PSP                                                                         |
| DB-07      | Relacionado D-04 FK compuesta preservada; índice/rendimiento editor diferido                                                                                                                                                                                                                 | Datos/editor; reactivar editor y carga/EXPLAIN representativos                                                                                 |
| DB-08      | assert_provider_price_matches_plan invoker y billing.plans calificado; aviso search_path sin escalada demostrada                                                                                                                                                                             | Datos; cambiar privilegios/lookups; no hardening por etiqueta                                                                                  |
| DB-09      | Alias D-05/012.1; grants SQL44 y RPC con membresía/service-only, no revocar APIs legítimas                                                                                                                                                                                                   | Seguridad; nuevo consumidor/ACL; no contraste exhaustivo nuevo de todas RPC                                                                    |
| DB-10      | Deny-all deliberado billing/intents/jobs/impersonation; acceso mediante RPC; SQL11/44                                                                                                                                                                                                        | Seguridad/datos; cambio de exposición o grants                                                                                                 |
| DB-11      | Límite Free: leaked-password Pro+, sin habilitar ni sustituir; configuración Cloud exacta [NO VERIFICADO]                                                                                                                                                                                    | Auth/propietario; requisito/producto/plan futuro autorizado                                                                                    |
| DB-12      | v_mrr_by_plan aproximación interna, sin consumidor UI identificado                                                                                                                                                                                                                           | Billing; antes de exponer como métrica contable                                                                                                |
| DB-13      | Índices unused no justifican eliminación sin ventana/carga                                                                                                                                                                                                                                   | Datos; medición representativa; diferido                                                                                                       |
| DB-14      | rate_limits legado append-only; admisión usa counters con PK; cleanup SQL48                                                                                                                                                                                                                  | Datos; cambio de admisión/retención; no añadir PK por intuición                                                                                |
| DB-15      | Robot=false; policies/bucket histórico conservados; Cloud bucket [NO VERIFICADO]                                                                                                                                                                                                             | Datos/vertical; paridad dirigida o reactivación autorizada                                                                                     |
| DB-16      | Bootstrap015 existente, usuario explícito y AAL2; no defecto por tabla admin vacía                                                                                                                                                                                                           | Operación/Auth; nueva instalación o cambio de admin                                                                                            |
| DB-17      | Auditor fuera de oferta, no nuevo rol                                                                                                                                                                                                                                                        | Producto/datos; requisito explícito futuro                                                                                                     |
| DB-18      | Metered/asientos comerciales diferidos011/013; enum no certifica producto                                                                                                                                                                                                                    | Producto/billing; decisión comercial y matriz propia                                                                                           |
| DB-19      | Alias015-OPERATIONS/011; billing activo exige PSP, escala masiva diferida                                                                                                                                                                                                                    | Billing/propietario; escenario ofrecido autorizado, evidencia real                                                                             |
| DB-20      | Contrato transversal016;014 audit/015 roles y SQL renovado, browser específico limitado                                                                                                                                                                                                      | Next/seguridad; cambios de rol/tenant/operación y gaps N                                                                                       |

DB-INTAKE puede cerrar **su clasificación**, no las validaciones asociadas.
DB-01/02/04 conservan deuda; DB-05 tiene cierre local; no20 cierres de defectos.

## Los16 IDs N recibidos

Todos mantienen sus IDs y aceptación original. La tabla refleja la evidencia
local vigente, sin convertirla en aceptación Cloud. Dueños Next/Auth/Storage/admin
según fila; N-15 conserva retorno condicional Cloud. Los intentos anteriores y
sus fallos quedan en las continuaciones fechadas.

| IDs                 | Evidencia vigente y límite                                                                                                                                                                                                                                                    |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| N-02,N-03           | Reparación sitemap y Node3/3; CLI instalado sobre manifests productivos:28URLs únicas,4locales, origen SITE_URL y0privadas; no prueba entrega Cloud nueva                                                                                                                     |
| N-07                | Browser productivo integrado: notificación útil persistida y presencia entrada/salida; aceptación local                                                                                                                                                                       |
| N-08                | Retry global reparado según Next instalado; error controlado y recuperación browser PASS local                                                                                                                                                                                |
| N-11,N-12,N-19,N-20 | Multipart avatar2MiB/logo5MiB, máximo+1, selección inválida, dos guardados sin remount, feedback y bytes tras recarga PASS local; logo en retest dirigido2/2                                                                                                                  |
| N-13,N-14           | Reintento tras error sin site key e invitación→password/MFA→contexto de equipo/recarga PASS browser local;49contratos Auth/global-error PASS                                                                                                                                  |
| N-15                | Condicional: CAPTCHA local deshabilitado; Cloud efectivo [NO VERIFICADO], no bypass demostrado                                                                                                                                                                                |
| N-16,N-17           | Settings browser8PASS: actual segunda fila/no revocable, error de petición visible sin alterar filas, revocación real de otra y sesión actual usable tras recarga. El caller inicial salió1 por su validador de basename; JSON independiente confirma8, sin ocultar ese fallo |
| N-21,N-23           | Browser productivo local: lookup fuera primeros100 y fallo DB genérico con retry PASS; SQL56/unit preservados                                                                                                                                                                 |
| N-28                | Hipótesis descartada tras root404 real: status404/noindex,1html/1body, hidratación y retorno a locale configurado PASS; markup sin cambio                                                                                                                                     |

N-01 caché A→B conserva cierre017 con identity-cache1/1 y consumidores actuales
sin diff TS; no se repite por transición. No certificar todos los recorridos
Auth por signup015 ni reenviar los16 IDs a017.

## Gates ejecutados, fallos y cleanup

Logs sanitizables locales bajo `.superpowers/sdd/016-nextjs-supabase-code-review/`;
no contienen credenciales volcadas. Comandos y resultados observados:

| Comando / caso                                                                                         | Resultado                                                                                                                                                                                                                                                   |
| ------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| git status/branch/rev-parse; gh PR250/run42866480336 y --log                                           | Identidad renovada; preparación preservada; CI success exacto HEAD                                                                                                                                                                                          |
| node scripts/run-reconciliation-db-test.mjs supabase/tests/database/57_team_quota_concurrency.test.sql | RED real2/5; primer intento falló por faltar CREATE EXTENSION dblink en test, corregido antes del RED válido                                                                                                                                                |
| mismo runner SQL57 + SQL25                                                                             | GREEN2 archivos21 aserciones                                                                                                                                                                                                                                |
| supabase migration up                                                                                  | Sólo20261112173000 aplicada localmente;180 migraciones                                                                                                                                                                                                      |
| node scripts/run-reconciliation-db-test.mjs                                                            | PASS58 archivos1189 aserciones,7s; sin reset; cleanup del runner                                                                                                                                                                                            |
| mismo runner, sólo SQL58_webhook_quota_concurrency.test.sql                                            | PASS3/3 adicional: sesiónA ocupa último cupo Pro real, B espera lock y recibe endpoint_limit_reached, persistencia respeta cuota. No es una nueva suite completa59; no cambió producto                                                                      |
| psql -X -v ON_ERROR_STOP=1 con profile-check.sql BEGIN/ROLLBACK                                        | 5/5; intentos iniciales por extensión/CTE incorrectos no son evidencia PASS; transacciones abortadas y corregidas                                                                                                                                           |
| node .superpowers/sdd/016-nextjs-supabase-code-review/storage-expiry.mjs                               | PASS contrato Storage local: bytes autorizados, nueva emisión denegada tras revocación con JWT previo, bearer previo válido antesTTL60; tras65s HTTP400 con `"exp" claim timestamp check failed`, nueva URL owner entrega bytes al mismo instante; cleanup0 |
| node node_modules/vitest/vitest.mjs run dashboard/actions.test.ts --maxWorkers=1 --pool=threads        | PASS1 archivo6 tests,1.22s; consumidor createTeam, contrato error/límite                                                                                                                                                                                    |
| intento inicial Vitest src/app con filtro createTeam en sandbox                                        | Sin resultado, cancelado; no PASS. Reintento fuera sandbox acotó archivo; sin segunda suite completa                                                                                                                                                        |
| node --test scripts/**tests**/dependency-security.test.mjs                                             | PASS11/11,0 skips; deepmerge mitigado localmente, alerta135 sigue upstream pendiente                                                                                                                                                                        |
| supabase db lint                                                                                       | Exit0 con85 diagnósticos:17 errores en extensiones,11 avisos en funciones public existentes; create_team sin issues. No reportar lint universal limpio ni reparar extensiones por intuición                                                                 |

**Incidencia del comando pnpm:** invocar `pnpm supa:test` disparó preparación
automática de pnpm (`prepare: husky`, relink/resolución) antes del script, pese
a no haber solicitado install/update. Se evitó continuar por pnpm y se usaron
entrypoints Node instalados. Manifiestos/lockfile siguen sin diff, versiones
de Next/Supabase/Vitest/TS confirmadas; no se presenta como una instalación
autorizada ni como actualización. No se restauró node_modules destructivamente.

Controles después de SQL:1 usuario/2 cuentas/1 objeto/180 migraciones,
schema `iroko_test_guard` ausente. Los fixtures de SQL57 se registran con UUIDs
propios; limpieza normal/excepcional y exterior del runner. Perfiles usa rollback.
Los servicios originales permanecen disponibles; no se detienen recursos ajenos.

## Cloud, operación y seguimientos: límites vinculantes

Supabase MCP en lectura12/11 identifica `iroko`, ref`rgrxlygtmvavqzkjyywg`,
ACTIVE_HEALTHY, Postgres17.6.1.141. Preflight histórico178 versiones,
última20261103090000. Después, con autorización específica del propietario,
se aplicaron sólo20261106170000 y20261112173000: Cloud180, igual historial que local.
Readback posterior verifica fail-closed de límite ausente, lock antes del conteo,
ACL anon/PUBLIC denegada, authenticated permitido, owner postgres y search_path vacío.
Hashes MD5 de las dos definiciones iguales a local:
within_plan_limit a2615ce03cbf644825a3939818e15548;
create_team 14a815bbd12c0056df6271f292348983.
Dry-run confirmó exactamente dos; push usó --skip-vault, sin seeds/roles/reset.
Artefactos cloud-dry-run-approved.log, cloud-apply-approved.log y
cloud-postflight-approved.json. Paridad acotada de migraciones/funciones,
sin extrapolar a runtime o configuración completa.
Lectura no demuestra configuración Auth/Storage ni salud completa.

| ID / gate               | Disposición y dueño / retorno                                                                                                                                                                                                                                                                                                                                    |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D-03.WEBHOOKS           | corrected-local para admisión SQL: nuevo SQL58 PASS3/3 con dos sesiones, tickets SQL distintos, último cupo Pro real y persistencia dentro de cuota. Cleanup de endpoints/Vault/billing/actor propios; no modifica planes. Revisión independiente final_review_016 favorable. No demuestra DNS/HTTP/worker/PSP; dueño datos/webhooks, retorno cambio de admisión |
| D-01 y API/SEATS/owners | Reutilización de reparaciones, SQL53/54 y suite completa renovada. No reimplementar ni reabrir017                                                                                                                                                                                                                                                                |
| RL-F01                  | Conservar P2 documentado de confianza IP; Cloud no renovado; dueño Auth/Data API; retorno cambio proxy o promesa IP                                                                                                                                                                                                                                              |
| RL-F03                  | Conservar reparación Cloud registrada04/11; lectura ledger no invalida grants. Retorno nuevo consumidor/drift ACL                                                                                                                                                                                                                                                |
| RL-F02                  | 503 limitador/500 posterior desplegado con inyección aislada pendiente; dueño API/operación; [NO VERIFICADO], sin indisponibilidad global                                                                                                                                                                                                                        |
| RL-F04                  | Segunda fuente independiente de origen pendiente; dueño red/operación; cambio ingress o garantía pública                                                                                                                                                                                                                                                         |
| RL-F05                  | Aceptación específica por integración, MP matriz011; no inferir de worker saliente ni mocks                                                                                                                                                                                                                                                                      |
| RL-F06                  | Condicional hosts/deployment/secreto/reglas: entrega y rotación nuevas registradas; bypass antiguo ausente/nuevo presente API, otros IDs preservados. Sin cambios WAF. Endpoint público404 anónimo/antiguo/nuevo no prueba denegación diferencial ni certifica WAF; dueño operación, retorno scope efectivo                                                      |
| FOLLOW-TTL              | Cloud autorizado en curso: T0 SQL20:15:05Z, sesión exp20:45:05Z, JWTexp21:15:06Z lifetime3600, primer RLS200 sólo target. Sin PASS/cleanup final; dueño Auth/operación. Distinto de Storage                                                                                                                                                                      |
| 015-OPERATIONS PSP      | Billing habilitado; compra/callback real, proveedor ofrecido y matriz011 pendientes. Dueño billing/propietario; operación externa requiere autorización específica y sólo Free/test sin cobro                                                                                                                                                                    |
| 015-OPERATIONS worker   | Ensayo real específicamente autorizado PASS: cron, entrega Resend, cuatro422, archivo read_ct5, alerta job131604242774 y recuperación job131605491365; fixtures0. Dueño operación; retorno cambio worker/cron/proveedor/alerta                                                                                                                                   |
| 015-OPERATIONS Storage  | Backend local aceptado en bucket documents privado: nueva emisión denegada tras revocación, bearer previo funciona antesTTL60, rechazo específico exp después65s y owner positivo contemporáneo. Fixture2 usuarios/equipo/objeto retirado, residual0. No reinstala derivado ni acepta Cloud/browser. Dueño Storage; retorno cambio de TTL/policy/consumidor      |
| Cloud parity            | Migraciones180/180 y dos funciones/ACL verificadas tras aplicación específicamente autorizada. Configuración y consumidores desplegados conservan su gate independiente; dueño datos/operación                                                                                                                                                                   |

Los gates externos no se resuelven apagando billing en documentación. La falta
de autorización de escritura no invalida trabajo local; impide cerrar la parte
de aceptación que la exige.016 permanece active y no se ofrece veredicto PASS.

## Reglas y revisión independiente

Las ocho reglas se leyeron y aplicaron: TypeScript/Next y JS, calidad,
principios, pruebas, SQL y Realtime. Excepciones: env.ts prevalece sobre env.js;
cacheComponents=false no migra a use-cache; tokens canónicos Iroko prevalecen
sobre ejemplos Material; migración manual+espejo en Windows; instrucciones
genéricas de grants y SECURITY DEFINER se contrastan con permisos reales.
No se impone refactor, transporte nuevo, índices ni reglas de tamaño arbitrarias.
Superpowers executing-plans/TDD/debugging/verification, clean-code y Supabase
apoyan método; el contrato autorizado prevalece sobre recetas de instalación,
worktree, reset o commit. Se reutiliza la rama indicada por el propietario.

Lectores independientes: next_integration (`code-reviewer`) y backend_intake
(`backend-architect`) con propiedad de sólo lectura, sin suites paralelas.
Backend confirmó además causa/lock/regresión57. Revisión final independiente
`final_review_016` (`code-reviewer`): favorable para esta entrega parcial, sin
nuevos P0/P1 confirmados ni error material de evidencia; no acepta016.
Comprobó migración/espejo, logs RED/GREEN/SQL/Next/dependencias, CSV103→124 sin
IDs perdidos/duplicados y manifiesto1211 filas sin hashes divergentes.
El manifiesto excluye su propio archivo generado para evitar un hash circular.

Checks documentales finales: `node scripts/check-docs.mjs` PASS197 Markdown;
Prettier sobre informe/current-state/capabilities/roadmap/index/016 PASS;
`git -c core.whitespace=cr-at-eol diff --check` PASS, variante explícita para
preservar CRLF del espejo SQL. El comando bare detecta esos CR en las líneas
nuevas; no se normaliza el archivo completo ni se oculta como cambio funcional.
Postflight guardado aparte: usuarios1/cuentas2/objetos1/migraciones180,
guard ausente y0 fixtures del probe perfil. Readback MCP sanitizado guardado:
178 versiones, última20261103090000. El revisor no había leído esos dos archivos
posteriores; su evidencia está en las lecturas del coordinador, no en una
afirmación de reejecución independiente.

**Salida de esta entrega:** reparación local revisada y clasificación registrada;
aceptación integrada pendiente. Siguiente trabajo local: evidencia N nominada
sin reinstalar el derivado ni repetir015. Cloud/PSP/operación remota requieren su autorización
específica; la preparación documental sigue sin push/merge. No se marca016
completo ni se mueve a completed.

Adición después de la revisión general: SQL58_webhook_quota_concurrency PASS3/3
separado de la suite completa58/1189; segundo contraste final_review_016 favorable.
No cambió producción después del GREEN. Storage tuvo un primer rechazo400 sin
control fresco y un segundo intento cuyo matcher `expir` no reconoció el mensaje
JOSE; esos intentos no cierran el gate. La última corrida añade motivo sanitizado
y nueva URL owner positiva contemporánea, con residual0; corrige una insuficiencia
de evidencia, no un defecto del producto. No se repitió ninguna suite completa.
Manifiesto final añade SQL58 al inventario y mantiene exclusión de su propio CSV.

**Corrección del cleanup Storage:** el contador inicial `cleanup0` sólo contaba
usuarios, equipo y objeto, omitiendo cuentas personales creadas por signup.
El postflight global detectó8 cuentas frente a2 originales. Se corroboraron
las6 cuentas sintéticas por ID exacto y registros Auth con marcador storage016;
se eliminaron sólo esos6 IDs en una transacción que exigía ese conteo y propiedad.
Postflight final1 usuario/2 cuentas/1 objeto/180 migraciones, guard ausente.
Se corrigió el probe para incluir ownerId/memberId tanto en limpieza de cuentas
como en el contador; no se repiteTTL por una corrección de cleanup. La revisión
de bytes/expiración permanece válida; el cleanup inicial no se presenta como
prueba completa. Log separado `storage-owned-cleanup.log` conserva corrección.

## Continuación operacional y browser — 2026-11-12

Las entradas anteriores con178 versiones o ausencia de escrituras describen
el preflight histórico. La autorización posterior y el resultado vigente son
Cloud180 y readback acotado de las dos funciones, según el apartado Cloud.

Worker: preflight proyecto iroko/rgrxlygtmvavqzkjyywg ACTIVE_HEALTHY,
cron process-email-queue activo cada minuto, cola0 y deadletter0. Resend Free
0/100 diarios y0/3000 mensuales. El propietario autorizó fixtures propios,
hasta6 peticiones de envío, dirección oficial delivered+plan016@resend.dev,
sin personas, secretos, cron ni dominios. Marcador plan016-worker-20261112-a684.
Mensaje3 válido entregado por cron a00:38UTC; mensaje4 vacío tuvo cuatro422
registrados por Resend con user-agent del proyecto Iroko y fue archivado
por cron con read_ct5. EmailWorkerHealth131604242774 falló por deadletter1,
no por error de red. Recuperación5 entregada a00:47UTC. Cleanup eliminó sólo
archivo4, con marcador/email/título/readct y exigencia transaccional de1 fila.
Cola/archivo propios0; salud200, cola0 y deadletter0. El mismo job volvió
verde131605491365 a00:48UTC. Son dos reruns del job específico, no del nightly
completo: otros jobs conservan timestamps anteriores aunque GitHub les asigne
IDs de metadata por intento. Total6POST:2success+4rechazos422; cuota final2/100
y2/3000. No se inspeccionaron credenciales. Artefactos worker-approved-*.json.
Esto demuestra transporte/cron, rechazo persistente/archivo, señal de alerta
Actions y recuperación. No demuestra que una persona recibió una notificación
de GitHub ni convierte en aceptación el worker de webhooks o billing.

Sitemap: next-sitemap4.2.3 omitía [locale] y producía0 URLs. El test de
comportamiento usa su UrlSetBuilder instalado: RED0 frente a28 esperadas;
additionalPaths aplica transform existente a siete rutas públicas por cuatro
locales. GREEN3/3 Node. CLI real con manifiestos de build confinado genera
28URLs únicas, origen SITE_URL localhost, privadas0 y egreso0; se reutilizan
manifiestos, sin otro build. Hosted XML queda sujeto a entrega Git.

Settings: reporte real production8/8,0skip/flaky, dos sesiones y actual segunda;
fallo POST visible conserva filas, revocación de otra sesión y recarga utilizable.
El caller salió1 por su validador de basenames después del PASS del navegador.
independent-result-check.json coteja8 resultados, guards y scratch retirado;
no se repite el browser por ese error de metadatos. No se oculta el exit1.

Batch final-browser9:5PASS4FAIL. Pasaron QA3 (avatar2MiB exactos persistidos,
exceso rechazado, notificación útil y presencia), error genérico admin y404
con DOM de una raíz e interacción. Fallos: selector exacto de email en detalle
(fixture corregido), destino tras MFA de invitación (diagnóstico pendiente),
feedback login inválido (pendiente) y Retry real del error global.
Este último confirmó defecto: Next16.4.5 instalado distingue reset sin refetch
y retry con refetch. Regresión unitaria RED, cambio mínimo a retry, GREEN
2archivos6tests. Revalidación production de auth/admin en curso, sin PASS adelantado.
N19/N20 necesitan además dos respuestas en el mismo formulario montado: recarga
entre uploads no prueba ese contrato. Logo5MiB necesita su propia evidencia;
no se extrapola desde avatar2MiB. Los IDs permanecen todos en el registro único.

Revisión independiente final_review_016 de runner/CI/fixtures/sitemap favorable,
sin defectos accionables confirmados. CI añade selección explícita de seis
casos confinados de Auth/admin, fuera de la selección ordinaria, sin mocks
de Cloud. Todavía no ejecutado en GitHub porque no hay push autorizado.

### FOLLOW-TTL: preparación acotada, sin ejecución Cloud

Lectura backend_intake confirma tres relojes distintos: fila de impersonación
30min, cookies/retorno35min y exp real del bearer emitido por Cloud (no inferirlo
de jwt_expiry local3600s). El cierre012.4 probó salida manual y cookie ausente,
no el transcurso del TTL. El runner local fuerza expiración SQL y sus guards
impiden Cloud: no se modifican para reutilizarlo indebidamente.

La aceptación dirigida requiere dos identidades fixture propias, admin temporal
con MFA/AAL2 y target no-admin, contexto administrativo independiente de retorno,
impersonación por UI normal y token previo sólo en memoria. Positivo previo,
espera real hasta expires_at más margen, lectura del mismo bearer sin refresh,
expiración de dashboard/cookies/fila/audit y control positivo de una sesión
fresca. Si se certifica expiración criptográfica, esperar también exp real más
margen. El cap de navegación no equivale a revocación universal de JWT en todas
las RPC/RLS; no se inventa ese contrato ni su aceptación. Cleanup exact-ID de
fila, grant, sesiones/factores, cuentas y usuarios propios, con cero residuos.
Dueño Auth/operación; retorno con revisión desplegada fijada y autorización
específica de esos fixtures y efectos Auth/SQL. Ninguna operación de este ensayo
se ejecutó todavía. No requiere pago, instalación, cambio de TTL ni reset.

### Actualización de casos y MP-01 — misma continuación

El lote productivo integrated-final terminó9PASS/1FAIL,0skip/flaky: pasaron
Auth/admin6 y QA3. N13 se corrigió sólo en el fixture: React vacía password
no controlado tras resolver la acción; cada intento debe volver a introducirlo.
N14 requirió reparación mínima: destino de documento sólo para el handler exacto
de invitación después de validar next/onboarding, conservando MFA; el handler
recibe la petición del navegador y entrega redirects/cookies. UnitMFA RED1/43,
GREEN focal Auth/global-error49/49; navegador real password/MFA, membresía activa
y recarga PASS. N19/N20 ahora pasan dos respuestas avatar_updated sin remount,
selección vacía/botón disabled por envío, feedback nuevo y bytes exactos tras
recarga. N21/N23 también PASS; no se repiten estos nueve por transición.

El logo superó en ese lote5MiB, rechazo de exceso y dos escrituras con bytes
verificados; falló el selector final Logo en vez de logo. El primer retest sólo
logo en development no superó su precondición; no se usa como aceptación.
root-logo-final productivo posterior falló dos casos: root404 esperaba sólo/es
al regresar desde una página sin locale, y logo terminó con fallo de cleanup
que ocultó el error primario. El objeto residual5MiB era del actor e2e+settings
corroborado en Auth: se eliminó sólo su ID/path/owner exactos por Storage API,
postflight1usuario/2cuentas/1objeto/180versiones/guard0. No se borra el intento.
Se conserva el fallo original junto a cualquier fallo de cleanup y se espera
la respuesta POST real de la subida antes de su feedback, con presupuesto
acotado para5MiB; no se quitan negativas ni verificaciones de bytes/limpieza.

N28: el404 localizado no ejerce rootnotfound. Nueva prueba dirigida a
/api/plan016-missing. Readback HTTP del servidor productivo propio confirmó
404,noindex,rootTitle,1html/1body; hidratación y retorno siguen bajo retest.
GET anónimo hosted fue429VercelCheckpoint y no se usa como prueba del fallback.
Se corrigió sólo el comentario obsoleto de rootnotfound; no se cambió markup
porque el HTML observado no mostró duplicación. Retorno acepta los cuatro
locales configurados, en vez de imponer/es a una petición sin locale.

MP-01 específicamente autorizado se ejecutó una vez en main5dd46f9,
[run43343240727](https://github.com/pipec80/iroko/actions/runs/43343240727),
job131616364223. El paso falló401 al generar el link Auth en sus tres intentos
configurados, antes de llegar a checkout. Readback:0intents nuevos/actualizados,
0eventos nuevos,4suscripciones y20eventos originales. No se hizo pago.

El APIRequestContext de Playwright hereda DesktopChrome, mientras la petición
admin se ejecuta en Node. La [referencia oficial Supabase](https://supabase.com/docs/guides/getting-started/api-keys)
distingue secretkey de JWT y rechaza su uso con identificación de navegador.
Reparación local del cliente de prueba: UA servidor por petición, sb_secret
sólo en apikey y Bearer conservado para claves JWT antiguas. Node contrato
RED antes del arreglo; GREEN moderno/legado y Vitest6/6. No se extraen ni rotan
secretos. Revisión independiente final_review_016 favorable. La causa exacta
remota sigue sin confirmarse hasta repetir MP-01 después de entrega Git
autorizada; no se declara resuelto el401 ni aceptado compra/callback.

CI incluye siete casos confinados explícitos (3Auth+3admin+1root), sin incluirlos
en la selección ordinaria; logo entra en la selección ordinaria. La metadata
del runner declara syntheticRootErrorFixture para distinguir inyección local
y producción. Sigue pendiente CI de este árbol local: no se atribuye el verde
histórico del HEAD a los cambios no entregados.
