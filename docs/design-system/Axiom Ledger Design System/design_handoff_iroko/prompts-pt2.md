# Prompts para Claude Code — parte 2

Continuación de `prompts.md`. Sigue el mismo orden recomendado del README: **1 → 5 → 3 → 2 → 4 → 6 → 7 → 8**.

---

## PROMPT 3 · Fase 3 (auth screens)

```
Ejecuta la FASE 3 del handoff (auth screens).

Re-skin SIN tocar server actions ni `useActionState`:
- `src/app/[locale]/(auth)/login/page.tsx` — usa `.design/design_handoff_iroko/iroko/ui_kits/iroko-dashboard/Login.jsx` como spec visual. Split-screen 50/50, form izquierda + brand panel HUD ink derecha.
- `src/app/[locale]/(auth)/signup/page.tsx` — mismo layout, campos different.
- `forgot-password/page.tsx` + `reset-password/page.tsx` — single-column variant.
- `signup/confirmation/confirmation-client.tsx` — mensaje "Revisa tu inbox" + resend button con los nuevos tokens.
- `src/app/[locale]/(auth)/layout.tsx` — wrapper split-screen reusable.

CRÍTICO: mantén `signInAction`, `signUpAction`, `magicLinkAction`, `verifyMfaAction`, `verifyRecoveryAction`, `oauthAction` exactamente como están. Solo cambias el JSX visual.

Commit: `iroko: phase 3 — auth screens`.
```

---

## PROMPT 4 · Fase 2 (marketing site)

```
Ejecuta la FASE 2 del handoff (public marketing).

Re-skin estas pages usando los componentes de `.design/design_handoff_iroko/iroko/ui_kits/iroko-marketing/` como spec visual:
- `src/app/[locale]/(public)/page.tsx` — Hero + FeatureGrid + Quote + PricingTiers + CtaBlock.
- `pricing/page.tsx` — PricingTiers + CtaBlock.
- `product/page.tsx` — Hero + FeatureGrid.
- `solutions/page.tsx` — FeatureGrid + Quote.
- `contact/page.tsx` — re-skin form, NO toques action.
- `src/components/layout/public-navbar.tsx` — usa Navbar.jsx como spec, mantén `<Link>` de `@/i18n/routing` y `useTranslations`.
- `src/components/layout/public-footer.tsx` — usa Footer.jsx como spec.

Copy: TODO el texto retail-analytics (SKU, inventario, retail, mermas) lo reemplazas por copy template SaaS. Frases canónicas en el README del bundle.

Commit: `iroko: phase 2 — marketing`.
```

---

## PROMPT 5 · Fase 4a (dashboard shell)

```
Ejecuta la FASE 4 — PARTE A — dashboard shell.

Solo sidebar + topbar + layout. Pantallas internas vienen después.

- `src/components/layout/app-sidebar.tsx` — usa Sidebar.jsx como spec. Reemplaza el monograma "RA" + "Retail Analytics" por mark Iroko + wordmark IROKO CAPS. AGREGA org switcher arriba del nav (consulta a Supabase: `select org_id, organizations.name, organizations.slug from memberships join organizations on... where user_id = auth.uid()`).
- `src/components/layout/app-topbar-client.tsx` — usa Topbar.jsx como spec. Agrega breadcrumb `{orgName} / {pageTitle}` a la izquierda del search. Mantén DropdownMenu del avatar.
- `src/app/[locale]/dashboard/layout.tsx` — shell 248px sidebar + 60px topbar + content padding 28/40/56.

Commit: `iroko: phase 4a — dashboard shell`.

PREGUNTA antes de hacer: el org switcher necesita un nuevo hook `useCurrentOrg()` o un context. ¿Lo armo o ya tienes algo?
```

---

## PROMPT 6 · Fase 4b (dashboard screens)

```
Ejecuta la FASE 4 — PARTE B — pantallas internas.

Renombra rutas si hace falta y re-skin cada pantalla con su componente de referencia en `.design/design_handoff_iroko/iroko/ui_kits/iroko-dashboard/`:

- `dashboard/page.tsx` — OverviewScreen.jsx (KPIs + chart + activity + projects table).
- `dashboard/inventory/` → renombrar a `dashboard/projects/`, usar ProjectsScreen.jsx.
- `dashboard/team/` → mover a `dashboard/members/`, usar MembersScreen.jsx.
- `dashboard/operations/page.tsx` — re-skin existente, mismo data.
- `dashboard/reports/page.tsx` — re-skin existente, mismo data.
- `dashboard/org/settings/page.tsx` — SettingsScreen.jsx con tabs General/Seguridad/Integraciones/Zona peligrosa.
- `dashboard/account/page.tsx` — re-skin con nuevos tokens, mantén `accountActions`.

NO inventes data fake. Si una pantalla espera datos que no existen aún (proyectos), usa un estado vacío con CTA "Crear primer proyecto" + un comentario `// TODO: wire to projects table (phase 7)`.

Commit: `iroko: phase 4b — dashboard screens`.
```

---

## PROMPT 7 · Fase 6 (copy + i18n)

```
Ejecuta la FASE 6 del handoff (copy + i18n).

Edita `messages/es.json` y `messages/en.json`:
- Reemplaza TODO `Axiom Ledger` por `Iroko`.
- Reemplaza copy retail-analytics (SKU, inventario, proveedores, mermas, retail, multitienda) por copy template SaaS (proyectos, miembros, organizaciones, billing, plan).
- Hero homepage: "Un tronco común para tus micro-SaaS." (es) / "The shared trunk for your micro-SaaS." (en).
- Las frases canónicas están en `.design/design_handoff_iroko/iroko/README.md` sección "Voice & content rules".

Si ves un key que ya no tiene sentido (ej. `inventory.low_stock`), pregúntame antes de borrarlo.

Commit: `iroko: phase 6 — copy + i18n`.
```

---

## PROMPT 8 · Fase 7 (projects table — opcional)

```
Ejecuta la FASE 7 del handoff (projects table).

OPCIONAL: si quiero datos reales en `/dashboard/projects` en vez del empty state.

1. Agrega migración Supabase con la tabla `projects` exacta como dice el README sección "Phase 7 · Database".
2. Crea `src/lib/projects.ts` con funciones `listProjects(orgId)`, `createProject(orgId, data)`, `deleteProject(id)`.
3. Conecta `ProjectsScreen` (que ya re-skineamos en fase 4b) al data real.
4. Si no tengo migrations setup, usa SQL directo en un archivo `supabase/migrations/00X_projects.sql`.

Commit: `iroko: phase 7 — projects table`.

Si no quiero esta fase ahora, sáltala y avísame.
```

---

## Cierre

```
¿Todo OK? Hazme un resumen final: archivos tocados por fase, lineas cambiadas total, y cualquier TODO pendiente que dejaste comentado en el código.
```
