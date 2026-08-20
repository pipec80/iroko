# Anuncios globales de plataforma (`announcements`)

> **Tarea F3-C7** · PR [#73](https://github.com/pipec80/iroko/pull/73) · Rama histórica `feat/f3-c7-announcements`
> Estado actual: código, migración y cobertura automatizada verificados estáticamente el
> 2026-08-20. La publicación con MFA y la recepción Realtime entre sesiones están
> **[NO VERIFICADO]** en esta revisión.

## 1. Qué es esto

Un canal de comunicación de la plataforma hacia **todos** los usuarios logueados: un
`platform_admin` publica un anuncio (mantenimiento programado, nueva feature, aviso legal) desde
`/dashboard/admin/announcements`, y aparece en tiempo real en la campana de notificaciones
(`NotificationBell`) de cualquier usuario con sesión abierta, además de quedar en el historial
para quien la abra después.

A diferencia de `public.notifications` (F2-2C), que es estrictamente **1 fila por
destinatario**, un `announcement` no pertenece a un `account_id` ni a un `user_id` — es un
broadcast global, con su propio canal Realtime (`platform:announcements`) y su propia tabla. No
se reutiliza `notifications` para esto: mezclar los dos casos de uso hubiera forzado un
`account_id`/`user_id` nullable y lógica condicional en un hook que hoy es simple (viola SRP/OCP).
En cambio, sí se **reusa el patrón** (tabla + trigger + canal + hook) y la UI de recepción — la
campana ya existente se extiende para mostrar ambas fuentes mezcladas, con un badge "Anuncio"
que las distingue visualmente.

**Lo que NO incluye esta tarea** (decisiones conscientes, ver design doc F3 tarea 6):

- **UPDATE/DELETE de anuncios** — YAGNI. Un anuncio mal publicado se corrige publicando uno
  nuevo, no hay UI de edición/borrado de historial.
- **Tracking de "leído" per-usuario en la base de datos** — el cursor de no-visto vive en
  `localStorage` del cliente (clave `iroko:announcements:last_seen_at`), no en una tabla
  `announcement_reads`. Si el negocio pide analytics de alcance (cuántos vieron un anuncio), es
  una tabla nueva a evaluar más adelante, no ahora.
- **Envío de email** — el anuncio es puramente in-app. Para alcance por email ya existe
  `broadcast_alert_email` (C6, `/dashboard/admin/alerts`) como acción separada — mezclar los dos
  canales en un mismo botón complica el copy ("¿a quién le llega esto?") y viola SRP.

---

## 2. Cómo usarlo (como platform admin)

1. Requisitos: estar en la whitelist `platform_admins` y tener MFA inscripto + sesión `aal2`
   (mismo requisito que el resto del back-office — ver [`platform-admin.md`](platform-admin.md)
   §2-3).
2. Andá a `/dashboard/admin/announcements` (nuevo link en la nav del back-office, junto a
   "Alertas").
3. Completá el formulario: tipo (info/éxito/advertencia/error — controla el color/ícono),
   título (obligatorio), mensaje (opcional) y enlace (opcional, para "ver más").
4. Al publicar, el anuncio queda visible **de inmediato** en la campana de cualquier sesión
   abierta (Realtime) y en el historial de cualquiera que abra la campana después (aunque no
   haya estado conectado en el momento de la publicación).

### Cómo lo ve un usuario cualquiera

En el dropdown de la campana (topbar), los anuncios aparecen mezclados con las notificaciones
personales, ordenados por fecha, con un badge de texto "Anuncio" (ícono de megáfono) que los
distingue. No tienen acción de "marcar leído individual" — desaparecen del contador de
no-vistos al abrir el dropdown, igual que las notificaciones normales.

---

## 3. Cómo funciona por dentro (arquitectura)

```
┌─────────────────────────────────────────────────────────────────────┐
│ 1. Admin completa el form en /dashboard/admin/announcements          │
│    → server action publishAnnouncement() (Zod)                       │
│    → supabase.rpc('publish_announcement', {...})                     │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│ 2. RPC public.publish_announcement (SECURITY DEFINER)                │
│    PERFORM private.assert_platform_admin() — whitelist + aal2 real   │
│    (mismo guard que broadcast_alert_email, C6)                       │
│    → INSERT INTO public.announcements                                │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│ 3. Trigger private.announcements_broadcast() (AFTER INSERT)          │
│    → realtime.send(payload, 'announcement_created',                  │
│                     'platform:announcements', true)                  │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│ 4. Cliente: useAnnouncements() suscrito a platform:announcements     │
│    (canal global, sin ownership por id — cualquier authenticated     │
│    puede leerlo, policy USING (topic = 'platform:announcements'))    │
│    → useInboxItems() mergea con useNotifications() por created_at    │
│    → NotificationBell renderiza el feed combinado                    │
└─────────────────────────────────────────────────────────────────────┘
```

### Por qué el INSERT directo está bloqueado (RPC-only)

La tabla tiene `GRANT SELECT, INSERT` a `authenticated`, pero una política **RESTRICTIVE**
(`announcements_deny_direct_insert`, `WITH CHECK (false)`) bloquea cualquier INSERT que no venga
de la función `publish_announcement`, que corre `SECURITY DEFINER` (como dueño de la tabla, no
está sujeta a esa RLS). El `GRANT INSERT` existe a propósito — sin él, Postgres rechaza el intento
a nivel de privilegios ("permission denied") antes de siquiera evaluar la política RLS; con el
grant, el rechazo es el error específico de RLS ("row-level security policy"), más informativo y
consistente con el mismo patrón ya usado en `notifications.sql`.

### Por qué el gate es un RPC con `assert_platform_admin()`, no una policy RLS directa

El diseño previo a la implementación proponía
un INSERT directo vía RLS con `WITH CHECK (is_platform_admin(...))`. Se decidió **no** seguir esa
ruta: `is_platform_admin()` sola no exige `aal2` real, mientras que `assert_platform_admin()` sí
(la misma función que ya usan C1 y C6). Publicar un anuncio es una acción de escritura del
back-office igual que enviar un `broadcast_alert_email` — tiene sentido que ambas exijan el mismo
nivel de autenticación, en vez de que una requiera MFA y la otra no.

---

## 4. Referencia técnica

### Tabla

```sql
public.announcements (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  type       text        NOT NULL DEFAULT 'info' CHECK (type IN ('info','success','warning','error')),
  title      text        NOT NULL,
  body       text,
  link       text,
  created_by uuid        NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
)
```

RLS: `SELECT` abierto a cualquier `authenticated` (`USING (true)`); `INSERT` bloqueado por
policy restrictiva (ver arriba). Sin `UPDATE`/`DELETE` — no hay política, así que quedan
denegados por default. `REVOKE`d de `anon` (tabla oculta en REST/GraphQL para no autenticados).
Índices: `created_at DESC` (historial) y `created_by` (soporte del FK).

### RPC público

**`public.publish_announcement(p_type text, p_title text, p_body text DEFAULT NULL, p_link text DEFAULT NULL) RETURNS public.announcements`**

`SECURITY DEFINER`. Gateado con `private.assert_platform_admin()` — lanza `not_platform_admin` o
`mfa_required` igual que el resto del back-office. Valida `title_required` (vacío/blank) e
`invalid_type` (fuera de info/success/warning/error). Devuelve la fila insertada completa.

### Canal Realtime

Topic global `platform:announcements` (patrón `scope:entity`, scope `platform` — no hay id
porque no hay múltiples instancias del canal). Evento `announcement_created`. Policy sobre
`realtime.messages`: `FOR SELECT TO authenticated USING (topic = 'platform:announcements')` —
sin `SPLIT_PART` de ownership, a diferencia de `notifications`/`presence`, porque no hay nada
que validar por id.

### Archivos del feature

```
supabase/migrations/20260724100000_f3_c7_announcements.sql   ← migración (fuente de verdad)
supabase/schemas/announcements.sql                            ← espejo declarativo
supabase/tests/database/22_announcements.test.sql             ← 14 tests pgTAP

src/lib/validation/admin.ts                                   ← announcementSchema

src/app/[locale]/dashboard/admin/
├── layout.tsx                                ← nav (link "Anuncios")
└── announcements/
    ├── actions.ts                            ← publishAnnouncement()
    ├── announcement-form.tsx
    ├── page.tsx
    └── __tests__/actions.test.ts

src/hooks/
├── use-announcements.ts                      ← carga + suscripción al canal global
├── use-inbox-items.ts                        ← mergea notifications + announcements
└── __tests__/use-announcements.test.ts

src/components/notifications/notification-bell.tsx   ← extendido para el feed combinado
```

### i18n

Namespace `Admin` (`nav_announcements`, `announcements_*`) y `Notifications`
(`announcement_badge`) en `messages/{en,es,pt,fr}.json`. Nota: `pt`/`fr` del namespace `Admin`
ya estaban en inglés como placeholder desde antes de esta tarea (deuda pre-existente, no
introducida acá) — las claves nuevas siguen la misma convención por consistencia interna del
archivo, no por decisión de esta tarea.

---

## 5. Cómo probarlo en local

```bash
pnpm supa:start   # si no está corriendo ya
pnpm dev
```

1. Entrá como un usuario ya dado de alta en `platform_admins` con MFA inscripto (ver
   [`platform-admin.md`](platform-admin.md) §2 si hace falta crear uno).
2. Andá a `/dashboard/admin/announcements` y publicá un anuncio.
3. Abrí una segunda sesión (otra ventana/perfil) con un usuario cualquiera, logueado — la
   campana debería mostrar el badge de no-visto sin necesidad de recargar (Realtime).
4. Recargá esa segunda sesión: el anuncio sigue apareciendo en el historial (carga inicial vía
   `SELECT`, no solo el evento en vivo).

### Tests automáticos

```bash
pnpm supa:test                                          # incluye 22_announcements.test.sql (14 tests)
pnpm test "admin/announcements/__tests__/actions"        # server action
pnpm test src/hooks/__tests__/use-announcements          # hook
```

---

## 6. Estado posterior

GDPR se implementó después mediante PR #75; no es trabajo pendiente de este
módulo. La deuda propia que permanece es obtener evidencia actual de publicación
con MFA y entrega Realtime en una segunda sesión.
