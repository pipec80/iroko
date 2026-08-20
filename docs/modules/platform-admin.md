# Back-office de Super-Admin (`platform_admins`)

> **Tarea F3-C1** · PR [#60](https://github.com/pipec80/iroko/pull/60) · Rama histórica `feat/f3-c1-admin-backoffice`
> Estado actual: implementación verificada estáticamente el 2026-08-20. La operación con un
> admin real y MFA está **[NO VERIFICADO]**; además permanece la limitación de filtros de
> auditoría descrita en §3.

## 1. Qué es esto

Un back-office interno, accesible en `/dashboard/admin`, para que un puñado de personas de
confianza (el equipo que opera la plataforma — soporte, founders) puedan:

- Ver **todas** las cuentas del SaaS (no solo la propia), con su plan y estado de suscripción.
  Resuelve el "caso call-center": alguien llama diciendo "mi suscripción no funciona" y el
  agente de soporte necesita buscar esa cuenta sin tener que entrar a la DB a mano.
- Ver el **audit log cross-account**: todas las acciones de todas las cuentas en un solo
  visor, a diferencia del audit log normal (`/dashboard/activity`) que cada cuenta solo ve el
  suyo.

No hay auto-registro. Nadie se puede "hacer admin" desde la UI — es una whitelist que se
puebla a mano, directo en la base de datos.

**Lo que NO incluye esta tarea** (son tareas separadas):

- **Impersonation** ("ver como" un usuario) — tarea C2, ✅ hecha, ver
  [`impersonation.md`](impersonation.md).
- **GDPR** (exportar/borrar mis datos) — tarea C3, implementada después mediante PR #75.
- Cualquier UI para dar/quitar el rol de admin a otros usuarios — no está en el diseño, se
  sigue haciendo a mano por SQL a propósito (menos superficie de ataque).

---

## 2. Cómo dar de alta a un super-admin

No hay botón para esto. Se inserta la fila a mano, vía **Supabase Studio** (local:
`http://127.0.0.1:54323`, tabla `public.platform_admins`) o por SQL directo:

```sql
INSERT INTO public.platform_admins (user_id)
VALUES ('<uuid-del-usuario>');
```

El `user_id` tiene que ser el `id` de una fila real en `auth.users` (hay FK con
`ON DELETE CASCADE` — si se borra el usuario, deja de ser admin automáticamente, sin acción
manual).

**Para quitarle el acceso a alguien:**

```sql
DELETE FROM public.platform_admins WHERE user_id = '<uuid-del-usuario>';
```

### Requisito obligatorio: MFA

Ser super-admin **exige** tener la autenticación de dos factores (TOTP) inscripta. No es
opcional como en el resto de la app. Si un admin recién dado de alta todavía no inscribió su
factor, la primera vez que intente entrar a `/dashboard/admin` lo va a mandar directo a
`Mi cuenta → Seguridad` a inscribirlo — no puede entrar al back-office hasta hacerlo.

---

## 3. Cómo usarlo (como admin)

1. Iniciá sesión normal con tu cuenta (la que está en la whitelist).
2. Si todavía no tenés MFA inscripto, andá a **Mi cuenta → Seguridad → App de autenticador →
   Habilitar**, escaneá el QR con Google Authenticator/Authy, y confirmá el código de 6
   dígitos.
3. Cerrá sesión y volvé a entrar (o esperá a que se refresque el token) para que tu sesión
   pase a nivel `aal2` — es el mismo paso extra de seguridad que ya existe hoy para cualquier
   usuario con MFA, no es nuevo.
4. Andá a `https://tu-dominio/dashboard/admin` (o `/es/dashboard/admin`, `/en/dashboard/admin`,
   etc. según tu idioma). Te redirige automáticamente a `/dashboard/admin/accounts`.

### Pestaña "Cuentas"

Lista de **todas** las cuentas de la plataforma (personales y de equipo), más reciente
primero. Cada fila muestra: nombre, email del owner, plan, estado de suscripción, cantidad de
miembros. Clic en cualquier fila para ver el detalle.

La UI actual incluye búsqueda con debounce en servidor y filtros de plan/estado sobre la
página cargada. Los filtros de plan/estado no consultan todavía todo el universo de cuentas;
si la operación crece a miles de cuentas habrá que moverlos al RPC paginado.

### Pestaña "Auditoría"

El mismo tipo de tabla que ya existe en `/dashboard/activity` (el audit log de tu propia
cuenta), pero acá se ven **todas las cuentas juntas**, con dos columnas extra: "Cuenta" (a
qué cuenta pertenece esa fila) y "Suplantado por" — el admin real detrás de una acción hecha
durante una sesión de impersonation (C2, ver [`impersonation.md`](impersonation.md)); dice "—"
en cualquier fila que no ocurrió durante una impersonation.

> ⚠️ **Limitación conocida:** los filtros (por acción, por recurso) y el botón "Cargar más" de
> esta tabla todavía apuntan internamente al endpoint del audit log _de cuenta_ (2G), no al
> cross-account nuevo. La carga inicial de la página sí trae los datos correctos con
> `get_platform_audit_logs`, pero interactuar con los filtros de esa tabla en la vista de
> auditoría de plataforma no re-consulta el endpoint correcto todavía. Es un TODO documentado
> a propósito (ver `src/app/[locale]/dashboard/admin/audit/page.tsx`), no un bug oculto.

### Si NO sos admin

Si entrás a `/dashboard/admin` sin estar en la whitelist, ves una página de **404** — no hay
ningún indicio de que la ruta existe, ni redirect a login revelando nada. Es indistinguible de
entrar a cualquier URL inventada.

---

## 4. Cómo funciona por dentro (arquitectura)

```
┌─────────────────────────────────────────────────────────────────────┐
│ 1. Login → GoTrue emite el JWT                                      │
│    custom_access_token_hook agrega el claim:                        │
│      app_metadata.is_platform_admin = true/false                    │
│      (lee de la tabla platform_admins en el momento del login)      │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│ 2. Edge (src/lib/supabase/middleware.ts)                            │
│    Ruta empieza con /dashboard/admin Y claim dice admin=true:       │
│      - sin MFA inscripto → redirect a Mi cuenta/Seguridad           │
│      - con MFA pero sesión aal1 → redirect genérico existente       │
│        (login?mfa=required, ya cubre esto para toda la app)         │
│    Si el claim dice admin=false: NO se intercepta acá (ver nota)    │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│ 3. AdminLayout (src/app/[locale]/dashboard/admin/layout.tsx)        │
│    Vuelve a chequear is_platform_admin server-side (no confía       │
│    ciegamente en el claim del edge) → notFound() si no es admin     │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│ 4. Cada RPC (admin_list_accounts, get_platform_audit_logs)          │
│    PERFORM private.assert_platform_admin() al inicio:               │
│      a) ¿está en la whitelist platform_admins?                      │
│      b) ¿la sesión tiene aal2 REAL (auth.jwt()->>'aal'),            │
│         no solo el claim mfa_enrolled?                              │
│    Si cualquiera de los dos falla → excepción, la UI no ve datos    │
└─────────────────────────────────────────────────────────────────────┘
```

### Por qué hay 4 capas de chequeo (y no es redundancia inútil)

Es **defensa en profundidad** — cada capa protege contra que una capa anterior falle o se
salte:

- El **claim del JWT** (capa 2) es rápido pero se puede quedar viejo hasta 1 hora (los JWT no
  se revalidan en cada request) — por eso nunca es la única fuente de verdad para decisiones
  sensibles.
- El **`notFound()` del layout** (capa 3) protege contra el caso de que alguien llegue a una
  ruta hija sin pasar por el gate del edge (navegación client-side, caché, bug futuro).
- El **`assert_platform_admin()` de cada RPC** (capa 4) es la que realmente importa desde el
  punto de vista de seguridad: aunque alguien lograra esquivar las 3 capas anteriores, la base
  de datos igual rechaza la query. Esta es la única capa que no se puede saltear.

### Por qué NO hay un 404 "real" (status HTTP) desde el edge

Durante el QA manual de esta tarea se comprobó que `NextResponse.rewrite()` en Next.js
**siempre devuelve status 200**, sin importar qué contenido tenga la página de destino — esto
no es un bug de esta implementación, es así en **todo el repo**: cualquier página que llama a
`notFound()` (por ejemplo `dashboard/projects/[id]`) también devuelve 200 en este entorno de
desarrollo. Por eso, para los no-admins, el edge **no intercepta la request** — simplemente la
deja pasar, y es el `notFound()` del `AdminLayout` el que produce la página de error 404 (con
la misma limitación de status que ya tiene el resto de la app). El comportamiento visual
("parece una ruta que no existe") es correcto; el código de status HTTP exacto es una
limitación pre-existente de Next.js en este proyecto, no algo introducido acá.

---

## 5. Referencia técnica

### Tabla

```sql
public.platform_admins (
  user_id    uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
)
```

RLS: **deny-all total** (`USING (false) WITH CHECK (false)` para `authenticated` y `anon`, más
`REVOKE ALL`). Ni siquiera un admin puede leer esta tabla vía la API REST/PostgREST — el único
acceso es a través de las funciones `private.*` de abajo, y esas corren `SECURITY DEFINER`
(con los privilegios del dueño de la función, no del que llama).

### Funciones `private.*`

| Función                                                        | Qué hace                                                                                                                                                                                                     |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `private.is_platform_admin(p_user_id uuid DEFAULT auth.uid())` | `boolean`. Consulta directa a la whitelist.                                                                                                                                                                  |
| `private.assert_platform_admin()`                              | `void`, o lanza excepción `not_platform_admin` (no está en la whitelist) o `mfa_required` (está en la whitelist pero la sesión actual no tiene `aal2` real). Se llama al inicio de todo RPC del back-office. |

### RPCs públicos

**`public.admin_list_accounts(p_search text DEFAULT NULL, p_limit integer DEFAULT 20, p_cursor_created_at timestamptz DEFAULT NULL, p_cursor_id uuid DEFAULT NULL)`**

Devuelve `TABLE (account_id, name, slug, type, owner_email, plan_slug, subscription_status,
member_count, created_at)`. `p_search` filtra por `ILIKE` sobre nombre o slug. Paginación por
keyset (`created_at`, `id`) — pedís la próxima página pasando el cursor de la última fila que
recibiste. `p_limit` acepta de 1 a 100; fuera de ese rango tira `invalid_limit`.

**`public.get_platform_audit_logs(p_limit integer DEFAULT 20, p_cursor_created_at timestamptz DEFAULT NULL, p_cursor_id bigint DEFAULT NULL, p_account_id uuid DEFAULT NULL, p_actor_id uuid DEFAULT NULL, p_action audit.action_type DEFAULT NULL, p_resource_type text DEFAULT NULL)`**

Devuelve `TABLE (id, actor_id, actor_name, impersonator_id, account_id, action, resource_type,
resource_id, created_at)`. Mismo patrón de paginación. `impersonator_id` se puebla desde C2
(ver [`impersonation.md`](impersonation.md)) en cualquier acción hecha durante una sesión de
impersonation activa; `NULL` en el resto.

### Claim JWT

`app_metadata.is_platform_admin: boolean`, agregado en
`public.custom_access_token_hook` (el mismo hook que ya pone `account_id`, `role` y
`mfa_enrolled`). Se recalcula en cada login/refresh de token — si sacás a alguien de la
whitelist, deja de tener el claim en cuanto se le refresque el token (hasta 1 hora, o al
volver a loguear).

### Archivos del feature

```
supabase/migrations/20260721155343_f3_c1_platform_admins.sql   ← migración (fuente de verdad)
supabase/schemas/{public,private,audit}.sql                    ← espejo declarativo
supabase/tests/database/19_platform_admin.test.sql              ← 15 tests pgTAP

src/lib/supabase/middleware.ts                                 ← gate de edge
src/lib/validation/admin.ts                                    ← schemas Zod

src/app/[locale]/dashboard/admin/
├── layout.tsx                    ← re-chequeo server-side + nav
├── page.tsx                      ← redirect a /accounts
├── accounts/
│   ├── actions.ts                ← getAdminAccounts()
│   └── page.tsx
│   └── [accountId]/page.tsx      ← detalle de cuenta
└── audit/
    ├── actions.ts                ← getPlatformAuditLogs()
    └── page.tsx

src/components/dashboard/activity/audit-log-table.tsx           ← tabla compartida
                                                                    (prop variant: 'account' | 'platform')
```

### i18n

Namespace `Admin` en `messages/{en,es,pt,fr}.json`. Si agregás texto nuevo a esta UI, tiene
que existir la misma key en los 4 archivos — hay un test (`src/test/i18n-parity.test.ts`) que
falla si falta alguna.

---

## 6. Cómo probarlo en local

```bash
pnpm supa:start   # si no está corriendo ya
pnpm dev
```

1. Registrate normal en `/signup` con cualquier email (Supabase local intercepta los correos
   en Mailpit — `http://127.0.0.1:54324` — no hace falta un SMTP real).
2. Confirmá la cuenta desde el correo en Mailpit.
3. Copiá tu `user_id` (Studio → `auth.users`, o `SELECT id FROM auth.users WHERE email = '...'`).
4. Insertalo en `platform_admins` (ver §2).
5. Inscribí MFA desde `Mi cuenta → Seguridad` (necesitás una app TOTP real, tipo Google
   Authenticator, para escanear el QR).
6. Cerrá sesión y volvé a entrar.
7. Andá a `/dashboard/admin`.

### Tests automáticos

```bash
pnpm supa:test                                    # 15 tests pgTAP de este feature (archivo 19)
pnpm test "dashboard/admin"                        # tests de los server actions
pnpm test "activity/__tests__/audit-log-table"     # tests de la tabla compartida (variant)
```

---

## 7. Qué sigue (roadmap)

Esta tarea (C1) es la base sobre la que se construyeron:

- **C2 — Impersonation. ✅ Hecho** — ver [`impersonation.md`](impersonation.md).
- **C6 — Gate de `broadcast_alert_email`. ✅ Hecho** (PR #62).
- **C3 — GDPR. ✅ Hecho** — RPCs de exportar/borrar los propios datos, implementados mediante
  PR #75.

---

## 8. Evidencia histórica: fix de CI incluido en el PR

Mientras el PR #60 estaba en revisión, el check "Security Audit" empezó a fallar por 3
vulnerabilidades altas de `brace-expansion` (`GHSA-3jxr-9vmj-r5cp`, DoS por expansión
exponencial de patrones `{}`), transitivas vía `exceljs` y `@sentry/nextjs` — **no
relacionadas con este feature** (no se tocó ningún `package.json` en el trabajo de C1). Se
aprovechó el mismo PR para arreglarlo con overrides puntuales en `pnpm-workspace.yaml`
(versión exacta vulnerable → versión exacta parcheada, no un override global, para no forzar
una versión mayor incompatible en dependencias que esperaban una API distinta):

```yaml
overrides:
  'brace-expansion@1.1.15': '1.1.16'
  'brace-expansion@2.1.1': '2.1.2'
  'brace-expansion@5.0.6': '5.0.7'
```

`pnpm audit --prod --audit-level=high` queda limpio. Importante: en pnpm 10+, el campo
`"pnpm.overrides"` de `package.json` **ya no se lee** — el override vive en
`pnpm-workspace.yaml`, campo `overrides:` de nivel raíz.
