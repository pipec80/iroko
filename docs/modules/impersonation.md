# Impersonation — "Ver como" (`impersonation_sessions`)

> **Tarea F3-C2** · PR [#64](https://github.com/pipec80/iroko/pull/64) · Rama histórica `feat/f3-c2-impersonation`
> Estado actual: implementación y especificación E2E verificadas estáticamente el 2026-08-20;
> el PR está mergeado. El flujo con admin real, MFA y `aal2` no se ejecutó en esta revisión y
> está **[NO VERIFICADO]**.

## 1. Qué es esto

Extiende el back-office de super-admin ([`platform-admin.md`](platform-admin.md), tarea C1) con
la posibilidad de que un admin inicie sesión **como si fuera** un usuario no-admin, para
resolver tickets de soporte sin pedirle la contraseña ni tocar la base de datos a mano.

No es JWT spoofing: es una **sesión real** del target (`auth.admin.generateLink` + `verifyOtp`),
así que RLS y todo el resto de la app ven al target genuinamente logueado. Tiene un cap duro de
30 minutos, un banner permanente que no se puede ocultar mientras dura, y cada acción que el
admin hace durante la impersonation queda registrada en `audit.logs` con el admin real
identificado (sin romper el visor de auditoría por cuenta, que sigue viendo al target como
actor).

## 2. Cómo usarlo (como admin)

1. Requisitos previos: estar en `platform_admins` y tener MFA inscripto (ver
   [`platform-admin.md` §2-3](platform-admin.md)).
2. Andá a `/dashboard/admin/accounts`, entrá al detalle de la cuenta del usuario que necesitás
   ver.
3. Clic en **"Ver como {email}"**. Se abre un diálogo pidiendo un motivo (mínimo 3 caracteres,
   ej. "ticket de soporte #123") — queda guardado en `audit.logs` junto con el resto.
4. Confirmá. Quedás logueado como ese usuario, con un banner naranja fijo arriba de todo:
   _"Estás viendo como {nombre} ({email}) · N min restantes"_.
5. Navegá la app normalmente — cualquier cambio que hagas queda auditado como si lo hubiera
   hecho el target, pero con `impersonator_id` apuntando a vos.
6. Clic en **"Salir"** del banner en cualquier momento para volver a tu propia sesión de admin.
   Si no salís antes de los 30 minutos, la próxima navegación te redirige automáticamente a
   `/login` y cierra la sesión de impersonation del lado del servidor.

### Quién puede ser impersonado

Cualquier usuario **no-admin** que exista. `begin_impersonation_session` rechaza:

- Impersonarte a vos mismo (`cannot_impersonate_self`).
- Impersonar a otro admin (`cannot_impersonate_admin`) — ni siquiera otro super-admin puede ser
  target, para evitar que un admin comprometido escale a otro.
- Un `target_user_id` que no existe (`target_not_found`).
- Tener ya una sesión de impersonation activa (el índice único `idx_impersonation_one_active_per_admin`
  lo impide a nivel de base de datos — hay que salir de la actual antes de abrir otra).

---

## 3. Cómo funciona por dentro (arquitectura)

```
┌──────────────────────────────────────────────────────────────────────────┐
│ 1. Admin hace clic en "Ver como" → startImpersonation(targetUserId, reason)│
│    a) RPC begin_impersonation_session: valida, inserta la fila en         │
│       impersonation_sessions (expires_at = now() + 30 min), audita        │
│       impersonate_start.                                                  │
│    b) Guarda la sesión ACTUAL del admin en la cookie admin_return_session │
│       (firmada con HMAC-SHA256, ver §5).                                  │
│    c) Guarda el id de la sesión en la cookie impersonation_session_id     │
│       (plana, no sensible — solo un UUID, no un token).                   │
│    d) service_role: auth.admin.generateLink('magiclink', target.email)    │
│       + supabase.auth.verifyOtp(hashed_token) → sesión REAL del target.   │
│    e) redirect a /dashboard.                                              │
└──────────────────────────────────────────────────────────────────────────┘
                              ↓
┌──────────────────────────────────────────────────────────────────────────┐
│ 2. custom_access_token_hook agrega, mientras la sesión esté activa:        │
│      app_metadata.impersonated_by = <uuid del admin>                      │
│      app_metadata.impersonation_expires_at = <timestamp>                  │
│    (consulta impersonation_sessions WHERE target_user_id = ... AND        │
│     ended_at IS NULL — se resuelve en cada mint de token, no en vivo)     │
└──────────────────────────────────────────────────────────────────────────┘
                              ↓
┌──────────────────────────────────────────────────────────────────────────┐
│ 3. private.audit_log() (el trigger genérico que ya existía) lee el claim  │
│    impersonated_by del JWT y lo guarda en audit.logs.impersonator_id en   │
│    CADA mutación mientras dura la impersonation. actor_id sigue siendo    │
│    auth.uid() (el target) — RLS y visores por cuenta no cambian.          │
└──────────────────────────────────────────────────────────────────────────┘
                              ↓
┌──────────────────────────────────────────────────────────────────────────┐
│ 4. middleware.ts chequea, en cada request a /dashboard/*:                 │
│    impersonation_expires_at <= now() → redirect a                         │
│    /api/impersonation/expire?returnTo=<path actual>                       │
└──────────────────────────────────────────────────────────────────────────┘
                              ↓
┌──────────────────────────────────────────────────────────────────────────┐
│ 5. Salida — endImpersonation() (botón "Salir") o el route handler de      │
│    expiración automática, EN ESE ORDEN:                                   │
│    a) Verifica la cookie admin_return_session. Si falta o es inválida     │
│       (tamperada, corrupta): signOut() completo, nunca se deja al admin   │
│       atrapado en la sesión del target.                                   │
│    b) setSession() con el access/refresh token del admin — RESTAURA       │
│       primero.                                                            │
│    c) RECIÉN AHORA, con auth.uid() = admin: RPC end_impersonation_session │
│       (marca ended_at, audita impersonate_end). El orden importa: el RPC  │
│       exige que el caller sea el admin dueño de la sesión.                │
│    d) Borra ambas cookies, redirect.                                      │
└──────────────────────────────────────────────────────────────────────────┘
```

### Por qué una sesión real y no un JWT falsificado

La alternativa obvia — mintear un JWT con `sub` = target sin pasar por Auth — rompería
silenciosamente cualquier lógica que dependa de `auth.uid()` teniendo una sesión GoTrue
legítima detrás (refresh tokens, `auth.mfa_factors`, revocación de sesiones, etc.). Usar
`generateLink` + `verifyOtp` es más código, pero el target queda con una sesión indistinguible
de si hubiera iniciado sesión él mismo.

### Por qué el cap de 30 min se basa en el claim, no en una consulta en vivo

El middleware corre en el edge y no tiene un cliente completo de Postgres — solo puede leer el
JWT ya minteado. Esto significa que **actualizar `expires_at` en la base de datos no afecta una
sesión ya iniciada** hasta que el token se refresque (Supabase refresca automáticamente antes de
que expire el access token, típicamente dentro de la hora). El cap real y confiable es el que
impone `begin_impersonation_session` al insertar la fila con `expires_at = now() + 30 min`, y el
claim simplemente refleja ese valor en cada mint. Para QA/debugging, forzar la expiración
requiere provocar un refresh de token, no alcanza con un `UPDATE` a la tabla.

### Por qué `end_impersonation_session` es idempotente

El cierre automático por expiración (route handler) y el cierre manual (botón "Salir") pueden
superponerse — por ejemplo, si el token se refresca justo cuando el admin hace clic en "Salir".
La RPC no falla si la sesión ya tiene `ended_at`: el `UPDATE ... WHERE ended_at IS NULL` de la
segunda llamada simplemente no encuentra filas para actualizar.

---

## 4. Referencia técnica

### Tabla

```sql
public.impersonation_sessions (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason         text NOT NULL,
  started_at     timestamptz NOT NULL DEFAULT now(),
  expires_at     timestamptz NOT NULL,
  ended_at       timestamptz,
  ended_reason   text,
  ip_address     inet,
  user_agent     text,
  CONSTRAINT impersonation_target_not_admin CHECK (admin_id <> target_user_id)
)
```

RLS: **deny-all total** (mismo patrón que `platform_admins`). Índice único parcial
`idx_impersonation_one_active_per_admin ON (admin_id) WHERE ended_at IS NULL` — a nivel de base
de datos, un admin no puede tener dos sesiones activas simultáneas.

### RPCs públicos

**`public.begin_impersonation_session(p_target_user_id uuid, p_reason text)`**

Devuelve la fila insertada (`impersonation_sessions`). Requiere `platform_admin` + aal2 real
(vía `assert_platform_admin()`). Lanza `reason_required` (motivo < 3 caracteres),
`cannot_impersonate_self`, `cannot_impersonate_admin`, `target_not_found`, o el error de
duplicate-key del índice único si ya hay una sesión activa.

**`public.end_impersonation_session(p_session_id uuid, p_reason text DEFAULT 'manual')`**

`void`. Invocable por el admin dueño de la sesión, o sin `auth.uid()` (contexto `service_role`,
para el cierre automático). Lanza `session_not_found` o `not_authorized` (un tercer admin
intentando cerrar la sesión de otro). Idempotente ante `session_id` ya cerrado.

### Claims JWT

`app_metadata.impersonated_by: string | undefined` y
`app_metadata.impersonation_expires_at: string | undefined`, agregados en
`public.custom_access_token_hook` solo cuando el usuario actual es el **target** de una sesión
activa.

### Cookie de retorno del admin

`src/lib/impersonation-cookie.ts` — `signImpersonationCookie` / `verifyImpersonationCookie`.
Formato: `base64url(JSON payload) + '.' + HMAC-SHA256-hex`, firmada con
`env.SUPABASE_SECRET_KEY` (ya existe como secreto solo-servidor, no se agregó ninguna
dependencia nueva como `jose` o `iron-session`). Firmada, no cifrada — el payload no es secreto
para el propio admin (son sus tokens), pero la firma evita que un payload tamperado (ej. un
`adminUserId` forjado) sea aceptado. Verificación con `crypto.timingSafeEqual`, nunca `===`
sobre el HMAC.

### Archivos del feature

```
supabase/migrations/20260721221310_f3_c2_impersonation_enum.sql   ← audit.action_type +2 valores
supabase/migrations/20260721221410_f3_c2_impersonation.sql        ← tabla, RPCs, claims, trigger
supabase/schemas/{public,private,audit}.sql                       ← espejo declarativo
supabase/tests/database/20_impersonation.test.sql                 ← 20 tests pgTAP

src/lib/impersonation-cookie.ts                                   ← firma/verifica la cookie de retorno
src/lib/supabase/middleware.ts                                    ← cap de 30 min en el edge

src/app/api/impersonation/expire/route.ts                         ← cierre automático por expiración

src/app/[locale]/dashboard/admin/accounts/[accountId]/
├── impersonation-actions.ts      ← startImpersonation() / endImpersonation()
├── impersonate-button.tsx        ← botón + diálogo de motivo
└── page.tsx                      ← botón "Ver como" (usa account.ownerId)

src/components/layout/
├── impersonation-banner.tsx      ← banner con countdown + botón "Salir"
└── dashboard-layout.tsx          ← acepta prop impersonationBanner

src/app/[locale]/dashboard/layout.tsx  ← arma el banner leyendo los claims
```

### i18n

Namespace `Impersonation` en `messages/{en,es,pt,fr}.json`. También se agregaron
`action_impersonate_start`/`action_impersonate_end` al namespace `ActivityLog` (visor de
auditoría) en los 4 locales.

---

## 5. Cómo probarlo en local

```bash
pnpm supa:start   # si no está corriendo ya
pnpm dev
```

Necesitás **dos usuarios**: un admin (en `platform_admins`, con MFA inscripto — ver
[`platform-admin.md` §6](platform-admin.md)) y un target (cualquier usuario normal, no-admin).

1. Registrá ambos usuarios normal, vía `/signup` (confirmá los correos en Mailpit,
   `http://127.0.0.1:54324`).
2. Insertá al admin en `platform_admins` e inscribile MFA (ver `platform-admin.md`).
3. Logueado como admin, con aal2, andá a `/dashboard/admin/accounts` → entrá a la cuenta del
   target → **"Ver como {email}"**.
4. Confirmá el diálogo con un motivo. Verificá el banner y que la sesión sea la del target
   (nombre/avatar cambian en el sidebar).
5. Hacé algún cambio (ej. renombrar el perfil en `Mi cuenta`) y verificá en
   `/dashboard/admin/audit` que la fila tenga "Suplantado por" = tu email de admin.
6. Clic en "Salir" — confirmá que volviste a tu sesión de admin.

### Tests automáticos

```bash
pnpm supa:test                         # 20 tests pgTAP de este feature (archivo 20)
pnpm test "impersonation-actions"      # server actions startImpersonation/endImpersonation
pnpm test "impersonation-cookie"       # firma/verificación de la cookie
```

---

## 6. Evidencia pendiente

- El E2E automatizado existe en `src/test/e2e/impersonation.spec.ts` y usa el fixture
  `platform-admin`; ya no está marcado con `test.skip`. Su ejecución actual no formó parte de
  esta revisión y permanece **[NO VERIFICADO]**.
- GDPR fue implementado posteriormente mediante PR #75; no es trabajo pendiente de este
  módulo.
