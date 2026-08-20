# Gate de `broadcast_alert_email` + UI de alertas (`/dashboard/admin/alerts`)

> **Tarea F3-C6** · PR [#62](https://github.com/pipec80/iroko/pull/62) · Rama histórica `feat/f3-c6-gate-broadcast-alert-email`
> Estado actual: implementación y rutas verificadas estáticamente el 2026-08-20. El PR está
> mergeado; el envío real de correo y su operación Cloud están **[NO VERIFICADO]** en esta
> revisión.

## 1. Qué es esto

Cierra una deuda de seguridad conocida desde F2-2F: `public.broadcast_alert_email` (encola un
email de alerta en `pgmq.email_queue` para el owner de **cada cuenta de la plataforma**) podía
invocarla cualquier usuario autenticado, no solo el equipo de la plataforma. Esta tarea:

1. Gatea la función con `private.assert_platform_admin()` (la misma whitelist + exigencia de
   `aal2` real que construyó C1) — un cambio de una línea al inicio del body.
2. Agrega un formulario en `/dashboard/admin/alerts` para que un platform admin dispare el
   envío sin tener que ir a Studio/SQL directo.

**Lo que NO incluye:** cualquier UI de segmentación de destinatarios — el alcance siempre es
"el owner de cada cuenta de la plataforma", no hay filtro. Si se necesita segmentar, es una
tarea nueva.

## 2. Cómo usarlo

1. Requisitos: estar en la whitelist `platform_admins` + sesión `aal2` (ver
   [`platform-admin.md`](platform-admin.md) §2-3).
2. Andá a `/dashboard/admin/alerts`.
3. Completá asunto + mensaje, enviá. La UI muestra cuántas cuentas recibieron el email en cola
   (no confirma entrega — solo que quedó encolado en `pgmq.email_queue`, el worker
   `process-email-queue` (F2-2F) lo procesa después).

## 3. Cómo funciona por dentro

```
┌─────────────────────────────────────────────────────────────────────┐
│ AlertForm → sendPlatformAlert() → supabase.rpc('broadcast_alert_    │
│ email', {p_subject, p_body})                                        │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│ public.broadcast_alert_email (SECURITY DEFINER)                     │
│   PERFORM private.assert_platform_admin();  ← el gate de esta tarea │
│   valida subject/body no vacíos                                     │
│   FOR owner IN accounts_memberships WHERE role='owner':             │
│     pgmq.send('email_queue', {...})                                 │
│   RETURN count                                                       │
└─────────────────────────────────────────────────────────────────────┘
```

El `GRANT`/`REVOKE` de la función **no cambió** — sigue siendo invocable por cualquier
`authenticated`; el rechazo es interno al body (`not_platform_admin` / `mfa_required`), mismo
patrón que toda otra RPC de este repo con chequeo de rol interno.

## 4. Referencia técnica

**`public.broadcast_alert_email(p_subject text, p_body text) RETURNS integer`** — encola un
mensaje en `pgmq.email_queue` por cada fila de `accounts_memberships` con `role='owner'`.
Errores: `not_platform_admin`, `mfa_required` (de `assert_platform_admin()`),
`subject_required`, `body_required`.

### Archivos del feature

```
supabase/migrations/20260721200634_f3_c6_gate_broadcast_alert_email.sql
supabase/schemas/public.sql                          ← mirror de la función

src/lib/validation/admin.ts                          ← platformAlertSchema
src/app/[locale]/dashboard/admin/
├── layout.tsx                                        ← link "Alertas"
└── alerts/
    ├── actions.ts                                     ← sendPlatformAlert()
    ├── alert-form.tsx
    ├── page.tsx
    └── __tests__/actions.test.ts
```

### i18n

Namespace `Admin` (`nav_alerts`, `alerts_*`, `error_subject_required`, `error_body_required`,
`error_not_platform_admin`, `error_mfa_required`) en `messages/{en,es,pt,fr}.json`.

### Tests

`supabase/tests/database/14_email_queue.test.sql` cubre el gate (no-admin rechazado, admin sin
`aal2` rechazado) además de los casos preexistentes del worker de F2-2F.

```bash
pnpm supa:test                                  # incluye 14_email_queue.test.sql
pnpm test "dashboard/admin/alerts/__tests__"
```

## 5. Qué sigue

Esta tarea (junto con C1) es la base sobre la que se construyó **C7 — Announcements**
(`/dashboard/admin/announcements`, ver [`announcements.md`](announcements.md)), pensada para
convivir en la misma sección de "comunicación a cuentas" del back-office.
