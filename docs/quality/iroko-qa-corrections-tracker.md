# Seguimiento de correcciones del QA de Iroko

**Corte:** 2026-11-24, America/Santiago. **Estado:** documentación preparada para acordar el primer lote. Base de la corroboración: `main` en `66bc3f7`, con cambios locales en curso.

Este registro ordena los identificadores del QA consolidado. La [bitácora manual](manual-qa-register.md) conserva los resultados observados y el [handoff](manual-qa-handoff.md) describe cómo repetirlos. El [plan del 20 de noviembre](../exec-plans/active/2026-11-20-organizacion-inicial-e-invitaciones.md) conserva la ejecución de organización, Auth, invitaciones y sus cambios de permisos. El [índice de ADR](../adr/README.md) reserva ese formato para decisiones duraderas. Si el contrato de cupos o autoridad financiera cambia sustancialmente tras su aprobación, evaluar entonces si merece un ADR.

## Orden de los FIX

El ordinal define la secuencia propuesta. Los IDs conservan sus referencias originales. Las filas de un mismo lote comparten revisión cuando tocan el mismo flujo.

| Orden | Lote                         | ID     | Estado de partida                                           | Acción y criterio de cierre                                                                                                                                                                                                                                   |
| ----- | ---------------------------- | ------ | ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1     | A · Ajustes                  | FIX-01 | Pendiente                                                   | Reutilizar `general-tab.tsx`, `actions-info.ts` y pgTAP 26. Mostrar los valores persistidos de nombre, slug, web y país sin recarga, actualizar el selector cuando corresponda y preservar cuenta y logo. Repetir QA-08 con errores de validación y permisos. |
| 2     | B · Entrada                  | FIX-04 | Implementado local en flujo principal                       | Reutilizar ambas migraciones del 24 de noviembre y pgTAP 59. Confirmar alta propia con una organización Free visible y rol Owner, repetición idempotente, entrada invitada y compatibilidad Personal histórica.                                               |
| 3     | B · Entrada                  | FIX-05 | Parcial                                                     | Comprobar la URL antigua, retirar consumidores del wizard tras comprobar referencias y verificar que Ajustes modifica la misma cuenta. La creación adicional se inicia explícitamente.                                                                        |
| 4     | B · Entrada                  | FIX-06 | SQL implementado en parte del alcance                       | Ratificar 1/3/10, máximo entre planes propios y compatibilidad legacy/ilimitada. Alinear UI y precio con el catálogo. Reutilizar pgTAP 25/57/59 y completar transferencia, downgrade y cupo efectivo.                                                         |
| 5     | C · Invitaciones y Auth      | FIX-07 | Verificado en local                                         | Abrir directamente «Iniciar sesión» o «Crear cuenta» según el ADR 0006. Conservar la continuación, la compatibilidad de correos emitidos y la privacidad de la identidad.                                                                                     |
| 6     | C · Invitaciones y Auth      | FIX-08 | Verificado en local para los dos destinos y el aviso causal | Edge comprobó sesión equivocada, equipo activo, rol, membresía única al reabrir y campana inmediata y persistente. SQL comprobó caducidad y revocación. Revisar confirmación en otro navegador en la siguiente aceptación.                                    |
| 7     | C · Invitaciones y Auth      | FIX-03 | Pendiente                                                   | Propuesta: retirar de `confirmation.html` el código y su instrucción. Verificar confirmación por enlace, reenvío y continuación de la invitación.                                                                                                             |
| 8     | C · Invitaciones y Auth      | FIX-11 | Parcial                                                     | Volver a Perfil con feedback de confirmación intermedia y final. Verificar ambos enlaces según configuración, correo definitivo y nuevo login.                                                                                                                |
| 9     | D · Autorización             | FIX-09 | Parcial                                                     | Acordar invitación Admin a Admin, lectura de Miembros y permisos de contenido. Alinear menú, rutas, acciones, RPC y RLS. Reusar matriz de cuatro roles y pruebas de aislamiento, incluido cambio de cuenta.                                                   |
| 10    | D · Autorización             | FIX-10 | Pendiente para Owner exclusivo                              | Cerrar alcance de cancelación, facturas delegadas y Personal histórico. Enforzar rol de la organización en mutaciones de UI y servidor, incluidas ramas simuladas. Validar Owner de A frente a B.                                                             |
| 11    | En paralelo si hay capacidad | FIX-02 | Diagnóstico pendiente                                       | Comparar sesión válida, sesión obsoleta controlada y navegador limpio sobre un mismo host. Registrar causa reproducida o condiciones del intento.                                                                                                             |
| 12    | En paralelo si hay capacidad | FIX-12 | Revocación persistente observada, UX pendiente              | Sustituir la confirmación nativa por diálogo de Iroko. Verificar cancelar, revocar y persistencia. La prueba funcional de credencial corresponde a TEST-05.                                                                                                   |

El plan previo registra 36/36 aserciones SQL, 144/144 pruebas focalizadas de Vitest y tres recorridos Edge. Son evidencia de aquella pasada y sirven para elegir regresiones del próximo candidato. Build servido y estado efectivo de GitHub, Cloud y Supabase en este corte: **[NO VERIFICADO]**.

## Aceptación y registro

| ID      | Momento                                                                                     | Evidencia mínima                                                                                                                                                                                                         |
| ------- | ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| TEST-01 | Tras A, B y Auth                                                                            | Identidad, confirmación, organización inicial, Ajustes y persistencia, con build local identificado y Mailpit.                                                                                                           |
| TEST-02 | Tras C y FIX-09                                                                             | Invitación nueva y existente, cuatro roles, dos cuentas aisladas, aviso y presencia. Usar la vista previa compartida de Codex cuando esté disponible.                                                                    |
| TEST-03 | Tras FIX-06/10                                                                              | Fixture local: Plus en A, Free en B, cupos, facturas, downgrade y mutaciones solo Owner.                                                                                                                                 |
| TEST-04 | Circuito [011f](../exec-plans/deferred/011-billing/011f-mercadopago-internal-acceptance.md) | Aceptación de proveedor independiente bajo ADR 0005. Para el primer cobro integrado se requiere TEST-03, contrato Owner y autorización específica. Acreditar cobro, estado, plan y reconciliación de la cuenta correcta. |
| TEST-05 | Por capacidad, con núcleo estable                                                           | Cruzar cobertura con bitácora y [registro del freeze](../exec-plans/active/freeze-remediation-register.csv). Mantener flags y protecciones del candidato.                                                                |

Actualizar la fila del FIX cuando cambie su estado. Registrar en la bitácora fecha, revisión/build, entorno y host, cuenta y rol ficticios, pasos, esperado, observado, resultado y enlace a evidencia. Enlazar desde aquí el resultado nuevo cuando cambie una conclusión. Mantener las observaciones históricas.

## Skills, agentes y reglas de ejecución

| Trabajo                 | Responsable y skills                                                                                                                                                                                                 | Entrega verificable                                                                                      |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| A · Ajustes             | Agente principal con Superpowers **Executing Plans** y **Systematic Debugging**. **Test-Driven Development** para fijar la regresión del formulario en la prueba focal existente.                                    | Reproducir la desincronización, aislar estado y cuenta activa, corregir y pasar prueba focal y QA-08.    |
| B · Organización y cupo | Agente principal integra. Si se delega, un worker con propiedad exclusiva de migraciones, espejo y pruebas SQL, usando **Supabase** y **Supabase Postgres Best Practices**.                                          | Contratos de RPC, idempotencia, concurrencia, grants, compatibilidad histórica y verificación local.     |
| C · Auth e invitación   | Un único implementador de rutas, plantillas y continuación, con **Next.js Supabase Auth** y **E2E Testing Patterns**. Un explorador puede revisar en paralelo los casos existentes de Mailpit y Realtime sin editar. | Prueba de dos identidades y revisión independiente de cookies, contexto y autorización de la invitación. |
| D · RBAC y billing      | Un implementador del contrato y revisión independiente con agente de seguridad o code reviewer. **Requesting Code Review** para el cambio sensible y **Verification Before Completion** al acreditar cada lote.      | Negativos por rol y por cuenta en servidor y SQL, además de UI.                                          |
| QA visual               | Agente principal y propietario en turnos breves con **Computer Use** cuando corresponda.                                                                                                                             | Veredicto humano por caso en la bitácora y evidencia automatizada reutilizable.                          |

Ejecutar A de forma directa. Para B–D, usar **Subagent-Driven Development** solamente cuando haya piezas independientes y un responsable por superficie. Mantener la integración de Auth, SQL y billing en secuencia donde comparten contrato. FIX-02 y FIX-12 pueden avanzar en paralelo con lotes de archivos disjuntos. No ejecutar builds, suites de navegador y SQL pesados simultáneamente.

- **TypeScript, JavaScript y React/Next.** Aplicar `typescript-nextjs.md`, `code-quality.md`, `software-principles.md` y `jsdoc-documentation.md`. Usar límites Server/Client existentes, TypeScript estricto, navegación localizada y `src/proxy.ts`. Consultar la documentación de Next incluida en el checkout antes de editar. Reusar funciones y contratos probados.
- **SQL y Realtime.** Aplicar `supabase-setup.md` y `supabase-realtime.md`. La excepción vigente en Windows está en `AGENTS.md`: migración manual y espejo SQL, con tipos si cambia el contrato. Validar RLS, grants mínimos y aislamiento de canales. Usar el stack local oficial.
- **Pruebas y Git.** Aplicar `testing-standards.md`, `TESTING-PLAN.md` y `git-workflow.md`. Preservar el árbol existente. Reusar specs y probar proporcionalmente: Vitest focal, pgTAP dirigido, Edge/Mailpit y QA humano según corresponda. Antes de entregar código, verificar typecheck, lint y los diffs pertinentes. Las operaciones remotas se rigen por la autorización aplicable.

## Avance del 24 de noviembre

- **FIX-01.** Fusionado en [PR #269](https://github.com/pipec80/iroko/pull/269). El commit `36a232c` coincide en GitHub main, main local y [Vercel producción](https://vercel.com/pipec80-labs/iroko/9UQSpXXowaNWuTqgA3PE41uD64Ri), en estado READY. Pasaron 21/21 pruebas focalizadas. QA-08 automatizado pasó en Edge local con cuatro campos, persistencia tras recarga y nombre inmediato en el selector.
- **FIX-03.** La plantilla local de confirmación de alta conserva el enlace con hash y destino y retira el código manual. La comprobación estática reprodujo la presencia del código y pasó después de retirarlo. Falta verificar el correo recibido, reenvío y continuación de invitación en Mailpit. Se entrega con los cambios de Auth de la misma plantilla.
- **FIX-04/06.** Nueva pasada de pgTAP sobre el stack oficial local, 36/36 aserciones de los archivos 25, 57 y 59. Se conserva la decisión comercial pendiente de FIX-06.
- **FIX-07/08.** El enlace sin sesión ofrece iniciar sesión o crear cuenta con la misma continuación. La aceptación sigue validando la identidad y el token en el RPC. Pasaron 16/16 pruebas focalizadas y ambos recorridos Edge con Mailpit. El alta volvió al origen autorizado `localhost:3000`; se usó IPv6 para preservar el servidor IPv4 existente. Quedan duplicados, rechazos y aviso en la matriz de cierre.
- **FIX-12.** Publicado en [PR #270](https://github.com/pipec80/iroko/pull/270), con merge automático sujeto a los checks. Pasaron 8/8 pruebas focalizadas de interfaz y acción. La prueba comprueba que Cancelar no llama al servidor, que Revocar lo llama una vez y que se actualiza el estado.
- **Supabase Cloud.** El inventario remoto en solo lectura devuelve 181 migraciones y ninguna de las dos del 24 de noviembre. El candidato de organización e invitaciones debe coordinar esas migraciones y las plantillas Auth con el despliegue que consume el RPC nuevo.
- **Candidato de organización e invitaciones.** Publicado como borrador en [PR #271](https://github.com/pipec80/iroko/pull/271), commit `117f5e0`. Incluye FIX-03, el flujo principal de FIX-04/05 y FIX-07/08, y el cálculo SQL de FIX-06. Su ascendencia incluye provisionalmente el commit de FIX-12. El borrador permite revisar los checks y coordinar la entrega de Supabase y Vercel.

**Siguiente bloque:** resolver los fallos de Database Types, pgTAP y E2E del PR #271 antes de promover el candidato. Completar después autorización, facturación simulada y las regresiones del núcleo. Mercado Pago se prueba al final, en una vuelta independiente bajo 011f.

### Corrección del candidato #271

- El commit `58a6125` elimina el redirect a la misma URL después de aprovisionar y conserva las cookies de la sesión renovada. Vitest reprodujo el 307 anterior y pasó 51/51 después del cambio.
- El archivo de tipos coincide byte por byte con el generado por CI. pgTAP comprueba el UPDATE de cada columna esperada y la protección de `organization_entry_state`. Los fixtures E2E conservan los escenarios históricos deliberados y usan la organización activa para gestión de miembros. La URL histórica del asistente se prueba explícitamente.
- TypeScript, ESLint y Prettier pasaron en el hook. Docker Desktop no logró iniciar en esta pasada. Database Types y la suite SQL pasaron en [GitHub Actions](https://github.com/pipec80/iroko/actions/runs/45489870870). El E2E de esta revisión sigue pendiente. La vista previa de Vercel del mismo commit está READY.
- FIX-12 se fusionó como `5681f8a`. GitHub main, main local y Vercel producción coinciden, con despliegue READY.
- La revisión independiente encontró un caso equivalente al recuperar contraseña antes del primer acceso. `d1075c5` usa navegación de documento para que la sesión renovada llegue al navegador y bloquea el fixture de gestión de miembros en Cloud. Pasaron 95/95 pruebas focalizadas y los hooks. El CI del último commit determina la aceptación de este candidato.
- El candidato se actualizó con `main` en `d9e91eb`. La comparación de árboles confirmó que el merge no cambió el contenido respecto de `d1075c5`. GitHub vuelve a ejecutar los checks sobre la revisión actualizada.
- Docker local restaurado. Las cuatro suites pgTAP (25, 44, 57, 59) sumaron 109/109, y `pnpm build:qa` pasó. Edge local aprobó nueve recorridos, incluidos los siete casos que motivaron la corrección anterior y los flujos de invitación. El caso adicional de checkout mock quedó bloqueado por un botón deshabilitado en el árbol local, donde hay un cambio de facturación sin publicar que excluye Personal. [CI de `d9e91eb`](https://github.com/pipec80/iroko/actions/runs/45491243573) aprobó tipos y SQL. El E2E del primer intento se detuvo por el puerto 54322 ocupado en el runner. El segundo intento llegó a ejecutar Playwright.

### Candidato integral de QA

Los cambios de la revisión anterior se completaron en local. Se eligió mantener
la lectura de Miembros para integrantes, restringir Ajustes y Facturación a
Owner/Admin, reservar las mutaciones de facturación al Owner y permitir que
solo el Owner invite a otro Admin. Las compras nuevas requieren un Team.

| FIX | Recorrido de aceptación en el candidato                                                                                                                               |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 01  | Guardar nombre, slug, web y país en Ajustes. Verificar cada resultado de inmediato y tras recargar.                                                                   |
| 02  | Usar una cuenta desechable. Revocar su sesión o eliminar solo su usuario, abrir una ruta protegida y verificar Login con destino conservado. Repetir con sesión sana. |
| 03  | Registrarse desde una invitación y reenviar confirmación. Abrir el último correo y comprobar que ofrece el enlace y conserva la invitación.                           |
| 04  | Registrar una cuenta propia y comprobar un Team visible con rol Owner. Repetir entrada y confirmar que no aparece otro Team.                                          |
| 05  | Abrir la URL antigua de onboarding y comprobar el regreso al dashboard. Editar la misma organización desde Ajustes.                                                   |
| 06  | Ver el cupo en Nueva organización. Probar límite, downgrade y transferencia con un fixture y confirmar que los Teams existentes permanecen.                           |
| 07  | Abrir una invitación sin sesión. Confirmar ambas opciones de acceso y los mensajes al invitar una dirección ya asociada o pendiente.                                  |
| 08  | Completar invitaciones nueva y existente. Probar sesión equivocada, enlaces vencidos o revocados y aviso al invitador.                                                |
| 09  | Con Owner, Admin, Member y Viewer, contrastar Miembros, Ajustes y Facturación. Probar entrada directa y verificar que Admin no puede invitar otro Admin.              |
| 10  | Con el proveedor simulado, activar Plus en A y comprobar que B conserva Free. Owner puede mutar, Admin puede leer facturas y los demás roles no gestionan billing.    |
| 11  | Cambiar el correo de una cuenta desechable. Abrir ambos enlaces con confirmación doble y comprobar aviso pendiente, aviso final, Perfil e inicio de sesión.           |
| 12  | En Ajustes, cancelar una revocación y confirmar que la clave sigue activa. Confirmarla y comprobar estado y contador.                                                 |

Anotar revisión de GitHub y Vercel, destino local o Cloud y resultado por FIX.
Mercado Pago se acepta por separado en 011f después de este recorrido.

**Evidencia del 25 de noviembre.** El candidato `93e6bf0` aplica localmente
las migraciones de invitación por Owner y lectura de cupos. Pasaron las suites
pgTAP de roles, concurrencia de datos y organización inicial (101 aserciones).
El generador postgres-meta v0.96.6 produce el mismo archivo de tipos. El build
QA pasó con billing simulado. En la primera corrida Edge pasaron cuatro casos,
incluidos Plus solo en A, cupo visible, alta invitada y guardado de Ajustes.
Dos aserciones de invitación y notificación tuvieron selectores ambiguos. Se
acotaron al contenido de la página y al enlace persistido de la campana.

El ensayo de Supabase Cloud enumera cuatro migraciones del candidato. El plan
de Auth, preparado sin escrituras, muestra solo cambios de contenido de las
plantillas de alta y enlace mágico. Mantener el mismo candidato para CI, SQL
y verificación de Vercel antes de la aceptación humana.

### Punto de reanudación

- PR #271 en borrador. El candidato publicado `c3b4bf9` pasó Database Types,
  Database Tests y E2E Tests en [CI](https://github.com/pipec80/iroko/actions/runs/45663847280).
  GitHub todavía reporta UNSTABLE. Leer todos los checks antes de promover.
- `src/test/e2e/auth-session-and-email.spec.ts` está sin commit. Edge local
  aprobó 4/5 en la segunda corrida: sesión obsoleta, cambio de correo con ambos
  enlaces e invitaciones nueva y existente. La prueba de campana se detuvo al
  abrir el selector de organización durante la preparación del fixture, antes
  de verificar la notificación. Repetirla de forma aislada.
- Supabase Cloud sigue pendiente. El ensayo de migraciones enumeró las cuatro
  previstas. El plan de publicación de Auth confirmó cambios de contenido
  exclusivamente para alta y enlace mágico. Revalidar el plan antes de aplicar,
  verificar la publicación de Vercel y registrar el candidato del QA humano.
- Conservar el trabajo local ajeno al PR. Mercado Pago queda para 011f.

### Continuación del 25 de noviembre

- El check que bloqueó `c3b4bf9` fue Unit Tests. El fixture de la página de
  Facturación no aportaba una cuenta activa ni la respuesta de
  `get_my_account_role`. Build quedó omitido por esa dependencia.
- Candidato `682870c` publicado en [PR #271](https://github.com/pipec80/iroko/pull/271).
  Incluye el fixture de Facturación con cobertura de los cuatro roles y dos
  recorridos locales de Auth. Vitest focal 5/5. TypeScript, ESLint y Prettier
  pasaron en el hook. El commit contiene únicamente los dos archivos de pruebas.
- Edge, un trabajador, contra el build QA local existente y el Supabase local
  oficial. Campana aislada 1/1. Luego 6/6 para sesión obsoleta, cambio doble
  de correo, Plus en A con B Free, invitación nueva y existente, y campana
  inmediata y persistente. La corrida local reutilizó un build previo al commit
  de pruebas. El build exacto del PR se valida en CI.
- `supabase db push --linked --dry-run` volvió a enumerar exclusivamente
  `20261124120000`, `20261124121000`, `20261124210000` y `20261124211000` en el
  proyecto Cloud `iroko`. La entrega queda condicionada a CI en verde. El
  dominio fijo de QA seguía sirviendo `5681f8a` al iniciar esta continuación.
- La comprobación de limpieza detectó dos invitados sintéticos de esta
  continuación cuyo Team propio sobrevivía al intentar borrar al usuario.
  Se limpiaron ambos en el Supabase local. `a619a17` elimina las cuentas del
  fixture y comprueba que Auth ya no conserva al invitado. Edge 1/1 con la
  comprobación; TypeScript, ESLint y Prettier aprobados en el hook. Este es el
  candidato actualizado en [CI](https://github.com/pipec80/iroko/actions/runs/45712794542).
- Un ensayo contra un servidor simulado verificó que publicar las plantillas
  de Auth envía únicamente `mailer_templates_confirmation_content` y
  `mailer_templates_magic_link_content`. Los HTML se comprobaron contra el
  commit publicado. Supabase confirmó plan Free y 181 migraciones previas.
- Edge y Mailpit 1/1 para FIX-03. Desde una invitación se creó una cuenta, se
  esperó el intervalo de reenvío de GoTrue y se recibió una segunda
  confirmación con otro enlace y sin código manual. Al abrir ese enlace, la
  cuenta entró a la organización invitada y la conservó tras recargar.

### Entrega del candidato para QA humano

- Los 15 checks de GitHub de `a619a17`, incluido Build, terminaron en verde.
  El [PR #271](https://github.com/pipec80/iroko/pull/271) se fusionó como
  `1390d8998fa3f704e38794385c50005c4d329411`. Ambos commits contienen el mismo
  árbol. [CI del candidato](https://github.com/pipec80/iroko/actions/runs/45712794542).
- Supabase Cloud quedó en 185 migraciones tras aplicar las cuatro enumeradas.
  La consulta posterior verificó las cuatro versiones, los siete usuarios y
  perfiles históricos y el permiso de los dos RPC para `authenticated`, con
  `anon` excluido.
- [Vercel](https://vercel.com/pipec80-labs/iroko/DReroTEnVdGPasJJiSBhNhyfDY5f)
  reportó `READY` para `1390d89` y confirmó que
  [el dominio fijo de QA](https://project-a89lv.vercel.app/) apunta a ese
  despliegue. Después, Supabase confirmó la publicación del contenido de las
  plantillas de alta y enlace mágico. La lectura independiente del HTML
  remoto sigue **[NO VERIFICADO]**.
- El sondeo posterior a `/` y `/es/login` devolvió HTTP 429 desde esta sesión.
  El recorrido humano en Cloud sigue **[NO VERIFICADO]**. Usar `1390d89` para la
  matriz de FIX-01 a FIX-12. Mercado Pago conserva su circuito 011f.

### Verificaciones previas a la pasada humana

**Criterio de FIX-07 aclarado en QA humano local (26-11).** El botón
«Aceptar invitación» del correo debe apuntar directamente a Iniciar sesión
para una cuenta existente o a Crear cuenta para una cuenta nueva. Resolver
el destino en el servidor al enviar el correo, sin mostrar una pantalla de
elección ni revelar a quien invita si el destinatario ya tiene cuenta.
Preservar la invitación hasta completar el acceso o confirmar el alta.
La aceptación de la membresía funcionó en local. El destino directo queda
pendiente de implementación y prueba para ambos casos.

- Supabase Cloud volvió a confirmar las cuatro versiones en el historial de
  185 migraciones, siete usuarios y los RPC de organización inicial y cupo.
- Edge local, un trabajador y fixtures desechables: en A se activó Plus, se
  mostró una factura simulada y se confirmó la cancelación tras recargar.
  B siguió en Free y no mostró la factura de A. Los casos de cupo, downgrade
  y transferencia pasaron en SQL.
- Edge local rechazó las invitaciones vencida y revocada sin crear membresía.
  Después aceptó el enlace de reemplazo entregado por Mailpit. Abrirlo otra
  vez dejó una sola membresía. Las cinco suites SQL focales pasaron 80/80.
- Dos suites SQL complementarias de roles y admisión de claves pasaron 55/55.
  El ensayo transaccional de facturación pasó 44/44, incluidas siete aserciones
  adicionales sobre la factura de A, su aislamiento frente a B, la lectura
  de Owner/Admin y el rechazo de Member/Viewer. Vitest focal pasó 62/62
  en acciones y página de facturación y la API de cuenta.
- El endpoint local de cuenta respondió `200` con una clave desechable y
  `401 invalid_key` tras revocarla. Se ejecutó con validación local habilitada
  al iniciar el servidor y se comprobó la limpieza del usuario de prueba.
- Para registrar la pasada humana, usar la planilla existente
  [Iroko · QA local](https://docs.google.com/spreadsheets/d/16_eHqYwc3Ugp9SNLop35Id1Rt_LC4KXXiEK0cW8St-Q/edit),
  anotando `1390d89` y el entorno Cloud. Los 11 trabajos del
  [CI de main](https://github.com/pipec80/iroko/actions/runs/45716316623),
  incluidos navegador y Build, terminaron en verde para esa revisión.
