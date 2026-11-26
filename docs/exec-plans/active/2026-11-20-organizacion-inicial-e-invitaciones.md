# Organización inicial, acceso e invitaciones

> Plan de ejecución propuesto el 20 de noviembre de 2026. Para implementarlo,
> usar `superpowers:executing-plans` o `superpowers:subagent-driven-development`
> según la modalidad que se acuerde. Los casilleros registran ejecución y evidencia.

**Objetivo.** Después del registro propio, entrar con una organización Free
activa, con el usuario como dueño y con Ajustes, Miembros y Facturación
disponibles. Completar una invitación con cuenta nueva o existente y entrar a
la organización que invitó. Retomar la compra con Mercado Pago en 011f una vez
acreditados los dos recorridos.

**Arquitectura.** Supabase Auth identifica a la persona. PostgreSQL controla la
creación, las membresías, el contexto activo y la cuota. Next.js presenta el
acceso, los ajustes y la navegación. Facturación conserva el `account_id` de
la organización como unidad de suscripción. Se reutilizan el selector,
`create_team`, los ajustes y el RPC de aceptación de invitaciones.

**Stack.** Supabase Auth/Postgres, Next.js 16 App Router, React 19, TypeScript
estricto, next-intl, Vitest, pgTAP y Playwright. Pruebas de correo en el receptor
del stack local oficial `saas-boilerplate`.

**Base.** [Reglas del núcleo](../../adr/0005-replicable-saas-mvp-and-bounded-acceptance.md),
[contrato Personal/Team y RBAC](../completed/009-v1-closeout.md),
[alta e invitación observadas](../../quality/manual-qa-register.md#diagramas-del-registro-y-la-invitación)
y [alcance de facturación comprobado](../deferred/011-billing/011f-mercadopago-internal-acceptance.md#alta-cuenta-activa-y-alcance-del-plan--2026-11-20).
Supabase ofrece el referente de una [organización inicial con Owner](https://supabase.com/docs/guides/platform/access-control)
y [suscripción por organización](https://supabase.com/docs/guides/platform/billing-on-supabase).

## Decisiones de producto

| Caso | Resultado esperado |
| ---- | ------------------ |
| Alta propia y correo confirmado | Una organización `team` visible y activa, nombre provisional «Mi organización», slug único, plan efectivo Free y rol `owner`. El perfil y la seguridad se gestionan en Mi cuenta. |
| Configuración inicial | Entrar directo al dashboard. Un acceso contextual lleva a Ajustes para completar nombre, slug, país y logo. Invitaciones y compra se hacen desde sus pantallas. |
| Alta por invitación válida | Crear o reutilizar la identidad, validar el correo y entrar al equipo invitante con su rol. Crear una organización propia queda como acción explícita del usuario. |
| Miembros | El equipo pertenece a la organización. Owner/admin invitan dentro del cupo de miembros del equipo. Member/viewer usan lo que permita su rol. Los proyectos documentales siguen como contenido dependiente de una cuenta. |
| Facturación | Owner/admin pueden contratar para la organización activa. Pagar en A habilita el plan de A. La nueva B empieza Free y conserva su propia facturación. |
| Cuenta existente | Conservar identificadores, datos, membresías, plan, facturas, permisos y selección válida. Si solo tiene Personal, ofrecer creación explícita de organización. Las suscripciones personales históricas conservan acceso a gestión y facturas. |

**Regla de cupo propuesta para aprobación.** Mantener los valores vigentes de
catálogo **Free 1, Plus 3, Pro 10** organizaciones propias en total, incluida
la inicial. Para nuevas identidades, usar el máximo `teams_max` entre Free y
los planes efectivos de organizaciones vigentes donde la persona es `owner`.
Las membresías `admin`, `member` o `viewer` quedan fuera del conteo y del
beneficio de cupo. Los planes se consultan en servidor con el criterio vigente
de acceso pagado. Los valores se leen del catálogo y los cupos de varios planes
no se suman. Durante la transición, considerar también el derecho de creación
de una suscripción Personal histórica vigente hasta su vencimiento.

Ejemplo de aceptación: Ana tiene una organización Free y alcanza el cupo 1.
Activa Plus en A y puede crear B y C, ambas Free. Una cuarta creación falla.
Si A pierde el plan efectivo, Ana conserva B y C y queda en el límite para
crear hasta volver a tener cupo. La cuota de miembros de A sigue siendo
independiente. Precio, membresías y copia comercial deben describir ese
comportamiento. Esta regla reemplaza para este alcance la consulta al plan
de Personal que hoy hace `create_team`.

## Orden y responsables propuestos

| Lote | Responsable sugerido | Habilidades | Entrega verificable |
| ---- | --------------------- | ----------- | ------------------- |
| 1. Organización y cupo | Backend/Supabase | `supabase:supabase`, `supabase-postgres-best-practices`, `superpowers:test-driven-development` | Identidad, membresía y cuota en una transacción, tipado generado y pruebas SQL. |
| 2. Entrada e interfaz | Auth/Next.js | `nextjs-supabase-auth`, `next-best-practices`, `superpowers:test-driven-development` | Alta propia al dashboard, Ajustes opcionales y ruta antigua retirada. |
| 3. Invitaciones y correo | Auth/Next.js con revisión de seguridad | `auth-implementation-patterns`, `supabase:supabase`, `superpowers:test-driven-development` | Correo, Login y confirmación conservan el destino hasta la aceptación. |
| 4. Aceptación | QA con el propietario | `e2e-testing-patterns`, `superpowers:verification-before-completion` | SQL y Playwright focalizados, recorrido humano en el build y evidencia lista para 011f. |

Un implementador responsable por lote y una revisión independiente de seguridad
de la rama integrada. El lote 2 consume el contrato SQL del lote 1. Los lotes
2 y 3 comparten Auth y los guards, por lo que sus cambios se integran en orden.
El diseño de las pruebas de QA puede adelantarse. La salida del asistente y la
entrada por invitación se validan juntas antes de entregar el candidato.

## Lote 1 — Organización inicial y cupo

**Avance del 24 de noviembre.** La prueba `59_initial_organization.test.sql`
falló inicialmente por ausencia de `organization_entry_state`. La migración
`20261124120000_initial_organization.sql` y su espejo pasaron las 14 aserciones
en una transacción local revertida. Después se aplicó la migración al stack
local oficial con `supabase migration up --local`. Se ajustaron los selectores
para mostrar el espacio de colaboración como organización inicial. Pasaron
36/36 en la selección SQL 25, 57 y 59, incluida concurrencia. La migración
aditiva `20261124121000` preserva la cuota ilimitada explícita. El catálogo
identifica el límite como organizaciones propias.

**Fuentes.** `supabase/schemas/{private,public}.sql`, `create_team` en la
migración `20261112173000`, catálogo de `20260812190300` y
`src/types/database.ts`. El trigger `handle_new_profile` aprovisiona Personal
con ID igual al del usuario y esa invariante tiene consumidores existentes.

- [ ] Inventariar Personal con suscripciones o recursos, equipos existentes y
  consumidores de `get_my_accounts`. Preservar los `account_id` y sus referencias.
- [ ] Escribir una prueba SQL de primer acceso propio, repetición y concurrencia,
  cuenta existente, y aceptación de invitación antes de la entrada habitual.
- [ ] Añadir un estado persistente de entrada en el perfil, con valores
  `legacy`, `pending` y `ready`. Inicializar los perfiles existentes como
  `legacy` y los nuevos como `pending`. El estado de entrada sirve al
  aprovisionamiento y queda bajo control del servidor.
- [ ] Añadir `public.ensure_initial_organization() → uuid | null` para la
  sesión verificada. Obtener el usuario con `auth.uid()` y comprobar su
  confirmación en Auth. Solo la rama propia pendiente crea el primer equipo,
  agrega `owner`, fija `active_account_id` y marca `ready` en la misma
  transacción. Reusar la lógica de slug y creación que aplica `create_team`.
  Si el usuario pendiente ya tiene una membresía de equipo vigente, elegir
  su equipo activo válido o el que corresponda al fallback existente y
  resolver el perfil sin crear otro equipo.
  La aceptación válida de invitación a un perfil pendiente marca `ready` y
  selecciona el equipo en su transacción. Una invitación vencida o una sesión
  incorrecta dejan pendiente el estado. Documentar el orden de locks y probar
  que no se duplican organizaciones ni aparecen fallos por bloqueo circular.
- [ ] Actualizar `create_team` para computar el cupo aprobado bajo el lock de
  admisión existente. Usar el mismo resultado autorizado en la UI de creación
  y explicar el bloqueo al alcanzar el cupo. Validar el máximo, downgrade,
  equipo borrado, membresía no-owner y el beneficio histórico Personal.
- [ ] Actualizar la fuente de pricing y el selector para describir los cupos
  correctamente. En cuentas nuevas, Personal se conserva internamente y el
  selector de trabajo ofrece organizaciones. Revisar `leave_team` y el fallback
  de cuenta activa cuando el usuario ya no pertenece a ningún equipo. Mantener
  una entrada útil para aceptar invitación o crear la primera organización propia.
- [ ] Correr SQL focal de alta y cupos, `25_teams_and_active_account` y
  `57_team_quota_concurrency` con `pnpm supa:test` y paths explícitos. Regenerar
  tipos con `pnpm supa:gen:types` y pasar `pnpm typecheck`.

## Lote 2 — Dashboard directo y salida del asistente

**Avance del 24 de noviembre.** El proxy aprovisiona al entrar al dashboard
con un perfil nuevo pendiente, refresca la sesión y devuelve la navegación
con las cookies vigentes. El asistente queda apagado y la ruta anterior
redirige al dashboard. La regresión del proxy se observó primero en rojo.
La selección `pnpm test --maxWorkers=1 supabase/middleware.test '(auth)/__tests__/actions'`
pasó 77/77. Falta validar el alta completa junto con la invitación en navegador.

**Fuentes.** `src/app/[locale]/(auth)/actions.ts`, `src/app/[locale]/auth/confirm/route.ts`,
callback OAuth, `src/lib/supabase/middleware.ts`, `src/proxy.ts`,
`src/config/app.config.ts`, `src/app/[locale]/dashboard/layout.tsx`,
`src/app/[locale]/dashboard/actions.ts`, Ajustes y selector de organización.

- [ ] Probar entrada propia normal, confirmación en otra sesión, retorno OAuth
  ofrecido, reintento si falla el aprovisionamiento y recarga sin otro equipo.
- [ ] Ejecutar el RPC del lote 1 en el primer acceso autenticado al dashboard,
  después de resolver una invitación explícita y antes de cargar una cuenta de
  trabajo. Refrescar claims y conservar cookies en la respuesta que navega.
  Resolver fallas de creación o refresh con un estado reintentable.
- [ ] Retirar la redirección automática al asistente del proxy y las acciones de
  Auth. Hacer que la URL antigua redirija al dashboard o a Ajustes según la
  cuenta. Retirar el wizard y sus acciones cuando sus consumidores se hayan
  sustituido. Conservar el campo y claim históricos mientras sean necesarios
  para compatibilidad entre versiones.
- [ ] Ofrecer acceso opcional a los Ajustes existentes. En Facturación y antes
  de confirmar checkout, identificar la organización que recibe el plan. Al
  probar el contexto, usar fixture local y el contrato ya implementado de
  billing. Aplicar en `startCheckout` el requisito de organización activa
  vigente y conservar la consulta de facturas y cancelación de suscripciones
  personales históricas. Probar ambas ramas. La aceptación con Mercado Pago
  corresponde a 011f.
- [ ] Pasar pruebas de registro, login, OAuth si está ofrecido, confirmación,
  MFA/recuperación, renovación de cookies, selección y borrado de rutas del
  asistente. Comprobar persistencia después de recargar y volver a iniciar sesión.

## Lote 3 — Invitación con cuenta existente o nueva

**Avance del 24 de noviembre.** Se agregó la continuación del enlace en
Login, Registro, reenvío y confirmación de correo. El validador admite el
destino localizado de la invitación y descarta redirecciones ambiguas.
La pantalla de error permite cerrar la sesión y volver con el correo
invitado. Pasaron 98/98 en Vitest focalizado de middleware, Auth, formularios,
destinos y aceptación. El E2E de invitación cubre ahora las dos ramas y el
de registro comprueba la organización inicial. GitHub `main` seguía en
`66bc3f7`. Las cinco PR abiertas correspondían a Dependabot. Cloud queda
pendiente de la entrega.

**Evidencia de navegador y revisión.** Pasaron los tres recorridos en Edge
contra `pnpm start`, con `pnpm build` completado y 144/144 tests focalizados
en Vitest. Se usó el Edge instalado porque faltaba el ejecutable Chromium
de Playwright. Se ejecutó el build por separado después del timeout de
180 s del arranque automático. La revisión independiente detectó la pérdida del destino en
enlace mágico y la cuota ilimitada. Se corrigieron ambos contratos en local.
Para Cloud, confirmar que las plantillas hospedadas de alta y enlace mágico
transporten el destino antes de acreditar el recorrido integrado.

**Fuentes.** `src/app/[locale]/auth/accept-invitation/route.ts`,
`src/app/[locale]/(auth)/{login,signup}`, acciones de Auth, `/auth/click`,
`/auth/confirm`, `/auth/callback`, `supabase/templates/confirmation.html`,
`src/lib/email/templates/invitation.tsx` y `src/test/e2e/invitation.spec.ts`.
El enlace actual conserva `next` hasta Login. El enlace a Registro lo pierde
y la plantilla de confirmación fija dashboard como destino. El error de
sesión incorrecta se entrega hoy por una URL de Login que puede redirigir.

- [ ] Abrir una pantalla de invitación con **Ya tengo cuenta** y **Crear
  cuenta** desde el enlace existente, y actualizar el texto del correo para
  explicar ambos caminos. En **Miembros**, distinguir ya es miembro de una
  invitación pendiente usando datos de la organización y conservar roles.
  El flujo de envío conserva la privacidad de la existencia global del usuario.
- [ ] Compartir un único destino de continuación entre login, MFA, signup,
  reenvío y OAuth ofrecido. En registro por correo, transportar la continuación
  por `emailRedirectTo` y la variable `.RedirectTo` de la plantilla de signup,
  manteniendo `/auth/click` para la confirmación humana. La plantilla lleva
  el destino codificado como parámetro. Validar origin, ruta localizada
  permitida y estructura exacta del destino en servidor, con fallback al
  dashboard para altas ordinarias y compatibilidad con enlaces ya emitidos.
  El correo basta para continuar en otra sesión de navegador.
  [Plantillas Auth](https://supabase.com/docs/guides/auth/auth-email-templates) ·
  [Redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls)
- [ ] Con identidad comprobada, reutilizar la aceptación RPC con token hash,
  vigencia, correo, cupo y rol. Mantener control de aceptación única y avisar
  al dueño después del éxito. La landing muestra qué hacer si el enlace
  venció o si hay otra sesión. Permitir cambiar de sesión conservando el
  destino. Formularios y redirecciones conservan la protección de cookies
  y quedan sin caché ni registro de tokens o URLs completas.
- [ ] Cubrir con tests cuenta existente sin sesión, alta nueva por correo
  hasta aceptación, reenvío y confirmación en otro contexto, identidad
  incorrecta seguida por la correcta, invitación vencida/revocada y replay.
  Comprobar miembros, rol, organización activa, ausencia de equipo propio
  automático en esta rama y un aviso al invitador. El E2E existente crea un
  usuario ya confirmado y lo conecta antes del clic. Ampliarlo para que
  ejecute el alta pública y lea los dos correos de prueba.

## Lote 4 — Cierre y retorno a Mercado Pago

- [ ] Correr Vitest con `--maxWorkers=1` y selección explícita de auth,
  invitaciones, selector, pricing y billing. Correr `pnpm typecheck`, lint
  focal, `pnpm docs:check` y `git diff --check`. Ejecutar SQL y Playwright
  de forma secuencial contra el stack local oficial. Si el equipo queda corto
  de memoria, reservar el run amplio para CI autorizado y conservar las
  aserciones de la selección enfocada.
- [ ] En el build local, recorrer registro propio → una organización visible →
  modificar Ajustes → invitar. Abrir la invitación en otros contextos para
  cuenta existente y nueva. Tras recargar, acreditar organización activa,
  membresía y rol. Registrar candidato, casos probados y limpieza de fixtures.
- [ ] Demostrar en el circuito local con eventos de billing simulados que A
  obtiene Plus, B comienza Free, las identidades invitadas conservan su rol
  y el cupo coincide con pricing. Leer plan e invoices de cada cuenta después
  de cambiar de organización. Este es el punto de retorno a
  [011f](../deferred/011-billing/011f-mercadopago-internal-acceptance.md).
- [ ] Preparar la entrega Cloud por separado. Verificar por lectura el proyecto
  esperado, la plantilla de confirmación y los destinos permitidos. Secuencia
  compatible: migración aditiva aprobada, aplicación capaz de leer enlaces
  antiguos y nuevos, luego plantilla y configuración autorizadas. Guardar la
  plantilla previa y validar un retorno de alta y de invitación. Despliegue,
  migración remota y compra de prueba tienen autorizaciones propias.

## Revisión y reglas aplicadas

- Revisar los riesgos de duplicación al entrar en dos sesiones, cambio de cuenta
  durante el refresco, intento de aceptación con correo distinto, y beneficio
  de un plan trasladado a otra organización. Cada caso tiene una aserción en
  los lotes correspondientes.
- Se revisaron las ocho reglas de `.codex/rules`. Aplican tipado estricto,
  validación de fronteras y sin `any` en TS/JS, Server Components y actions
  conforme a React/Next. Antes de editar, leer la guía pertinente en
  `node_modules/next/dist/docs/`. La frontera de rutas permanece en `src/proxy.ts`
  y el inventario de env vigente es `src/env.ts`, aunque la regla antigua
  nombre `src/env.js`.
- SQL aplicará la excepción Windows del repositorio: migración manual con
  espejo en `supabase/schemas/`, `search_path = ''`, grants mínimos explícitos
  y tipos sincronizados. Realtime usa la notificación y suscripción existentes.
  El cambio de invitaciones no requiere nuevos canales.
- `TESTING-PLAN.md` y `testing-standards.md` gobiernan fixtures y aserciones.
  `software-principles`, `code-quality` y `jsdoc-documentation` se aplican a
  reutilizar los puntos de entrada, documentar los contratos de estado y
  mantener simples los helpers. La ejecución respeta `git-workflow` y los
  permisos de entrega del repositorio.
