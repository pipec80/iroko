# Freeze — entrega documental y revisión de planes

Fecha: **2026-10-20**, America/Santiago. Código base: `main` en
`a2feb3de9ca95bef5b18c7f6d2b4a4e88f6f899f`. Alcance autorizado: dejar escritos
los cinco puntos aceptados después de la auditoría, usando Superpowers y las
capacidades disponibles de revisión. No se implementó producto ni se ejecutó
SQL, navegador, pagos, proveedores o Cloud en esta entrega.

## Resultado de los cinco puntos

| Punto                 | Entregable                                                                                                                                             | Estado                                                                                                                      |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------- |
| Consolidar            | [Registro de disposición](../exec-plans/active/freeze-remediation-register.csv)                                                                        | 96 filas; 53 IDs históricos N/S/D, 13 RS, 13 DOC, tres desgloses D-03, 13 follow-ups y un gate. No son 96 implementaciones. |
| Planes acotados       | [017 y cinco hijos](../exec-plans/active/017-freeze-remediation.md), [012.5](../exec-plans/active/012-5-pricing-truth.md), coordinación en 014/015/016 | Archivos, interfaces, regresiones, comandos futuros y revisión por tarea documentados; implementación no iniciada.          |
| Prioridad             | [ROADMAP](../../ROADMAP.md) y [current-state](../current-state.md)                                                                                     | 017 P1 precede 012.5; 014 conserva su scope; P2 y 015 siguen; validación final después de los últimos cambios.              |
| Ejecución verificable | Contrato 017 y pasos RED/GREEN/revisión de cada hijo                                                                                                   | Un propietario por reparación, sin reimplementar causas ya corregidas; hipótesis condicionadas primero se reproducen.       |
| Aceptación final      | [Runbook del candidato](../runbooks/freeze-candidate-validation.md)                                                                                    | Preflight, checks, DB/Edge/build/browser, Cloud autorizado y revisión semántica final; protocolo planificado.               |

**012.5 conserva identidad y alcance completo.** No se desarma entre 017 y 015:
mantiene catálogo público/dashboard/checkout, nombres, límites, copy y metadata.
017 repara seguridad e integridad; 015 reutiliza el catálogo y gobierna la
disponibilidad de módulos/nuevas ventas. No se cambian slugs/precios ni se crea
ADR de pricing por esta reorganización.

## Revisión independiente y correcciones

Dos agentes revisores distintos de los autores inspeccionaron documentos y
contratos seleccionados. La revisión de trazabilidad no encontró IDs duplicados,
faltantes, destinos inexistentes ni ciclos declarados. La revisión técnica
identificó los siguientes ajustes; se conservaron como revisión de planes, no
como reparaciones de producto ejecutadas:

| ID de revisión | Observación                                                               | Resolución documental                                                                                                                                                    |
| -------------- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| PLAN-R1        | 017.2 describía project_id nullable aunque el esquema lo declara NOT NULL | Preservar NOT NULL, probar SQLSTATE 23502 para NULL y 23503 para vínculo de otro tenant.                                                                                 |
| PLAN-R2        | secure_password_change no prueba exigencia de contraseña actual           | 017.1-T1 distingue sesión/nonce de current_password y exige preflight efectivo del setting Auth requerido antes del negativo GoTrue. Sin precondición no se cierra S-02. |
| PLAN-R3        | Runner del fixture D-09 podía quedar sin usar desde el comando habitual   | 017.5-T11 incluye cableado de package.json/supa:test, suite completa, guard SQL obligatorio y pruebas de bypass/identidad errónea/atestación vencida antes de efectos.   |
| PLAN-R4        | Borrador en sessionStorage añadiría persistencia privada no solicitada    | 017.4 usa memoria por usuario/cuenta/documento; salida forzada pierde borrador con advertencia, sin promesa de recuperación durable.                                     |
| PLAN-R5        | Limpieza antes de una transición fallida podía perder borrador            | 017.1/017.4 advierten antes, limpian tras transición confirmada y conservan borrador si la transición falla. No hay dependencia circular de aceptación entre providers.  |

La distinción Auth de PLAN-R2 se contrastó con el SDK instalado y la
[documentación oficial de seguridad de contraseñas](https://supabase.com/docs/guides/auth/password-security).
No se consultó ni cambió la configuración efectiva Cloud.

## Skills, herramientas y límites

- Superpowers: using-superpowers, brainstorming, writing-plans, requesting-code-review y verification-before-completion. La intención y el alcance ya estaban aceptados por el usuario; se redactaron los planes sin aplicar cambios de producto. La ubicación exec-plans del repositorio prevalece sobre el directorio genérico de la skill.
- Se leyeron las ocho reglas actuales .codex/rules y TESTING-PLAN; aplicación y contradicciones están en 017 y sus hijos. No se editan reglas personales ni se copian sus recetas inválidas.
- Code Review instalado ofrece lectura de checks de PR mediante `pull_requests_checks`; no hay un PR de esta entrega ni se creó uno. Se usaron revisores locales independientes; no se presenta como revisión remota de PR ni se inventan diagnósticos CI.
- Los cambios previos de docs/index y current-state se preservaron y se extendieron con la coordinación autorizada. Los registros históricos reciben avisos de estado/ubicación superados, conservando resultados y fechas.

## Comprobaciones de esta entrega

Comprobaciones ejecutadas el **2026-10-20** sobre esta entrega:

| Comprobación                                                        | Resultado                                                                                                                                                                           |
| ------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `node scripts/check-docs.mjs`                                       | PASS; 171 archivos Markdown.                                                                                                                                                        |
| `git diff --check`                                                  | PASS; sin errores de whitespace.                                                                                                                                                    |
| Prettier API `check`, mediante Node sobre Markdown modificado/nuevo | PASS; 29 archivos, cero diferencias de formato.                                                                                                                                     |
| Validación estructural del CSV mediante Node                        | PASS; 96 filas únicas, 53 IDs históricos, 17 columnas; sin IDs faltantes, duplicados, campos de disposición ausentes, rutas inválidas ni tareas 017 inexistentes en su propietario. |
| Inventario Git de cambios versionados y archivos nuevos             | 30 documentos: 29 Markdown y un CSV; cero archivos de producto, pruebas, configuración o migraciones modificados. Branch `main`, HEAD `a2feb3de9ca95bef5b18c7f6d2b4a4e88f6f899f`.   |
| Revisión independiente                                              | Trazabilidad sin cambios obligatorios; revisión técnica documental aprobada después de corregir PLAN-R1–R5.                                                                         |

Los resultados de app del 19/10 (TypeScript, lint y 1452 unitarios con threads)
conservan su propia fecha: no se volvieron a ejecutar ni se atribuyen a
reparaciones futuras por haber escrito estos documentos. SQL, Edge, build,
navegador y Cloud de los planes nuevos permanecen **[NO VERIFICADO]**.

**Veredicto documental:** aprobado para iniciar la implementación acotada,
con certeza alta sobre coherencia y trazabilidad de los planes revisados.
**Veredicto de producto:** freeze abierto; implementación y aceptación
pendientes. El siguiente bloque de implementación es 017 P1; 012.5 mantiene
su lugar y alcance propios después de ese bloque. Esta entrega no incluyó
commit, push, merge, deploy ni cambios en proveedores o Cloud.

## Revisión de dirección del MVP — 2026-10-28

**Autoridad:** el mantenedor pide retirar el runner del camino crítico, centrar
la entrega en una base SaaS replicable/adaptable antes deRobot u otra vertical,
y hacer una reauditoría final basada en evidencia después de cerrar implementación.
Decisión duradera en [ADR0005](../adr/0005-replicable-saas-mvp-and-bounded-acceptance.md).
No es aceptación runtime ni autorización de publicación, instalación o Cloud.

**Alcance de esta entrega:** documentación/CSV solamente. Se revisaron fuentes
de dirección,roadmap,ADR1–4,planes actuales012/012.5/014/015/016/017 e hijos,
inventario de capacidades,estrategia de pruebas y runbooks de aceptación.
Se contrastó código de configuración: projects=true,robot=false; no se cambió.
Auditorías y ejecuciones históricas se conservaron, no se reetiquetaron como
revisión exhaustiva actual ni como resultados nuevos.

Ruling: usar los planes/registro existentes y un ADR nuevo por el cambio duradero,
no otra familia de planes ni inventario paralelo. La skill writing-plans se adapta
a las rutas del repositorio y a esta entrega documental, sin crearworktree,
commits sugeridos o código de producto. El usuario autoriza decisión de alcance,
no permite dar por aceptado aquello que sus pruebas no demostraron.

### Resultado concreto

- N04/N05/R02: deferred,phasepost-mvp, manteniendo prioridad, reparación,
  evidencia y retorno al ofrecereditor. No se borran tests ni se declara PASS.
- RS05:partial, primera tarea015-T1; comprobar exclusión deProjects/editor y
  Robot en rutas/acciones/UI/home. La aplicación actual aún no está desactivada.
  Alinear selección CI antes de ejecutar, sin skips ocultos ni bajar umbrales.
- RobotD06 conserva corrected-local; no se vuelve a implementar una vertical
  para cerrar015. No se modifica su otro repositorio.
- Núcleo017:privacidad/identidad,cuotas e integridadbilling ofrecidos continúan;
  disponer agregados desde subfilas y reutilizar evidencia válida deT11.
- 012.5/014:catálogo y superficies ofrecidas. 015:réplica,marca/configuración,
  una extensión neutral y actualización conservando datos/personalización.
- 016-T2/T3:inventario final,hipótesis falsables,controles,certeza y revisión
  independiente; una ronda de reparación/retest proporcional, sin ampliaciones
  automáticas ni aprobación por nombre/acuerdo de modelos. Módulos excluidos
  siguen revisándose en su límite de acceso. P0/P1 ofrecidos bloquean entrega.
- ADR1–4 conservan decisiones y motivos originales; sólo enlazan decisión
  posterior. Roadmap/estado/estrategia/capabilities/índices/runbooks alineados.

### Reglas y excepciones

Releídas las ocho fuentes .codex/rules de TypeScript/Next,testing,calidad,
principios,Git,JSDoc,Supabase yRealtime. Mantener monolito,ReactCompiler,
proxy.ts,env.ts,cacheComponents:false,tipos estrictos y RLS. No se adopta usecache
por una regla genérica; env.js antiguo se interpreta comoenv.ts. ExcepciónWindows
de migraciones y verificación efectiva deACL prevalecen; no asumirPUBLIC en cada
CREATEORREPLACE. Los ejemplosRealtime no autorizan migrar el patrón existente,
effectsasync inválidos o políticas permisivas. M3 histórico no cambia tokensIroko.
Las instrucciones genéricas deGit no autorizan commits/push/merge en esta entrega.
No modificar tests/cobertura ni crear infra por producir documentos.

### Revisión independiente

review_r02 revisó en lectura/diff y solicitó corregir configuración estratégica
que aún decíaProjects/Robotoculto,tabla017.4P1 y rezagosT5Robot. Corregidos.
Confirmó queRS05 existente basta como gate y que no hay ciclo de dependencias
entre exclusión anticipada y réplica posterior. Dictamen final: conforme para
esta entrega documental, sin cambios requeridos pendientes; certezaalta dentro
del alcance inspeccionado. No ejecutó pruebas,links,runtime,CI oCloud.

### Verificación y límites

`node scripts/check-docs.mjs`:183Markdown PASS.
`git diff --check`:PASS. CSV parseable,IDsúnicos; las filas editor diferidas no
son aceptaciones de producto. Typecheck,SQL,build,E2E y proveedores no ejecutados:
no hubo cambios de aplicación ni una nueva aceptación runtime. El runnerSQL
atestado sigue obligatorio; sólo se retiró del camino crítico el runnereditor.
Árbol pendiente preservado,sincommit/push/merge/deploy.

**Veredicto documental:** conforme. **Veredicto deproducto:** MVP todavía no
aceptado; siguiente implementación015-T1/RS05(exclusión/configuración) y pendientes
del núcleo017 segúnroadmap. GitHub/Cloud [NO VERIFICADO] en esta entrega.

Comprobación final:183Markdown y diff-check PASS; CSV101filas/101IDsúnicos,
3filas editor deferred. Formato delADR nuevo PASS. Una escritura del inventario
introdujoCRLF y diff-check lo señaló; normalizado aLF y comprobado de nuevo.
No se incorporaron cambios semánticos de formato a evidencia histórica.

Manifiesto documental sobreHEADa2feb3de9ca95bef5b18c7f6d2b4a4e88f6f899f,
sincommit, rama fix/017-editor-draft-revision (SHA256):

- ADR0005:03F7FA66D2280216C12605AD267AF59C619061EC5AA73B058E4A3D53AF31DECB
- ROADMAP.md:6E2C6D6DB594AFFD08B03A6AAC436F215F89BE25D97E2CEABF02FCC86141B22B
- 015:5D4ADC995EE80FC362C11B12B9C9A341D6975D7CA11D973BBF05D3934F017971
- 017padre:45861C1A64FE34BAA1A9758DB0F44720D0D87D5D527C2B3EBB9E11C255E32974
- CSV:D8FF1F95738C89571D8C5B266F5E381BAA066FBB244DF8BDA714DA916721E506
