# Plan 017 — Remediación del freeze y contrato de ejecución

> **Para cualquier ejecutor:** leer este contrato y la tarea del plan hijo. No requiere un modelo, plugin o conversación determinados. Las herramientas disponibles pueden variar; los resultados y límites exigidos son los mismos.

**Goal:** Resolver los defectos existentes revalidados, conservar cada seguimiento y entregar un candidato verificable sin ampliar el producto.

**Architecture:** Mantener el monolito modular, Supabase como autoridad de identidad/datos y los contratos comerciales actuales. Esta familia implementa las reparaciones que 016 identifica pero no ejecuta; 012.5, 014 y 015 conservan su propiedad.

**Tech Stack:** Next.js 16.4.1, React 19/Compiler, TypeScript strict, PostgreSQL/Supabase, TanStack Query, Vitest, pgTAP y Playwright instalados.

**Spec:** [Auditoría revalidada](../../audits/2026-10-19-freeze-code-and-documentation-revalidation.md), [estrategia](../../architecture/product-strategy.md) y aceptación del mantenedor en esta conversación, 2026-10-20.

**Estado:** ejecución **P1 y P2 locales en curso** desde 2026-10-20, con [evidencia P1](../../audits/2026-10-20-017-p1-execution.md), [evidencia P2](../../audits/2026-10-22-017-5-p2-execution.md) y disposición por ID en el registro central. Contraseña, identidad, MFA, Storage RBAC, traducciones Admin y consentimiento Vercel ya tienen controles locales positivos; el editor browser, analytics funnel y otras aceptaciones siguen pendientes según el registro. La aceptación integrada final no está cerrada. Base `main` @ `a2feb3de9ca95bef5b18c7f6d2b4a4e88f6f899f`, cambios sin commit. No autoriza Cloud, pagos ni despliegue. El [roadmap](../../../ROADMAP.md) mantiene el único orden de ejecución.

## Entendimiento aprobado y alcance

Actualización de exclusión2026-10-29: prerrequisito015-T1 aceptado localmente
con navegador2/2 y cleanup, complementando guards unitarios/revisión. No quedan
filasP1 pendientes del núcleo017 en CSV; se habilita012.5 según el paso4 de la
cola. RS-05 global sigue pendiente por composición/billingT0/T1; no cierra015
ni017 P2 ni certifica build/Cloud. Véase la evidencia más reciente enlazada arriba.

Actualización2026-10-29: implementación consolidada localmente en
`634ad4918809141b0d63c3f00bf368cc8b829b02`; documentación/evidencia en consolidación
separada. Sustituye «cambios sin commit» del estado histórico anterior. S-05/S-06
satisfacen el contrato localT10; Actions/protección de rama siguen
**[NO VERIFICADO]**. No cierra017, RS-05 runtime ni autoriza publicación.

**Dirección vigente 2026-10-28:** [ADR 0005](../../adr/0005-replicable-saas-mvp-and-bounded-acceptance.md).
El resultado de017 es cerrar defectos del núcleo ofrecido, no perfeccionar un
runner ni construir una vertical. Editor N04/N05/R02 queda diferido; su exclusión
efectiva pertenece a RS-05/015-T1: guards y regresiones unitarias implementados
el29/10; aceptación browser de exclusión2/2 completada después ese día. La disposición individual
actualizada está en la evidenciaP1, sin borrar resultados históricos.
Robot no condiciona replicar la base. Las secciones técnicas de tareas diferidas
se conservan para su retorno, sin constituir una orden de ejecutarlas ahora.

La [separación de destinos y diagnóstico local/Cloud](../../audits/2026-10-27-017-environment-triage.md)
explica por qué Turnstile real y el código desplegado no sustituyen las pruebas
locales de este candidato sin commit; los fallos E2E se atribuyen sólo con traza.

El usuario aceptó cinco entregables: consolidar cada hallazgo; crear/reutilizar planes acotados; priorizar seguridad/integridad; ejecutar posteriormente tareas pequeñas con regresión y revisión; validar el candidato final después de todos sus cambios. Se conserva el alcance del freeze: reparar, demostrar, configurar y documentar capacidades presentes. No se agregan proveedores, verticales, modelos de pricing ni un sistema genérico de plugins.

La especificación original del20/10 no creaba ADR porque no cambiaba arquitectura.
La decisión posterior del28/10 sí queda enADR0005: cambia alcance/prioridad del
MVP sin renombrar catálogo ni afirmar implementación. Otras decisiones duraderas
incompatibles requieren su evidencia y disposición, no cambios implícitos.

## Registro único y estados

El [registro consolidado CSV](freeze-remediation-register.csv) tiene una fila por ID histórico N/S/D, aliases RS, desgloses D-03, discrepancias DOC y seguimientos heredados. Es el registro de disposición, no otro roadmap. Cada fila identifica responsable lógico, tarea, aceptación y evidencia. Un alias no crea otra implementación.

- `planned`: defecto vigente con tarea de reparación; no implementado.
- `conditional`: primero reproducir el escenario; si no ocurre en el candidato, cerrar la hipótesis con evidencia y alcance, sin inventar una corrección.
- `partial`: fila agregada; sus subfilas separan resuelto y pendiente.
- `corrected-static`: causa original corregida y evidencia enlazada; no abrir otra reparación por el mismo defecto. Validación final según superficie afectada.
- `evidence-pending`: falta una aceptación, no demuestra fallo del producto.
- `corrected-local`: reparación y aceptación local de su tarea ejecutadas, con
  revisión y gates generales enlazados; no declara paridad Cloud, cierre de 017
  ni aceptación integrada final de 016.
- `decision-pending`: debe quedar una disposición explícita antes del cierre, conservando restricciones actuales hasta decidir.
- `deferred`: fuera del alcance ofrecido por decisión explícita; conservar razón,
  evidencia histórica y condición de retorno. No equivale a corregido/aceptado;
  si sigue ofrecido/accesible, su riesgo continúa bloqueando esa configuración.
- `documented`: asignación o corrección documental realizada; no declara código corregido.

El ejecutor actualiza la fila en el mismo cambio que la tarea: SHA, resultado RED/GREEN, revisión, aceptación local/Cloud separada y enlace de evidencia. Un P1 no se cierra porque pase una suite genérica. No cambiar `planned` a completado al escribir un plan.

Las columnas `baseline_sha`, `implementation_sha`, `validation_result`,
`reviewer`, `closure_evidence` y `updated_at` evitan perder trazabilidad al
ejecutar. Los campos de implementación/revisor/cierre están vacíos mientras no
exista esa ejecución; `historical-bounded` conserva evidencia anterior sin
atribuirla al candidato nuevo y `documentation-only` no certifica producto.

## Propiedad por subsistema

| Plan                                              | Tareas y responsabilidad                                                                                    | Condición de fase                                                        |
| ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| [017.1](017-1-auth-identity-and-privacy.md)       | Auth, estado entre identidades, privacidad, Realtime y logs                                                 | T1–T3 prioritarias; restantes después de 014 salvo dependencia necesaria |
| [017.2](017-2-data-and-memberships.md)            | Cuotas API keys/seats, invitaciones, relación documento/proyecto/cuenta, último owner y serialización Robot | T1–T4 P1; T5 P2                                                          |
| [017.3](017-3-billing-integrity.md)               | Fencing recovery y divergencia discovery MP; disposición de replay mock                                     | T1–T2 P1; T3 decisión acotada                                            |
| [017.4](017-4-editor-integrity.md)                | Edición pendiente y conflicto de versiones entre sesiones                                                   | Diferido post-MVP; retorno al ofrecer editor; exclusión por015-T1        |
| [017.5](017-5-web-correctness-and-quality.md)     | Defectos web P2, gates CI y fiabilidad de fixtures                                                          | Después de 014; T11 puede adelantarse si prepara pruebas seguras de P1   |
| [012.5](012-5-pricing-truth.md)                   | Catálogo público/dashboard/checkout, nombres, límites, copy y metadata                                      | Sigue independiente; después de los P1 de 017                            |
| [014-T2/T3](014-reference-surface-correctness.md) | Imágenes por origen y auditoría global                                                                      | Conservar tareas y criterios existentes; no duplicarlas en 017           |
| [015](015-reusable-foundation-acceptance.md)      | Composición, integraciones opcionales, recetas y reuso independiente                                        | S-10 pertenece a T1; pruebas de marketing coordinan 012.5                |
| [016](016-nextjs-supabase-code-review.md)         | Consolidación inicial/final y validación del candidato                                                      | Revisa/asigna, no implementa las reparaciones de 017                     |

El mantenedor conserva la decisión de producto y los permisos de Cloud; el ejecutor de cada PR es propietario de su diff; un revisor distinto comprueba aceptación y regresiones. No se inventan responsables humanos ni fechas de entrega.

## Dependencias e interfaces compartidas

1. **017.1-T2 antes de E2E con URLs Auth/telemetría:** interceptar tráfico local y utilizar tokens sintéticos. No enviar secretos para probar que no se filtran.
2. **017.2-T3 antes de 017.4-T2:** primero garantizar pertenencia documento/proyecto/cuenta; después añadir revisión/CAS. Migraciones y tipos deben componerse, no sobrescribirse.
3. **017.2-T2 y T4 serializadas:** comparten membresías; usar el mismo orden de locks por cuenta y probar combinaciones. Implementar una después de revisar la anterior.
4. **017.5-T11 antes de utilizar el fixture dblink afectado:** validar destino y cleanup. Es una precondición de seguridad de pruebas aunque su prioridad original sea P2.
5. **012.5 antes de la aceptación sin billing de 015:** un catálogo/DTO; 015 controla disponibilidad, no introduce otros precios. S-10 extiende el guard de analítica servidor en 015-T1.
6. **016-T2 final después de 015:** toda modificación posterior de producto invalida los checks afectados. Las validaciones intermedias siguen siendo útiles, pero no son el cierre final.

No ejecutar dos suites mutantes contra el mismo Supabase local simultáneamente. Se pueden investigar módulos en paralelo; compartir ownership de un archivo o migración exige coordinación y revisión serial.

## Global Constraints

- Leer AGENTS, docs/index/current-state, arquitectura relevante, plan hijo y TESTING-PLAN antes de tocar pruebas.
- Mantener `src/proxy.ts`; nunca crear `middleware.ts` de entrada. React Compiler sigue habilitado, `cacheComponents: false`, sin `useMemo`/`useCallback` manual.
- TypeScript strict, sin `any`, imports de tipos con `import type`, errores tipados y logger Pino. JSDoc explica contratos/efectos no evidentes.
- `src/env.ts` sigue siendo el inventario de variables. No duplicar listas ni valores en guías ni usar bypass de validación para acreditar instalación.
- Conservar nombres Free / Plus / Pro, slugs `free` / `pro` / `scale`, IDs y precios vigentes. MP mensual CLP, sin trial/anual; no certificar Stripe/Paddle/Lemon Squeezy.
- No cambiar paleta ni fuentes: Poppy/Cobalt/Geist/Geist Mono; cuatro idiomas `es/en/pt/fr`, español predeterminado. Los prototipos históricos no definen la oferta.
- SQL Windows: migración versionada manual + espejo correspondiente en el mismo cambio; tipos si cambia contrato expuesto; `search_path=''`, roles vivos y ACL efectivas. CREATE OR REPLACE conserva permisos existentes.
- Antes de modificar integraciones, inventariar consumidores Supabase, GitHub CI/CD, Cloudflare, PostHog, Resend, Sentry, Vercel y proveedores implementados; distinguir presencia de código/configuración/runtime. Free-tier por declaración del usuario; sin instalaciones, upgrades, tarjetas ni recursos pagos.
- Reutilizar stack oficial `saas-boilerplate`. Identificar URL, project_id, contenedor y alcance antes de fixtures/reset. Preservar secretos, fuentes pendientes, material local y recursos ajenos. No crear otro entorno sin necesidad justificada y autorización de esa ejecución.
- Este trabajo documental no ejecuta resets, migraciones, fixtures, Cloud, pagos, push, merge o deploy. Las operaciones linked/Cloud siguen requiriendo autorización explícita propia.

## Reglas leídas, aplicación y contradicciones

Se leyeron las ocho reglas actuales: typescript-nextjs, testing-standards, supabase-setup, supabase-realtime, software-principles, jsdoc-documentation, git-workflow y code-quality. Cada hijo registra las que aplica.

| Práctica        | Aplicación / excepción deliberada                                                                                                                                                                                                                   |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| TS y JavaScript | Firmas/errores concretos; validar fronteras y cancelar continuaciones; pruebas de comportamiento. No convertir consejos de estilo en nuevas refactorizaciones.                                                                                      |
| React/Next      | RSC/cliente explícitos, identidad en keys y cleanup. La receta local use cache no habilita Cache Components; env.js antiguo no sustituye env.ts.                                                                                                    |
| SQL             | Locks, invariantes, ACL y controles positivos/negativos. La regla que afirma regrant universal en CREATE OR REPLACE es incorrecta para funciones existentes; inspeccionar permisos efectivos. Excepción Windows prevalece sobre db diff automático. |
| Testing         | Antes de cambiar tests leer TESTING-PLAN; mocks de fronteras, DB/GoTrue reales para contratos de seguridad. data-testid no sustituye comprobar resultado visible ni control positivo.                                                               |
| Realtime        | Canales privados/broadcast existentes, cleanup del canal concreto y continuación cancelable; no copiar await directamente en useEffect, doble AS, INSERT USING ni policies USING true de ejemplos.                                                  |
| Diseño          | La regla Material 3 y los dos idiomas del guide antiguo no sustituyen el contrato Iroko ni los cuatro locales ejecutables. Solo correcciones visuales necesarias.                                                                                   |
| Git             | Convenciones y revisión por tarea. Recetas de pull, borrar ramas, merge o despliegue no conceden autorización para esas operaciones.                                                                                                                |

## Review Focus

- Un mock verde puede consolidar un contrato SDK erróneo: 017.1-T1 debe comprobar GoTrue con contraseña válida/inválida.
- Ausencia de requests no prueba privacidad: 017.1-T2/N-29 necesita evento de control y payload decodificado.
- Mismo usuario cambiando cuenta y respuestas antiguas: 017.1-T3 cubre caché/notificaciones/atribución.
- Las carreras SQL necesitan sesiones independientes, no dos llamadas en una transacción: 017.2/017.3 y CAS deben demostrar la intercalación.
- Catálogo no disponible o billing apagado: 012.5/015 deben conservar UI fiel, denegar compra y mantener worker/callbacks de recursos existentes.

## Contrato de ejecución independiente del modelo — 2026-10-27

Esta revisión documental sustituye las instrucciones de proceso repetidas en los
cinco hijos; sus contratos técnicos y escenarios de aceptación se conservan.
No obliga a recrear archivos, migraciones, pruebas RED o implementaciones que ya
existen. Un checkbox histórico vacío no invalida la evidencia del registro.

### Entrada y salida de cada tarea

| Campo        | Fuente y obligación                                                                                                                      |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Problema     | ID y escenario en el CSV y en la tarea; verificar código actual antes de reparar.                                                        |
| Resultado    | Bloque **Resultado y límite** y assertions del hijo: comportamiento observable, no cantidad de archivos.                                 |
| Alcance      | **Files/Interfaces** del hijo; tocar otro archivo solo si es un consumidor necesario, registrando el motivo.                             |
| Dependencias | Relaciones de este padre y del CSV; evidencia válida satisface una dependencia, sin repetir su implementación.                           |
| Validación   | Comandos focalizados del hijo, bajo los destinos definidos abajo; exit 0 más assertions esperadas y cleanup cuando hay fixtures.         |
| Cierre       | Resultado focal, revisión del lote y gate compartido enlazados en CSV; ninguna aceptación faltante se infiere de un mock.                |
| Bloqueo      | Primer fallo útil, clasificación, diagnóstico realizado y próxima acción reproducible. No equivale a aceptación ni a defecto demostrado. |

1. Registrar branch/HEAD y diff inicial; leer las filas propias y evidencia
   enlazada. Seleccionar la primera tarea habilitada de la cola siguiente.
2. Si está implementada, comprobar exclusivamente el contrato pendiente. Si hay
   defecto vigente, reproducirlo con regresión y hacer el cambio mínimo. RED
   previo se conserva con su fecha; no revertir código para fabricar otro RED.
3. Ejecutar los controles focalizados y actualizar la misma evidencia fechada
   del subsistema, con comando, esperado, observado y límites. No crear una
   auditoría nueva por cada repetición.
4. Entregar el lote a un revisor distinto (persona o agente). Una revisión cubre
   todas sus tareas; las correcciones posteriores reciben revisión dirigida del
   diff y controles afectados. No reiniciar la auditoría de toda la plataforma.
5. Actualizar CSV antes del handoff. Salida: `aceptada localmente`, `pendiente de
validación` o `bloqueada`, con próxima tarea habilitada. Son resultados del
   handoff, no nuevos valores de la columna `state`.

### Comandos, lotes y destinos

- Unitarios: `pnpm test <selección del hijo>`; usar sufijos únicos en rutas con
  corchetes. Para JS/config, `node --test <archivo indicado>`.
- SQL: `pnpm supa:test <ruta de test SQL>`; suite completa: `pnpm supa:test`.
  No ejecutar `supabase test db` directamente: test42 exige la atestación del
  runner. Antes de pruebas mutantes, resolver R01/R04/R05 y verificar identidad
  del stack, ausencia de candidatos ajenos y cleanup. Nunca dos suites mutantes
  simultáneas sobre el mismo stack.
- Browser: fijar recorridos de la configuración ofrecida antes de ejecutar y
  registrar método reproducible, positivos/negativos y cleanup. No se exige
  development/webpack. El runner existente permanece disponible para alcances
  previamente confinados, pero el editor diferido NO se ejecuta para cerrar MVP:
  `node scripts/run-plan-017-local.mjs <basename.spec.ts>`; solo acepta los ocho
  basenames declarados en ese script. No añadir filtros para omitir casos que
  fallan dentro del alcance elegido. Otros escenarios necesitan el confinamiento del runbook antes
  de usar Playwright; no ampliar el runner por conveniencia. No convertir su
  optimización en una nueva tarea del MVP. Este runner usa
  desarrollo/webpack: no acredita build de producción ni Turnstile real.
- Un lote es un conjunto fijo de tareas con dependencia o superficie compartida,
  declarado antes de ejecutarlo. Cada tarea tiene pruebas focalizadas; al cerrar
  el lote ejecutar una vez `pnpm typecheck`, `pnpm lint` y `git diff --check`,
  más SQL/build/browser cuando su superficie lo requiera. Se conservan las reglas
  pre-commit de AGENTS; agrupar no autoriza omitir hooks ni controles.
- Suite unitaria completa con cobertura, SQL completo, build y E2E integrados
  pertenecen al candidato final de 016. Una corrida completa con cobertura puede
  satisfacer también el requisito de suite unitaria sin duplicarla. Repetir solo
  evidencia invalidada por cambios de contenido, dependencias o configuración.
- Registrar revisión inmutable o manifiesto de contenido de archivos relevantes
  si el árbol sigue sin commit. `uncommitted@<HEAD>` solo identifica la base; no
  demuestra qué contenido fue probado. No incluir secretos en el manifiesto.

### Fallos, límites y cambios de alcance

Clasificar cada fallo como producto, prueba, entorno o causa aún desconocida.
Un timeout anterior a la acción objetivo no demuestra un defecto de esa acción.
Después de un fallo, aislar el primer escenario y explicitar una hipótesis antes
del siguiente intento. Tras dos intentos con la misma firma sin información nueva, detener
esa ejecución, registrar bloqueo y continuar otra tarea independiente habilitada.
No aumentar timeouts, cambiar producto o añadir excepciones al harness sin causa
demostrada. Si es una restricción del sandbox, usar el mecanismo de aprobación
permitido para el comando concreto; no cambiar permisos/configuración global.

Solo entra en la tarea un hallazgo que impida su resultado o una regresión del
diff. Otros hallazgos se registran con owner sin incorporarlos automáticamente al
lote. No reducir permisos, cobertura, controles positivos ni aceptación para
obtener verde. No introducir nuevas capas, servicios o persistencia de borradores.

### Cola de reanudación finita

El roadmap conserva el orden entre planes. Dentro de la fase 017 actual:

Entrada inmediata por ADR0005: adelantar015-T1/RS-05 para fijar configuración
ofrecida y exclusión de módulos. Esto no adelanta el ensayo completo015 ni
permite entregar con un P1 accesible. Después se retoma esta cola del núcleo.

1. **017.5-T11 / R01, R04, R05:** cablear runner en CI y aislar fixtures de
   billing; precondición de las pruebas mutantes, aunque la tarea sea P2.
2. **017.4-T1/T2 / R02: diferido por ADR0005.** Conservar reparación y evidencia;
   no ejecutar/optimizar su runner. 015-T1 debe comprobar exclusión de editor en
   el MVP; diferir no demuestra desactivación. Retorno sólo al ofrecer el editor.
3. **017.1-T2/T3:** cerrar payload de analítica y atribución pendientes; reutilizar
   aceptación de caché/contraseña que siga vigente, sin reabrirla por otro SHA.
   **017.3-T1/T2:** después de R04/R05, renovar únicamente la aceptación de
   aislamiento/persistencia que reabrió D-01/D-11. Revisar todas las filas P1 de
   017 del CSV antes del paso4: no postergar P1 de una superficie ofrecida.
   D-03 se resuelve desde sus subfilas; D01/D11 pueden reutilizar evidencia T11
   que realmente cubra su contrato, sin una nueva implementación de billing.
4. **Gate local P1:** focales exigidos, revisión de lote y controles compartidos.
   Sin P1 pendientes del núcleo ofrecido y con exclusión efectivamente verificada,
   continuar012.5/014 según roadmap, aunque el gate integrado
   final siga pendiente.
5. **Restantes017 del MVP:** atender riesgos y fallos esenciales de las capacidades
   ofrecidas, incluido R03 si MFA se ofrece. Disponer explícitamente P2 secundarios
   con dueño/retorno; no son ampliaciones automáticas del gate. Robot/editor fuera
   del MVP no se reactivan por su orden numérico. Sólo reparar contratos ausentes
   o defectuosos; no inventar implementación para cerrar una hipótesis.
6. **Gate local restante:** mismos criterios proporcionales; continuar 015 y luego
   016 final. No abrir nuevos frentes al llegar al cierre.

R01–R05 son las filas `017-R01`–`017-R05` del registro: su detección original
fue estática, no una reparación. Actualización29/10: R01/R04/R05 conservan
aceptación local T11; R02 diferido; R03 reparado y12/12 con revisión y gates
compartidos locales satisfechos en la continuación29/10. Pertenecen a tareas ya existentes, no crean otro
subplan. Si una tarea independiente queda bloqueada,
anotar la desviación y tomar la siguiente habilitada sin alterar el roadmap.
R02 conserva su riesgo y evidencia, con phase=post-mvp por ADR0005. No bloquea
los demás lotes; sí bloquea ofrecer editor hasta su aceptación. La exclusión
de015-T1 conserva su gate sobre rutas/acciones; el prerrequisito de exclusión fue
aceptado localmente el29/10, sin aceptar la composición/billing restante.

## Seguimientos que requieren disposición, no un cierre ficticio

RL-F01/F03 son seguimientos de seguridad/permisos de 012 con inventario antes de decidir cambios. RL-F02/F04 son ampliaciones de evidencia Cloud; RL-F05 conserva aceptación por integración; RL-F06 es condición operativa de WAF. Mock TTL/jti se dispone en 017.3-T3. Consentimiento Vercel Analytics/SpeedInsights se dispone en 017.1-T8. Los escenarios avanzados 011 permanecen diferidos.

Antes del cierre final, cada seguimiento tendrá resultado, dueño y condición de retorno. Una excepción acotada aprobada puede conservarse con razón; ningún P1 vigente de una capacidad ofrecida se oculta detrás de un estado global de plan cerrado. No hace falta ejecutar una prueba Cloud no autorizada para registrar correctamente que sigue no verificada.

## Aceptación documental y de implementación

**Esta entrega documental** exige cobertura de los 53 IDs y RS/DOC/RL, links válidos, un solo owner por reparación, dependencias sin ciclos y revisión independiente. No cambia el estado de producto a implementado.

**Hito local de017:** tareas del alcance MVP aceptadas y diferidos dispuestos,
con exclusión efectiva verificada, pruebas focalizadas,
revisión del lote, gates compartidos y disposición explícita de hipótesis y
seguimientos. Permite avanzar en el roadmap; no certifica Cloud ni termina el
freeze. Una fase aceptada no cierra las restantes.

**Aceptación integrada:** después de 012.5/014/015, 016 ejecuta el
[gate final](../../runbooks/freeze-candidate-validation.md) y comprueba
compatibilidad del candidato. 017 permanece en `active/`, con su hito local
visible, hasta completar esta obligación. No esperar al gate integrado para
registrar reparaciones locales ni repetir toda su ejecución sin cambios afectados.
