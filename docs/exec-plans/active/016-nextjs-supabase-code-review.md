# Plan 016 — Revisión de Next.js, seguridad Supabase y arquitectura de datos

- Fecha: 2026-09-29.
- Estado: T0 cerrado; T1 cerrada como revisión estática; T2/T3 pendientes.
- Tipo: revisión técnica, no plan de implementación ni certificación de producción.
- Base local de planificación: `main` en `f82d2fbe381014c80a090ba3c36c99e4778111c3`.
- Contexto: 14 documentos modificados/nuevos preexistentes; conservarlos. La
  inspección selectiva para delimitar este plan no reemplaza la revisión.
- Objetivo: identificar defectos y deuda verificable que afecten seguridad,
  operación y reutilización de la base, con correcciones acotadas y responsables.

## Contrato y fuentes

Leer [estado actual](../../current-state.md), [arquitectura](../../architecture/system-overview.md),
[estrategia de producto](../../architecture/product-strategy.md),
[ADR 0001](../../adr/0001-documentation-authority-and-agent-contract.md),
[ADR 0003](../../adr/0003-mercadopago-reliability-boundaries.md) y
[estrategia de pruebas](../../quality/testing-strategy.md). Leer `TESTING-PLAN.md`
antes de cualquier propuesta que cambie pruebas.

Fuentes técnicas de referencia:

- Next.js instalado: `16.3.5`, con documentación en
  `node_modules/next/dist/docs/01-app/`. Verificar de nuevo la versión al ejecutar.
  Usar guías `authentication.md`, `data-security.md`,
  `server-and-client-boundary.md`, `caching-without-cache-components.md`,
  `production-checklist.md` y referencias de las APIs realmente utilizadas.
- [Next.js Guides](https://nextjs.org/docs/app/guides) y
  [API Reference](https://nextjs.org/docs/app/api-reference): registrar sección,
  fecha y compatibilidad con la versión instalada para cada recomendación.
- [Supabase SSR](https://supabase.com/docs/guides/auth/server-side/nextjs),
  [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security),
  [Storage](https://supabase.com/docs/guides/storage/security/access-control) y
  documentación PostgreSQL correspondiente a la versión del entorno revisado.
- Skills disponibles: `code-review-excellence`, `multi-reviewer-patterns`,
  `vercel-react-best-practices`, `supabase` y
  `supabase-postgres-best-practices`; pruebas según `TESTING-PLAN.md`.
  Las skills son apoyo local, no autoridad sobre el contrato del repositorio.

La inspección de planificación registra `reactCompiler: true` y
`cacheComponents: false` en Next, PostgreSQL 17 y exposición API local de
`public` en `supabase/config.toml`. El inventario inicial de datos cuenta 159
migraciones y 42 archivos pgTAP; estos conteos no son cobertura ni paridad Cloud.

Conservar `src/proxy.ts`, React Compiler, navegación tipada de next-intl y el
monolito modular. No introducir `middleware.ts`, memoización manual, otra
librería de consultas ni migración a Cache Components por aplicar una receta.
Comprobar la configuración efectiva antes de recomendar cambios.

## Responsables y límites

Los tres agentes trabajan en lectura. El coordinador es el único escritor del
informe consolidado y de los enlaces de estado. Los nombres identifican roles;
las conclusiones dependen de evidencia, no de la etiqueta del agente.

| Frente                    | Responsable                                           | Propiedad principal                                                                              | Segunda lectura                                                    |
| ------------------------- | ----------------------------------------------------- | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------ |
| N — Next.js/React         | `code-reviewer` (`scope_next_react` en planificación) | Renderizado, navegación, límites cliente/servidor, caché, errores, interacción y rendimiento web | Seguridad valida cualquier impacto en acceso o exposición de datos |
| S — Seguridad Supabase    | `security-auditor` (`scope_supabase_security`)        | Sesión, autorización, aislamiento, RLS, grants, Storage y entradas privilegiadas                 | Datos contrasta invariantes SQL; Next contrasta cookies y caché    |
| D — Arquitectura de datos | `backend-architect` (`scope_data_architecture`)       | Modelo, migraciones, integridad, transacciones, consultas, colas e idempotencia                  | Seguridad valida privilegios; Next contrasta consumo de consultas  |
| C — Coordinación          | Agente principal                                      | Baseline, ejecución común de checks, reproducción, deduplicación, severidad e informe            | Revisor distinto del autor confirma hallazgos bloqueantes          |

La concurrencia del trabajo de lectura no implica ejecutar tres suites contra
el mismo entorno. El coordinador serializa build, E2E y pruebas de base de datos.

## Alcance y cobertura

Ampliación solicitada por el mantenedor: revisar cada archivo y cada línea del
código propio, cada configuración y cada regla aplicable. Se retira el muestreo
de UI del alcance anterior. Priorizar por riesgo ordena el trabajo; no elimina
archivos de bajo riesgo ni permite declarar revisada una carpeta por sus helpers.

### Inventario obligatorio y trazabilidad

T0 producirá un manifiesto de archivos a partir de `git ls-files --cached
--others --exclude-standard`, complementado con configuración local pertinente
identificada sin revelar secretos. Separar archivos mantenidos, generados,
dependencias, assets, documentos actuales y material histórico. Registrar cada
exclusión con motivo y método alternativo; no excluir por tamaño o repetición.

El manifiesto de ejecución se guardará junto al informe en `docs/audits/`, en
CSV o JSON, con: ruta relativa, categoría, dueño, SHA del candidato y hash del
contenido local, número de líneas, rangos leídos, criterios aplicados, evidencia
breve específica del archivo, hallazgos, comprobaciones y estado. Si cambia un
archivo, su revisión queda pendiente de revalidar sobre el contenido nuevo.
No versionar hashes ni contenidos de secretos o archivos de credenciales.
Un cambio obliga también a revalidar conclusiones de consumidores/dependencias
afectados, aunque sus propios archivos no hayan cambiado.

Estados: pendiente, lectura parcial, lectura completa con contraste, validación
pendiente y validado en el alcance indicado. La lectura completa exige recorrer
todos los rangos de líneas, comprender sus contratos y revisar consumidores y
productores relevantes; `rg`, un linter o abrir el archivo no cumplen ese criterio.
Registrar archivos sin hallazgos con evidencia concreta, sin inventar observaciones
para llenar la tabla. No hace falta un comentario por cada línea.

### Cobertura por superficie

| Superficie                                                                                     | Cobertura exigida                                                                                                     | Responsable / contraste            |
| ---------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- | ---------------------------------- |
| Código propio en `src/`, incluidos UI base incorporada, hooks, providers, estilos y utilidades | Lectura integral; revisar también duplicación, código muerto, consistencia y contratos de tipos                       | N / S, D según dominio             |
| SQL de todas las migraciones, espejos, seed y funciones Edge                                   | Lectura integral de secuencia e invariantes; no limitarse al último esquema o a archivos con RLS en su nombre         | D / S                              |
| Tests, fixtures, mocks, helpers, scripts y automatizaciones propios                            | Lectura integral; contrastar aserciones, omisiones, determinismo, limpieza y efectos externos                         | Dueño N/S/D del comportamiento / C |
| Configuración de Next, React, TypeScript, ESLint, formatos, build, paquetes y workspaces       | Revisar cada opción explícita y los defaults que afecten el comportamiento; comprobar overrides y versiones efectivas | N / C                              |
| Supabase, despliegue, observabilidad, `.github/`, hooks Git y scripts de release               | Revisar cada regla, condición, permiso, exclusión y destino; distinguir declaración local de aplicación real en Cloud | C / S, D                           |
| Traducciones, catálogos, configuración de producto y datos estáticos que gobiernan lógica      | Lectura integral y consistencia entre idiomas, menús, precios, flags y contratos                                      | N / D                              |
| AGENTS, CLAUDE, reglas locales relevantes, ADR aceptados y documentación operativa vigente     | Leer cada regla aplicable y contrastarla con código, configuración y fuentes oficiales; registrar contradicciones     | C / responsable técnico            |

Ejemplos de configuración incluidos: `next.config.ts`, `src/env.ts`,
`tsconfig.json`, `eslint.config.mjs`, `vitest.config.ts`, `playwright.config.ts`,
`supabase/config.toml`, `vercel.json`, `pnpm-workspace.yaml`, `package.json`,
configuración Sentry, PostHog, sitemap, PostCSS, Prettier, Knip, commitlint,
lint-staged, `.gitignore`, exclusiones de secretos y workflows. El inventario
real manda: esta lista no es exhaustiva ni sustituye descubrir archivos ocultos.

La documentación vigente entra como contrato y afirmaciones a verificar; los
planes cerrados y documentos históricos conservan su fecha y no se reinterpretan
como promesas actuales. Las skills aplicadas se contrastan con documentación
oficial; no es parte de esta revisión auditar todas las skills ajenas al producto.

### Límites explícitos de «cada línea»

- `node_modules`, bundles, binarios, cachés y assets gráficos no reciben auditoría
  manual línea por línea. Se registran como dependencias/artefactos; revisar
  procedencia, versiones, avisos de seguridad, configuración y usos relevantes.
  Código de terceros incorporado y mantenido dentro de `src/` sí entra.
- Lockfile y tipos generados reciben validación de correspondencia con sus
  fuentes, resolución y consumidores; sus generadores/configuración se leen.
  No contar esa validación automática como lectura manual de sus líneas.
- Entorno local: revisar nombres, origen, precedencia y alcance de variables
  sin copiar valores sensibles al informe. Configuración efectiva Cloud requiere
  comprobación separada; no se certifica desde `vercel.json` o `config.toml`.
- Las pruebas en ejecución cubren los escenarios acordados y las hipótesis
  encontradas; no se promete probar todas las combinaciones posibles. Leer toda
  la UI no equivale a certificación completa de accesibilidad o de SEO.

### Matrices de configuración y reglas

Además del manifiesto de archivos, entregar una matriz por opción/regla:
origen, propósito, valor o comportamiento no sensible, consumidor, efecto,
referencia oficial/versionada, evidencia y decisión. Evaluar defaults relevantes,
reglas desactivadas, exclusiones y excepciones con la misma atención que opciones
habilitadas. Registrar precedencias y diferencias local/CI/producción, opciones
desconocidas o ignoradas y qué valor efectivo se pudo comprobar. Para reglas:
cumple, incumple, excepción justificada, no aplica o
pendiente; justificar cada excepción y cada «no aplica».

Cruzar reglas del repositorio con configuración efectiva: una instrucción escrita
no demuestra cumplimiento ni que el comportamiento descrito sea universal en
Next.js. Diferenciar norma local, requisito del framework y recomendación optativa.
La evidencia de comportamiento actual no convierte un defecto en práctica válida.

La lectura por archivo se completa con trazados entrada → validación →
autorización → consulta/efecto → respuesta e invalidación, incluyendo rutas
alternativas, fallos y concurrencia. Revisar archivos aislados no demuestra que
los contratos entre ellos se cumplan.

### Lotes y progreso

Revisar por lotes de módulo y configuración con lista cerrada de archivos;
mantener límites de contexto y continuar hasta cubrir el inventario completo.
Cada entrega parcial informa archivos/líneas leídos frente al total incluido,
reglas contrastadas, escenarios ejecutados y pendientes por frente. Son métricas
de cobertura del trabajo, no porcentajes de seguridad ni madurez del producto.
Los hallazgos graves se comunican al confirmarse, sin esperar el último lote.

### N — Next.js y React

Superficies iniciales: `next.config.ts`, `src/proxy.ts`, `src/env.ts`,
`src/app/[locale]/`, `src/app/api/`, `src/i18n/`, `src/components/layout/`,
componentes de dashboard, providers, `src/hooks/`, `src/lib/server-action.ts`,
clientes Supabase y tests asociados.

Criterios:

1. Límites Server/Client Components, importaciones exclusivas del servidor y
   datos serializados hacia el navegador.
2. Server Actions y Route Handlers validan entradas; enlazar su autorización
   al frente S en lugar de asumirla por el layout o un wrapper de errores.
3. Cookies de sesión, redirecciones e idioma se conservan al componer respuestas.
4. Caché de Next, respuestas HTTP y claves/invalidaciones del cliente no mezclan
   usuarios ni cuentas; contrastar login, logout y cambio de cuenta con S.
5. Uso correcto de APIs asíncronas, redirecciones, `notFound`, errores esperados
   e inesperados; comprobar comportamiento visible y registro útil.
6. Consultas independientes, peticiones repetidas, volumen serializado y carga
   de módulos pesados: medir antes de declarar un problema de rendimiento.
7. Suscripciones Realtime y efectos se limpian al desmontar/cambiar de cuenta;
   no duplican eventos ni mantienen datos del contexto anterior.
8. Rutas, títulos, menús y módulos desactivados son coherentes; formularios
   críticos tienen estados de carga/error/vacío y operación por teclado.

No incluye rediseño visual, auditoría exhaustiva de accesibilidad ni SEO completo.

### S — Seguridad Supabase y límites de aplicación

Superficies iniciales: `src/lib/supabase/`, `src/lib/active-account.ts`,
`src/lib/permissions.ts`, `src/lib/auth/`, `src/lib/api-keys/`,
`src/lib/impersonation-cookie.ts`, acciones de cuenta/equipo/admin,
`src/lib/storage.ts`, `src/lib/robot-config.ts`, entradas API/webhook/worker,
`supabase/schemas/`, migraciones y pruebas SQL de autorización.

Criterios:

1. Identidad verificada, renovación/cierre de sesión y contextos de MFA; no
   confundir un JWT válido con una membresía o rol todavía vigentes.
2. Autorización antes de efectos sensibles y derivación confiable de la cuenta;
   probar URL directa, acción directa y acceso SQL/API, además del menú.
3. Políticas SELECT/INSERT/UPDATE/DELETE, grants y RPC con privilegios elevados:
   función invocable, rol efectivo, `search_path` y autorizaciones internas.
4. Uso del cliente administrativo: justificar cada consumidor y localizar la
   validación que sustituye la protección RLS omitida por ese cliente.
   Buscar también construcciones directas del SDK fuera de `createAdminClient`.
5. Buckets públicos/privados, rutas de objetos, URLs firmadas, metadatos,
   reemplazo y descarga respetan pertenencia, rol y límites de carga.
6. Claves API, impersonación y exportación/borrado de datos conservan sus
   límites; no extrapolar permisos humanos a futuras credenciales IoT.
7. Firmas y autenticación de webhooks/workers, validación de destinos externos,
   abuso de endpoints, CSP y redacción de secretos/datos sensibles en logs.
8. Realtime, caché y respuestas al navegador no filtran datos de otra cuenta.

No incluye pentest externo, ataques a proveedores ni extracción de datos reales.

### D — Arquitectura de datos y servicios durables

Superficies iniciales: `supabase/config.toml`, `supabase/migrations/`,
`supabase/schemas/`, `src/types/database.ts`, RPC y consumidores en `src/lib/`,
`src/lib/billing/`, notificaciones, `supabase/functions/process-email-queue/`
y pruebas de base de datos. Mapear esquemas expuestos y wrappers reales antes
de asumir acceso PostgREST a esquemas internos.

Criterios:

1. Claves, restricciones, nulabilidad y relaciones conservan integridad de
   cuentas, membresías, recursos y archivos; detectar enlaces entre cuentas.
2. Migraciones ordenadas, espejos SQL y tipos reflejan el mismo contrato.
   Un diff textual no demuestra el estado efectivo de PostgreSQL.
3. Mutaciones de varios pasos explicitan transacción, compensación o estado
   recuperable; examinar carreras, pérdida de actualizaciones y cuotas.
4. Webhooks, reducer y jobs deduplican y respetan orden/estado; el checkout
   no activa acceso por una afirmación del navegador, conforme a ADR 0003.
5. Colas, leases, reintentos, agotamiento y recuperación dejan estado durable
   y diagnóstico; un cron exitoso no prueba que se completó el trabajo.
6. Consultas tienen selección y paginación adecuadas; índices se justifican
   con filtros/joins/orden reales y, cuando sea posible, planes de ejecución.
7. Retención, borrado y auditoría no rompen referencias ni conservan datos
   sin finalidad; separar reglas de negocio de detalles de la vertical robot.
8. Contratos de extensión y servicios opcionales sostienen Plan 015 sin
   introducir un framework de plugins ni otra fuente de verdad del catálogo.

No incluye migrar ORM, motor, esquema o billing a Deno; tampoco certifica
renovaciones/reembolsos externos ni límites de escala sin mediciones.

## Escenarios compartidos obligatorios

Usar cuentas sintéticas A/B y actores anónimo, usuario sin membresía, owner,
admin, member, viewer, miembro revocado y platform admin. Verificar primero los
roles efectivamente implementados; no inventar permisos ni asignar service role
a una persona. Añadir clave API y worker como identidades separadas.

El primer frente de cada fila entrega la conclusión; los indicados después de
la barra contrastan la evidencia.

| Escenario                                                               | Responsable / contraste | Evidencia requerida en la revisión                              |
| ----------------------------------------------------------------------- | ----------------------- | --------------------------------------------------------------- |
| Login, MFA cuando corresponda, refresh, logout y redirección localizada | S / N                   | Recorrido y propagación de cookies; pruebas existentes y huecos |
| Cambio A → B, navegación atrás, caché y notificaciones                  | N / S                   | Estado visible y acceso directo sin reutilizar datos de A       |
| Viewer, revocación con JWT antiguo y acceso cruzado A/B                 | S / D                   | Acción y política SQL; distinguir mocks de denegación real      |
| Invitación, aceptación y cambio de membresía                            | S / D                   | Permisos, invariantes y efectos de concurrencia                 |
| Crear recurso, subir/descargar/reemplazar archivo privado               | S / D, N                | Pertenencia, consistencia DB/Storage y errores visibles         |
| Módulo robot apagado y acceso por URL/acción                            | S / N                   | Revalidar RS-01 y enlazar Plan 014                              |
| Filtros y paginación de auditoría de plataforma                         | N / S, D                | Consulta correcta, privilegios y manejo de error; RS-03         |
| Webhook repetido y reintento/interrupción de worker                     | D / S                   | Autenticación e invariantes de efecto único; evidencia local    |

Incluir casos negativos de token inválido, tenant admin intentando operaciones
de plataforma, AAL1 intentando una operación que exige AAL2, API key revocada y
worker sin secreto. Cada denegación debe tener un control positivo autorizado;
una función que falla para todos no demuestra autorización correcta. No asumir
que un `db_pre_request` de PostgREST protege endpoints propios de Next.js.

Datos cubrirá además dos solicitudes compitiendo por el último cupo, webhooks
concurrentes con reconciliación, paginación de varios batches con fallo intermedio
y envío de email seguido de fallo al confirmar consumo. La concurrencia requiere
sesiones independientes; no prometer entrega exactamente una vez sin mecanismo
y evidencia que la sostengan.

Si no existe una prueba o fixture necesaria, registrar el hueco y el procedimiento
propuesto. No convertir una ausencia de prueba en una vulnerabilidad confirmada.

## Ejecución y precondiciones

### T0 — Fijar candidato e inventario

- [x] Registrar SHA, rama, diff local, versiones efectivas y fecha. No actualizar
      dependencias ni limpiar cambios ajenos para conseguir un candidato verde.
- [x] Crear el manifiesto exhaustivo por archivo y las matrices de configuración
      y reglas; asignar dueño a todas las entradas y justificar exclusiones.
- [x] Releer la auditoría del 24 de septiembre y planes 011/012/014/015 para
      marcar hallazgos conocidos, cerrados históricamente y pendientes actuales.
- [x] Acordar entorno y rutas exactas de pruebas. No imprimir valores de `.env`.
- [x] Resolver y registrar cómo deshabilitar las subidas externas del build
      según la versión instalada de Sentry y su configuración. Hasta verificar
      el mecanismo, no ejecutar build/analyze ni E2E que lance build. Quitar una
      variable del proceso no basta si `.env.local` puede volver a cargarla.

### T1 — Tres revisiones en lectura

La continuación se organiza con el
[subplan T1 — seguridad, integridad y flujos críticos](016-t1-security-integrity-critical-flows.md).
Su mapa asigna las 947 rutas sin reducir alcance. Es planificación de las tareas
pendientes, no evidencia de un nuevo lote ni una segunda secuencia de roadmap.

- [x] Cada frente entrega criterios aplicados, referencias, archivos revisados,
      candidatos a hallazgo, fortalezas observadas y vacíos de evidencia.
- [x] Cubrir todos los archivos y rangos del manifiesto, incluidas configuración,
      pruebas, scripts y reglas; no cerrar lotes con archivos omitidos silenciosamente.
- [x] El coordinador cruza interfaces compartidas; revisar en segundo frente
      cualquier candidato P0/P1 antes de considerarlo confirmado.
- [x] Resolver recomendaciones contradictorias contra código, evidencia,
      documentación aplicable y contrato del proyecto. No decidir por votación.

### T2 — Validación común del candidato

Ejecutar una vez los checks comunes y luego solo los relevantes para reproducir
un candidato. No modificar código ni tests como parte de la revisión; las pruebas
de regresión permanentes pertenecen a las correcciones posteriores.

| Comando existente                   | Precondición y alcance de la evidencia                                                                                                                |
| ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm typecheck` y `pnpm lint`      | Toolchain instalada; análisis estático, sin `--fix`                                                                                                   |
| `pnpm test`                         | Revisar setup y selección de tests para excluir llamadas reales; registrar fallos, skips y duración                                                   |
| `pnpm test <sufijo-unico>`          | Reproducción focalizada; en Windows evitar rutas con corchetes interpretables                                                                         |
| `pnpm build`                        | Entorno de prueba coherente; impedir uploads externos de observabilidad antes de ejecutar; no usar bypass de validación como evidencia de instalación |
| `pnpm supa:lint` y `pnpm supa:test` | Solo DB local desechable identificada y con esquema preparado; pgTAP puede escribir fixtures                                                          |
| `pnpm test:functions`               | Deno/dependencias ya disponibles y pruebas sin envío real ni servicios externos                                                                       |
| `pnpm test:e2e <spec>`              | Por ejemplo `auth.spec.ts` o `active-account.spec.ts`; target local y fixtures sintéticos verificados, sin `PLAYWRIGHT_BASE_URL` remoto               |
| `node scripts/check-docs.mjs`       | Enlaces y referencias documentales; no prueba comportamiento de la app                                                                                |

Playwright carga `.env.local`, puede reutilizar un servidor y ejecuta build/start;
sus fixtures pueden crear/eliminar usuarios. Verificar proyecto, URL, puerto y
contenedor local seleccionados por los helpers antes de ejecutar. No basta con
que el navegador use localhost si Supabase apunta a Cloud. Un entorno existente
del mantenedor no se considera desechable por defecto. El helper SQL puede elegir
el primer contenedor `supabase_db`: confirmar cuál escogerá. Los tests de cola
incluyen purga/borrado de fixtures; tampoco son inspección de solo lectura.

Si se comparan tipos generados, producir una copia temporal: `supa:gen:types`
sobrescribe el archivo versionado y no se ejecuta como un check inocuo. Una
hipótesis de bundle puede justificar `pnpm analyze`; no es un gate universal.

No ejecutar reset, migraciones, cargas de volumen ni `EXPLAIN ANALYZE` sobre datos
reales. Si falta entorno seguro, continuar la inspección estática y declarar
SQL/E2E **[NO VERIFICADO]**, con causa y siguiente comprobación concreta.
Preparación destructiva de entornos, instalación, escrituras Cloud, pagos,
deploy, push y merge no forman parte de este plan de revisión.

### T3 — Consolidar y entregar

- [ ] Reproducir o demostrar por recorrido de código cada defecto reportado.
- [ ] Unificar misma causa/impacto sin perder ubicaciones; conservar cuestiones
      distintas aunque compartan archivo. Calibrar severidad con impacto y
      condiciones demostradas; documentar desacuerdos todavía abiertos.
- [ ] Asignar cada corrección a un plan existente o proponer una tarea nueva
      acotada. No implementar correcciones desde este plan.
- [ ] Registrar fecha/SHA y resultados de comandos; si cambia el candidato,
      revalidar únicamente las conclusiones afectadas antes de publicarlas.

## Entregable y severidad

El coordinador creará al ejecutar la revisión un informe fechado en `docs/audits/`
con nombre `AAAA-MM-DD-nextjs-supabase-code-review.md`. No se crea ahora un informe
vacío que parezca evidencia. Incluir alcance, manifiesto exhaustivo de cobertura,
matrices de configuración y reglas, hallazgos, resultados de comandos, pendientes,
fortalezas y orden de remediación. El registro de lectura y el registro de pruebas
son evidencias distintas; ninguno sustituye al otro.

Cada entrada tendrá: ID N/S/D, título, prioridad, estado de evidencia, archivo y
línea, condición de entrada, resultado esperado/observado, impacto, referencia
oficial aplicable, reproducción o trazado, corrección mínima, prueba de cierre,
dueño y vínculo al plan. Usar estados «confirmado por código», «reproducido en
local», «hipótesis pendiente» y «mejora opcional» sin mezclarlos.

- P0: impacto crítico e inmediato demostrado, como acceso indebido grave o
  corrupción de datos. No asignarlo solo por el nombre del área.
- P1: defecto importante de seguridad, integridad o flujo esencial bajo
  condiciones concretas. Cerrar antes del uso afectado con usuarios reales.
- P2: deuda o defecto acotado con impacto comprobable y mitigación viable.
- Mejora opcional: alternativa de diseño/estilo o rendimiento aún no medido;
  no bloquear el producto por preferencia del revisor.

La falta de ejecución SQL/E2E limita el dictamen: puede entregarse una revisión
estática completa de su inventario, pero la revisión integral conserva abiertos
esos checks. Cero hallazgos no significa ausencia garantizada de vulnerabilidades.

## Relación con trabajo existente y cierre

- [Plan 011](../deferred/011-billing/011-billing-correctness.md): conserva aceptación de proveedores y
  recuperación; este review evalúa implementación/contratos, no renueva evidencia Cloud.
- [Plan 012](012-security-hardening-and-pricing-truth.md): recibe hardening y
  coherencia de pricing; evitar una segunda lista de correcciones sin dueño.
- [Plan 014](014-reference-surface-correctness.md): conserva robot, orígenes de
  imágenes y auditoría. Revalidar esos defectos, no presentarlos como nuevos.
- [Plan 015](015-reusable-foundation-acceptance.md): recibe límites de módulos y
  reutilización; la instalación independiente sigue siendo su criterio propio.
- [Plan 013](../deferred/013-launch-readiness-roadmap.md): distribución comercial condicional.

No hace falta un ADR para asignar revisores. Proponer uno solo si un hallazgo
requiere una decisión duradera que cambie los límites arquitectónicos aceptados.

La entrega estática puede completarse con SQL/E2E **[NO VERIFICADO]**, siempre
que identifique las limitaciones y sus siguientes pasos. Esto no cierra el plan
integral. Para cerrar Plan 016, el 100% de archivos y rangos de líneas incluidos
debe tener lectura completa con contraste; todas las opciones/reglas inventariadas
deben tener decisión documentada; no deben quedar archivos propios sin asignar ni
exclusiones sin justificar. Los tres frentes deben entregar cobertura trazable,
los hallazgos estar contrastados y priorizados, y las validaciones obligatorias
acordadas tener resultados registrados y analizados (incluidos fallos reales).
Asignar dueño a una validación pendiente no equivale a ejecutarla. Las
correcciones pueden quedar en sus planes con responsable y prueba de cierre;
terminar este review no declara preparación productiva ni cierra implementación.

## Registro de planificación

- 2026-09-29: alcance solicitado por el mantenedor; los tres agentes entregaron
  inventario, criterios, escenarios y precondiciones de sus frentes en lectura.
  Sus aportes se consolidaron aquí. Inspección selectiva y documentación solamente.
  La ejecución integral y la corrección de hallazgos siguen pendientes.
- 2026-09-29, ampliación: el mantenedor pide revisar cada configuración, línea y
  regla. Se elimina muestreo de código propio, se añaden manifiesto por archivo,
  matrices de configuración/reglas, responsables de tooling/CI y cierre de cobertura
  exhaustiva. Esta ampliación documental no constituye lectura ya ejecutada.

### Continuación T1 — 2026-10-07, lote 3

[Registro y límites](../../audits/2026-10-07-plan-016-t1-batch-3.md): D-03/D-04 confirmados por código con segunda lectura; N-06 reproducido en componente aislado, impersonación E2E pendiente. Manifiesto: 947 rutas, 205 lecturas completas, 672 pendientes y 70 métodos alternativos. Sin cambios de aplicación/tests/SQL ni ejecución T2. T1 sigue abierta.

### Continuación T1 — lotes 4–7

[Registro](../../audits/2026-10-07-plan-016-t1-batch-7.md):425 completas,452
pendientes,70 alternativas. D-07/D-08 estáticosP1; runtime pendiente. Matrices
y cobertura restante abiertas. Sin aplicación/tests/SQL/Cloud ni T2.

## Consolidacion de cobertura —2026-10-08

[Registro](../../audits/2026-10-08-plan-016-t1-closure.md):947 rutas,874lecturas
completas y73alternativas aplicadas;4153opciones y654normas con decisiones
estaticas. Checkpoints anteriores conservan fecha. T2/T3/correcciones no cerradas.
