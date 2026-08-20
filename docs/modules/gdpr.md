# GDPR — exportar y borrar mis datos (`export_my_data` / `delete_my_account`)

> **Tarea F3-C3** · PR [#75](https://github.com/pipec80/iroko/pull/75) · Rama histórica `feat/f3-c3-gdpr`
> Estado actual: código, migración y cobertura automatizada verificados estáticamente el
> 2026-08-20. Exportación, borrado, purga diferida y efectos externos en un runtime actual están
> **[NO VERIFICADO]** en esta revisión.

## 1. Qué es esto

Dos acciones de GDPR accesibles desde **Mi cuenta → Seguridad**, disponibles para cualquier
usuario logueado (no requieren ser platform admin):

- **Exportar mis datos** (Art. 15, derecho de acceso): descarga un `.json` con todo lo que la
  plataforma sabe del usuario — perfil, memberships, billing de su cuenta personal, sesiones
  activas, notificaciones, conteo de API keys creadas, y su rastro de auditoría.
- **Eliminar mi cuenta** (Art. 17, derecho al olvido): evoluciona el borrado que ya existía
  (`request_account_deletion`, soft-delete de 90 días) agregando un guardrail — no te deja
  borrarte si sos el único owner de una cuenta de equipo — y revocando todas tus sesiones
  activas de inmediato, no cuando expiren solas.

**Lo que NO incluye esta tarea:**

- **Borrado del contenido de negocio de una cuenta de equipo** — eso es responsabilidad del
  owner de esa cuenta (transferir o borrar la cuenta), no del usuario individual. El export
  tampoco vuelca ese contenido: solo **conteos** de recursos creados por el usuario
  (`api_keys`), nunca su contenido — ese contenido pertenece al tenant, no es dato personal.
- **Anonimización retroactiva del `audit.logs` histórico** de acciones ya registradas contra
  cuentas de las que el usuario ya no es miembro — el audit trail exportado es _su propio_
  rastro (`actor_id = auth.uid()`), no algo que se reescribe.

## 2. Cómo usarlo

1. Andá a **Mi cuenta → Seguridad**.
2. **Exportar**: botón "Exportar mis datos" → descarga un `.json` con fecha en el nombre
   (`iroko-export-YYYY-MM-DD.json`).
3. **Eliminar cuenta**: en la Zona peligrosa, escribí `ELIMINAR` (o `DELETE` en inglés) y
   confirmá.
   - Si sos el único owner de una o más cuentas de equipo, la acción se bloquea con un mensaje
     que lista esas cuentas por nombre — hay que transferir la propiedad (desde
     `/dashboard/org/settings` de esa cuenta) antes de poder borrarte.
   - Si no hay bloqueo: tu perfil y tu cuenta personal quedan marcadas para borrado (90 días),
     se cierran todas tus sesiones activas, y salís al login.

## 3. Cómo funciona por dentro (arquitectura)

```
┌─────────────────────────────────────────────────────────────────────┐
│ Export: Security tab → exportMyDataAction() → export_my_data()       │
│ SECURITY DEFINER, solo exige estar autenticado (auth.uid())          │
│ Devuelve un jsonb; el cliente arma un Blob y dispara la descarga     │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│ Delete: Security tab → deleteAccountAction() → delete_my_account()   │
│  1. ¿Único owner de alguna cuenta type='team'? → sole_owner_must_    │
│     transfer (DETAIL = nombres de las cuentas), no se borra nada     │
│  2. PERFORM request_account_deletion() (soft-delete ya existente)    │
│  3. DELETE FROM auth.sessions WHERE user_id = caller                 │
└─────────────────────────────────────────────────────────────────────┘
                              ↓ (90 días después, cron nocturno)
┌─────────────────────────────────────────────────────────────────────┐
│ 03:00 hard-delete-old-accounts: DELETE FROM public.accounts          │
│       (cascada: accounts_memberships, projects, documents,           │
│        invitations, billing.customers→...→payment_methods)           │
│ 03:30 purge-deleted-identities: DELETE FROM auth.users                │
│       (cascada: profiles, accounts_memberships restantes,            │
│        notifications, auth_recovery_codes, auth.identities/          │
│        sessions/mfa_factors/etc. api_keys.created_by y                │
│        announcements.created_by quedan en NULL)                       │
└─────────────────────────────────────────────────────────────────────┘
```

### Por qué `delete_my_account()` es un wrapper, no un reemplazo

`request_account_deletion()` ya existía (soft-delete de perfil + cuenta personal) y tiene otros
callers. `delete_my_account()` es el nombre público que pide GDPR y el que consume la UI nueva
— agrega el guardrail de sole-owner y la revocación de sesiones, y por dentro llama al RPC
viejo en vez de duplicar su lógica.

### El bug que este trabajo destapó (y arregló en un PR aparte)

Investigando el cascade de borrado se encontraron dos bugs de integridad **pre-existentes**,
arreglados en `fix/announcements-created-by-set-null` (mergeado antes que este PR):

1. `announcements.created_by` (F3-C7) era `NOT NULL` + FK `NO ACTION` → bloquearía borrar a un
   admin que publicó un anuncio. Fix: nullable + `ON DELETE SET NULL`.
2. `private.enforce_single_owner_per_account()` (trigger de 2026-06-25) bloqueaba **cualquier**
   borrado del owner de una cuenta, incluidas las personales — que son 1:1 con su único usuario
   y no tienen "transferencia de ownership" posible. Efecto real: el cron
   `hard-delete-old-accounts` viene fallando en silencio para **toda** cuenta personal desde que
   existe, porque `DELETE FROM public.accounts` cascadea a `accounts_memberships` y el trigger
   aborta la transacción. Fix: el invariante ahora solo aplica a `type = 'team'`.

Sin este fix, ni el cron viejo ni el nuevo `purge-deleted-identities` podrían completar el
borrado de ninguna cuenta personal — el "derecho al olvido" nunca se cumplía del todo.

### Por qué el cron de purga es SQL directo, no pg_net + GoTrue Admin API

El diseño previo a la implementación proponía purgar `auth.users` llamando al Admin API de
GoTrue vía `pg_net`, con un
`service_role_key` guardado en Vault. Se descartó esa ruta al implementar: este proyecto no
tiene ese patrón en ningún otro lado (el único cron→HTTP existente, `process-email-queue`,
llama a una Edge Function propia con `verify_jwt=false`, nunca al Admin API de Supabase con un
secret global), y sembrar un secret real en una migración no es seguro ni reproducible por
entorno. En su lugar, `purge-deleted-identities` hace `DELETE FROM auth.users` directo — el
mismo patrón que `hard-delete-old-accounts` ya usa para `public.accounts`. `auth.users` tiene
`ON DELETE CASCADE` hacia todo lo relevante (esquema base de Supabase + este repo), así que un
DELETE ahí purga todo correctamente. El job procesa fila por fila con `EXCEPTION WHEN OTHERS`
para no frenar todo el batch si un usuario quedó en un estado inconsistente (ej. alguien que se
autoeliminó por la vía vieja antes de que existiera el guardrail de sole-owner).

---

## 4. Referencia técnica

### RPCs públicos

**`public.export_my_data() RETURNS jsonb`** — `STABLE SECURITY DEFINER`. Gate: `auth.uid()` no
nulo (`not_authenticated`). Shape devuelto: `exported_at`, `profile` (sin `metadata`), `auth`
(email/created_at/last_sign_in_at), `memberships[]`, `personal_account_billing`
(`{subscriptions[], invoices[]}`, solo cuenta `type='personal'`), `sessions[]` (vía
`list_my_sessions()`), `mfa_factors_count`, `unused_recovery_codes_count`, `notifications[]`,
`resources_created_summary.api_keys` (conteo), `audit_trail[]` (últimas 1000 filas).

**`public.delete_my_account() RETURNS void`** — `SECURITY DEFINER`. Gate: `auth.uid()` no nulo
(`not_authenticated`). Bloquea con `sole_owner_must_transfer` (`ERRCODE='P0001'`, `DETAIL` =
nombres de las cuentas bloqueantes) si el caller es único owner de alguna cuenta `type='team'`.
Si no, `PERFORM request_account_deletion()` + `DELETE FROM auth.sessions WHERE user_id = caller`.

### Cron

`purge-deleted-identities` — `30 3 * * *` (después de `hard-delete-old-accounts`, 03:00, para no
competir por locks). Purga `auth.users` de perfiles con `pending_deletion=true AND deleted_at <
now() - 90 días`. No mirroreado en `supabase/schemas/` (mismo criterio que
`hard-delete-old-accounts`: los cron jobs de este repo no se declaran ahí).

### Fix de UX encontrado de paso: `error.code` vs `error.message`

Al reescribir `deleteAccountAction`, se confirmó empíricamente (contra PostgREST local) que
`supabase.rpc(...)` devuelve el **SQLSTATE** en `error.code` (ej. `"42501"`) y el texto real de
la excepción en `error.message` (ej. `"not_authenticated"`). La mayoría de las acciones de
`account/actions.ts` usaban `error.code` para el mensaje mostrado al usuario — casi todos los
errores de esas acciones caían al mensaje genérico en vez del específico. Se corrigió
inicialmente en `deleteAccountAction`. Al 2026-08-20 varias acciones ya usan `error.message`,
pero `updateEmail`, `updatePassword`, `requestPasswordReset` y `signOutOtherSessions` aún
retornan `error.code`; la consistencia del mapeo de errores sigue siendo deuda de código fuera
del alcance de esta guía.

### Archivos del feature

```
supabase/migrations/20260724150000_f3_c3_gdpr.sql   ← migración (fuente de verdad)
supabase/schemas/gdpr.sql                             ← espejo declarativo
supabase/tests/database/24_gdpr.test.sql              ← 14 tests pgTAP

src/app/[locale]/dashboard/account/actions.ts          ← exportMyDataAction, deleteAccountAction
src/app/[locale]/dashboard/account/__tests__/actions.test.ts

src/components/dashboard/account/security-tab.tsx      ← ExportDataCard + danger zone actualizada
```

### i18n

Namespace `Settings.security` (`export_data_*`, `success.data_exported`) y `Settings.errors`
(`export_failed`, `delete_failed`, `sole_owner_must_transfer` con placeholder `{accounts}`) en
`messages/{en,es,pt,fr}.json` — las 4 con traducción real (a diferencia del namespace `Admin`,
`Settings` ya estaba genuinamente traducido en pt/fr).

---

## 5. Cómo probarlo en local

```bash
pnpm supa:start   # si no está corriendo ya
pnpm dev
```

1. Registrate normal, andá a **Mi cuenta → Seguridad**.
2. "Exportar mis datos" → revisá el `.json` descargado.
3. Para probar el bloqueo: creá una cuenta de equipo desde ese usuario (quedás como único
   owner), intentá "Eliminar mi cuenta" → debería mostrar el mensaje con el nombre de esa
   cuenta.
4. Transferí el ownership o dejá esa cuenta, reintentá el borrado → debería funcionar y
   redirigir a `/login?deleted=1`.

### Tests automáticos

```bash
pnpm supa:test                                     # incluye 24_gdpr.test.sql (14 tests)
pnpm test "dashboard/account/__tests__/actions"    # exportMyDataAction + deleteAccountAction
```

---

## 6. PostHog — sub-encargado de tratamiento (Plan 006)

Desde Plan 006, PostHog Cloud (US) procesa datos de analítica de producto por cuenta de la
plataforma — ver [`analytics.md`](analytics.md) para la arquitectura completa. Relevante para
GDPR:

- **Identidad**: PostHog nunca recibe email ni nombre — solo el UUID de `auth.users`
  (`distinct_id`) y el UUID de la cuenta (`group`). No hay forma de re-identificar a una
  persona desde PostHog sin cruzar contra la base de datos propia.
- **Consentimiento**: analítica es opt-out por defecto; el SDK no se carga sin consentimiento
  explícito (`cookie_consent.analytics`). No hay tracking previo al consentimiento.
- **Borrado (Art. 17)**: `delete_my_account()` **no** borra al usuario de PostHog
  automáticamente — el UUID en PostHog queda huérfano (sin datos personales asociados más allá
  del UUID mismo, que no es re-identificable sin la base de datos que ya se borró). Si un
  usuario pide borrado explícito de su perfil en PostHog (raro, dado que no hay PII allí), se
  hace manualmente vía la API de PostHog (`DELETE /api/projects/:id/persons/:distinct_id/`) o
  desde la UI del proyecto, buscando por el UUID.
- **Export (Art. 15)**: `export_my_data()` no incluye datos de PostHog — los eventos de
  analítica no son "datos personales" en el sentido del export (no hay PII en ellos), y no
  forman parte del conjunto que este RPC expone.
- **Impersonación**: cero eventos se capturan durante una sesión impersonada (ver
  `analytics.md` §3) — ninguna acción del admin actuando como el usuario objetivo se atribuye a
  ninguno de los dos.

## 7. Estado posterior

La implementación histórica de esta fase quedó completa. La preparación legal y comercial
actual se sigue en el
[Plan 013](../exec-plans/active/013-launch-readiness-roadmap.md); la operación real de export,
borrado y purga conserva estado **[NO VERIFICADO]** hasta registrar evidencia fresca.
