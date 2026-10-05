# Investigación de cierre de la base SaaS — 2026-09-24

Baseline: `main` en `f82d2fbe381014c80a090ba3c36c99e4778111c3`, árbol limpio
antes de esta investigación. Resultado: base amplia implementada; cierre de
operación y reutilización **pendiente**, sin porcentaje global defendible.

## Pregunta y alcance

¿Qué falta para respaldar la promesa de la
[estrategia de producto](../architecture/product-strategy.md): resolver acceso,
cuentas, permisos y servicios comunes para dedicar el desarrollo a cada negocio?

Se recorrieron índice/estado, arquitectura/ADRs, roadmap, catálogo de módulos,
planes 011–013, estrategia de pruebas, registro operacional y análisis histórico
MakerKit. Se inspeccionaron selectivamente configuración, rutas/acciones,
autorización, Storage, Realtime, API keys, correo/worker, billing y sus pruebas.
Se consultaron ofertas oficiales de competidores y restricciones de Supabase.

No es una revisión línea por línea de todo el código, pentest, prueba de carga,
auditoría legal ni recertificación de Cloud. No se ejecutaron migraciones,
resets, pagos, envíos reales, deploys, ni cambios de proveedores. El otro
proyecto personal está fuera del alcance. Los tests locales no prueban una
instalación independiente ni aislamiento SQL real.

## Inventario de capacidades y evidencia

Las rutas siguientes se verificaron en el árbol. «Pruebas existentes» significa
que hay código de prueba; la ejecución observada se detalla al final.

| Capacidad                  | Implementación de referencia                                                          | Pruebas existentes                                                                            | Qué falta para afirmarla como reutilizable/operable                                               |
| -------------------------- | ------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Auth y recuperación        | `src/app/[locale]/(auth)/actions.ts`, `src/lib/supabase/middleware.ts`, rutas `auth/` | Unit de actions/middleware; E2E `auth`, `recovery`                                            | SMTP/OAuth/redirects en instalación nueva y recorrido real del candidato                          |
| Cuentas, membresías, RBAC  | `src/lib/active-account.ts`, `permissions.ts`, `supabase/schemas/public.sql`          | SQL 25/28/29/30/32; E2E `active-account`, `invitation`, `membership-lifecycle`, `rbac-matrix` | Revalidación DB/E2E; separar el caso robot del core remediado en Plan 010                         |
| Storage                    | `dashboard/account/actions.ts`, `src/lib/storage.ts`, proyectos/documentos            | SQL 16/17/32; E2E `qa-storage-realtime`; unit `small-helpers`                                 | Corregir origen de URL; documentar público/privado, tamaño, autorización y limpieza               |
| Realtime                   | `src/hooks/use-notifications.ts`, `use-presence.ts`, schemas notifications/presence   | Unit de hooks; SQL 18/27; E2E `qa-storage-realtime`                                           | Probar reconexión/contexto del candidato y consumo bajo cuotas                                    |
| Correo y jobs              | `src/lib/email/index.tsx`, `supabase/functions/process-email-queue/handler.ts`        | Unit email, Edge tests, SQL 14                                                                | Distinguir envío inline/cola/SMTP de Auth; entrega y agotamiento observados, no solo cron exitoso |
| API keys y webhooks        | `src/lib/api-keys/index.ts`, `src/app/api/v1/account/route.ts`, schema webhooks       | Unit actions/route; SQL 09/10                                                                 | Rate limit y salida segura de Plan 012; receta con alcance explícito al usar service role         |
| Flags                      | `src/lib/flags/index.ts`, `src/config/app.config.ts`                                  | Unit flags/config                                                                             | Distinguir flags de producto/tenant de disponibilidad del módulo y de autorización                |
| Administración y auditoría | `dashboard/admin/`, `audit-log-table.tsx`                                             | SQL 08/19; unit de actions y tabla                                                            | Corregir carga posterior/filtros de la variante plataforma                                        |
| Impersonación              | `src/lib/impersonation-cookie.ts`, actions admin                                      | SQL 20; E2E `impersonation`                                                                   | Recorrido con MFA, expiración y retorno; secreto dedicado bajo Plan 012                           |
| Exportación/borrado        | `supabase/schemas/gdpr.sql`, actions de cuenta                                        | SQL 24; unit actions                                                                          | Evidencia de exportación/purga/Storage y límites por proveedor; no equivale a certificación legal |
| Onboarding y marca         | `src/config/app.config.ts`, wizard y actions onboarding                               | SQL 21; E2E onboarding; unit config/actions                                                   | Configuración sin billing coherente; brand/domain/email revisados en instalación nueva            |
| Billing                    | `src/lib/billing/`, `api/internal/billing/worker/`                                    | Unit/contratos, SQL 33–42, E2E acceptance                                                     | Autoridad: matriz MP; otros proveedores no certificados por la existencia de un adapter           |
| Analítica/observabilidad   | `src/lib/analytics/`, logger, Sentry, workflows nightly                               | Unit/consent/E2E analytics y smoke                                                            | Alertas y actuación real del operador para el candidato; configuración externa no revalidada aquí |
| IA                         | Migración `20260610120000_advanced_extensions.sql` habilita vector                    | No se encontró un vertical completo de IA                                                     | Extensión disponible no es RAG/chat/créditos implementados; fuera del cierre                      |

## Hallazgos y propietario único

P0: comportamiento/autorización que impide el alcance ofrecido. P1: riesgo o
fiabilidad/adopción necesaria. P2: presentación/distribución futura. «Estático»
no afirma explotación en Cloud. No se reabre Plan 010 ni se alteran sus evidencias.

| ID    | Prioridad / evidencia          | Hallazgo y efecto                                                                                                                                                                                                    | Propietario / aceptación                                                                             |
| ----- | ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| RS-01 | P0, estático                   | `features.verticals.robot=false` oculta nav; `dashboard/robot/page.tsx` y `uploadRobotConfigAction` no lo comprueban. RPC `replace_robot_config` y políticas originales aceptan cualquier membresía, incluido viewer | Plan 014 T1: cierre de ruta/acciones y matriz SQL del ejemplo; no basta ocultarlo                    |
| RS-02 | P1, reproducción local aislada | `storage.ts` usa `value.startsWith(SUPABASE_URL)`; acepta hostname con sufijo ajeno y userinfo                                                                                                                       | Plan 014 T2: comparar origen parseado, rechazar userinfo y fijar regresiones                         |
| RS-03 | P1, estático                   | La primera página de auditoría plataforma usa `getPlatformAuditLogs`, pero filtros/cargar más invocan `getAccountAuditLogs`                                                                                          | Plan 014 T3: mantener dominio de consulta, columnas y errores en interacciones                       |
| RS-04 | P1, estático y ya planificado  | Pricing público usa traducciones/precios propios; no lee el catálogo usado por checkout                                                                                                                              | Plan 012 PR5: fuente común por proveedor/moneda/intervalo, sin cambiar slugs/precios                 |
| RS-05 | P1, estático                   | Flags de billing/projects/members/activity controlan enlaces; no constituyen disponibilidad de rutas/acciones. Onboarding sigue mostrando organización/invitación                                                    | Plan 015 T1: contrato limitado y pruebas de configuración, sin prometer modo B2C                     |
| RS-06 | P1, estático                   | `env.ts` exige Resend/FROM_EMAIL/MOCK_BILLING_SECRET aun con catcher local o UI billing apagada; imports del registry amplían dependencias                                                                           | Plan 015 T1: requisitos por transporte/capacidad; nunca resolverlo con bypass global de validación   |
| RS-07 | P1, brecha de evidencia        | No se realizó aquí instalación independiente, prueba de extensión ni actualización de derivado                                                                                                                       | Plan 015 T2/T3: ensayo limpio y mediciones, sin tocar otro proyecto                                  |
| RS-08 | P1, aceptación incompleta      | MP: renewal, refunds, invoice realmente omitida y escenarios parciales permanecen abiertos                                                                                                                           | Plan 011/matriz MP exclusivamente; no cerrar mediante otro plan o smoke genérico                     |
| RS-09 | P1, riesgo ya registrado       | Grants, salida HTTP/DNS, rate limit, CSP y secretos no fueron auditados exhaustivamente en esta pasada                                                                                                               | Plan 012: revalidar cada mecanismo; no afirmar exploit ni solución por presencia de una función      |
| RS-10 | P2, estático                   | `appConfig.description` promete funcionamiento desde el primer día y alimenta metadata                                                                                                                               | Plan 012 PR5: copy limitado a capacidades aceptadas; no cambiar aplicación en este parche documental |
| RS-11 | P2, documental                 | README llama activo a 010; index/resumen de current-state aún dicen discovery scan pendiente; catálogo no muestra capacidades centrales                                                                              | Corregido documentalmente en esta entrega; no implica corrección de código                           |
| RS-12 | P1, documentación/operación    | El formato de instalación, recetas y upgrades aparece ligado a comercializar; también se necesita para uso propio                                                                                                    | Plan 015 toma aceptación interna; Plan 013 reutiliza resultados para terceros                        |
| RS-13 | P2, documental                 | La estrategia de pruebas atribuía fallos del suite al entorno por pasar aisladamente, sin demostrar la causa                                                                                                         | Corregido: conservar el fallo original e investigar; una repetición aislada no certifica la suite    |

### RS-01: límite de la conclusión

`src/config/app.config.ts` explica que el robot se oculta por sus permisos.
La página solo comprueba `accountId`; la acción solo comprueba sesión/contexto.
La migración `20260702000003_replace_robot_config_rpc.sql` usa una comprobación
de membresía, no de rol; `20260611000000_iroko_robot_config.sql` configura DML
y Storage por membresía. No se encontraron migraciones posteriores que
corrijan ese contrato. La suite SQL 29 cubre projects/documents, no este caso.

No se afirma acceso entre tenants ni explotación de producción. Se confirma
una discrepancia entre «oculto», «desactivado» y el rol viewer esperado. El
plan debe probar SQL efectivo y llamadas directas antes de cerrar el hallazgo.

### RS-02: reproducción sin red

Se leyó el módulo real `src/lib/storage.ts`, se sustituyó solo su import de
entorno por `NEXT_PUBLIC_SUPABASE_URL=https://proj.supabase.co`, se transpilaron
sus tipos con TypeScript instalado y se ejecutó en un contexto Node aislado.
No se escribieron tests ni se modificó código. Resultados:

| Entrada                                                           | Host parseado                       | Resultado actual     |
| ----------------------------------------------------------------- | ----------------------------------- | -------------------- |
| `https://proj.supabase.co/storage/v1/object/public/avatars/a.png` | `proj.supabase.co`                  | Aceptada, correcto   |
| `https://proj.supabase.co.attacker.example/a.png`                 | `proj.supabase.co.attacker.example` | Aceptada, incorrecto |
| `https://proj.supabase.co@attacker.example/a.png`                 | `attacker.example`                  | Aceptada, incorrecto |

Esto prueba el fallo del helper. No prueba que CSP/Next Image permitan cargar
esas imágenes ni que un atacante pueda persistir la URL en producción. No es
una demostración de SSRF ni de ejecución de código.

## Decisiones de alcance

Conservar el monolito modular y Supabase-first. Cerrar defectos de las
superficies presentes antes de anunciar reutilización. Probar una configuración
actual y una instalación nueva sin venta de suscripciones. No desarrollar el
otro proyecto personal, IA, generadores, cuatro proveedores o roles arbitrarios
para completar esta investigación. La estrategia competitiva está en
[product-strategy](../architecture/product-strategy.md), con fuentes oficiales.

## Verificación de esta investigación

| Comando / acción                                                                           | Resultado observado                                                                                                   | Alcance                                                                    |
| ------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| `git status --short`, `git branch --show-current`, `git rev-parse HEAD`, remotes/identidad | `main`, baseline indicado, limpio al comenzar                                                                         | Estado local; no fetch ni comparación remota                               |
| `pnpm typecheck`                                                                           | No llegó a tsc: `ERR_PNPM_ABORTED_REMOVE_MODULES_DIR_NO_TTY` durante sincronización automática                        | No es fallo de tipos                                                       |
| `pnpm test`                                                                                | 99 archivos / 1032 tests pasaron; 161,03 s                                                                            | Vitest completo del baseline; no E2E/pgTAP/Edge                            |
| `node_modules/.bin/tsc.cmd --noEmit`                                                       | Exit 0                                                                                                                | Tipos del baseline; ejecutable local para evitar sincronización automática |
| `node_modules/.bin/eslint.cmd .`                                                           | Exit 0, 4 warnings existentes de non-null assertion en `mercadopago-cloud-acceptance.spec.ts` (líneas 50, 51, 53, 74) | Sin errores; los warnings no se corrigieron en esta entrega documental     |
| Probe de `storageUrl` con entorno sintético                                                | Dos URLs externas aceptadas                                                                                           | Reproducción aislada de RS-02                                              |

Durante `pnpm test`, pnpm 11.22.0 ejecutó una sincronización automática que
reportó lockfile vigente y dependencias ya actualizadas, además de `prepare`
(Husky). No fue solicitada una instalación y no se repitió intencionalmente;
no cambió archivos versionados de dependencias. Los checks siguientes usan
binarios existentes. Esto no se presenta como ensayo de instalación limpia.

Build, coverage, pgTAP, Edge, navegador, instalación limpia, prueba de carga,
estado actual de CI/Cloud, cuotas consumidas y demanda comercial:
**[NO VERIFICADO]** en esta investigación. Las evidencias previas mantienen su
fecha y alcance en el [registro operacional](../quality/operational-evidence.md).

### Validación documental y revisión final

El checker del repositorio revisó **93 archivos Markdown, cero incidencias**;
sus tests pasaron **4/4** mediante
`node scripts/__tests__/check-docs.test.mjs`. Las invocaciones iniciales
`node scripts/check-docs.mjs` y `node --test scripts/__tests__/check-docs.test.mjs`
encontraron `spawn EPERM` al abrir subprocesos en este entorno. Se ejecutó la
misma función exportada sin cambiar el checker, enumerando archivos desde
PowerShell; no se omitieron documentos ni reglas:

```powershell
$docFiles = @(git ls-files --cached --others --exclude-standard -- '*.md')
$docFiles | ConvertTo-Json -Compress | node --input-type=module -e 'import {checkMarkdownFiles} from "./scripts/check-docs.mjs"; let input=""; for await (const chunk of process.stdin) input+=chunk; const files=JSON.parse(input); const issues=checkMarkdownFiles({root:process.cwd(),files}); console.log(JSON.stringify({files:files.length,issues})); if(issues.length)process.exitCode=1;'
```

La revisión de coherencia separó aceptación MP, correcciones de referencia,
reutilización interna y distribución comercial; retiró la dependencia artificial
de esperar una renovación para trabajar en hardening o reutilización.
Prettier, ejecutado desde el binario local con `--check --ignore-path
.prettierignore-docs` sobre los 13 Markdown cambiados, pasó. `git diff --check`
terminó con exit 0. `git status --short` confirma nueve documentos modificados
y cuatro nuevos; ningún archivo de aplicación, migración o dependencia cambió.
Los nuevos planes permanecen propuestos, sin implementación iniciada.
