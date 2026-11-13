# Plan 015 — Aceptación de la base reutilizable

## Cierre local acotado — 2026-11-10

**Estado: completado para el núcleo reutilizable local.** El propietario fijó
como resultado práctico páginas públicas, registro/confirmación/acceso y una
acción útil persistida en el área privada, con permisos backend. Se demostró
además instalación independiente, marca/módulo, archivo privado, notificación,
actualización real014 y recuperación de DB/Storage. T0/T1 implementados y
verificados; T2 documentado; T3 aceptado en ese alcance. [Resultados y límites](../../quality/reusable-foundation-evidence.md).

La checklist inferior conserva el contrato amplio original y checkpoints; las
casillas abiertas no se presentan como ejecutadas. Su disposición final es:

- **015 cerrado localmente:** composición y exclusión, secretos opcionales,
  cuotas sin fail-open, instalación sin compras, superficie billing activa,
  siete recetas documentadas, una extensión útil y actualización conservando
  dato/archivo/marca; restauración original verificada.
- **016 pendiente:** aceptación integrada/Cloud, operación programada real de
  correo/alerta/recuperación, expiración runtime del enlace firmado y contratos
  de datos pendientes de la matriz DB. No repetir las pruebas ya vigentes.
- **011/016 pendiente según oferta:** compra real y callbacks del PSP con la
  matriz existente; billing activo se construyó y renderizó sin credenciales,
  con fallo explícito `provider_unavailable`, sin fallback.

Esta disposición limita el cierre local; no acepta Cloud, pagos reales ni un
producto instalable para clientes. Siguiente: **016 aceptación integrada**.
Instalación y reset/restauración fueron autorizados específicamente. La
integración Git posterior está en [PR250](https://github.com/pipec80/iroko/pull/250)
y conserva los gates de la rama protegida. No se aplicaron migraciones Cloud.

### Checkpoint histórico de preparación — 2026-11-05

El resto del contrato conserva sus casillas originales, no una nueva cola
activa. Los pendientes transferidos se ejecutan únicamente desde los cuatro
bloques del [016 vigente](../active/016-nextjs-supabase-code-review.md): evidencia
reutilizable en el bloque1; datos e integración en el2; operación/Cloud y PSP
según oferta en el3; disposición final en el4. No reabrir015 ni marcar como
probadas las casillas históricas abiertas.

Base observada `032f1a30794241cebc97e0ccd32b48d836110475`, rama
`codex/014-images-platform-audit`, con cambios014 staged/unstaged/untracked.
El SHA no identifica por sí solo ese árbol. Preservar todos los cambios y
material local; no checkout/reset/clean, commit, push, merge o deploy implícitos.

[Contraste estático, reglas y recepción de la investigación de datos](../../audits/2026-11-05-plan-015-readiness.md).
La auditoría externa y su prompt son insumos, no órdenes de ejecutar ni prueba
de runtime vigente. Los IDs DB-01…20 son referencias de esa fuente; el registro
central recibe su triage sin reemplazar IDs/cierres anteriores.

| Etapa | Existe en el árbol inspeccionado                                                                                 | Falta para aceptación                                                                             |
| ----- | ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| T0    | Sidebar por flags/rol, móvil compartido, atajo Projects condicionado y home sin consultas Projects al desactivar | Contraste de títulos/rutas hijas y adaptación real; extraer sólo metadatos necesarios             |
| T1    | Wizard sin plan con billing=false y test existente; catálogo012.5; política mock restrictiva                     | Guard de página/checkout, requisitos opcionales, S-10 y contratos de flags/cuotas                 |
| T2    | Patrones de Auth/RLS, Storage, API, correo y Realtime; catálogo de módulos                                       | Siete recetas y guía independiente contrastadas con código, límites y errores                     |
| T3    | Evidencia histórica de superficies base, no de réplica                                                           | Instalación de ambas configuraciones, marca, extensión neutral, recuperación y actualización real |

### Recepción acotada de datos antes de T1/T3

DB-02/03/04 se revisan en T1 sólo por su efecto en configuración, límites Free
y conservación de derechos existentes. La auditoría general de perfiles,
grants/RLS, concurrencia, integridad financiera y paridad permanece en016.
Si aparece un P0/P1 confirmado de una capacidad ofrecida, bloquea su aceptación:
asignar reparación acotada en el registro y resolver antes del recorrido afectado,
sin esperar al gate final ni reabrir017 por defecto. Un aviso no es un defecto.

- [x] Trazar `src/lib/flags/index.ts`, `supabase/schemas/flags.sql`,
      `src/lib/billing/entitlements.ts`, `supabase/schemas/private.sql`,
      catálogo/migraciones y consumidores efectivos. Distinguir disponibilidad
      de instalación, flag operacional, derecho comercial y autorización viva.
      Documentar las claves `webhooks`/`webhooks_enabled` y
      `api_keys`/`api_keys_enabled`; ningún override operacional concede permisos
      ni cuotas por sí solo. No renombrar claves sin contrato y consumidores.
- [ ] Fijar pruebas de T1 para Free sin compras, límite0, cupo alcanzado, clave
      ausente/inválida y fallo de lectura: una operación sujeta a cuota no obtiene
      derechos ilimitados por error. Separar el ilimitado explícitamente soportado
      del dato faltante. Reproducir en el límite SQL/acción real, no sólo helper.
      `withinLimit` TS sólo aparece usado en sus tests en esta búsqueda; eso no
      demuestra un bypass productivo. Los tests actuales codifican el fallback:
      actualizar contrato y negativos únicamente tras justificar el cambio.
- [ ] Contrastar `active`, `trialing`, `canceled` con período futuro/vencido y
      ausencia de suscripción: apagar nuevas compras no altera derechos vigentes
      ni callbacks/worker. La matriz financiera completa y multiproveedor queda
      en016/011 según oferta; no exigir nuevas certificaciones.
- [ ] Si se confirma una incoherencia que afecta estos casos, reparación mínima
      en los helpers/consumidores afectados, prueba RED/GREEN y, si hay SQL,
      migración manual + espejo + pgTAP por runner atestado existente; regenerar
      tipos sólo si cambia API expuesta. Identificar archivos exactos y escenario
      antes de mutar; si excede estos contratos, disposición en016 y aprobación
      del lote correspondiente. No habilitar módulos excluidos para probarlos.

### Recursos y destino de los ensayos

Antes de cada ejecución autorizada, medir RAM/procesos y comprobar destino.
Host16GB: un worker; SQL, build, navegador y suites pesadas secuenciales.
Tras dos fallos iguales sin evidencia nueva, detener ese método y proponer
alternativa sin bajar assertions, cobertura ni guards. Reutilizar evidencia
vigente por contenido/dependencias/configuración, no sólo por SHA o fecha.

Usar exclusivamente el stack oficial `saas-boilerplate`. T3 admite un checkout
derivado separado, pero no crea otro stack Supabase por defecto. Antes de T3
presentar destino exacto y procedimiento revisable de instalación limpia y
recuperación que preserve usuario del mantenedor, credenciales, datos a conservar
y recursos ajenos. Si exige reset/recreación, requiere aprobación específica del
procedimiento; fixtures sobre una base usada no prueban instalación limpia.
La estrategia operativa todavía está **[NO VERIFICADO]** y bloquea ejecutar T3,
no la preparación de T0/T1/T2. No ensayar recuperación sobre datos ajenos.

Todos los proveedores son Free/gratis por declaración del propietario. Antes
de operarlos, inventariar consumidores y comprobar capacidad/cuota oficial y
estado efectivo de cuenta en lectura. No instalar herramientas, habilitar pagos
ni ampliar recursos. Instalado/configurado no equivale a runtime aceptado.

Los checkpoints inferiores conservan contexto histórico; este bloque gobierna
el estado y las restricciones actuales.

## Contrato vigente de producto — 2026-10-28

**Actualización2026-10-29:** prerrequisito de exclusión aceptado localmente:
guards unitarios/revisión y navegador2/2, cleanup verificado. Ver resultado más
reciente en [evidencia017](../../audits/2026-10-20-017-p1-execution.md).
RS-05 global mantiene `evidence-pending` por composición/billingT0/T1. No acepta
el resto de015, buildproduction ni Cloud; los bloqueos previos quedan históricos.

[ADR0005](../../adr/0005-replicable-saas-mvp-and-bounded-acceptance.md) fija el
resultado: replicar una base SaaS, cambiar marca/configuración y añadir un caso
de negocio pequeño. Robot no es requisito ni primer consumidor obligatorio.
Las instrucciones posteriores de ejecución se interpretan con este alcance;
no construir cosmética, tarot e IoT para probar la misma base.

**Prerrequisito adelantado,2026-10-29:** T1/RS-05, exclusión efectiva del editor/Robot y
configuraciones ofrecidas, en paralelo lógico con la disposición de P1 del núcleo,
pero nunca pruebas mutantes simultáneas. El código ahora fija
`features.projects=false` y conserva Robot=false, con guards y regresiones locales;
ver [evidencia browser y límites](../../audits/2026-10-20-017-p1-execution.md).
Esto no acepta el resto deT1 ni inicia los ensayos de015. Antes de ofrecer
el MVP verificar páginas, URLs profundas, acciones y accesos del inicio. Usar
configuración existente; retirar la referencia Projects completa si es la forma
simple de excluir su editor, sin borrar datos/esquemas ni crear un framework.
El proyecto derivado neutral usa patrones de datos/autorización, no depende de
reactivar esa UI ni de importar un editor cuya aceptación está diferida.

**Archivos de T1 adicionales por exclusión:** `src/config/app.config.ts`;
`src/app/[locale]/dashboard/projects/page.tsx`, `actions.ts`, `[slug]/page.tsx`,
`[slug]/doc/actions.ts`, `[slug]/doc/[docId]/page.tsx` y
`[slug]/doc/[docId]/actions.ts` (todos bajo el mismo directorio projects);
`src/components/layout/app-sidebar-client.tsx`, `app-topbar-client.tsx` y
`src/app/[locale]/dashboard/page.tsx`. Verificar consumidores antes de editar.
Reusar controles Robot de014-T1; añadir regresiones focalizadas para flags falsos,
URL directa y acción guardada antes de leer/escribir. La nueva configuración no
autoriza acceso a datos anteriores ni permite omitir RLS.

**Aceptación mínima:** ambas configuraciones (proveedor ofrecido / sin nuevas
compras), una instalación derivada neutral, cambio de marca, una extensión útil
y una actualización real preservando dato/personalización. Una sola extensión,
con positivos/negativos; sin generador, nuevo motor de módulos o suite de verticales.
La configuración con billing existente conserva callbacks y jobs. Los recorridos
de navegador pueden ser manuales reproducibles o automatizados, con evidencia y
autorización de destino; no dependen del runner development del editor.

**Coordinación — 2026-10-20:** se conserva este alcance y sus tareas.
El [registro central](../active/freeze-remediation-register.csv) asigna S-10 a T1:
`captureServer` debe respetar `appConfig.features.analytics=false`, además de
token/consentimiento; añadir regresión con flag false y token/consentimiento
positivos, sin envío de proveedor. Esto no cambia callbacks/worker de billing.
El wizard ya omite el paso de plan con billing false: reusar esa implementación
y probarla, sin presentar la condición como inexistente. 012.5 proporciona el
único catálogo para superficies públicas/dashboard; T1 gobierna disponibilidad.
La validación final integrada de 016 sucede después de los últimos cambios de
este plan, no antes. Sólo el prerrequisito de exclusión tiene implementación
local; el resto deT1 y los ensayos siguen sin iniciar.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans
> to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Estado:** preparación documental actualizada; prerrequisito de exclusión
aceptado localmente, incluido navegador. Implementación restante y ensayos
pendientes de autorización. P1 para uso propio; no depende de decidir vender.
Baseline histórico: `f82d2fbe381014c80a090ba3c36c99e4778111c3`; candidato actual arriba.

**Goal:** demostrar que una instalación nueva puede configurarse, extenderse y
actualizarse sin conocimiento oculto ni cambios innecesarios del núcleo.

**Architecture:** conservar el monolito modular y el modelo de cuentas actual.
Separar configuración de presentación, disponibilidad para nuevas operaciones,
entitlements y procesamiento de recursos existentes. Entregar recetas en
Markdown sobre patrones existentes, sin generador ni framework de plugins.

**Tech Stack:** Next.js/Supabase, configuración TypeScript, Vitest/Playwright/
pgTAP y scripts actuales; sin dependencias nuevas ni Fumadocs requerido.

**Spec:** [estrategia](../../architecture/product-strategy.md), RS-05/06/07/12
de la [auditoría](../../audits/2026-09-24-reusable-saas-readiness.md).

**Contexto histórico, no dependencia vigente:** el
[piloto IoT](../../architecture/iot-vertical-pilot.md) es el primer candidato
real de dominio, con el robot como emisor. T3 puede usar ese dominio en el
derivado desechable en lugar del registro neutral de ejemplo, conservando
todos los criterios de aceptación, incluidos archivo privado/notificación y
actualización. No obliga a construir ambos verticales ni autoriza cambios en
el robot. La integración real requiere su propio contrato e inspección; no
se convierte en dependencia de acabar toda la plataforma IoT para cerrar 015.

## Global Constraints

- No crear `middleware.ts`; conservar `src/proxy.ts`.
- TypeScript strict, sin `any` y sin dependencias nuevas.
- `src/env.ts` sigue siendo inventario de entorno; no duplicar su lista en guías.
- Conservar el modelo personal/equipos; no prometer un preset B2C sin organizaciones.
- Conservar catálogo Free y slugs `free` / `pro` / `scale`; no falsear entitlements.
- Desactivar nuevas compras no cancela suscripciones ni deshabilita callbacks.
- No usar `SKIP_ENV_VALIDATION` como solución a requisitos opcionales.
- No modificar otro proyecto personal ni limpiar el entorno actual del mantenedor.
- Instalar dependencias o crear un entorno desechable requiere autorización de
  ejecución que lo incluya; este documento no la concede.
- No hacer escrituras Cloud, pagos, push, merge o deploy sin autorización propia.
- Leer `TESTING-PLAN.md` antes de tocar pruebas; lotes pequeños revisables, sin
  autorización implícita de commit/push por aparecer en un paso sugerido.

## Review Focus

1. Instalación nueva sin billing ni sus secretos: debe arrancar con límites Free coherentes (T1/T3).
2. Enlace directo o acción de checkout con módulo apagado: no crear intención ni llamar al proveedor (T1).
3. Despliegue con suscripciones previas: conservar callbacks/worker y no ofrecer apagar soporte operativo a ciegas (T1/T3).
4. Extensión que usa service role o Storage privado: tenant y rol insuficiente se deniegan aunque la UI oculte botones (T2/T3).
5. Actualización con personalización y datos: conservar ambos y detectar incompatibilidad antes del rollout (T3).
6. Sidebar, títulos, accesos y atajos respetan la misma configuración; un módulo oculto no sigue disparando consultas desde el inicio (T0).

## T0 — Composición del producto y navegación

Propuesta añadida tras inspeccionar el dashboard y el servidor del robot;
véase [composición y paneles del piloto](../../architecture/iot-vertical-pilot.md).
Esta tarea cubre una necesidad del núcleo. La ingestión y las pantallas IoT
con datos reales conservan su trabajo propio.

**Files:** reutilizar configuración y composición actuales; extraer
`src/config/product-modules.ts` y su test sólo si la duplicación impide el caso
de adaptación real. Modificar según necesidad demostrada
`src/components/layout/app-sidebar-client.tsx`, `app-topbar-client.tsx`,
`src/app/[locale]/dashboard/page.tsx` y los tests afectados. Mantener
`appConfig` como selección de capacidades de producto. No introducir un segundo
inventario de variables de entorno ni una configuración editable con código remoto.

**Interfaces:** metadatos estáticos tipados con ID, rutas, claves i18n, icono,
orden/grupo, condición de disponibilidad/visibilidad y acceso de inicio.
Resolvers puros reciben configuración y rol de presentación; devuelven solo
metadatos, nunca clientes, secretos, callbacks privilegiados o consultas SQL.
La ruta y su autorización real continúan implementándose explícitamente.
El móvil reutiliza el mismo sidebar; se preservan rutas/admin, idiomas y enlaces
profundos existentes. El catálogo no convierte un rol de UI en autorización.

- [ ] **Contraste y regresión de comportamiento.** Reutilizar tests existentes;
      exigir RED sólo para divergencias nuevas reproducidas, nunca provocar
      fallos artificiales en comportamiento ya correcto. Con projects deshabilitado, verificar que
      desaparecen entrada/acceso/atajo y que el home no llama a `listByAccount`.
      Con activity habilitado, un viewer no obtiene su entrada administrativa.
      Al cambiar de cuenta se deriva visibilidad del nuevo contexto. Comprobar
      que sidebar y título coinciden para rutas existentes, incluidas rutas
      hijas; los tests deben renderizar consumidores, no duplicar el catálogo.
      Ejecutar las pruebas afectadas y registrar el fallo por divergencia real.
- [ ] **Implementar sólo lo necesario.** Reutilizar o extraer metadatos y consumirlos en
      sidebar, títulos, accesos y atajos. Ejecutar consultas del inicio solo para
      módulos habilitados. Conservar las páginas explícitas y sus guards; T1 y
      Plan 014 mantienen sus cierres de rutas/acciones, no se sustituyen por menú.
- [ ] **Demostrar extensión.** En el derivado de T3, incorporar la entrada de
      una vertical y su home mediante el contrato documentado, sin editar los
      componentes compartidos de navegación. La página concreta y sus consultas
      pertenecen a la vertical. No implementar drag-and-drop ni un motor de widgets.
- [ ] **GREEN.** Unit afectados, typecheck/lint y navegación desktop/móvil del
      candidato; comprobar idioma, rol, flags y enlaces directos. Reutilizar el
      diseño vigente; no instalar librerías de gráficos en esta tarea. Commit
      sugerido: `refactor: centralize product navigation composition`.

T0 puede avanzar de forma independiente de la renovación de billing. T3 debe
usar su contrato al demostrar extensión y actualización; T1 debe respetarlo al
retirar la oferta de nuevas suscripciones.

## T1 — Configuración sin venta de suscripciones

**Files:**

- Modify: `src/config/app.config.ts`, `src/env.ts`, `src/lib/billing/registry.ts`.
- Modify: `src/app/[locale]/dashboard/billing/page.tsx`, su `actions.ts`,
  `src/components/dashboard/onboarding/onboarding-wizard.tsx` y navegación
  existente solo donde un acceso a compra siga disponible.
- Modify: `src/app/[locale]/dashboard/billing/__tests__/actions.test.ts`,
  `src/lib/billing/__tests__/registry.test.ts`, `src/config/__tests__/app.config.test.ts`.
- Create: `src/lib/config/integration-requirements.ts` y
  `src/lib/config/__tests__/integration-requirements.test.ts`.
- Modify: `src/components/dashboard/onboarding/__tests__/onboarding-wizard.test.tsx`
  (ya existe; conservar sus casos). Create: `src/test/e2e/no-billing.spec.ts`
  sólo si no hay recorrido existente que cubra las mismas assertions.

**Interfaces:** `appConfig.features.billing=false` significa que esta
instalación no ofrece nuevas suscripciones. Página billing no disponible para
una instalación nueva sin billing; checkout devuelve el error de módulo
desactivado del contrato existente de `ActionResult`, antes de crear intentos.
El wizard omite el plan, pero sigue siendo un onboarding de cuentas/equipos.
Los schemas y límites Free continúan instalados. El flag no gobierna las rutas
webhook ni la autenticación del worker.

La selección de proveedor debe ser perezosa respecto de credenciales: importar
la aplicación sin billing no exige secretos de un proveedor no utilizado. Una
operación habilitada falla explícitamente si falta su configuración; nunca
cambia silenciosamente a mock. Mailpit no exige una API key de Resend; el
transporte Resend sí la exige. `FROM_EMAIL` sigue siendo necesario para enviar
correo con cualquiera de los dos transportes.

`mailTransport` del helper es un valor derivado de la selección existente por
`MAILPIT_URL`, no una nueva variable de entorno. La función pura detecta
credenciales faltantes; la admisibilidad mock se comprueba por separado con
`mock-policy.ts` y sus tests, usando el contexto real existente, sin introducir
lecturas de `process.env` en el helper puro ni rebajar sus guards.

- [ ] **RED requisitos de integración.** Extraer una función pura tipada
      `missingIntegrationRequirements(input): string[]` cuyo input incluya
      `billingEnabled`, `provider`, `mailTransport` y un objeto `credentials`
      con las claves consumidas de `src/env.ts`. Declarar/exportar su tipo en el
      mismo archivo; no leer `process.env` dentro de la función. Casos concretos:

  ```ts
  expect(
    missingIntegrationRequirements({
      billingEnabled: false,
      provider: 'mock',
      mailTransport: 'mailpit',
      credentials: { FROM_EMAIL: 'dev@example.com', MAILPIT_URL: 'http://localhost:54324' },
    }),
  ).toEqual([]);

  expect(
    missingIntegrationRequirements({
      billingEnabled: true,
      provider: 'mock',
      mailTransport: 'mailpit',
      credentials: { FROM_EMAIL: 'dev@example.com', MAILPIT_URL: 'http://localhost:54324' },
    }),
  ).toContain('MOCK_BILLING_SECRET');
  ```

  Agregar casos Resend sin key, Stripe con solo API key, MP sin URL webhook
  y combinación completa. En los tests de política mock cubrir fuera de fixture
  local, hosting y ausencia de opt-in.
  Un opt-in no habilita mock en Cloud: conservar fixture explícita, loopback,
  exclusión de hosting y todos los guards de `src/lib/billing/mock-policy.ts`. Conservar la
  semántica de `isMockBillingAllowed`; no debilitarla al hacer secretos
  condicionales. Ejecutar `pnpm test src/lib/config/__tests__/integration-requirements.test.ts`.

- [ ] **RED comportamiento.** En tests billing simular flag falso y un usuario
      autorizado: checkout debe devolver error sin invocar servicio/proveedor;
      no autenticar por UI. En wizard comprobar ausencia del paso de plan y
      finalización al dashboard. En registry, importar sin secretos de pagos no
      falla, pero pedir proveedor no configurado sí. Mantener los tests de webhook
      y worker: el flag falso no cambia validación de firmas/secretos ni el manejo
      de recursos existentes. Ejecutar los archivos modificados por sufijo único.

- [ ] **Implementación mínima.** Integrar la validación pura con `src/env.ts`
      en el lado servidor y con selección/uso de proveedores. Mantener validación
      de forma para credenciales presentes y exigencia de las activas; no filtrar
      valores a errores cliente. Añadir guards de nuevas operaciones y página.
      Auditar enlaces billing en dashboard, wizard y páginas públicas, coordinando
      estas últimas con Plan 012 PR5 para no reintroducir otro catálogo.
      No añadir otros presets o un sistema genérico de dependencias.

- [ ] **GREEN.** Unit afectados, typecheck/lint. En entorno desechable nuevo,
      con flag falso y secretos de pago ausentes: build/start, signup, onboarding,
      dashboard y recurso de negocio funcionan; URL directa no ofrece billing;
      intento de compra no produce cambios. Repetir con configuración actual y
      proveedor sandbox/mock autorizado para demostrar ausencia de regresión.
      En fixtures con suscripción previa mantener webhook/worker operables. La
      guía prohíbe aplicar el preset vacío sobre una instalación con recursos
      activos sin revisión y conservación de sus credenciales/servicios.
      Commit sugerido: `feat: support a minimal no-subscription configuration`.

### 015-T1 — Extensión de aceptación S-10: flag de analítica servidor

**Files:** modificar `src/lib/analytics/server.ts` y `src/lib/analytics/__tests__/server.test.ts`; conservar `client.ts` y sus tests como control de navegador. **Interface:** `captureServer` conserva firma y validación de eventos, y retorna sin consultar consentimiento ni crear cliente PostHog cuando `appConfig.features.analytics=false`. Con flag true siguen aplicándose token y consentimiento.

- [ ] RED: flag false con token y consentimiento positivo no construye SDK ni envía; flag true/consentimiento positivo conserva evento de control; consent false sigue bloqueando. Comprobar que la operación de negocio invocante conserva su resultado con flag false.
- [ ] Implementar guard temprano sin cambiar configuración del proveedor ni identidad financiera. Ejecutar `pnpm test src/lib/analytics/__tests__/server.test.ts src/lib/analytics/__tests__/client.test.ts`, typecheck/lint y revisión independiente.
- [ ] Actualizar S-10 en registro con evidencia del candidato; no declarar cerrado por el guard equivalente que ya existe en navegador.

## T2 — Recetas de extensión y mapa de dependencias

**Files:** ampliar `docs/modules/README.md`; crear
`docs/modules/foundation-recipes.md` y
`docs/runbooks/independent-installation.md`. Actualizar `README.md` y
`docs/architecture/system-overview.md` con enlaces, no duplicar inventarios.

**Interfaces:** cada receta consume el contrato real del módulo y produce una
extensión comprobable en el entorno desechable de T3. Ninguna receta se declara
ejecutada hasta adjuntar su resultado. Guías editables sin framework adicional.

Ampliación documental 2026-09-25: incorporar los
[aprendizajes de entrega y mantenimiento](../../architecture/product-strategy.md#aprendizajes-de-instalación-adaptación-y-postventa--2026-09-25).
No amplía las dos configuraciones aceptadas ni autoriza configuración dinámica
por tenant, un instalador visual o un generador.

- [ ] **Redactar las siete recetas con archivos y comandos del árbol:**

  | Receta                  | Patrón a reutilizar                                    | Criterio de prueba                                                           |
  | ----------------------- | ------------------------------------------------------ | ---------------------------------------------------------------------------- |
  | Dato por tenant         | `active-account.ts`, projects/actions, migración + RLS | Usuario B y viewer no pueden escribir dato de A                              |
  | Archivo público/privado | actions de cuenta/proyectos, políticas de buckets      | Avatar público y documento privado no comparten una política accidentalmente |
  | Notificación            | `notifications/index.ts`, `use-notifications.ts`       | Solo destinatario autorizado recibe/lee; cleanup al salir                    |
  | Job pequeño             | worker email, pgmq, cron/Vault                         | Fallo/reintento/agotamiento visible; explicar riesgo de duplicados y límites |
  | API externa             | `api/v1/account/route.ts`, `authenticateApiKey`        | Derivar tenant de clave verificada; no confiar en accountId del request      |
  | Acción con permisos     | `requireAccountRole`, matriz UI + SQL                  | Revocación real gana sobre JWT antiguo                                       |
  | Módulo nuevo            | config/nav/ruta/acción/datos/entitlements/telemetría   | Documento de dependencias y comportamiento al desactivar sin perder datos    |

- [ ] **Contrato por receta.** Incluir entrada/salida, archivos de referencia,
      rol permitido, caso negativo, límites, resultado observable, manejo de fallo
      y archivos que el desarrollador cambia. Explicar qué parte permanece en
      Node/Edge/SQL. Los textos de ejemplo no deben contener nombres/clientes reales.
- [ ] **Guía de instalación.** Secuencia para checkout y base nuevos, versiones
      requeridas, entorno desde plantilla, migraciones, correo local, primer usuario
      y admin/MFA, marca, provider opcional y checks. Diferenciar scripts locales
      de linked/Cloud. Consultar `src/env.ts` como inventario; mostrar valores
      ficticios solo para ilustrar contratos. Usar el procedimiento Windows de
      migración manual/espejo; no recomendar `supa:diff` mientras siga deshabilitado.
- [ ] **Ficha de adaptación y entrega.** En las recetas, clasificar peticiones
      ficticias de empresas A/B como configuración, extensión o cambio estructural.
      Indicar ámbito (instalación/cuenta/usuario), responsable, mecanismo real,
      dependencias, validación y efecto en upgrades. Señalar explícitamente los
      ajustes aún no soportados; no insinuar un panel de configuración existente.
      En la guía distinguir preparación del instalador, configuración del
      administrador y primer resultado del usuario. Incluir registro de versión
      base, diferencias del derivado, configuración no secreta, responsable
      operacional, recuperación y procedimiento de actualización. Reutilizar
      estas secciones en la evidencia de T3; no crear otra fuente de entorno.
- [ ] **Validación.** Ejecutar `node scripts/check-docs.mjs` y formato de los
      archivos cambiados; revisar rutas contra `rg --files`. Documentar separados
      disponibilidad operacional, entitlements y autorización; usar roles reales
      owner/admin/member/viewer. Bootstrap de plataforma exige procedimiento
      explícito y AAL2, nunca un admin por defecto. T3 debe ejecutar la
      guía y un recorrido combinado de recetas; las restantes llevan estado de
      evidencia explícito. Commit: `docs: document foundation extension recipes`.

## T3 — Ensayo independiente y actualización

**Files:** crear `docs/quality/reusable-foundation-evidence.md` al ejecutar;
actualizar `docs/runbooks/independent-installation.md`, `docs/current-state.md`
y esta checklist. No almacenar secretos, URLs firmadas ni registros personales.

**Interfaces:** consume candidato que incorpora T0/T1/T2 y Plan 014; para afirmar
operación debe incorporar Plan 012 y la aceptación de Plan 011 del proveedor
ofrecido. Produce evidencia con SHA, configuración, comandos, tiempos, cambios
y limitaciones. El checkout/base desechables se identifican antes de cualquier
reset; nunca se usa el otro proyecto personal por inferencia.

- [ ] **Preparar ejecución autorizada.** Identificar ruta absoluta, recursos
      identificados, puertos y comando de instalación congelada. El checkout
      derivado no es el actual y el destino no es linked/Cloud. Aplicar el
      procedimiento aprobado de instalación limpia sobre el stack oficial,
      con preservación/restauración verificadas antes de cualquier reset.
      No crear otro stack ni resetear la base usada por inferencia. Limpiar sólo
      fixtures/recursos propios incluidos en la autorización y preservar evidencia;
      otras eliminaciones requieren alcance específico.
- [ ] **Recorrido de instalación.** Un ejecutor que siga solo la guía registra
      cada pregunta al mantenedor como defecto documental; tiempo activo separado
      de descargas/esperas. Ejecutar ambas configuraciones con datos ficticios.
      Registrar archivos cambiados para marca, soporte, URLs e idioma; no prometer
      cambio en un archivo si las evidencias muestran más.
      Completar la ficha de T2 con la configuración realmente ejecutada y sus
      límites; registrar por separado arranque local y aceptación operacional.
- [ ] **Extensión mínima neutral.** Crear, solo en el derivado desechable, un
      registro de negocio por tenant reutilizando patrones de identidad/RLS, sin
      habilitar la UI/editor Projects diferida, con
      entrada validada, archivo privado y notificación. Crear dos cuentas, owner,
      admin, member y viewer. Probar escritura permitida según contrato, rechazo viewer, aislamiento,
      revocación y persistencia tras reload. Explicar cada modificación del núcleo;
      si la tarea exige duplicar autorización, corregir receta/diseño antes de cerrar.
- [ ] **Operación.** En el candidato, correlacionar solicitud y resultado de
      correo/worker, observar fallo y recuperación, y registrar qué alerta recibe
      el operador y su acción. Probar restauración de datos y archivos en destino
      desechable con objetivos de recuperación acordados para el producto; no
      asumir que backup SQL incluye bytes de Storage. MP utiliza exclusivamente
      escenarios/evidencias de la matriz 011, sin duplicar cobros ni inventar otra
      certificación. Cloud/productivo requiere autorización específica.
- [ ] **Actualización.** En el derivado con dato semilla y personalización,
      aplicar una actualización revisada del núcleo desde una revisión anterior
      compatible. Si el cambio requiere migración, usar historia aditiva sin
      squash. Registrar conflictos, resolución, dato conservado, personalización
      conservada y pruebas ejecutadas. No inventar una actualización trivial solo
      para marcar la casilla; escoger una corrección real del programa 012/014.
      Actualizar el registro del derivado con revisión origen/destino, diferencias
      preservadas y responsable del mantenimiento; acceso a upstream por sí solo
      no satisface este criterio.
- [ ] **Medir y cerrar.** Registrar tiempo activo, preguntas, archivos editados,
      cambios al núcleo y conflictos. No calcular ahorro sin una comparación
      equivalente. Cero pasos ocultos y cero bloqueos de autorización/datos son
      necesarios para afirmar «reutilizable demostrado»; el tiempo inicial fija
      una línea base. Unit, SQL, E2E, build y checks proporcionales del candidato
      deben pasar. Defectos encontrados vuelven a su tarea/plan, no se excusan por
      ser una demo. Commit de evidencia: `docs: record independent reuse acceptance`.

## Dependencias y criterio final

T1 y T2 se pueden revisar sin esperar una renovación del proveedor. La
aceptación con pagos conserva todos los gates MP; la configuración nueva sin
venta no implica que una instalación con suscripciones pueda abandonarlas.
El resultado de T3 puede ser parcial: declarar exactamente qué capacidad se
probó y mantener abiertas las demás, sin llamar completo al plan.

- [ ] Defectos 014 cerrados; Plan 012 y el alcance operativo 011 satisfechos.
- [ ] Navegación, títulos, accesos y atajos usan el contrato de composición T0.
- [ ] Ambas configuraciones instaladas y verificadas desde la guía.
- [ ] DB-02/03/04 tienen contrato y evidencia en el recorrido afectado; ningún
      P0/P1 confirmado de seguridad/integridad de la oferta queda sin resolver.
- [ ] Extensión y actualización conservan aislamiento, datos y personalización.
- [ ] Recetas, límites de coste y recuperación tienen evidencia explícita.
- [ ] La promesa publicada corresponde a esa evidencia, no a todos los módulos futuros.

Plan 013 reutiliza estos resultados para buyer onboarding/documentación pública;
conserva licencia, entrega, soporte y validación comercial. No es necesario
instalar Fumadocs, construir otro vertical o certificar proveedores no ofrecidos
para completar la base interna.
