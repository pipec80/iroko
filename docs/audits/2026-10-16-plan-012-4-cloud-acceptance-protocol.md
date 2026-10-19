# Plan 012.4 — protocolo de aceptación Cloud del candidato

Fecha: 2026-10-16. Preparación de solo lectura sobre `800e439`, implementación
local `3ee98bd`. No se ejecutaron eventos, navegación Cloud, fixtures, cambios
de proveedor, deployment, push o merge. La aceptación local registrada en
[current-state](../current-state.md) no acredita esta etapa.

## Alcance y autorización pendiente

Este protocolo concreta la tarea 6 del
[plan activo](../exec-plans/active/012-4-csp-and-secrets.md) y
[ADR 0004](../adr/0004-csp-nonce-and-rendering-boundary.md).
Requiere autorización separada para el candidato exacto, sus escrituras de
prueba y cleanup. Máximo tres intentos por prueba; detenerse al primer PASS.
No crear recursos, instalar dependencias, ampliar WAF, desactivar CAPTCHA/MFA,
relajar CSP o habilitar uploads para conseguir un resultado.

## Acceso comprobado y límites

| Superficie           | Observación de esta preparación                                                                                                                                                                                                                                                                                                                    | Pendiente                                                                                                                        |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| PostHog MCP          | `projects-get {}` autenticado devuelve proyecto `538546`, `Default project`, organización `019fc0ed-ff4a-0000-2718-ed5e3399f589`, timezone UTC; `ingested_event=true`. El coordinador descubrió columnas uuid/event/timestamp y ejecutó una consulta de lectura por UUID deliberadamente ausente, limitada a una hora, con resultado vacío exitoso | Igualdad con token del candidato y plan/retención efectivos **[NO VERIFICADO]**; consulta disponible, receipt real aún pendiente |
| PostHog skills       | `learn -s` devolvió catálogo; informa falta de scope `llm_skill:read` para skills del proyecto                                                                                                                                                                                                                                                     | Reconectar solo si se necesitan esas skills; este aviso no prueba falta de acceso SQL                                            |
| PostHog conocimiento | `business-knowledge-documents-search` existe pero no está habilitado; `docs-search` sí respondió. La documentación consultada declara un año de retención de eventos en Free                                                                                                                                                                       | Retención efectiva del proyecto y cuota restante **[NO VERIFICADO]**; no confundir retención de eventos con AI/replays           |
| Sentry local         | CLI instalada `3.6.2`. Tras el fallo DNS inicial, el coordinador usó el script de lectura de la skill Sentry con Python 3.11.9 instalado y el token local existente: API list-issues iroko/iroko aceptada, filtro sintético no emitido, cero coincidencias                                                                                         | Receipt real/event-detail sobre el candidato pendiente; no se emitió ningún evento                                               |
| Sentry identidad     | Lectura autenticada de issues en org/project `iroko/iroko` confirmada a las 22:04:31 UTC                                                                                                                                                                                                                                                           | Proyecto numérico del DSN y correspondencia con el candidato **[NO VERIFICADO]** hasta correlacionar la emisión autorizada       |
| Free                 | Baseline declarado por el propietario, sin tarjetas; Supabase Free confirmado por separado                                                                                                                                                                                                                                                         | Cuotas restantes y retención efectiva Sentry/PostHog **[NO VERIFICADO]**; no generar eventos antes de renovarlas                 |

No se consultaron eventos existentes con PII. No se necesita pedir tokens en
chat: primero renovar acceso de solo lectura con la CLI existente. Solo si esa
consulta demuestra credencial ausente/inválida se requiere que el propietario
configure localmente un token con permisos de lectura del proyecto/eventos.
Las consultas posteriores funcionan con las conexiones existentes; no se ha
demostrado necesidad de una nueva credencial. El resultado vacío acredita acceso
de lectura, nunca recepción de un evento del candidato. El wrapper PowerShell
de la consulta Sentry terminó con exit 1 en su limpieza de variables opcionales;
la llamada Python devolvió exit 0 y JSON vacío válido, registrado como tal.

Referencia general consultada mediante el conector:
[retención de eventos PostHog](https://posthog.com/docs/data/events-retention).

La skill PostHog requiere descubrir schemas, cargar la skill de consultas y
consultar documentación antes de SQL. Antes del ensayo: resolver el proyecto
por comparación de token en RAM, imprimir solo ID/coincidencia; consultar
metadata/retención y ejecutar una consulta sin datos personales (por ejemplo
constante, tras confirmar schema). No basta que `execute-sql` aparezca en catálogo.
Si receipts no son accesibles, detener la aceptación como **[NO VERIFICADO]**.

## Destino vigente — decisión del propietario 2026-10-19

Aplicar este protocolo a **https://project-a89lv.vercel.app/** como único destino
Cloud del MVP. Preview/production son el mismo entorno operativo durante la
construcción; el propietario confirma valores iguales. El
[runbook vigente](../runbooks/mvp-cloud-acceptance.md) sustituye los requisitos
anteriores de preview aislado/hostname de candidato. Verificar la revisión y
configuración efectiva del dominio fijo antes de atribuir resultados a 012.4.
Las observaciones de acceso y selección preview de abajo son históricas.

## Preparación del candidato

### Renovación de acceso y prerrequisitos — 2026-10-16, 21:00 Chile

El propietario autorizó posteriormente la selección de tres migraciones,
clave preview/uploads false, candidato sellado `800e439` y pruebas reales
acotadas con cleanup. Las mutaciones y emisiones corresponden al coordinador;
esta renovación se limitó a lecturas y no acredita su ejecución.

- PostHog `organization-get {}` confirma `Pipeclabs`, slug `pipeclabs`, ID
  `019fc0ed-ff4a-0000-2718-ed5e3399f589` y único proyecto `538546`.
  `search billing` identifica `billing-overview-get`, `billing-usage-get` y
  `billing-spend-get` ocultos por falta de scope **billing:read**. La skill
  autoritativa `posthog:understanding-billing-usage`, cargada con `learn`, dice
  “billing usage investigation is not enabled” cuando esas herramientas no
  están disponibles. No sustituir cuota restante por counts SQL de eventos.
  Inspeccionar Billing en sesión UI existente; reautorizar OAuth solo si se
  elige esa vía. La falta de scope no demuestra falta de rol Billing del usuario.
- Sentry a **2026-10-17 00:00:47.849 UTC**: GET de organización aceptado,
  ID `4511537461067776`, slug `iroko`, estado active. GET público `stats_v2`
  agregado de 24h también aceptado: error accepted 1, transaction accepted 367,
  span accepted 939 y span_indexed accepted 944. No se devolvieron grupos
  rate_limited; eso no demuestra cuota restante. Hay client_discard por
  network_error en session 274/transaction 4 y por sample_rate transaction
  7601; no interpretar estos agregados como salud global o fallos del candidato.
  Metadata no devolvió cuota ni retención. Script y JSON saneado quedan en
  artifacts ignorados, sin eventos ni acceso a PII.
- La documentación actual Sentry indica “check your usage in Settings →
  Subscription”; la migración de planes legacy de septiembre2026 cambia
  transactions a spans y no reinicia uso ni ciclo. Verificar ahí asignación,
  consumo y retención efectivos antes de las emisiones; no derivar capacidad
  restante de un catálogo histórico de Free. Fuente:
  [Sentry Developer plan changes](https://www.sentry.help/en/articles/16738709-changes-to-legacy-developer-plans-september-2026).
  Endpoint consultado: [stats_v2](https://docs.sentry.io/api/organizations/retrieve-event-counts-for-an-organization-v2/).
- Cloudflare: no MCP en el catálogo disponible; `Get-Command wrangler -All` y
  `where.exe wrangler` sin ejecutable, sin variables de proceso `CF_*` o
  `CLOUDFLARE_*`. La aplicación sí tiene sitekey configurada localmente; eso no
  acredita allowlist del widget. No se instaló CLI ni solicitó un token nuevo.
  Usar la sesión UI existente para inspección de solo lectura del widget.
- Turnstile Free documenta diez hostnames por widget. Hostnames cubren sus
  subdominios, pero no hermanos: `project-a89lv.vercel.app` no cubre otro
  hostname preview bajo `vercel.app`. No añadir `vercel.app` ni “Any Hostname”
  como atajo. Allowlist real del widget sigue **[NO VERIFICADO]**. Fuente:
  [hostname management](https://developers.cloudflare.com/turnstile/additional-configuration/hostname-management/).

Tras crear el candidato exacto, primero inspeccionar hostname/allowlist y
protección. El widget debe completar challenge real y el login debe validar
token servidor. Código `110200` significa dominio no autorizado; conservar
fallo y detener esa fila, sin deshabilitar widget ni añadir hostname sin
selección autorizada. El sitekey del candidato debe coincidir con el widget
inspeccionado mediante comparación privada; no usar un dummy sitekey.

Para Vercel protegido, la skill `access-protected-vercel-deployment` usa
autenticación existente: `vercel curl` con URL completa para HTTP y token OIDC
local de corta duración, header `x-vercel-trusted-oidc-idp-token` limitado al
origen del candidato, para navegador. Preview del mismo proyecto puede usar
Trusted Sources sin desactivar protección. No enviar ese header a Cloudflare,
Sentry, PostHog u otros orígenes, ni imprimir/persistir el token. La navegación
protegida real aún queda **[NO VERIFICADO]** hasta existir el candidato; una
respuesta de autenticación Vercel se distingue del 401 de la aplicación.

1. Registrar deployment ID, SHA, URL exacta y alias sin promocionar; confirmar
   configuración aplicada y uploads deshabilitados. No utilizar el dominio
   estable como sustituto implícito del candidato.
2. Verificar proyecto Supabase esperado y condiciones de secretos/migraciones
   mediante el preflight separado. No incluir valores de claves ni tokens.
3. Confirmar acceso real a Turnstile para el hostname del candidato y un
   usuario de prueba autorizado con MFA real. Usuario/contraseña/TOTP se
   introducen localmente; nunca guardar semillas, QR, recovery codes o cookies
   en capturas/versionado. No fabricar claims AAL2 ni usar fixtures locales en Cloud.
4. Elegir navegador visible normal y perfil limpio. No reutilizar el spoofing
   de webdriver/UA de `analytics.spec.ts`: sus mocks y supresión de detección
   headless no acreditan ingest real. No ejecutar la suite local completa contra Cloud.
5. Confirmar cuotas/retención efectivas Free y acceso a receipts antes de emitir.
   Presupuestar además tráfico automático del SDK: Sentry configura tracing,
   replay 5% y replay-on-error 100%; un error objetivo puede originar envelopes
   adicionales. Un objetivo no significa exactamente una request o unidad facturada.

## Matriz de navegador real

Observar cuatro locales (`es/en/pt/fr`), login, tema, hidratación, hard reload,
prefetch/soft navigation y documentos not-found con punto/prefijo API. Cada
documento debe tener nonce coherente y nuevo tras reload, script-src sin
unsafe-inline/eval, no-store y ausencia de violaciones atribuibles a consumidores
legítimos. Conservar la excepción style-src documentada.

La ruta `/es/csp-runtime-error` pertenece al scratch del runner local; no asumir
que existe en el candidato ni crear una ruta de debug pública para este ensayo.
Si no hay un disparador de error SSR seguro ya existente, ese escenario Cloud
queda **[NO VERIFICADO]**, con evidencia local enlazada por separado.

Desde pricing, navegar por enlace a login después de prefetch y observar montaje
tardío del widget Turnstile real con nonce del documento vivo. Completar su
challenge y observar el login/server action legítimo. Una carga del script sola
no acredita challenge ni validación servidor. Si CAPTCHA/WAF pide interacción,
el propietario completa esa interacción; no cambiar protecciones globales.

## Receipt Sentry mediante SDK real

Fuente inspeccionada: `src/instrumentation-client.ts` inicializa el SDK fuera de
local-validation y conserva beforeSend; `src/lib/sentry-filters.ts` filtra ruido
ChunkLoadError/Loading chunk/NetworkError. SDK instalado `@sentry/browser@10.67.0`:
`sdk.js` incluye GlobalHandlers por defecto y
`integrations/globalhandlers.js` habilita onerror/onunhandledrejection y llama
captureEvent con mecanismo `auto.browser.global_handlers.onerror`.

1. Usar página pública anónima del candidato, sin formularios ni datos privados,
   tras hidratación. Registrar UTC y marcador no personal `plan0124-<run>-<attempt>`.
2. Tras autorización, ejecutar una sola vez en el navegador un error asíncrono
   controlado: `setTimeout(() => { throw new Error('plan0124-<run>-<attempt>'); }, 0)`.
   Esto usa el handler del SDK cargado; no importar otro SDK, crear una ruta,
   construir manualmente envelopes ni asumir `window.Sentry` público.
3. Observar la request real a `/sentry-tunnel?...`; extraer en RAM solo event_id,
   timestamp, tipo/mecanismo y marcador. No guardar body completo, DSN, URLs
   privadas, replay ni encabezados sensibles. El error esperado se distingue
   explícitamente de otros pageerrors y violaciones CSP.
4. Consultar Sentry con lectura del proyecto renovado, filtrando el marcador y
   ventana UTC exactos; comprobar event_id, environment/candidato y release si
   está emitido, sin inventarlo cuando uploads/releases estén deshabilitados, y
   mecanismo browser. Guardar receipt ID saneado, proyecto, UTC y coincidencia.
5. Esperar consultas acotadas hasta cinco minutos antes de repetir emisión;
   máximo tres emisiones totales, registrando también intentos fallidos.

Un HTTP 200 del envelope manual de `sentry-tunnel.spec.ts` es evidencia de
transporte de ese envelope, no ejecución del SDK browser ni receipt consultable.
Un 401/403/429 puede originarse en WAF/plataforma: identificar emisor por evidencia
antes de atribuirlo a Sentry. No sustituir receipt por status, lastSeen global o
un evento previo. No borrar issues/events históricos para limpiar el ensayo.

## Receipt PostHog y gates de privacidad

1. Perfil anónimo limpio en página pública, sin consentimiento: observar ventana
   acotada y navegación, sin inicialización ni tráfico `/ingest` prematuro.
2. Conceder analytics por la UI real. Observar el `$pageview` manual emitido por
   AnalyticsProvider tras init/claims; identificar uuid y UTC del evento en RAM
   dentro de la request/batch del SDK, sin guardar token, distinct_id ni payload.
3. Consultar solo el proyecto verificado, uuid+evento+ventana UTC, seleccionando
   uuid, event, timestamp y environment; no seleccionar personas, propiedades
   completas, emails o IPs. Receipt debe coincidir con el evento browser observado.
   No añadir una página/track endpoint ni llamar capture con token por fuera del SDK.
4. Revocar consentimiento por UI, esperar vaciado de requests anteriores y
   navegar: cero nuevas captures. Distinguir requests de bootstrap/static de
   captures; no contar assets como eventos ni atribuir una request previa a revocación.
5. En fase MFA/impersonación autorizada, observar cero captures mientras está
   activa y ausencia de escritura del consentimiento del target. Este flujo
   requiere cuentas/sesiones Cloud de prueba y cleanup separado. Un test con
   `/ingest` interceptado sigue siendo evidencia local, no receipt Cloud.
6. Mantener máximo tres intentos del receipt positivo, con consultas acotadas y
   espera de ingest antes de repetir. La navegación posterior con consentimiento
   puede generar eventos normales adicionales: revocar al cerrar el positivo y
   presupuestar explícitamente la fase autenticada antes de ejecutarla.

El gate PostHog no acredita consentimiento de todos los consumidores: Vercel
Analytics/SpeedInsights están montados independientemente.

## MFA, recuperación y cleanup

Sobre cuentas de prueba autorizadas, comprobar login AAL1, challenge MFA real,
elevación AAL2 e impersonación permitida; nunca impersonar personas ajenas al
ensayo. Registrar solo identificadores saneados y resultados. Comprobar salida
manual y expiración/rechazo de cookie inválida con recuperación admin, cierre de
fila correcto y revocación de sesión target. No rotar el secreto global para
forzar una prueba; si se requiere invalidación, concretar primero el alcance.

Antes de iniciar registrar baseline de fixtures/sesiones. Al terminar cerrar
sesiones de impersonación y logout, revocar consentimiento, cerrar perfil de
navegador y eliminar exclusivamente fixtures creadas por el ensayo conforme al
procedimiento autorizado, cuentas antes de usuarios Auth. Comparar counts con
baseline, verificar cero huérfanos propios y no borrar usuarios/proveedores ajenos.
Conservar eventos sintéticos por la retención del proveedor, sin borrados amplios.

Workers, mock opt-in y advisors se comprueban en el alcance seleccionado del
rollout; no provocar checkout/pagos/email/webhooks reales de forma implícita.

## Registro de aceptación

Por fila: SHA/deployment/URL exactos, herramienta, UTC inicio/fin, número de
intento, resultado observable, ID saneado del receipt y método de correlación,
cleanup y limitaciones. Nunca guardar secretos, bodies, screenshots de PII,
replay, MFA o credenciales. Registrar PASS solo para filas ejecutadas con evidencia;
receipt inaccesible, quota incierta o intervención pendiente conservan
**[NO VERIFICADO]** y bloquean la conclusión amplia de aceptación012.4.

Referencias de lectura PostHog consultadas: [identidad](https://posthog.com/docs/product-analytics/identity-resolution)
y [retención de eventos](https://posthog.com/docs/data/events-retention). La
consulta posterior docs-search del coordinador devolvió el texto que declara un
año para Free; esto no verifica el plan o la retención efectiva del proyecto.
Preparación documental comprobada
con `git diff --check`; no ejecución Cloud ni renovación de resultados históricos.
