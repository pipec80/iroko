# Plan 012.5 — ejecución local acotada, 2026-10-30

Plan: [012.5](../exec-plans/completed/012-5-pricing-truth.md).
Implementación aceptada localmente: `436228963bf87a073040fbdc2f644c348ee9c40b`.
Base inspeccionada: `71c04ccdaee8c013627f45c927d50d34c5212291`.
Rama local: `feat/012-5-pricing-truth`. Entrada con árbol limpio.
Este registro describe código local y evidencia por capa; no acepta Cloud,
proveedores, un checkout real ni el MVP completo. No se ejecutaron planes vecinos.

## Cierre de aceptación local — 2026-11-02

El mantenedor autorizó expresamente la captura confinada del POST MP y aprobó
el alcance editorial y sus retiradas. Estas decisiones sustituyen el bloqueo de
método T3 y la revisión humana pendiente descritos históricamente abajo. No
autorizan pagos, egress a proveedores ni escrituras Cloud.

- Reejecución actual: conjunto relevante Vitest **132/132, ocho archivos**, con
  `--maxWorkers=1 --no-file-parallelism`; TypeScript sin emit/incremental PASS.
- Lint con configuración original: **486 archivos Git versionados/nuevos no
  ignorados, 0 errores/34 warnings**. Las advertencias pertenecen a archivos
  anteriores ajenos al lote. No se modificaron ignores para el scratch histórico.
- Browser real owner: tarjeta Plus muestra **34.567CLP y Miembros17**. La primera
  navegación agotó60s durante compilación; el registro posterior mostró HTTP200
  a63s y las aserciones del contenido hidratado pasaron. Un intento posterior
  llegó a login por sesión ausente; al reponer las cookies de Auth local real,
  la tarjeta y el botón de compra fueron observables. No se acepta login por UI.
- `src/test/e2e/pricing-catalog.spec.ts`, ejecutado por CLI Playwright Chromium
  contra el snapshot local sin `.env`: **1/1 PASS,27.6s**, sin retries/skips.
  El caso compara ocho rutas (landing/pricing, es/en/pt/fr) con SQL local durante
  el precio/límite modificado. Usa el presupuesto de compilación local existente
  y bloquea solicitudes browser no loopback. No se ejecutó toda la suite016.
- Captura servidor autorizada: `scripts/plan-0125-mp-capture.mjs` se compone
  después de `networkGuard` original, cuya presencia/contenido comprueba por
  SHA256. Requiere desarrollo, Supabase loopback, proveedor MP, credencial
  sintética exacta y autorización explícita; rechaza mock general. Acepta solo
  POST exacto `/preapproval`, registra únicamente términos recurrentes y produce
  ID sintético único. El log está confinado junto al preload y rechaza symlink.
- RED/GREEN captura:3 fallos iniciales→4/4; hallazgo de guard/ruta ausente
  reproducido→5/5; composición en proceso real con rechazo de otra URL→6/6.
  El test de composición provoca deliberadamente un rechazo externo en su log
  temporal; el runtime de aceptación no registró egress bloqueado.
- Checkout owner desde Free: se alteró la petición real de la Server Action
  agregando `amount=1,currency=USD`. Captura efectiva: **transaction_amount34567,
  currency_idCLP, frequency1, frequency_type months**. El browser llegó al
  destino HTTPS loopback servido por interceptación de Playwright, sin socket al
  proveedor. El primer intento sintético usaba HTTP y falló el attach SQL,
  correctamente: se corrigió la fixture a HTTPS y se retiró exclusivamente su
  intento propio antes del caso positivo. Ningún guard de producto se relajó.
- Postlectura SQL del positivo:1 intento pending,0 suscripciones activas,
  effective_plan free y seats2. Iniciar checkout no eleva entitlements. La
  vinculación de plan con límite17 ya había sido comprobada en la fixture
  activa local del2026-10-30; no se simula autorización/pago MP como evidencia.
- Cleanup comprobado: cuenta/Auth/customer/intent propios retirados; catálogo
  completo restaurado a19990CLP, seats10, activo; mismo cluster
  `7697300702868647975`,0 suscripciones/intent capturados, guard SQL ausente.
  Runtimes propios detenidos por PID/commandline; Docker y otros proyectos
  preservados. Browser cerrado; ninguna instalación ni modificación Cloud.

Revisión independiente final: código T1/T2/T4 y display billing sin nuevos
bloqueantes; se corrigió el etiquetado histórico de esta auditoría. La revisión
de captura detectó guard/ruta/ID: corregidos mediante tests y composición real.
La inspección del revisor es estática, distinta de los comandos anteriores.

Revisión documental independiente del lote de cierre: sin bloqueantes; plan
completed, CSV corrected-local, SHA de implementación y límites Cloud/012/016
coherentes. Commit de código con hooks normales (TypeScript, lint-staged,
ESLint/Prettier y commitlint), sin omitirlos. Se utilizó pnpm10.32.1 ya instalado
con descarga automática de gestor desactivada; no se instaló pnpm11 ni se
modificó packageManager/lockfile.

Ruling: la respuesta de prueba usa HTTPS loopback interceptado en browser para
respetar la restricción SQL existente; no representa una página ni autorización
de Mercado Pago. Costo si se extrapola: confundir precio intentado con cobro.
Ruling: el cierre es local y proporcional al012.5; no depende de desplegar ni
aplicar las ocho migraciones Cloud halladas. Costo si se extrapola: atribuir
paridad/salud a un entorno remoto que esta ejecución no acepta.

No se ejecutó build productivo ni aceptación integrada016, otros dispositivos,
certificación de proveedor o flujo real pago→webhook. Se preserva su evidencia
histórica y seguimiento; cerrar012.5 no cierra el agregado012/015/016.

## Continuación con Docker disponible — 2026-10-30

Esta sección actualiza los bloqueos de la primera ejecución registrados más
abajo. Docker estaba activo y el stack oficial ya levantado al acceder con los
permisos necesarios; el sandbox inicial rechazaba su pipe. El usuario autorizó
levantar servicios locales existentes cuando sean necesarios. No se instalaron
herramientas ni se crearon stacks adicionales.

- Runner atestado SQL34: **3/3 PASS**.
- Mismo runner con SQL11 (`11_billing.test.sql`) y SQL33
  (`33_billing_provider_catalog_rpc.test.sql`): **41/41 PASS**. Comprueban
  entitlements, separación de roles y catálogo service-role; no todo billing.
- Postflight inicial: esquema temporal `iroko_test_guard` ausente y cero jobs
  locales en processing.
- Browser real mediante conector Playwright: **8/8 rutas públicas disponibles**,
  landing/pricing en es/en/pt/fr, HTTP200, nombres Free/Plus/Pro, CLP19990 Plus y
  metadata localizada. Cero errores de página y cero solicitudes externas
  bloqueadas durante ese recorrido. El IAB agotó CDP en su arranque; se usó el
  conector disponible, sin instalar navegador.
- Runtime de desarrollo webpack en copia de fuentes actuales, sin `.env`, con
  dependencias instaladas compartidas. Usa `networkGuard`, helpers de entorno y
  confinamiento de rewrites existentes sin modificar sus controles. Se seleccionó
  MP con credenciales sintéticas sin valor proveedor y se quitó
  `ALLOW_MOCK_BILLING`; no se activó ni consumió mock. Esta composición manual
  no agrega capacidad de interceptar el POST MP ni acepta un build productivo.
- Fixture local reversible: Plus pasó temporalmente aCLP34567 y17 seats. Ambas
  páginas públicas reflejaron los nuevos valores sin editar código/i18n. Cuenta
  sintética propia con suscripción ligada al mismo plan leyó17 como entitlement
  efectivo en SQL.
- Dashboard **[NO VERIFICADO]**: el login de la fixture permaneció en login,
  con recargas Fast Refresh y timeout90s. No se aceptó el recorrido por SQL ni
  se repitieron pruebas generales de Auth/S-02. La causa no está confirmada.
- El primer cleanup de la cuenta falló por FK de reconciliation_state y su
  transacción hizo rollback. Se corrigió la secuencia usando la eliminación de
  dependencias propias del helper existente; segundo cleanup comprobó cero
  usuarios/cuentas/clientes propios. Se conservan snapshot y registro de cleanup
  en el workspace ignorado del012.5.
- Estado unavailable: **8/8 rutas**, cuatro idiomas y ambas superficies,
  HTTP200, mensaje traducido y cero tarjetas. Se desactivó exclusivamente el
  precio MP de la fixture; ninguna oferta de fallback se mostró.
- Cleanup final comprobado: importe19990, seats10, JSON completo de límites e
  `is_active=true` idénticos al snapshot original, mismo cluster
  `7697300702868647975`. Cero usuarios/cuentas/clientes/suscripciones propios y
  guard SQL temporal ausente. La fila reconciliation propia se retiró antes del
  customer según sus FKs. No se modificaron cuentas ajenas.
- Postflight del runtime: `networkGuard` idéntico al helper versionado, cero
  `.env` copiados y sin archivo de egress bloqueado. Esto no acepta un POST MP;
  no se intentó ninguno.

Capturas locales: `.playwright-mcp/0125-pricing-available-es.png` y
`.playwright-mcp/0125-landing-updated-es.png`, más
`.playwright-mcp/0125-pricing-unavailable-es.png`. Son evidencia de desarrollo, no de
Cloud, deploy o compra.

La [inspección Supabase local/Cloud](2026-10-30-supabase-local-cloud-parity.md)
confirma177 migraciones repo/local frente a169 Cloud, ocho pendientes y una
reconciliation Cloud con `provider_fetch_failed:429`. No se aplicaron migraciones
ni se provocaron reintentos o cobros remotos. Este diagnóstico no es ejecución
de017 ni cierre de su paridad Cloud.

## Decisiones de aplicación

- T1 produce un lector servidor común y dos proyecciones: DTO público cerrado
  ante catálogo incompleto/proveedor ausente, y catálogo de cuenta que conserva
  `overview`/`paymentHealth`. `description` ya era pública por RPC; se conserva
  nullable y se renderiza como texto. No se exponen IDs ni metadata proveedor.
- Se conservan etiquetas Free/Plus/Pro, slugs, precios de la DB, proveedores y
  contratos de cobro. No hay migraciones ni dependencias nuevas. CLP se expresa
  en pesos; otras monedas usan el exponente de `Intl`.
- Cada petición lee el catálogo vigente, sin caché persistente. Una compra nueva
  resuelve precio en servidor; reanudar un checkout existente conserva la URL
  remota original. No se cambia el importe de suscripciones existentes en MP.
- `authorized` de MP significa suscripción `active`; `invoice_paid` registra el
  pago/período y no cambia por sí solo el lifecycle. Se conserva ese contrato.
- Cambiar un límite de `billing.plans` sí afectaría temporalmente a cuentas que
  referencian ese plan. La aceptación con fixture sintético necesita exclusividad,
  restauración de valores originales y postlectura; la continuación superior
  registra su ejecución y rollback comprobado.
- Las capacidades desconocidas o ausentes se omiten en tarjetas; comparación
  usa «No especificado» para ausencia. No se inventa cero o ilimitado. El flag
  `priority_support` no acredita servicio operacional y se omite de la publicidad.
- Se trabaja en la ruta solicitada, en rama local, reutilizando dependencias
  instaladas. No se creó otro entorno ni se instalaron herramientas.

## Estado por tarea — actualizado al cierre local2026-11-02

### Reentrada posterior del mismo día (America/Santiago)

Se detectó un faltante real de presentación en `billing-tab.tsx`: PlanRow ya
contenía features/limits, pero PlanCard no los mostraba. Para cumplir la
coherencia de las tres superficies se añadió la lista mediante `getPlanItems`
compartido, con traducciones PublicCatalog, omitiendo capacidades desconocidas
y soporte no acreditado. No se cambiaron botones, permisos, overview,
paymentHealth ni inicio de checkout.

- RED observado: caso `shows current catalog limits and capabilities alongside
  the provider price`, fallo «Miembros:17» ausente en la tarjeta, con precio
  CLP34567 ya correcto. La selección `-t` no ejecutó26 casos restantes; esos
  casos no se contabilizaron como aceptación durante RED.
- GREEN:27/27 del archivo de billing; después conjunto relevante **132/132 en
  ocho archivos**, con `--maxWorkers=1 --no-file-parallelism`. Un primer intento
  anterior no inició el worker; otro fue interrumpido al acotar el RED. Ninguno
  cuenta como prueba aprobada. Se liberó el Next propio antes de la ejecución
  exitosa; no se bajaron umbrales ni assertions.
- Typecheck posterior al cambio: `node node_modules/typescript/bin/tsc --noEmit
  --incremental false` → PASS.
- Revisión independiente concreta: hooks incondicionales, import cliente sin
  arrastrar código servidor, límites cero conservados, estados/CTA intactos.

Se intentó billing con una sesión real de Supabase Auth local, provisionada por
`@supabase/ssr` y cookies en el contexto de pruebas. Esto no omite proxy/RLS ni
acepta login por UI. El runtime webpack llegó al título/shell de la ruta, pero
no al contenido esperado antes del timeout120s; el intento posterior con el
servidor Turbopack habitual no respondió cabeceras antes del límite90s. **No se
acepta browser de dashboard** y no se abre optimización del runner/editor.
La presión de recursos observada incluyó1712MB libres de16123MB; no se atribuye
el fallo exclusivamente a RAM sin diagnóstico concluyente.

Ambos runtimes propios se detuvieron por PID/commandline verificados, sin parar
Docker ni servicios ajenos. Las cuentas sintéticas posteriores se limpiaron
siguiendo sus FKs, con postflight cero propio. El catálogo quedó en19990CLP,
10seats eactivo como su snapshot completo original. Se conserva la aceptación
pública8+8 y fixture pública2/2 del primer runtime: el cambio posterior solo
añade presentación al dashboard y estrecha el tipo del helper compartido.
La aceptación del intento MP sigue bloqueada; no se inició ningún checkout.

| Tarea | Código/revisión | Aceptación pendiente |
| --- | --- | --- |
| T1 | Aceptado localmente: lector común seguro, regresiones, SQL, tipos y lint PASS; SHA superior | Cloud no aceptado por esta tarea |
| T2 | Aceptado localmente: DTO, formatter, cuatro locales, browser available/unavailable y CLI ocho rutas PASS | Desktop en desarrollo; sin build productivo ni todos los dispositivos |
| T3 | Aceptado localmente: billing actualizado, captura MP confinada con manipulación cliente, SQL y cleanup PASS | No acredita login por UI, pago real, webhook ni autorización MP |
| T4 | Aceptado localmente: copy/metadata, revisión independiente y aprobación humana2026-11-02 | Browser completo de product/solutions/contact no ejecutado; no es certificación operacional |

## Primera ejecución — registro histórico del2026-10-30

Los resultados y bloqueos de esta sección y de los dos apartados siguientes
corresponden al primer intento. La continuación con Docker y la reentrada
superiores sustituyen sus estados de SQL, browser público, fixtures y cleanup.

- Baseline: `node node_modules/vitest/vitest.mjs run src/lib/billing/__tests__/entitlements.test.ts` → 8/8.
- T1 RED: tras crear el contrato mínimo vacío, `public-catalog.test.ts` → 8 fallos
  de comportamiento; primero se observó también import inexistente, que no se
  contó como RED de comportamiento.
- T1 GREEN: `node node_modules/vitest/vitest.mjs run src/lib/billing/__tests__/public-catalog.test.ts "dashboard/billing/__tests__/actions"` → 49/49; typecheck pasó en ese punto.
- T2 RED: formatter y páginas → 19 fallos (3 formatter, 16 páginas/estados/locales).
  Tras implementar, se corrigió el matcher de espacios no separables de `Intl`.
- T1/T2 GREEN: `node node_modules/vitest/vitest.mjs run public-catalog presentation "(public)/__tests__" "dashboard/billing/__tests__/actions"` → 69/69, incluida regresión adicional T1.
- T3 unitario: el comando anterior más `src/lib/billing/__tests__/service.test.ts`
  y `src/lib/billing/__tests__/entitlements.test.ts` → 100/100. Comprueba contratos
  aislados, no acepta el recorrido real ni SQL.
- T4 RED: `public-metadata.test.ts` → 5 fallos por descripción/metadata anterior.
  Se corrigió una coincidencia espuria de «SLA» dentro de «aislamiento» usando
  límites de palabra; las aserciones se limitan a copy público actual.
- SQL: `node scripts/run-reconciliation-db-test.mjs supabase/tests/database/34_mercadopago_clp_catalog.test.sql`
  → salida 1 en preflight: socket Docker Desktop Linux no disponible. Ningún SQL
  del test se ejecutó y no se adquirió atestación ni se mutaron fixtures.

Los comandos Node usan las herramientas ya instaladas, equivalentes a los
scripts `pnpm test`, `typecheck`, `lint` y `supa:test`. No se autorizó instalar ni
actualizar dependencias. La investigación previa registró fallos de pnpm/EPERM;
en esta ejecución Vitest directo ya funciona. Los resultados previos no se
confunden con los gates finales siguientes.

## Gates del primer intento — históricos

- `node node_modules/typescript/bin/tsc --noEmit --incremental false` → PASS.
- `node node_modules/vitest/vitest.mjs run src/lib/__tests__/public-metadata.test.ts public-catalog presentation "(public)/__tests__" "dashboard/billing/__tests__/actions" src/lib/billing/__tests__/service.test.ts src/lib/billing/__tests__/entitlements.test.ts`
  → **105/105, 7 archivos**, última ejecución tras los ajustes de tipos del test
  y selectores del spec. No es la suite completa ni el gate integrado016.
- `node node_modules/eslint/bin/eslint.js` con estos 14 archivos modificados →
  PASS, 0 errores y 0 warnings tras corregir el mock accesible de `Link`:
  `src/lib/billing/public-catalog.ts`, `src/lib/billing/presentation.ts`,
  `src/lib/billing/__tests__/public-catalog.test.ts`,
  `src/lib/billing/__tests__/presentation.test.ts`,
  `src/lib/__tests__/public-metadata.test.ts`, `src/lib/public-metadata.ts`,
  `src/app/layout.tsx`, `src/config/app.config.ts`,
  `src/app/[locale]/(public)/page.tsx`,
  `src/app/[locale]/(public)/pricing/page.tsx`,
  `src/app/[locale]/(public)/__tests__/pricing-catalog.test.tsx`,
  `src/app/[locale]/dashboard/billing/actions.ts`,
  `src/app/[locale]/dashboard/billing/__tests__/actions.test.ts`,
  `src/test/e2e/pricing-catalog.spec.ts`. Se repitió únicamente el subconjunto
  de páginas/spec tras añadir selectores slug/interval y selección de proveedor.
- `node node_modules/eslint/bin/eslint.js .` → **no completado**:
  `RangeError: Invalid string length` en formatter stylish después de procesar
  assets generados de trazas Playwright en `scratch/github-sync-20261030`.
  No se borró material local, no se cambiaron ignores ni se relajaron reglas.
  El lint focal no sustituye un PASS global.
- `node scripts/check-design-system.mjs` → PASS, 7 tokens, 4 guías y fuentes runtime.
- `node scripts/check-docs.mjs` → PASS, 185 Markdown.
- `git diff --check` → PASS después de preservar LF del CSV.
- `node node_modules/prettier/bin/prettier.cjs --check` sobre todos los archivos
  modificados/nuevos `.ts`, `.tsx`, `.json` y `.md` del lote → PASS.
- Build, navegador/E2E, fixture sintético y SQL ejecutado: **[NO VERIFICADO]**.
  No se lanzó el browser sin el stack local ni el checkout con mock general.

El spec de lectura pública utiliza `provider_prices` para MP y catálogo base
para los otros adaptadores según el entorno del runner. Distingue slug/interval
en las tarjetas y no introduce skips ni llamadas al proveedor. No hay commit de
cierre: cambios locales revisables en esta rama, plan activo por aceptación
pendiente. Los commits de implementación/evidencia se identificarán antes de
aceptar el alcance por SHA; no se marca el checklist de cierre como satisfecho.

## Bloqueos y cleanup del primer intento — históricos

T3 conserva el bloqueo explícito de la reentrada: no existe un método confinado
autorizado que capture la petición MP del servidor sin egress. El runner0124
fuerza mock y su sumidero no intercepta esa petición; no se utilizó. No se amplió
ningún harness, no se consumieron tokens mock ni se alteraron guards. El nuevo
spec `pricing-catalog.spec.ts` solo compara páginas públicas y SQL local; no
representa aceptación del dashboard, checkout o entitlements.

No se arrancó/reinició Docker ni Supabase, no se modificaron datos de catálogo,
usuarios, suscripciones, proveedores, secretos o Cloud. No hay fixtures que
limpiar por esta ejecución; esto no constituye prueba de rollback de un fixture
no ejecutado. Reanudar SQL por el mismo runner atestado cuando el stack oficial
esté disponible. La aceptación browser requiere un runtime local autorizado;
no sustituirlo por Cloud ni por mock general. No hubo push, PR, merge o deploy.

## Matriz editorial — cuatro locales

| Claim anterior | Consumidor | Evidencia/decisión | Resultado |
| --- | --- | --- | --- |
| Ready on day one / listo para producción | `app.config.description`, root metadata, HomePage/Marketing, home/product/footer | ADR0005: base y adaptación aún pendientes de aceptación | «Base SaaS en desarrollo con autenticación, cuentas, permisos e integraciones configurables» y traducción equivalente |
| Personal/Studio/Custom, $79/79 €, contactar ventas | tarjetas y comparación landing/pricing | DB+provider_prices son autoridad; no catálogo alternativo en i18n | Retirado; nombres/importes/capacidades del DTO |
| Stripe certificado, portal, upgrade/downgrade | home/product y comparación retirada | Matriz MP v1 no acepta esas operaciones ni otros proveedores | Mensual CLP Mercado Pago, sin certificar otros proveedores |
| Más popular | badge landing/pricing | Selección visual por slug no demuestra popularidad | Retirado; se conserva jerarquía visual |
| SLA garantizado / soporte prioritario / Discord privado | tiers, comparación, solutions y contact | Sin evidencia operacional aceptada para esos servicios | Retirado; consulta por correo sin plazo garantizado |
| Lanzar esta tarde / menos de 30 min / respuesta 24 h | Marketing, home/pricing/product/solutions/contact | No hay medición aceptada ni compromiso de servicio | Configuración/adaptación por validar; sin plazo garantizado |
| Migraciones automáticas / tokens M3 | home/product | Reglas actuales Windows y tokens Iroko | SQL versionado, migraciones, RLS y tokens Iroko; detalles operacionales solo en documentación |
| Trial o límites comerciales independientes | tiers retirados / tarjetas nuevas | Interval/trial/features/limits del DTO; MP trialDays=0 | Se muestran solo valores del catálogo; sin trial MP |

Metadata usa el mismo texto limitado por idioma desde `HomePage.description`,
sin modificar CSP, fuentes, título base, icons, robots o metadataBase. El fallback
de configuración conserva una descripción inglesa equivalente. Los handoffs y
material histórico no se editaron. Las verificaciones automatizadas no sustituyen
la revisión semántica humana requerida al aceptar el texto.

## Revisión y reglas

Revisor independiente `/root/pricing_review`: T1 sin bloqueantes, pidió la
regresión de overview/paymentHealth existente y formato del diff; ambos resueltos.
T2 sin bloqueantes, señaló popularidad y soporte; retirados en T4. T3/T4 sin
bloqueantes funcionales; el detalle Windows se retiró del copy público. Ninguna
de estas revisiones ejecutó navegador, SQL o proveedor.

Aplican las ocho reglas locales: TS/import type, JS asíncrono, límites RSC,
SQL/ACL, pruebas observables y JSDoc de contratos. Realtime no cambia. Excepciones
conservadas: `env.ts`, `cacheComponents=false` sin `use cache`, React Compiler,
tokens Iroko frente a Material3, cuatro locales y migraciones manuales+mirror en
Windows si fueran necesarias (no hubo cambios de esquema). Se mantienen gates
de016 separados y no se cierra012/015 ni se ejecuta014.
