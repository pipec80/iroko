# 016-T1 — Seguridad, integridad y flujos críticos

Dirección posterior,2026-10-28: [ADR0005](../../adr/0005-replicable-saas-mvp-and-bounded-acceptance.md).
Este desgloseT1 y su evidencia histórica se conservan. La reauditoría nueva del
candidato ocurre en016-T2/T3 después de015, con alcance ofrecido y exclusiones
verificadas; no reactivar tareas históricas ni editor/Robot por recorrer esta lista.

> **Para agentes:** ejecutar como revisión en lectura dentro del Plan 016,
> con coordinación principal y contraste N/S/D. Usar
> `superpowers:executing-plans` para seguimiento por tareas y `clean-code`
> para criterios de mantenibilidad; sus recetas de implementación no autorizan
> cambios de aplicación, tests o SQL. Registrar avances con checkboxes.

**Estado vigente:** T1 estático cerrado el 2026-10-08 según el
[registro consolidado](../../audits/2026-10-08-plan-016-t1-closure.md).
Este subplan conserva el checkpoint de planificación del 2026-10-07 y sus
checklists históricos; sus pendientes no reabren la cobertura consolidada ni
acreditan aceptación funcional de las correcciones posteriores.

**Objetivo:** completar la revisión exhaustiva de T1, priorizando riesgos de
seguridad, integridad y flujos esenciales, sin retirar ninguna ruta, opción,
regla o método alternativo del contrato original.

**Arquitectura de trabajo:** subplan operativo del
[Plan 016](016-nextjs-supabase-code-review.md). Revisar conjuntos relacionados
de productor, consumidor, autorización, persistencia y pruebas. La coordinación
escribe artefactos; los frentes N/S/D entregan lecturas y contrastes independientes.

**Stack:** Next.js 16/React 19, TypeScript strict, Supabase/PostgreSQL 17;
toolchain instalada, Git y documentos versionados. Ninguna dependencia nueva.

**Especificación:** alcance y criterios T1 del Plan 016, el
[checkpoint del lote 3](../../audits/2026-10-07-plan-016-t1-batch-3.md),
[arquitectura](../../architecture/system-overview.md) y
[estrategia](../../architecture/product-strategy.md). La
[roadmap](../../../ROADMAP.md) conserva el único orden entre planes.

## Baseline y autoridad

- Candidato inmutable: `03ef8730560c638328c7bad12e58d50376493080`.
- HEAD al planificar: `dfa228fb63e762a77beb291b828561d4547ed2e9`, rama `main`.
  Hay cambios documentales preexistentes del lote 3; preservarlos.
- Consultar código mediante `git show 03ef873:<ruta>`, no asumir que HEAD es
  el candidato. No checkout, reset ni limpieza para facilitar la revisión.
- [Manifiesto](../../audits/2026-10-05-nextjs-supabase-code-review-manifest.csv):
  947 rutas; 205 lecturas completas, 672 pendientes y 70 métodos alternativos.
- [Matriz de configuración](../../audits/2026-10-05-nextjs-supabase-code-review-config-matrix.csv):
  4.136 declaraciones `pending-review`.
- [Matriz de reglas](../../audits/2026-10-05-nextjs-supabase-code-review-rules-matrix.csv):
  654 declaraciones `pending-review`.
- [Asignación por ruta](../../audits/2026-10-07-plan-016-t1-task-map.csv):
  947 asignaciones de planificación, una por ruta. No es evidencia de lectura.
  `checkpoint_status` es el estado al crear el mapa; el manifiesto manda después.
- Nuevos artefactos de revisión no se añaden al denominador del candidato.
  Cambios en un candidato posterior requieren revalidar archivos y consumidores.

## Límites y aplicación de skills

- Esta autorización cubre planificación y revisión. Las reparaciones conservan
  planes receptores 012/014/015 o tareas propuestas con dueño para T3.
- No modificar `src/`, mensajes de producto, tests, migraciones, espejos, tipos
  generados ni configuración ejecutable. No instalar/actualizar dependencias.
- Mantener Proxy, React Compiler, navegación next-intl y monolito modular.
- `clean-code`: valorar nombres, contratos, cohesión, duplicación, errores,
  efectos y legibilidad de pruebas; tamaños de función o preferencias de estilo
  no son defectos por sí solos. No introducir refactors durante la lectura.
- Skills técnicas: usar Next/React, Supabase y revisión de seguridad cuando
  aporten al lote; leer su SKILL.md al aplicarlas, contrastar recomendaciones con
  documentación oficial compatible y registrar referencia/fecha. No aplicar
  recetas por palabra clave ni convertir una sugerencia en requisito de cierre.
- Leer `TESTING-PLAN.md` antes de especificar cambios permanentes de pruebas.
  Durante T1 se revisan las existentes y se describe la aceptación futura.
- Cloud, proveedores, pagos, deploy, push y merge siguen fuera de alcance.
  No imprimir secretos ni hashes de archivos de credenciales.
- Build/analyze/E2E siguen bloqueados por gate Sentry ausente en el candidato.
  La casilla histórica T0 documenta el mecanismo, no su implementación.
- pgTAP/DB, suites comunes y comprobaciones integradas pertenecen a T2 con sus
  precondiciones. Un probe aislado excepcional debe tener alcance, dobles,
  comando y efectos comprobados antes de ejecutarse; no es aceptación integrada.

## Foco de revisión

### Buenas prácticas por lenguaje y reglas locales

Antes de cada lote, leer las reglas aplicables de `.codex/rules/`, considerando
sus patrones `paths` y los consumidores afectados. Son instrucciones locales
de apoyo, subordinadas a AGENTS, código/configuración y al contrato de Plan 016.
No versionar estos archivos ignorados ni incorporarlos a las 947 rutas del
candidato. Su disponibilidad y contenido pueden cambiar entre instalaciones.

| Fuente local             | Aplicación en la revisión                                                                                                          |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| `typescript-nextjs.md`   | TypeScript/TSX, Server/Client boundaries, Proxy, schemas y entorno; contrastar caché con configuración efectiva.                   |
| `code-quality.md`        | Tipos sin `any`, imports de tipos, validación, errores/logging y legibilidad; styling según sistema canónico.                      |
| `software-principles.md` | SOLID/DRY/KISS/YAGNI y coherencia de responsabilidades; evitar abstracciones o refactors sin necesidad demostrada.                 |
| `jsdoc-documentation.md` | Contratos exportados, efectos y fallos no obvios; documentación útil sin repetir tipos.                                            |
| `testing-standards.md`   | Independencia, comportamiento observable, mocks de fronteras y espera determinista; combinar con TESTING-PLAN.                     |
| `supabase-setup.md`      | SQL, migraciones/espejos, RLS, grants y SECURITY DEFINER; aplicar excepción Windows y verificar afirmaciones técnicas.             |
| `supabase-realtime.md`   | Autorización de canales, identidad, cleanup, reconexión y productores/consumidores; no migrar transporte por receta.               |
| `git-workflow.md`        | Convenciones Git y checks; preservar cambios y límites de autorización, sin sincronizar/eliminar ramas ni mergear automáticamente. |

Criterios de lenguaje: TypeScript strict, `unknown` con narrowing, imports de
tipos y contratos asíncronos explícitos; JavaScript de scripts con errores y
efectos comprobables; SQL con integridad tenant, transacciones y privilegios
acotados. React/Next y Supabase se revisan además según versión/configuración
efectiva. No convertir umbrales de longitud/indentación ni preferencias de
abstracción en P0/P1 sin impacto demostrado.

Contradicciones locales identificadas al leer estas ocho fuentes, 2026-10-07:

- `typescript-nextjs.md` menciona `src/env.js`; el inventario vigente es
  `src/env.ts`. Su receta de `use cache` no autoriza activar Cache Components:
  el candidato declara `cacheComponents: false` y Plan 016 lo conserva.
- `code-quality.md` menciona tokens Material Design 3; manda el sistema Iroko
  Poppy/Cobalt/Geist. No introducir una tercera paleta.
- Las recetas Realtime, selectores E2E y principios de diseño se contrastan
  con contratos existentes, TESTING-PLAN y documentación aplicable; no son
  instrucciones para reescribir la aplicación durante T1.

R4 registra para cada regla local relevante: archivo/línea, aplicabilidad,
consumidor, evidencia y decisión (aplicar, contextualizar o descartar con motivo)
en el registro del lote. Este registro local es adicional a las 654 entradas
versionadas de la matriz; no cambiar ese conteo ni afirmar que ya está resuelto
por haber leído los ocho archivos. La actualización de reglas locales queda
fuera de esta revisión documental.

1. Actor sin membresía, viewer, revocado o AAL insuficiente: contrastar denegación
   directa y control positivo autorizado en aplicación y SQL (tarea R1).
2. Datos A en identidad/cuenta B con caché caliente o consulta fallida: seguir
   el ciclo completo de estado y documentar el hueco de aceptación (tarea R3).
3. Último cupo, lease vencido o saves fuera de orden: demostrar intercalado,
   autoridad de la escritura y ausencia/presencia de protección (tarea R2).
4. URL externa, DNS/redirección o token operativo presente: distinguir
   validación declarada de política efectiva de conexión/egreso (tareas R1/R4).
5. Flag apagado, pricing divergente o promesa comercial: comprobar ruta,
   acción, consumidor, traducción y evidencia, sin asumir aceptación (tareas R3/R5).

## Prioridades y cobertura sin omisiones

R0–R7 son identificadores de tareas; las severidades P0/P1/P2 pertenecen
al contrato del Plan 016 y no se deducen del orden de una tarea.

El orden organiza riesgo, no crea fases rígidas. R1/R2/R3 pueden avanzar en
paralelo por lectores distintos; R4/R5 acompañan los consumidores afectados.
R6 se agenda en cada ciclo, para que lo menos crítico no quede indefinidamente
postergado. El coordinador mantiene una sola escritura y serializa cualquier
comprobación que comparta entorno.

| Tarea                        | Pendientes | Completas previas | Alternativas | Propietario de lectura             |
| ---------------------------- | ---------: | ----------------: | -----------: | ---------------------------------- |
| R1 Seguridad y aislamiento   |         77 |                39 |            1 | S, contraste D/N                   |
| R2 Integridad y concurrencia |        103 |                39 |           18 | D, contraste S/N                   |
| R3 Estado y flujos críticos  |        187 |                55 |            0 | N, contraste S/D                   |
| R4 Configuración y reglas    |          3 |                50 |            0 | C, contraste técnico               |
| R5 Producto y reutilización  |         20 |                 4 |            0 | N/C, contraste D/S                 |
| R6 Resto exhaustivo          |        282 |                18 |           51 | Dueño original del manifiesto      |
| Total                        |        672 |               205 |           70 | Sin sumar propietarios compartidos |

La asignación usa rutas/categorías para iniciar trabajo, no sustituye entender
contratos. Mover una ruta entre tareas exige actualizar el mapa conservando
unicidad. Los contrastes secundarios no duplican la ruta ni cambian su dueño
original. R4 incluye también las 4.136 opciones y 654 reglas: su tamaño no se
deduce de sus tres archivos pendientes.

## Tareas ejecutables

### 016-T1.R0 — Preparar el ciclo y seleccionar lotes

**Responsable:** C. **Entrada:** manifiesto, matrices, mapa, informe y handoff.
**Salida:** lista exacta de rutas del próximo lote, lectores y contrastes.

- [x] Comprobar estado Git, rama y SHA; conservar cambios preexistentes.
- [x] Revalidar unicidad/candidato/conteos permitidos y categorías del inventario.
- [x] Elegir rutas `pending` de R1/R2/R3 con sus dependencias ya leídas; añadir
      trabajo de R4/R5 y un lote R6 en cada ciclo, con lista exacta en el registro.
- [x] Asignar responsabilidad exclusiva por lectura y segundo frente para
      candidatos de severidad P0/P1; declarar que los agentes no escriben artefactos compartidos.

**Cierre:** no ruta seleccionada sin responsable; no estado cambiado por selección.

### 016-T1.R1 — Seguridad y aislamiento

**Entradas:** todas las rutas R1 del mapa; releer dependencias cuando haga falta.
Arranque concreto: `src/app/[locale]/dashboard/robot/page.tsx`,
`src/lib/robot-config.ts`, `src/lib/__tests__/robot-config.test.ts`,
`supabase/migrations/20260611000000_iroko_robot_config.sql`,
`20260611000001_iroko_robot_config_grants.sql` y
`20260702000003_replace_robot_config_rpc.sql` en ese mismo directorio.

- [x] Leer rutas/acciones/SQL de Robot y el flag; revalidar RS-01 de 014-T1.
- [ ] Seguir identidad, MFA, invitaciones, revocación, impersonación, API keys,
      Storage y GDPR hasta la autorización efectiva, sin confiar sólo en layouts.
- [ ] Revisar grants/RLS/RPC en secuencia; identificar acceso anon/authenticated/
      service_role, `search_path`, autorizaciones vivas y uso de cliente admin.
- [ ] Revisar salida webhooks/workers y secretos: firmas, destinos, DNS,
      redirecciones y límite entre validación local y control de egreso.
- [ ] Registrar por operación actor, tenant, entrada, efecto, permiso y prueba
      negativa/positiva existente o procedimiento futuro si falta.

**Cierre de lote:** EOF físico de cada ruta seleccionada, contrato y consumidor
contrastados; segunda lectura de todo candidato severidades P0/P1. Cloud no se infiere de SQL.

### 016-T1.R2 — Integridad, concurrencia y trabajo durable

**Entradas:** rutas R2, secuencia SQL restante y dependencias R1/R3.
**Salida:** invariantes y escenarios de concurrencia trazables.

- [ ] Leer migraciones pendientes por orden y contrastar redefiniciones con
      espejos, consumidores y tipos generados mediante su método alternativo.
- [ ] Completar relaciones tenant, nulabilidad, cascades, transacciones, cuotas,
      idempotencia, reducer, cola, retry y retención.
- [ ] Conservar D-03/D-04 como confirmados por código; ampliar variantes y
      detectar dependencias afectadas sin repetir su segunda lectura como pendiente.
- [ ] Completar recovery/reconciliación y editor: lease vencido/reclaim,
      finalización duplicada, respuesta invertida, desmontaje y dos sesiones.
- [ ] Revisar pgTAP/unitarios/fixtures; separar concurrencia real de llamadas
      secuenciales y mocks. Describir sesiones, controles y resultado de cierre.

**Cierre:** intercalados explícitos y evidencia por archivo; SQL no ejecutado se
mantiene `[NO VERIFICADO]`. Billing diferido no se reactiva por revisar su código.

### 016-T1.R3 — Estado y flujos críticos Next/React

**Entradas:** rutas R3 y consumidores de R1/R2. Incluye componentes base y pruebas.

- [ ] Completar cambio A→B, login/logout, navegación atrás, caché, query keys,
      suscripciones y errores; seguir la identidad de productores a render.
- [ ] Conservar reproducción aislada N-06 y su límite: impersonación integrada
      pendiente; no exigir volver a ejecutar el mismo probe sin nueva hipótesis.
- [ ] Revisar contraseña, invitaciones, archivos privados, API keys/webhooks,
      creación/guardado de documentos y billing según alcance vigente.
- [ ] Revalidar imágenes confiables RS-02 y auditoría de plataforma RS-03 junto
      con filtros, paginación y errores, manteniendo dueño Plan 014.
- [ ] Leer Server/Client boundaries, rutas, acciones, hooks, UI, pruebas y
      fixtures de cada lote completo; no declarar carpeta cubierta por sus helpers.

**Cierre:** estados carga/error/vacío y acceso directo contrastados; ningún defecto
de rendimiento sin medición se presenta como mejora medida ni bloqueo confirmado.

### 016-T1.R4 — Configuración, automatización y reglas

**Entradas:** rutas R4 y todas las filas de ambas matrices, incluidas las opciones
de archivos ya leídos. **Salida:** decisión individual trazable por declaración.

- [ ] Interpretar cada opción/default/override: consumidor, efecto, precedencia,
      referencia oficial compatible, evidencia y decisión.
- [ ] Distinguir regla real, contexto, ejemplo o historia en las 654 entradas;
      registrar excepción/contradicción contra la autoridad del repositorio.
- [ ] Contrastar CI y scripts con comandos y destinos reales: cancelaciones,
      skips, permisos, fixtures, mutaciones y checks requeridos no verificados.
- [ ] Revisar rate limiting, IP confiable, CSP, Vault, Sentry y entorno Supabase;
      separar configuración local, mecanismo propuesto y enforcement Cloud.
- [ ] Registrar S-03/S-05/S-06 y sus dependencias de cierre sin atribuir bypass
      remoto ni ejecutar los workflows para demostrar intención.

**Cierre:** cero declaraciones sin decisión; no rellenar filas con una aprobación
genérica del archivo ni convertir sus 53 lecturas en 4.136 decisiones aceptadas.

### 016-T1.R5 — Producto, contratos y reutilización

**Entradas:** rutas R5, catálogos, configuración y documentos consumidores.

- [ ] Contrastar nombres/slugs/precios/límites entre SQL, checkout, entitlements,
      páginas públicas, metadata y los cuatro idiomas.
- [ ] Mapear promesas a evidencia aceptada; N-09 pertenece a 012.5 y no autoriza
      editar copy desde esta revisión.
- [ ] Revisar flags: visibilidad, disponibilidad de acción, autorización y
      soporte de recursos existentes; comprobar contratos con/sin billing.
- [ ] Revisar instalación, configuración, adaptación, actualización y operación
      documentadas; preparar huecos/pruebas receptoras 015 sin ejecutar sus ensayos.

**Cierre:** toda promesa revisada tiene fuente y límite, y toda contradicción dueño;
lectura de una guía no se presenta como instalación independiente demostrada.

### 016-T1.R6 — Resto exhaustivo y métodos alternativos

**Entradas:** las 282 rutas pendientes restantes y 70 alternativas de todo el mapa.

- [ ] Leer SQL, seed, templates, UI base, utilidades, estilos, fixtures y scripts
      que no entraron antes, además de cada documento vigente aplicable.
- [ ] Revisar cada método alternativo de assets, lockfile, tipos y material
      histórico: procedencia, usos, versiones/contratos y limitaciones exigidas.
- [ ] Contrastar reglas/afirmaciones de documentos con implementación; remitir
      decisiones a R4, sin auditar todas las skills locales ajenas al producto.
- [ ] Registrar evidencia concreta aunque no haya hallazgo; no omitir por tamaño,
      repetición o riesgo bajo, ni usar búsquedas estructurales como lectura completa.

**Cierre:** ninguna fila propia sin dueño y ninguna exclusión sin método realizado
en el alcance acordado; los métodos pendientes siguen explícitamente abiertos.

### 016-T1.R7 — Consolidar cada ciclo y cerrar T1

**Responsable:** C; contraste independiente por N/S/D.

- [ ] Actualizar manifiesto con rangos, criterios, evidencia, hallazgos, checks y
      estado; cada lector entrega rutas/rangos sin truncamiento.
- [ ] Registrar candidatos con condición/esperado/observado/impacto/referencia,
      trazado, corrección mínima, prueba de cierre, responsable y plan receptor.
- [ ] Deduplicar causas, resolver desacuerdos por evidencia y preparar tareas
      concretas para 012/014/015; hallazgo sin receptor queda propuesto para T3.
- [ ] Recalcular cobertura global por rutas únicas y decisiones de matrices;
      actualizar informe/handoff sin presentar la selección del mapa como avance.
- [ ] Ejecutar checks documentales y revisión del diff; registrar comandos y
      resultados exactos. No avanzar al siguiente plan por haber cerrado un lote.
- [ ] Cerrar T1 sólo con 100% de archivos/rangos y alternativas resueltos,
      opciones/reglas decididas, contrastes entregados y límites T2 explícitos.

**Cierre:** T1 puede terminar su lectura con runtime `[NO VERIFICADO]`; eso no cierra
Plan 016 integral. T2/T3 conservan candidato/entorno propio y el orden de ROADMAP.

## Artefactos, verificaciones y primer ciclo

El coordinador modifica sólo el manifiesto, matrices, informe, handoff y enlaces
documentales de estado. Este subplan y el mapa son planificación, no un cuarto
lote ni cobertura añadida. No se crea un informe vacío de ejecución.

Validación documental: `node scripts/check-docs.mjs`, `git diff --check` y
`pnpm exec prettier --check --ignore-path .prettierignore-docs` con los Markdown
modificados explícitos. Comprobar que las 947 rutas del mapa y manifiesto sean
iguales, sin duplicados ni estados de lectura alterados al planificar.

Primer ciclo: R0 selecciona el recorrido Robot/RPC/permisos R1, la secuencia de
integridad R2 y sus consumidores R3; R4 documenta las declaraciones de esas
superficies y R6 reserva lectura de reglas/documentos relacionados. R5 continúa
con flags y promesas que aparezcan en esos consumidores. Los demás lotes siguen
en el mapa; no se elimina alcance ni se promete fecha antes de medir avance real.

## Verificación de esta planificación

El code-reviewer contrastó el mapa con el manifiesto y ambas matrices:
947 rutas iguales y únicas, sin diferencias de candidato, propietario o estado;
subtotales por tarea consistentes. Se resolvió la ambigüedad entre identificador
de tarea y severidad. La revisión de planificación no aporta lectura de código
ni aceptación de las correcciones. En ese checkpoint de planificación R0–R7 estaban pendientes; el registro
de ejecución posterior conserva su avance separado.

Comprobaciones de esta planificación, 2026-10-07:

- `node scripts/check-docs.mjs`: exit 0, 106 Markdown.
- `pnpm exec prettier --check --ignore-path .prettierignore-docs` sobre este
  subplan, el padre, índice de ejecución, estado actual y handoff: exit 0.
- `git diff --check`: exit 0.
- Python/CSV: PASS en igualdad y unicidad de las 947 rutas, conservación de
  SHA/owner/estado, referencias de tareas y conteos de las matrices.
- Suites de aplicación, SQL, build/E2E y Cloud: no ejecutados; no son validación
  de esta modificación exclusivamente documental.

## Ejecución — checkpoint lotes 4–7

R0 completado para este ciclo, Robot revalidado. El snapshot inicial y mapa
se conservan históricos: CSV actual425 completas,452 pendientes,70 alternativas.
R1–R7 siguen abiertos en su alcance restante. Matrices4153 opciones/654 reglas,
4/111 revisadas estáticamente. Enriquecer inventarios no acredita decisiones.
Aplicación, excepciones y contradicciones de reglas/lenguajes en registros4–7.

## Cobertura consolidada —2026-10-08

[Registro y limites](../../audits/2026-10-08-plan-016-t1-closure.md):874lecturas
completas,73alternativas aplicadas,0pending sobre947rutas; matrices4153/654
con decisionesestaticas. R0–R6 tienen cobertura registrada; cierre R7 registrado con checks documentales. Correcciones yvalidacionruntime no pertenecen
a esta lectura; mapas/checklists iniciales se mantienen historicos.

T1 estática cerrada el2026-10-08: R0–R7 entregan cobertura y contraste en el
registro de cierre. Las checklists y cifras de planificación anteriores se
conservan como snapshots históricos. Plan016 permanece activo paraT2/T3.
