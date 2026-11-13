# Plan 016 — Revisión de Next.js, seguridad Supabase y arquitectura de datos

## Entrada operativa — 2026-11-10

> **Para agentes:** aplicar `superpowers:executing-plans` por bloques y revisión
> independiente antes del veredicto. Esta preparación documental no ejecuta T2/T3.

**Objetivo:** aceptar el circuito MVP de la base Supabase + presentación Next.js,
reutilizando evidencia válida y corrigiendo sólo defectos confirmados del alcance
ofrecido. **Arquitectura:** conservar el monolito modular, Supabase como backend
principal y los consumidores Next existentes. **Stack:** Next.js/React/TypeScript,
Supabase/PostgreSQL, Vitest y Playwright instalados; renovar versiones al iniciar.
**Decisión de alcance:** [ADR0005](../../adr/0005-replicable-saas-mvp-and-bounded-acceptance.md).
No hace falta otro ADR: se ordena la ejecución de la decisión ya aceptada.

Estado2026-11-12: **ejecución parcial;016 permanece activo**.
Actualización2026-11-13: **P1 abierto S-016.CLOUD-TRACE**. El artefacto13999499918
del run43343240727 contenía credenciales Supabase/bypass Vercel sin redactar;
eliminado y ausencia verificada0. Rotación específicamente autorizada: preparación
completada (sustituta RPC200, GitHub y Vercel production/preview actualizados),
revocación pendiente. Captura/artefactos reparados localmente con33tests PASS,
lint0errores/4warnings y tsc0 antes del último ajuste trivial de test; revisión
final en curso. Revocar credenciales anteriores sólo después de entrega Git y deploy
automático READY con sustitutas; comprobar salud y política segura de artefactos
antes de repetir MP Cloud. Dueño ejecución016/operaciones; no hay cierre016
por eliminar el artefacto ni por separar la aceptación de pasarelas.
[Evidencia, clasificación DB y límites](../../audits/2026-11-12-nextjs-supabase-code-review.md):
D-03.TEAMS/DB-05 reparado localmente, SQL58 archivos1189 asserts PASS y consumidor
Next6/6. Cloud/local180 tras dos migraciones específicamente autorizadas y readback.
Worker real programado/entrega/rechazo/archivo/alerta/recuperación PASS, fixtures0.
Billing habilitado conserva obligaciones PSP.
Los16 IDs N/seguimientos no reciben PASS por disposición. Gates obligatorios
[NO VERIFICADO] impiden cierre. Preparación documental previa preservada sin integrar.
T0/T1 están cerrados para su candidato histórico; no se reabren ni se presentan
como lectura del código actual. Los cuatro bloques siguientes son la entrada
vigente del mismo016; los criterios N/S/D y registros históricos siguen debajo.

Baseline de preparación: `5dd46f9d4e5463155754a592ca4e8febd745a39d` (PR250,
main), Next16.4.5, Supabase JS2.119.0,179 migraciones y57 archivos pgTAP.
CI de PR250 y main42866480336 verde es evidencia fechada, no aceptación Cloud.
Al ejecutar, registrar HEAD real y decidir qué resultados siguen siendo válidos.

### Bloque 1 — Candidato, oferta y evidencia (actualización T0)

- [x] Registrar HEAD/status/versiones y diferencias respecto del baseline; preservar
      fuentes pendientes, secretos y material ignorado de015.
- [x] Fijar oferta efectiva desde `src/config/app.config.ts`, `src/env.ts`, rutas,
      acciones y configuración. Billing habilitado exige decidir sus escenarios;
      projects/Robot excluidos requieren denegación efectiva, no sólo texto.
- [x] Actualizar inventario y hashes del candidato, enlazando el manifiesto T1.
      Releer archivos/consumidores modificados e interfaces afectadas; conservar
      cobertura histórica de lo que no cambió con justificación, sin otra lectura
      masiva automática ni afirmar que los947 archivos históricos son actuales.
- [x] Usar [capabilities](../../capabilities.md) y el
      [registro central](freeze-remediation-register.csv), sin crear otro backlog.
      En la evidencia de ejecución mapear capacidad ofrecida → productor
      Supabase/backend → consumidor Next → autorización → evidencia → gap.
      Inventariar servicios/consumidores existentes antes de intervenirlos.

**Salida:** candidato y alcance identificados, evidencia reutilizada/invalidada
con motivo y lista finita de comprobaciones faltantes. Runbook V0.

### Bloque 2 — Integración y brechas técnicas (contraste T1 del candidato)

- [x] Contrastar consumidores Next de Auth: signup/confirmación/login/recovery,
      modificación/borrado de cuenta y sesiones; administración/ban sólo donde
      se ofrezca, con autorización y AAL2 pertinentes. OAuth/MFA/CAPTCHA según
      configuración, sin implementar toda API disponible de Supabase.
- [x] Revisar Actions/Handlers, cookies, caché A→B, errores, validación de entrada,
      límites cliente/servidor y UI por rol contra RLS/grants/RPC/Storage reales.
      Aplicar criterios N/S/D existentes a superficies cambiadas y gaps recibidos.
- [x] Disponer cada DB-01…20 de DB-INTAKE: evidencia, alias o diferido con motivo;
      conservar la matriz original enlazada abajo. Investigación no equivale a
      defecto: no añadir índices, roles, restricciones o capacidades por intuición.
- [x] Confirmar reproducción o trazado preciso y segunda lectura de P0/P1;
      realizar la reparación local mínima necesaria del defecto ofrecido, con
      regresión pertinente y retest de consumidores afectados. No refactorizar
      por preferencia, ampliar producto ni crear un plan paralelo de Next.

**Salida:** gaps confirmados corregidos o bloqueos explícitos con reproducción,
impacto y dueño. Un P0/P1 ofrecido pendiente impide aceptar esa capacidad.
Runbook V1/V2 y casos concretos V3/V4 según naturaleza del gap.

### Bloque 3 — Circuito integrado (T2)

- [ ] Recorrer público → registro/confirmación → ingreso → área privada → acción
      útil persistida → cierre/reingreso. Reusar015 donde contrato/código/config
      sigan vigentes; cubrir negativas de acceso, roles y módulos excluidos.
- [ ] Completar sólo evidencia faltante de los16 IDs N recibidos de017, según
      su tabla V2/V3; un recorrido puede cubrir varios contratos explícitos.
- [ ] Ejecutar gates proporcionales del
      [runbook V0–V4](../../runbooks/freeze-candidate-validation.md), reutilizando
      CI/evidencia válida y registrando comando, candidato, resultado y cleanup.
      QA manual reproducible sirve para navegador; no sustituye SQL negativo,
      concurrencia con sesiones independientes, tipos, cobertura ni build.
- [ ] Resolver alcance/evidencia de015-OPERATIONS, RL-F02/04/05/06 y FOLLOW-TTL.
      PSP real, worker programado/alerta/recuperación, paridad Cloud y expiración
      de bearer previo conservan [NO VERIFICADO] hasta prueba o disposición
      compatible con oferta. No inferirlos de mocks, CI o HTTP200.

**Salida:** circuito ofrecido demostrado con evidencia por caso y límites
local/Cloud; escenario omitido no se convierte en PASS. No certificar otros PSP,
editor avanzado ni Robot. Runbook V3/V4.

### Bloque 4 — Veredicto y consolidación (T3)

- [x] Deduplicar por causa manteniendo IDs/alias; cerrar DB-INTAKE sólo con sus20
      disposiciones. RL-F01 conserva decisión sobre confianza IP, RL-F03 su
      reparación local/Cloud registrada; no reabrirlos por una nota histórica.
      RL-F06 se retoma ante su condición de cambio, no como ensayo universal.
- [ ] Revisar independientemente integración y seguridad/datos sobre cambios y
      evidencia; resolver observaciones confirmadas y repetir sólo lo afectado.
- [ ] Actualizar registro, current-state, capabilities, roadmap y referencias
      con un único veredicto del candidato: aceptado, parcial o bloqueado, con
      evidencia y pendientes. Mantener diferidos con dueño/condición de retorno.
- [ ] Cerrar016 sólo si no quedan P0/P1 ofrecidos y todos los gates acordados
      tienen resultado suficiente; [NO VERIFICADO] obligatorio no permite cierre.
      Reutilización local015 no equivale a distribución comercial013 ni a cierre
      de todos los escenarios históricos011/017. Runbook V5.

### Límites de ejecución y aplicación de reglas

La siguiente sesión debe recibir orden de ejecutar016. Esa ejecución incluye
inspección, fixtures locales acotados y reparaciones locales mínimas confirmadas;
no exige pedir permiso por cada ajuste rutinario dentro del alcance aprobado.
Reset/restauración destructiva, instalación/actualización de dependencias,
escrituras Cloud/proveedores, pagos, deploy, push y merge requieren autorización
específica para la operación; no heredar permisos agotados del procedimiento015.
Verificar destino/recursos y límites Free antes de operar; serializar suites
pesadas y usar concurrencia de lectura sólo con responsabilidades separadas.

Aplicar las ocho `.codex/rules` actuales: TypeScript/Next y JavaScript (tipos,
fronteras y JSDoc de contratos), calidad y principios (KISS/DRY/YAGNI), pruebas,
SQL y Realtime. Resolver contradicciones por AGENTS/código/ADR: `src/env.ts`
prevalece sobre la referencia vieja `env.js`; `cacheComponents: false` no se
migra para cumplir una receta `use cache`; diseño canónico ADR0002 prevalece
sobre tokens Material antiguos. En Windows: migración manual versionada + espejo
SQL, pruebas locales y tipos si cambia esquema expuesto. Realtime conserva
seguridad, evento útil y cleanup; no migrar transporte sin defecto confirmado.
Clean Code y Superpowers apoyan el método, no justifican sobreingeniería.
Esta preparación no cambia código ni tests: no aplica inventar pruebas/TDD
para texto; antes de una regresión de producto leer `TESTING-PLAN.md`.

Mantenimiento: conservar [seguridad de dependencias](../../quality/dependency-security.md),
incluida alerta135 low/deepmerge mitigada localmente sin fingir cierre upstream.
El [prompt de nueva sesión](../../runbooks/plan-016-session-start.md) referencia
este contrato. Los checkpoints siguientes conservan fecha; donde describen un
método anterior, manda esta entrada operativa.

## Recepción del cierre local015 — 2026-11-10

[015](../completed/015-reusable-foundation-acceptance.md) acepta el núcleo local
acotado por el propietario. [Evidencia reutilizable](../../quality/reusable-foundation-evidence.md):
instalación independiente, signup/confirmación/onboarding sin compras, registro
privado útil, roles/RLS, archivo/notificación, marca, update014 y recuperación
original. Browser creación/update PASS y consola0; no repetir este circuito por
la mera transición de plan. Contrastar sólo código/configuración que cambie.

016 conserva como **[NO VERIFICADO]**:

- Compra y callbacks PSP reales según la oferta y matriz011 existente; no
  convertir build/página billing sin credenciales en certificación de pago.
- Entrega programada real del worker, alerta operacional y recuperación con
  proveedor; worker10/10 usa proveedor simulado, SQL17/17 prueba cola y señales.
- Paridad linked/Cloud y gates integrados que ya eran dueños de016.
- Expiración runtime del enlace Storage previamente emitido tras revocación;
  la nueva emisión está denegada por RLS, pero el bearer previo dura hasta60s.
- Casos pendientes de la matriz DB-INTAKE que no cubrió el contrato acotado015.

Prioridad del propietario: cerrar el circuito MVP y gaps backend concretos,
reutilizando evidencias y QA manual reproducible cuando resulte más rápido.
Esto no inicia operaciones Cloud ni amplía proveedores.

## Recepción de investigación de datos — 2026-11-05

Se recibe la [matriz DB-01…20 y su contraste preparatorio](../../audits/2026-11-05-plan-015-readiness.md)
mediante `DB-INTAKE-20261105` del registro central. No son veinte defectos
confirmados ni autorización para ejecutar el prompt adjunto. Renovar evidencia,
deduplicar contra D-03/API/SEATS/WEBHOOKS, D-04, D-05 y demás IDs existentes.
Priorizar perfiles, cuotas/flags y concurrencia de superficies ofrecidas.

015-T1 recibe únicamente contratos de configuración/Free/derechos existentes
DB-02/03/04 y015-T2/T3 la receta de bootstrap DB-16.016 conserva seguridad/datos,
paridad y revisión integrada, incluida UI por rol; no crear otra fase Next.js
paralela. Defectos nuevos confirmados requieren subfila con severidad, dueño,
reproducción y reparación acotada; P0/P1 ofrecidos bloquean el recorrido afectado
antes de aceptación, sin esperar a la ronda final. No reabrir017 por defecto.
La recepción sólo cierra cuando cada referencia tiene evidencia/disposición o
alias canónico. El gate integrado sigue después del último cambio015.

La instantánea externa no renueva Cloud ni demuestra checkout, cargas, carreras
o bypass. Mantener límites Free, migraciones manuales locales y autorización
específica de escrituras remotas. Esta actualización es documental.

## Reauditoría final vigente — 2026-10-28

### Recepción acotada de evidencias017 —2026-11-02

El mantenedor acotó017 para no repetir validaciones ni mantenerlo abierto hasta
este gate.016 recibe los IDs siguientes con sus estados pendientes originales;
no se aceptan por traslado. Las especificaciones de los hijos017 se conservan
como referencia, no como una segunda orden de ejecutar los mismos recorridos.

| Gate | IDs                 | Resultado mínimo                                                                                               |
| ---- | ------------------- | -------------------------------------------------------------------------------------------------------------- |
| V2   | N-02,N-03           | Inspeccionar sitemap generado: origen correcto y sin rutas privadas en cuatro locales; reutilizar build válido |
| V3   | N-07                | Un evento Realtime útil y cleanup al salir/cambiar identidad; sin prueba de carga                              |
| V3   | N-08,N-28           | Recuperación visible del error controlado; HTML/hidratación404 sólo si se reproduce la hipótesis               |
| V3   | N-11,N-12,N-19,N-20 | Un recorrido avatar/logo que reúna rechazo inválido, límite, dos envíos y persistencia; Robot no ofrecido      |
| V3   | N-13,N-14,N-15      | Retry y destino seguro Auth/invitación/MFA; CAPTCHA condicionado a configuración ofrecida, sin bypass          |
| V3   | N-16,N-17           | Dos sesiones: identificar actual, revocar otra, conservar sesión válida y feedback de error                    |
| V3   | N-21,N-23           | Lookup por ID fuera del primer lote y error genérico fiel; no confundir con014-T3                              |

Antes de ejecutar, comparar cada assertion con evidencia vigente y registrar
qué se reutiliza. Método manual reproducible o automatización existente
confinada; un único recorrido puede cubrir varios IDs si demuestra cada contrato.
Sólo ejecutar lo que falta, con control positivo/negativo y cleanup pertinente.
No construir harness nuevos, ampliar permisos, bajar cobertura ni forzar cuotas.
Los P0/P1 de una capacidad ofrecida siguen bloqueando; P2 no demostrados admiten
disposición explícita con riesgo/dueño/retorno, no PASS inventado.

017 puede cerrar su remediación acotada antes de015;016 conserva el veredicto
integrado posterior a015. Este ajuste no declara completas las tareas de016.

[ADR0005](../../adr/0005-replicable-saas-mvp-and-bounded-acceptance.md) fija
el alcance deT2/T3 después de015: base replicable y configurable, sin obligación
de construir Robot ni aceptar editor avanzado. Conservar el manifiesto/revisiónT1
históricos; crear o renovar inventario del candidato final con hashes de fuentes
propias y revisar consumidores/riesgos. No declarar lectura actual a partir del
informe viejo. Los accesos de módulos excluidos sí se revisan para comprobar
exclusión efectiva; no se exige aceptar funcionalidades que no se ofrecen.

Método: hipótesis falsables, evidencia específica, controles positivos/negativos,
reproducción proporcional al riesgo, severidad y certeza explícitas; separar
producto/prueba/entorno/desconocido. Contraste independiente de aplicación,
seguridad/datos e integración. Modelos/herramientas son apoyo, no certificación.
Una revisión final con reparación de bloqueantes confirmados y retest afectado;
no nueva ronda completa automática ni ampliación de producto. Gates integrados
una vez sobre candidato identificado, con reuso justificado de evidencia vigente.
Aplicar el runbook final actualizado; un bloqueo no se convierte en PASS.

## Disposición histórica — 2026-10-20

La [auditoría dirigida](../../audits/2026-10-19-freeze-code-and-documentation-revalidation.md)
y el [registro central](freeze-remediation-register.csv) consolidan los 53 IDs
históricos y sus alias/seguimientos. Las reparaciones están asignadas a
[017](../completed/017-freeze-remediation.md), 012.5, 014 o 015; 016 conserva revisión,
validación y disposición según la asignación de esa fecha. La entrada operativa
de2026-11-10 habilita reparaciones locales mínimas confirmadas al ejecutar016.
Esta asignación documentada no cierra todo T3 ni renueva la lectura exhaustiva
T1 del candidato histórico. Final T2/T3 sucede después de los últimos cambios
de 015 según el roadmap actualizado; precondiciones y comandos en el
[runbook final](../../runbooks/freeze-candidate-validation.md).

El helper E2E ya identifica proyecto/contenedor exactos: el párrafo histórico
que advierte selección del primer contenedor está superado por S-08 corregido.
Persisten otros requisitos de target/cleanup, especialmente el dblink de D-09.
Los gates Sentry actuales permiten validación confinada; no mantener el bloqueo
histórico absoluto como si la implementación no existiera.

## Contrato original y evidencia histórica

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

- Next.js del inventario histórico: `16.3.5`, con documentación en
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

La inspección histórica de planificación registra `reactCompiler: true` y
`cacheComponents: false` en Next, PostgreSQL 17 y exposición API local de
`public` en `supabase/config.toml`. El inventario inicial de datos cuenta 159
migraciones y 42 archivos pgTAP; estos conteos no son cobertura ni paridad Cloud.

Conservar `src/proxy.ts`, React Compiler, navegación tipada de next-intl y el
monolito modular. No introducir `middleware.ts`, memoización manual, otra
librería de consultas ni migración a Cache Components por aplicar una receta.
Comprobar la configuración efectiva antes de recomendar cambios.

## Responsables y límites

Los revisores trabajan en lectura; el coordinador integra informe y enlaces.
Durante ejecución autorizada, asignar cada reparación local a un escritor con
propiedad de archivos y revisión independiente; no compartir escrituras simultáneas. Los nombres identifican roles;
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

Este apartado conserva la definición de cobertura que rigió T0/T1 históricos.
En el candidato nuevo se aplica el bloque1: actualizar manifiesto, contrastar
cambios y sus consumidores y justificar reuso por contenido/contrato. No ordena
repetir todas las lecturas históricas ni transforma su fecha en evidencia actual.

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
Su mapa histórico asignó947 rutas y cerró el contraste estático el8de octubre.
No es una checklist vigente de trabajo pendiente ni una segunda secuencia;
actualizar el candidato por diferencias conforme al bloque1.

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
un candidato, justificando reuso de evidencia válida. Las correcciones locales
confirmadas y sus regresiones siguen el bloque2; no ampliar producto.

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
del mantenedor no se considera desechable por defecto. El helper ya selecciona
proyecto/contenedor exactos (S-08); comprobar su identidad efectiva al ejecutar. Los tests de cola
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
      acotada sólo si excede el alcance; reparar localmente los defectos
      confirmados del alcance ofrecido según bloque2 y registrar su cierre.
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
- [Plan 012](../completed/012-security-hardening-and-pricing-truth.md): recibe hardening y
  coherencia de pricing; evitar una segunda lista de correcciones sin dueño.
- [Plan 014](../completed/014-reference-surface-correctness.md): conserva robot, orígenes de
  imágenes y auditoría. Revalidar esos defectos, no presentarlos como nuevos.
- [Plan 015](../completed/015-reusable-foundation-acceptance.md): recibe límites de módulos y
  reutilización; la instalación independiente sigue siendo su criterio propio.
- [Plan 013](../deferred/013-launch-readiness-roadmap.md): distribución comercial condicional.

No hace falta un ADR para asignar revisores. Proponer uno solo si un hallazgo
requiere una decisión duradera que cambie los límites arquitectónicos aceptados.

La cobertura T1 histórica permanece cerrada para su manifiesto y fecha. El
bloque1 actualiza candidato y diferencias, justificando reuso y cubriendo nuevas
fuentes/consumidores; no basta copiar conteos antiguos. Una entrega sólo estática
con SQL/E2E **[NO VERIFICADO]** no cierra aceptación integrada. El cierre vigente
es el bloque4: evidencia suficiente de todos los gates del alcance ofrecido,
ningún P0/P1 ofrecido pendiente y disposiciones trazables de los demás IDs.
Asignar dueño no equivale a ejecutar. Excluir una capacidad exige frontera
efectiva; una documentación o merge verde no certifica runtime.

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
