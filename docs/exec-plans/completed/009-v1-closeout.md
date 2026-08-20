# Plan 009 — Cierre de V1: RBAC, lifecycle de miembros y QA

- Priority: P0
- Status: Completed (2026-08-18) — los 9 PRs mergeados a `main`: #121, #122,
  #123, #124, #125, #133 (4b), #126 (7), #134 (8), #135 (6). Supabase Cloud en
  paridad (135/135 migraciones aplicadas).
- Baseline: `main` @ `fec4baa` — PRs 1, 2, 3, 4, 5, 7 mergeados; Supabase Cloud en
  paridad (134/134 migraciones aplicadas, sin advisors nuevos de deuda —
  solo el +4 esperado de `authenticated_security_definer_function_executable`
  por las RPCs de lifecycle del PR 4)
- Scope: cerrar el producto que ya existe. **No se agregan capabilities nuevas de
  Supabase.** Auth, Database, RLS, Storage, Realtime, Edge Functions, Queues,
  Vault, billing, webhooks, API keys y audit ya están construidos y demostrados;
  lo que falta es coherencia de permisos, lifecycle de membresías y QA de los
  flujos que hoy existen pero nunca se probaron end-to-end.

## Objective

Llevar el boilerplate de "muy avanzado pero inconsistente en permisos" a "V1
coherente y demostrable": una matriz RBAC única que DB, Storage, RPCs y UI
obedecen igual, el lifecycle mínimo de membresías completo, y los caminos
críticos cubiertos por tests en vez de por suposición.

## Contexto — lo que YA está cerrado (no re-auditar)

Verificado contra código, SQL, tests, CI y Cloud el 2026-08-14. Esta sección
existe para no volver a gastar sesiones confirmando lo mismo:

- **Modelo multi-account: cerrado.** `create_team()` y `switch_account()`
  existen y funcionan (`20260812190000`). El hook JWT prefiere
  `profiles.active_account_id` validando membresía, con fallback a la membresía
  más reciente (`20260812180000:31-49`).
- **Adopción del active account: cerrada.** 27 archivos usan
  `getActiveAccountId()`. `get_my_account_id()` no tiene uso productivo en
  `src/` — solo queda en `types/database.ts` y como helper de un test E2E.
- **Cobertura del switch: real.** `active-account.spec.ts:78-140` es un test de
  regresión del bug de "membresía más reciente"; `25_teams_and_active_account.test.sql`
  aporta 16 assertions pgTAP.
- **Advisors de Supabase: ruido justificado, sin deuda.**
  - `get_active_plans()` expuesto a `anon` **a propósito** — es `SECURITY DEFINER`
    para que anon lea planes sin darle SELECT sobre `billing.plans`. Documentado
    en `20250506040000_harden_grants_for_linter.sql:8,52`.
  - `check_request()` expuesto a `anon` **por requisito funcional** — es el hook
    `db_pre_request` del rol `authenticator` (`20260625400000:87`); PostgREST lo
    corre como el rol de la petición, sin ese grant toda request anónima falla.
    `RETURNS void`, escribe solo en `private.rate_limit_counters` (schema no
    expuesto).
  - `api_keys`, `webhook_endpoints`, `webhook_deliveries` con "RLS sin policy":
    tienen `REVOKE ALL ... FROM authenticated, anon`. RLS activo + cero grants =
    deny-all. El acceso va por RPCs con `assert_account_admin`. Es INFO, no deuda.
  - Los advisors de performance son todos INFO (índices sin uso en un proyecto
    sin tráfico). **No borrar índices por limpiar el panel.**
- **Único ítem de seguridad real pendiente:** Leaked Password Protection, que es
  un toggle del dashboard de Auth, no código. Fuera del scope de este plan.

## Design decisions

### 1. Matriz RBAC canónica (fuente de verdad única)

`member` pasa a ser el rol que **trabaja**; `viewer` es estrictamente lectura.
Hoy los dos son idénticos en el core, que es la raíz del problema.

| Acción                              |           owner           |          admin          |     member      |     viewer      |
| ----------------------------------- | :-----------------------: | :---------------------: | :-------------: | :-------------: |
| Ver account                         |            ✅             |           ✅            |       ✅        |       ✅        |
| Editar account (nombre, info, logo) |            ✅             |           ✅            |       ❌        |       ❌        |
| Ver members                         |            ✅             |           ✅            |       ✅        |       ✅        |
| Invitar (admin/member/viewer)       |            ✅             |           ✅            |       ❌        |       ❌        |
| Invitar como owner                  |            ❌             |           ❌            |       ❌        |       ❌        |
| Cambiar rol de un miembro           |            ✅             | ⚠️ solo a member/viewer |       ❌        |       ❌        |
| Remover member/viewer               |            ✅             |           ✅            |       ❌        |       ❌        |
| Remover admin                       |            ✅             |           ❌            |       ❌        |       ❌        |
| Transferir ownership                |            ✅             |           ❌            |       ❌        |       ❌        |
| Salir del team                      | ✅ solo si hay otro owner |           ✅            |       ✅        |       ✅        |
| Ver projects / documents            |            ✅             |           ✅            |       ✅        |       ✅        |
| **Crear projects / documents**      |            ✅             |           ✅            | **✅ (cambia)** |       ❌        |
| **Editar projects / documents**     |            ✅             |           ✅            | **✅ (cambia)** |       ❌        |
| Borrar projects / documents         |            ✅             |           ❌            |       ❌        |       ❌        |
| **Subir a Storage `documents`**     |            ✅             |           ✅            |       ✅        | **❌ (cambia)** |
| Billing: ver plan/entitlements      |            ✅             |           ✅            |       ✅        |       ✅        |
| Billing: checkout, portal, facturas |            ✅             |           ✅            |       ❌        |       ❌        |
| API Keys / Webhooks / Audit Log     |            ✅             |           ✅            |       ❌        |       ❌        |
| Presence                            |            ✅             |           ✅            |       ✅        |       ✅        |

Notas de diseño:

- **Borrar sigue siendo solo-owner**, incluso subiendo a member a editor. Es una
  acción destructiva y el comportamiento actual no está roto; se documenta como
  decisión consciente, no como omisión.
- **Billing de lectura queda abierto a todos los roles.** `get_account_subscription`
  y `get_account_entitlements` usan `user_is_member` hoy y así se quedan: saber
  en qué plan está la cuenta no es información administrativa.
- **`admin` no puede promover a `admin`.** Evita la escalada lateral sin pasar
  por el owner.

### 2. Personal es 1:1, Team es colaboración

Hoy hay una contradicción interna ya escrita en el repo: el trigger
`enforce_single_owner_per_account` documenta que las cuentas personales son
_"1:1 con su único usuario, sin transferencia de ownership posible"_
(`20260724211828`), pero `invite_members` no valida `accounts.type` y permite
invitar gente a una cuenta personal renombrada. Se resuelve a favor del trigger:

- `invite_members` rechaza cuentas con `type <> 'team'`.
- El onboarding deja de renombrar la Personal y pasa a crear un Team real.
  El plan `free` ya trae `teams_max: 1` (`20260812190300`), así que el flujo
  funciona sin tocar entitlements.

### 3. Aceptar una invitación cambia al Team

El comportamiento actual **no es "te quedas en Personal": es no determinista.**
`handle_new_profile` no setea `active_account_id`, así que para todo usuario
recién registrado el claim viene del fallback `ORDER BY created_at DESC`.
Aceptar una invitación crea la membresía más reciente → la cuenta activa salta
al Team sola en el siguiente refresh. Para un usuario que sí hizo switch alguna
vez, no salta. Mismo flujo, dos resultados, según historial invisible.

Se cierra por los dos lados: `handle_new_profile` setea `active_account_id` en
el signup (el fallback deja de ser el camino normal) y `accept_invitation`
setea explícitamente el team como cuenta activa.

### 4. El vertical Robot se apaga en V1

Sus policies dejan escribir a cualquier membresía, incluido `viewer`
(`get_user_role(...) IS NOT NULL`), lo que viola la matriz. Es un vertical demo:
se apaga con `verticals.robot = false` y se conserva como ejemplo activable.
No se rediseñan sus permisos ahora — un vertical experimental no debe retrasar
el core del boilerplate.

## Tabla priorizada

| #     | PR                             | Prioridad | Depende de | Esfuerzo | Por qué ahí                                                                                                                                                                                               |
| ----- | ------------------------------ | :-------: | :--------: | :------: | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1     | `fix/ci-email-worker-secret`   |  **P0**   |     —      |  5 min   | CI en rojo hace 3 días por un secret faltante. Bloquea confiar en cualquier señal verde                                                                                                                   |
| 2     | `fix/invitation-correctness`   |  **P0**   |     —      |    M     | Salto de cuenta no determinista + link roto + el email de invitación no llega y falla en silencio                                                                                                         |
| 3     | `feat/rbac-matrix-db`          |  **P1**   |     —      |    M     | Es el contrato que todo lo demás obedece. Nada de UI tiene sentido antes                                                                                                                                  |
| 4     | `feat/membership-lifecycle`    |  **P1**   |     3      |    M     | `remove_member` ya remite a un `leave_team` que no existe                                                                                                                                                 |
| 5     | `feat/ui-role-aware`           |  **P1**   |     3      |    M     | La UI no puede reflejar una matriz que aún no existe                                                                                                                                                      |
| 4b ✅ | `feat/membership-lifecycle-ui` |  **P1**   |     4      |    S     | Backend de 4 sin ningún consumidor: hoy nadie puede usar estas RPCs desde la app. Gap real, no decorativo — abierto en #125, la UI se escribió en #124 antes de que estas RPCs existieran — mergeado #133 |
| 6 ✅  | `test/rbac-e2e`                |  **P2**   |  3,4,4b,5  |    M     | El gate que prueba que 3-5 quedaron bien — mergeado #135                                                                                                                                                  |
| 7 ✅  | `test/qa-storage-realtime`     |  **P2**   |     —      |    S     | Avatar, notifications y presence: implementados, nunca probados E2E — mergeado #126                                                                                                                       |
| 8 ✅  | `chore/release-hygiene`        |  **P2**   |     —      |    S     | Lo último: nada de esto bloquea a lo demás — mergeado #134                                                                                                                                                |

PRs 7 y 8 no dependen de nadie: se pueden intercalar si hace falta soltar carga.

**Mergeados:** 1 (#121), 2 (#122), 3 (#123), 4 (#124), 5 (#125), 4b (#133), 7 (#126), 8 (#134), 6 (#135).
**Pendientes:** ninguno — Plan 009 (V1 closeout) cerrado.

---

## PR 1 — `fix/ci-email-worker-secret`

**Problema.** El job `Email Worker Health` de `nightly.yml` falla desde el
2026-08-12 con `curl exit 7` contra `127.0.0.1:54321`. El workflow **ya tiene**
`environment: production` (línea 168) — ese fue el fix del Plan 008. La causa
real la da el log: `SUPABASE_URL length: 22`, exactamente `http://127.0.0.1:54321`.
El secret `NEXT_PUBLIC_SUPABASE_URL` **no está definido en el GitHub Environment
`production`**, así que GitHub cae al secret de repositorio, que apunta al stack
local.

Esto además cierra una validación que el Plan 008 dejó explícitamente diferida
(_"deferred to the first run on `main` after merge"_). Ese run ocurrió, falló y
nadie volvió.

**Ejecución — COMPLETADA 2026-08-14.** La causa resultó ser distinta de la
hipótesis inicial y vale registrarla: los secrets **sí existían** en el
Environment `production` (creados 2026-06-09T23:26, 35 min después de los de
repo). El problema era que **contenían los valores locales** — se copiaron en
bloque desde `.env.local`. Nadie verificó nunca su contenido, solo su existencia.

1. `NEXT_PUBLIC_SUPABASE_URL` → `https://rgrxlygtmvavqzkjyywg.supabase.co`
   (tenía `http://127.0.0.1:54321`; el log lo delataba con `length: 22`).
2. `SUPABASE_SECRET_KEY` → key real de Cloud (la tenía local; producía
   `HTTP 401 Invalid API key` una vez corregida la URL). Seteada por el usuario;
   no es obtenible vía MCP por diseño.
3. `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` → `sb_publishable_...` de Cloud
   (misma tanda sospechosa).
4. `RESEND_API_KEY` → sincronizada con la vigente. El Environment conservaba la
   key del 2026-06-24, es decir **la que se revocó el 2026-08-10**.
5. Verificado: `gh workflow run nightly.yml --ref main` → 3/3 jobs en verde.
   `target host: rgrxlygtmvavqzkjyywg.supabase.co`, `length: 40`,
   `✅ email_worker_health OK — HTTP 200, hace 16s`.

**Efecto colateral corregido.** `ci.yml:577` hace que el job `Build` use este
mismo Environment, pero **solo en pushes a `main`**. Todos los builds de `main`
se construían con la URL de Supabase local y una key de Resend revocada. No
rompía nada visible (Vercel hace su propio build con sus variables), pero el
gate final no validaba lo que aparentaba validar.

**Corrección al Plan 008.** Su nota decía que el valor real _"solo vive en el
GitHub Environment production"_ y que `environment: production` replicaba _"el
mismo constructo que el job `build` de `ci.yml`"_. Lo primero era falso: el valor
real no vivía en ninguna parte. Lo segundo es cierto solo en `main`. Marcar allí
la validación diferida como cerrada.

**Acceptance criteria.**

- El job imprime un `target host` que es el project ref de Cloud, no loopback.
- `nightly.yml` completo en verde en `main`.
- No se modifica el YAML: el problema es de configuración, no de código.

**Hallazgo relacionado — el health check tiene un punto ciego.**
`get_email_worker_health()` mide el status HTTP de la **invocación** de la edge
function, no la entrega del email. En `process-email-queue/handler.ts:80-84`, si
Resend responde 403 el mensaje no se borra de la cola (correcto, reintenta) pero
la función igual devuelve HTTP 200 con `processed: 0`. Con el techo de sandbox
descrito en el PR 2, hoy eso significa: **worker verde, cero emails entregados.**
Es exactamente el fallo que el Plan 002 quiso cerrar ("el cron dice éxito pero el
worker nunca respondió"), un nivel más abajo: "el worker responde 200 pero
Resend rechaza todo".

Arreglo mínimo, sin dominio: que el health check también falle si
`processed = 0` mientras había mensajes en la cola, o si la profundidad de la
cola crece de forma monótona. Va en este PR o en el 8 — no requiere dominio ni
plan pago.

---

## PR 2 — `fix/invitation-correctness`

**Migración** `supabase/migrations/20260814100000_invitation_and_active_account_fixes.sql`

- espejo en `supabase/schemas/public.sql`.

**Ejecución.**

1. `private.handle_new_profile()`: setear `active_account_id = v_account_id`
   junto con la creación de la Personal, para que el claim nunca dependa del
   fallback.
2. Backfill: `UPDATE public.profiles p SET active_account_id = (membresía más
reciente) WHERE active_account_id IS NULL` — sin esto los usuarios existentes
   siguen con el comportamiento no determinista.
3. `accept_invitation()`: tras crear la membresía, `UPDATE public.profiles SET
active_account_id = v_invitation.account_id WHERE id = v_user_id`.
4. `src/app/[locale]/auth/accept-invitation/route.ts`:
   - línea 46: `link` de `/dashboard/team` → `/dashboard/members` (la ruta
     `/dashboard/team` ya no existe como página; solo quedó `actions.ts`).
   - llamar `supabase.auth.refreshSession()` antes del redirect, para que el JWT
     nuevo traiga el team como cuenta activa.
5. Corregir la expectativa del test que congela el bug:
   `accept-invitation/__tests__/route.test.ts:88`.

### El email de invitación no llega (reportado 2026-08-14)

Diagnóstico verificado. Son dos problemas independientes:

**A. A Mailpit no puede llegar nunca — es arquitectura, no configuración.**
`sendInvitationEmail` → `sendEmail` (`src/lib/email/index.tsx:56`) usa la **API
HTTP de Resend**. Mailpit (`:54324`) es el `[inbucket]` de Supabase **Auth**
(`supabase/config.toml:88-96`) y solo intercepta el SMTP que emite Auth (signup,
recovery, magic link). Ningún email de la aplicación — invitación, bienvenida,
notificación — pasa por SMTP. Por eso `auth.spec.ts` y `recovery.spec.ts` usan
Mailpit y no existe ni un solo E2E de invitación: **hoy no hay forma de
escribirlo.**

**B. Al correo real, dos caminos y los dos silenciosos.**

- **B1 — Resend en modo sandbox. CONFIRMADO por el usuario (2026-08-14): no hay
  dominio comprado.** `.env.local` y `supabase/functions/.env:2` usan
  `FROM_EMAIL=onboarding@resend.dev` (el remitente de prueba de Resend). Sin
  dominio verificado, Resend solo entrega a la dirección del dueño de la cuenta
  y responde 403 para cualquier otro destinatario. El error se loguea en
  `sendEmail` y lo traga el `.catch()` del `after()` (`team/actions.ts:160`):
  la UI nunca se entera.

  **Alcance real del techo de sandbox** — todo lo que sale por Resend está
  afectado, no solo las invitaciones:

  | Email                         | Origen                              | ¿Entrega hoy?                                                |
  | ----------------------------- | ----------------------------------- | ------------------------------------------------------------ |
  | Invitación                    | `team/actions.ts:156`               | ❌ va a terceros                                             |
  | Bienvenida                    | `auth/confirm/route.ts:73`          | ❌ va al usuario que se registra                             |
  | Notificación por email        | `lib/notifications/index.ts:58`     | ❌ va a terceros                                             |
  | Formulario de contacto        | `contact/actions.ts:28`             | ✅ va a `supportEmail`, que **es** la dirección de la cuenta |
  | Cola de email (edge function) | `process-email-queue/handler.ts:66` | ❌ mismo `FROM_EMAIL`                                        |

  **Comprar/verificar el dominio queda FUERA del scope de V1** (ver "Out of
  scope"): el producto es el boilerplate, y quien lo despliegue pone su propio
  dominio y su key. Lo que sí entra en V1 es que el sistema sea desarrollable,
  testeable y observable sin dominio — que es lo que se arregla abajo.

- **B2 — Invitación duplicada.** Si ya hay una invitación `pending` para ese
  email, el `INSERT` choca contra `idx_invitations_pending_unique` y
  `EXCEPTION WHEN unique_violation THEN NULL` se lo come. El RPC devuelve cero
  filas, no se envía nada, la action retorna `{success: true, count: 0}` y
  `invite-form.tsx:45` **solo mira `result.success`, ignora `count`**: cierra el
  diálogo y muestra éxito. Reinvitar a alguien pendiente parece funcionar y no
  manda nada.

Nota: `public.invitations` en Cloud está vacía (verificado 2026-08-14), así que
esto se reprodujo en local. B2 es un bug real con independencia de cuál causó
el reporte.

**Ejecución (continuación).**

6. **Transporte de email observable en local.** Enrutar `sendEmail` a SMTP local
   (Mailpit `:54325`) cuando `NODE_ENV !== 'production'` o cuando exista una var
   explícita tipo `EMAIL_TRANSPORT=smtp`. Sin esto no se puede escribir el E2E
   de invitación del PR 7 ni depurar ningún email de la app.
7. **Dejar de tragar el fallo de envío.** El `.catch()` de `after()` registra y
   sigue. Como mínimo: contar los envíos fallidos y devolverlos en el
   `ActionResult` para que la UI los muestre. Alternativa mejor y ya disponible
   en el repo: encolar en `pgmq` (la cola de email de Plan 002 ya existe y tiene
   reintentos + health check) en vez de enviar inline dentro de `after()`.
8. **`count: 0` deja de ser éxito.** `invite-form.tsx:45` debe distinguir
   `count === 0` y decir "ya tenían una invitación pendiente", no cerrar el
   diálogo como si hubiera enviado algo. Considerar que `invite_members`
   distinga "duplicado" de "enviado" en su retorno en vez de silenciarlo.

**Acceptance criteria.**

- Un usuario nuevo que acepta una invitación aterriza en el Team, siempre, haya
  hecho switch antes o no.
- El link de la notificación al invitador abre una página que existe.
- pgTAP nuevo: `active_account_id` no es NULL después del signup.
- En local, invitar a cualquier dirección deja el email visible en Mailpit.
- Invitar a alguien con invitación pendiente muestra un mensaje distinto al de
  envío exitoso.
- Un fallo de envío llega al usuario, no solo al log.

---

## PR 3 — `feat/rbac-matrix-db`

**Migración** `20260814110000_rbac_matrix.sql` + espejo en
`supabase/schemas/public.sql` y `presence.sql`.

**Ejecución.**

1. **Projects / documents — member pasa a editor.** `DROP POLICY` + recrear las
   4 policies de escritura agregando `'member'` al array de roles:
   `admins_can_create_projects`, `admins_can_update_projects`,
   `admins_can_create_documents`, `admins_can_update_documents`.
   Renombrarlas a `editors_can_*` para que el nombre no mienta.
   Las `owners_can_delete_*` no se tocan.
2. **Storage `documents` — cerrar a viewer.** La policy `documents_insert_member`
   compara carpeta y `auth.uid()` pero **nunca** el rol
   (`20260513000000` → redefinida en `20260609180000:136-142`). Agregar
   `AND (auth.jwt() -> 'app_metadata' ->> 'role') IN ('owner','admin','member')`,
   igualando el criterio que su propio DELETE/UPDATE ya aplica.
3. **`invite_members` — exigir Team.** Agregar al inicio:
   rechazar si `(SELECT type FROM public.accounts WHERE id = p_account_id) <> 'team'`
   con `RAISE EXCEPTION 'not_a_team'`.
4. **Onboarding — crear Team en vez de renombrar Personal.**
   `src/app/[locale]/dashboard/onboarding/actions.ts:42`: `rename_account` →
   `create_team`, con `refreshSession()` posterior. Ajustar
   `getOnboardingOrg` (ya no prellena desde la cuenta activa) y los tests de
   `onboarding/__tests__/actions.test.ts`.
5. **Robot off.** `src/config/app.config.ts:75` → `robot: false`. Añadir comentario
   apuntando a este plan para que se sepa por qué.
6. Documentar la matriz en `docs/modules/` como referencia única.

**Acceptance criteria.**

- Un `member` crea y edita projects y documents; un `viewer` recibe error de RLS
  en las tres capas (tabla, Storage, RPC).
- `invite_members` sobre una cuenta personal falla con `not_a_team`.
- El onboarding de un usuario nuevo produce una cuenta `type='team'` con el
  usuario como `owner`, y el plan `free` lo permite (`teams_max: 1`).
- pgTAP nuevo cubriendo la matriz de la sección "Design decisions" fila por fila.

---

## PR 4 — `feat/membership-lifecycle`

**Migración** `20260814120000_membership_lifecycle.sql`.

**Problema.** `remove_member` lanza literalmente _"Cannot remove yourself. Use
leave team instead."_ y `leave_team` no existe. No existen tampoco
`change_member_role`, `transfer_ownership` ni `revoke_invitation`.

**Ejecución.** 4 RPCs nuevas, todas `SECURITY DEFINER` + `SET search_path = ''`

- `GRANT EXECUTE TO authenticated` + `REVOKE FROM PUBLIC`:

1. `leave_team(p_account_id uuid)` — rechaza si la cuenta es personal; rechaza si
   el caller es el único owner (remite a `transfer_ownership`); si la cuenta que
   deja era la activa, mueve `active_account_id` a la Personal.
2. `change_member_role(p_account_id uuid, p_user_id uuid, p_role membership_role)` —
   caller owner o admin; `admin` solo puede asignar `member`/`viewer`; nadie
   asigna `owner` por acá (eso es `transfer_ownership`); no puede cambiarse el
   rol a sí mismo.
3. `transfer_ownership(p_account_id uuid, p_new_owner uuid)` — solo owner; el
   destinatario debe ser miembro; el owner saliente queda como `admin`. Ojo con
   el orden de operaciones: `enforce_single_owner_per_account` dispara en
   `UPDATE OF role` y aborta si la cuenta queda sin owner — promover primero,
   degradar después.
4. `revoke_invitation(p_invitation_id uuid)` — owner/admin de la cuenta de la
   invitación; pasa `status` a `revoked` (el enum ya lo contempla).

`resend_invitation` queda **fuera de V1** a propósito.

**Acceptance criteria.**

- Los 4 RPCs con pgTAP: happy path + cada rechazo de rol + el caso "último owner".
- `transfer_ownership` no deja jamás una cuenta sin owner, ni siquiera a mitad de
  transacción.
- El texto de error de `remove_member` ya no miente: `leave_team` existe.

**Estado (2026-08-15): backend mergeable en PR #125, cero consumidores.**
Ninguna de las 4 RPCs se llama desde ningún componente — no es un matiz, es
que hoy nadie puede usarlas desde la app. Nace de un accidente de orden: PR 5
(`feat/ui-role-aware`, #124) se escribió y se abrió **antes** de que estas RPCs
existieran, así que no las incluyó. Ver PR 4b abajo.

---

## PR 4b — `feat/membership-lifecycle-ui`

**Problema.** Las 4 RPCs del PR 4 (`leave_team`, `change_member_role`,
`transfer_ownership`, `revoke_invitation`) no tienen ningún punto de entrada en
la UI. Gap real de producto, no housekeeping — por eso no va en el PR 8
(`release-hygiene`), que es limpieza sin superficie de UX nueva. Cada RPC ya
define sus rechazos como strings matcheables
(`last_owner_must_transfer`, `cannot_change_own_role`, `use_transfer_ownership`,
`invitation_not_pending`, más los ya conocidos `Only owner or admin can ...`);
la UI debe mapear cada uno a un mensaje, no a un genérico.

**Ejecución.**

1. **Cambiar rol** — selector de rol en `members-table.tsx` (o en el diálogo de
   `RowActions`), gateado por `canManageMembers` del helper de PR 5 y por las
   mismas reglas que el RPC ya aplica (admin no ofrece "Admin" como destino, ni
   lo ofrece sobre otro admin).
2. **Transferir ownership** — acción separada, solo visible para el owner,
   con confirmación explícita (mueve al owner actual a admin).
3. **Salir del team** — visible para cualquier no-personal activo; si el que
   sale es el único owner, mostrar el mensaje de `last_owner_must_transfer`
   con un CTA a transferir primero, no un error genérico.
4. **Revocar invitación** — acción sobre las filas `status: pending` de
   `members-table.tsx`, que hoy solo se listan sin ninguna acción disponible.

**Acceptance criteria.**

- Las 4 RPCs tienen un punto de entrada real en la UI, no solo en la DB.
- Cada código de rechazo del PR 4 tiene su mensaje propio, no cae en
  `error_generic`.
- E2E de al menos un camino feliz por RPC (puede compartirse con el PR 6).

---

## PR 5 — `feat/ui-role-aware`

**Problema.** La DB rechaza correctamente, pero la UI ofrece acciones que van a
fallar. Hoy existe **un solo** gate de rol en todo el frontend
(`app-sidebar-client.tsx:62-67`, para el link de Activity) y no se reutiliza.

**Ejecución.**

1. Helper único en `src/lib/permissions.ts` que exprese la matriz de este plan
   (`canInvite`, `canEditContent`, `canManageBilling`, `canManageMembers`, …),
   alimentado por `getActiveAccountRole()`. Una sola definición, server y client.
2. Aplicarlo en los sitios verificados como abiertos:
   - `dashboard/members/page.tsx:50` — `<InviteDialog />` incondicional.
   - `members-table.tsx:47-66` — `RowActions` solo mira el rol de la **fila**,
     nunca el del que mira. Pasar `currentUserRole` como prop.
   - `members-table.tsx:169-177` — el filtro de roles no incluye `viewer`, pero
     `ROLE_LABELS` sí sabe renderizarlo y `INVITABLE_ROLES` sí permite invitarlo.
   - `projects/page.tsx:69,78` y `projects/[slug]/page.tsx:78,88,160` —
     `NewProjectDialog` / `NewDocumentDialog` incondicionales.
   - `billing-tab.tsx` — `PlanCard` solo se deshabilita por estado del plan,
     nunca por rol; y el link "Billing" del sidebar no tiene el gate que sí
     tiene "Activity".
3. **Arreglar el error silencioso de billing**: el `useMutation` de checkout
   (`billing-tab.tsx:53-62`) no define `onError` y `checkout.error` no se
   renderiza en ninguna parte. Hoy un `not_authorized` desaparece sin rastro.
4. Exponer los controles de PR 4 en la UI de members: cambiar rol, transferir
   ownership, salir del team, revocar invitación.

**Acceptance criteria.**

- Un `viewer` no ve ningún control que la DB vaya a rechazar.
- Ningún error de server action queda sin renderizar.
- El helper es la única fuente de verdad de permisos en el frontend: cero
  comparaciones de rol inline nuevas.

---

## PR 6 — `test/rbac-e2e`

**Problema.** Ningún fixture E2E crea usuarios `admin` ni `viewer`. El único rol
además de owner es un `member` insertado por SQL en `team.spec.ts`. No hay
ningún E2E cross-tenant.

**Ejecución.**

1. Fixture que seedea un Team A con los 4 roles, un Team B, y un outsider.
2. Matriz de la sección "Design decisions" recorrida por rol contra Team A.
3. Cross-tenant: cada rol de Team A intentando leer y escribir en Team B,
   incluyendo llamadas directas con `account_id` ajeno (no solo navegación).

**Acceptance criteria.**

- Cada celda de la matriz tiene su assertion.
- El E2E falla si alguien afloja una policy más adelante.
- Nota: ya existe cobertura cross-tenant **parcial** en pgTAP
  (`18_presence_rls.test.sql:40-49`, `08_audit_log_viewer.test.sql:95-101`).
  Extenderla, no duplicarla.

---

## PR 7 — `test/qa-storage-realtime`

Tres features implementadas y sin una sola prueba E2E. No se construye nada
nuevo: solo se prueba que lo que existe funciona de verdad.

1. **Avatar** — subir, guardar, recargar, sigue ahí. Hay unit tests
   (`account/__tests__/actions.test.ts:439-501`, `validation/profile.test.ts:169-186`)
   pero cero E2E. No agregar cropper, galería ni CDN.
2. **Notifications realtime** — dos contextos de navegador: B acepta la
   invitación, A recibe la campana sin refrescar.
3. **Presence** — A y B en el mismo Team se ven online; B sale y el indicador
   desaparece.
4. **Invitación end-to-end** — invitar, leer el email en Mailpit, abrir el link,
   aceptar, aterrizar en el Team. **Depende del punto 6 del PR 2**: hoy el email
   sale por la API de Resend y Mailpit no puede verlo, así que este test no es
   escribible hasta que exista transporte SMTP en local. Esa es la razón real de
   que nunca haya existido un E2E de invitación, no un olvido.

**Acceptance criteria.** Los cuatro flujos verdes en CI, sin `waitForTimeout`
arbitrarios. Si alguno resulta inestable en CI, se documenta como manual en un
runbook — no se marca como cubierto sin estarlo.

---

## PR 8 — `chore/release-hygiene`

1. **Cache-Control.** `proxy.ts:128` setea `private, no-store` dentro de
   `applySecurityHeaders()`, que corre en las 3 salidas de `proxy()` — incluida
   la línea 171, **después** del condicional de `middleware.ts:233-235`. La
   optimización de cachear páginas anónimas está anulada. Mover el header fuera
   del helper y dejar que decida `updateSession`.
2. **Datos falsos.** Eliminar (no simular): `projects/page.tsx:120,124` — el `4`
   de miembros y el `main` de branch son literales en el JSX.
3. **Versión hardcodeada.** `app-sidebar-client.tsx:242,247` (`iroko · v1.0`,
   `● stable`) y `public-footer.tsx:58`. Leer de `package.json` o quitar. El
   badge "stable" debería ser de lo último que se encienda, no de lo primero.
4. **Docs.** `docs/estado-fases.md` sigue en "Última actualización: 2026-07-28"
   y no refleja nada del bloque de Teams/active-account de agosto.
5. **Único warning de lint del repo.** `src/app/layout.tsx:63` dispara
   `@next/next/no-page-custom-font` por el `<link rel="stylesheet">` de Material
   Symbols. Es **falso positivo**: la regla apunta al Pages Router, y en App
   Router el root layout sí aplica a todas las páginas. No se silencia con
   `eslint-disable` (prohibido por las reglas del repo) — el arreglo real es
   migrar el icon font a `next/font/google`, que además lo self-hostea y quita
   el round-trip a Google. Toca la iconografía de toda la app, así que necesita
   verificación visual; por eso no se coló en el PR del health check.

## Required validation (todos los PRs)

- `pnpm typecheck && pnpm lint && pnpm format:check` limpios.
- `pnpm test` sin regresión.
- `supabase test db` verde — cada PR con migración suma sus propios pgTAP.
- Migraciones escritas **a mano** con espejo en `supabase/schemas/*.sql` en el
  mismo commit (`supabase db diff` está roto en Windows, ver `AGENTS.md`).
- Tras mergear cualquier PR con migración: `pnpm supa:cloud:migration:list` —
  las migraciones **no** se aplican solas a Cloud al mergear.
- `nightly.yml` verde tras el PR 1, y verificado de nuevo al cerrar el plan.

## Out of scope (explícito, para no volver a discutirlo)

- Capabilities nuevas de Supabase de cualquier tipo.
- `resend_invitation` (V1.1).
- Rediseño de permisos del vertical Robot (queda apagado).
- Borrar índices "sin uso" reportados por los advisors: el proyecto no tiene
  tráfico, la métrica no significa nada todavía.
- Leaked Password Protection: es un toggle del dashboard, no código.
- Nonces de CSP en vez de `unsafe-inline` (mejora conocida y documentada en
  `proxy.ts:66-74`, sin relación con V1).
- **Comprar y verificar un dominio para Resend.** Entrega real a terceros no es
  un requisito del boilerplate: quien lo despliegue configura su dominio y su
  key. V1 exige que el sistema sea desarrollable, testeable y observable sin
  dominio (transporte SMTP local, fallos visibles, health check que no mienta) —
  no que este proyecto en particular entregue email a producción. El requisito
  se documenta en el README/runbook de despliegue, con la nota de que verificar
  un dominio en Resend no tiene costo: lo que se paga es el dominio.

## Rollback

Cada PR es independiente y revertible por separado. Los dos con más superficie:

- **PR 3**: revertir la migración restaura las policies `admins_can_*` con el
  array original de roles. El cambio de onboarding es un revert de commit; no
  hay migración de datos que deshacer salvo los Teams ya creados, que quedan
  válidos.
- **PR 2**: el backfill de `active_account_id` no es destructivo (solo rellena
  NULLs). Revertir el hook deja el fallback anterior funcionando.
