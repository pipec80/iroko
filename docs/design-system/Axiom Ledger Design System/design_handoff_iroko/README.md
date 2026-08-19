# Handoff · Iroko Design System

> _"Antes de cortar el iroko, se le pide permiso al espíritu del árbol — porque sin tronco, no hay ramas."_

This bundle is the **complete Iroko design system** plus a migration plan for applying it to the existing Next.js + Tailwind + shadcn + Supabase codebase that originated as a Google Stitch boilerplate (the same code shipped under the placeholder brand "Axiom Ledger / Retail Analytics").

---

## Overview

**Iroko** is a Spanish-first, multi-tenant SaaS template built by **pipec** (pipec.cl) as a reusable trunk on top of which to rebrand and ship micro-SaaS products. The visual identity uses the **Optimus Prime "Autobot" palette** (poppy red + cobalt blue on white, with deep ink for accents) and **Geist** sans throughout — no serif, no italic, precise geometric mark.

The product surfaces are:

1. **Public marketing site** — landing, pricing, docs (Spanish-first, English microcopy)
2. **Authenticated dashboard** — overview, projects, members, billing, settings (multi-tenant with org switcher)
3. **Auth flows** — login, signup, magic link, MFA, recovery

---

## About the design files

The files in this bundle are **design references created in HTML** — pixel-perfect prototypes showing the intended look, behavior, and componentization, **not production code to copy directly**.

Your job in Claude Code is to **recreate these designs in the existing Next.js + Tailwind + shadcn codebase** (`src/`), preserving:
- The existing route structure (`[locale]/(public)`, `[locale]/(auth)`, `[locale]/dashboard`)
- The existing Supabase integration (auth, RLS, server components, server actions)
- The existing `next-intl` i18n setup (`es` default, `en` secondary)
- The existing shadcn primitives (Button, Card, Input, Badge, Dialog, etc. in `src/components/ui/`)

What changes is the **visual layer** — design tokens, fonts, components' visual treatment, copy, and the brand identity. The placeholder "Axiom Ledger / Retail Analytics" copy and Material 3 teal palette are replaced wholesale.

## Fidelity

**High-fidelity (hifi).** All colors, typography, spacing, radii, shadows, and component states are final. Reproduce pixel-perfectly. The only fluidity you have is:

- **Where to put the design tokens** — they live in `iroko/colors_and_type.css` as native CSS custom properties; you should map them into the existing `src/app/globals.css` `@theme inline { … }` block so Tailwind utilities pick them up.
- **Component implementation** — keep the existing shadcn API (`<Button variant="primary">`), just re-skin via the new tokens.

---

## Brand summary

| | |
|---|---|
| Brand name | **Iroko** |
| Tagline (es) | _Un tronco común para tus micro-SaaS._ |
| Tagline (en) | _The shared trunk for your micro-SaaS._ |
| Wordmark | `IROKO` — uppercase, Geist 800, with the two `O`s tinted poppy (first) + cobalt (second) |
| Mark | Autobot-style ring — poppy outer ring + cobalt inner core on ink square |
| Default locale | `es` |
| Iconography | Lucide, stroke-width 1.5 (default) |

---

## Design tokens

The full token system is in `iroko/colors_and_type.css`. Below is the **migration mapping** from the placeholder M3 tokens in the existing `src/app/globals.css` to the new Iroko tokens.

### Color palette — "Optimus Autobot"

```
--color-poppy:        #d92121   /* PRIMARY action — Optimus red */
--color-crimson:      #b11226   /* pressed / dark variant of primary */
--color-poppy-soft:   #ff3a3a   /* hover / hot-light variant, used on dark bg */
--color-cobalt:       #0047ab   /* SECONDARY accent — Optimus blue */
--color-cobalt-deep:  #003782   /* pressed accent */
--color-cobalt-soft:  #4682bf   /* jay blue — light accent variant */

--color-silver:       #a8a9ad   /* metallic silver — muted UI */
--color-gray-300:     #d3d3d3   /* Optimus light gray */
--color-ink:          #0e1117   /* near-black, slight blue undertone */
--color-paper:        #ffffff   /* primary surface */

/* Neutral ramp */
--color-gray-50:      #fafafa   /* surface-2 */
--color-gray-100:     #f4f4f5   /* surface-3 */
--color-gray-200:     #e8e9ec   /* border */
--color-gray-500:     #71717a   /* text-tertiary */
--color-gray-700:     #3a4252   /* text-secondary */
--color-gray-900:     #161a21   /* surface-2 on dark */

/* Washes (used for badges, notifications, tints) */
--color-poppy-wash:    rgba(217,33,33,0.10)
--color-cobalt-wash:   rgba(0,71,171,0.10)

/* Semantic */
--color-success:      #1e8a4f
--color-warning:      #c47a00
--color-error:        var(--color-poppy)
--color-info:         var(--color-cobalt)
```

### Role tokens

```
--background:           var(--color-paper)
--foreground:           var(--color-ink)
--surface-1:            var(--color-paper)
--surface-2:            var(--color-gray-50)
--surface-3:            var(--color-gray-100)
--surface-elevated:     var(--color-paper)

--text-primary:         var(--color-ink)
--text-secondary:       var(--color-gray-700)
--text-tertiary:        var(--color-gray-500)

--border:               #e8e9ec
--border-strong:        #d3d3d3
--ring:                 var(--color-poppy)

--primary:              var(--color-poppy)
--primary-foreground:   var(--color-paper)
--primary-hover:        var(--color-crimson)
--accent:               var(--color-cobalt)
--accent-foreground:    var(--color-paper)
```

### Dark theme (`[data-theme="dark"]`)

```
--background:           var(--color-ink)
--foreground:           #e6e8eb
--surface-2:            #161a21
--surface-3:            #1c2028
--surface-elevated:     #161a21
--text-secondary:       rgba(230,232,235,0.72)
--text-tertiary:        rgba(230,232,235,0.50)
--border:               rgba(230,232,235,0.10)
--border-strong:        rgba(230,232,235,0.20)
--primary:              var(--color-poppy-soft)   /* emissive red */
```

### Typography

- **Sans (display + UI + body):** `Geist`, weights 300–900. Headlines use **700–800**, body **400**, UI medium **500–600**.
- **Mono (numerals, code, eyebrow labels):** `Geist Mono`, weights 400–700. Numbers always `font-mono` + `font-variant-numeric: tabular-nums`.

```
--font-sans:    'Geist', system-ui, sans-serif
--font-display: 'Geist', system-ui, sans-serif
--font-mono:    'Geist Mono', ui-monospace, monospace
```

### Type scale

| Token | Use | Spec |
|---|---|---|
| display-1 | Marketing hero H1 | Geist 700, clamp(48px, 5.5vw, 80px), tracking -0.04em, line-height 1.0 |
| display-2 | Section title | Geist 700, clamp(40px, 4.5vw, 56px), tracking -0.035em |
| headline-1 | Dashboard page H1 | Geist 700, 32px, tracking -0.035em |
| headline-2 | Section H2 | Geist 700, 24px, tracking -0.025em |
| title-1 | Card title | Geist 600, 18px, tracking -0.015em |
| title-2 | Small title | Geist 600, 14px |
| body-lg | Lead paragraph | Geist 400, 17px, line-height 1.6 |
| body-md | Default body | Geist 400, 15px, line-height 1.6 |
| body-sm | Caption | Geist 400, 13px, line-height 1.55 |
| label-lg | Eyebrow | Geist Mono 600, 11px, **uppercase**, tracking 0.22em |
| label-sm | Mini eyebrow | Geist Mono 700, 10px, uppercase, tracking 0.24em |
| label-xs | Micro eyebrow | Geist Mono 700, 9px, uppercase, tracking 0.26em |
| mono-display | KPI value | Geist Mono 600, 44px, tracking -0.04em |

### Wordmark rule (canonical)

```jsx
<span className="wordmark">
  IR<span style={{ color: 'var(--color-poppy)' }}>O</span>K
  <span style={{ color: 'var(--color-cobalt)' }}>O</span>
</span>
```

`.wordmark` is: `font-family: 'Geist'; font-weight: 800; text-transform: uppercase; letter-spacing: 0.005em`.

### Radii

Small + precise — Iroko is not soft.

```
--radius-xs:   2px
--radius-sm:   4px
--radius-md:   6px
--radius-lg:   8px
--radius-xl:   10px
--radius-2xl:  12px
--radius-pill: 999px
```

Use `radius-md` (6px) for buttons and inputs, `radius-lg` (8px) or `radius-2xl` (12px) for cards, `radius-pill` for status chips and avatars.

### Shadows

```
--shadow-sm:      0 1px 2px rgba(14,17,23,0.05)
--shadow-md:      0 4px 12px -4px rgba(14,17,23,0.08)
--shadow-lg:      0 10px 24px -8px rgba(14,17,23,0.10)
--shadow-xl:      0 24px 48px -12px rgba(14,17,23,0.14)
--shadow-poppy:   0 0 0 1px rgba(217,33,33,0.35), 0 8px 24px -8px rgba(217,33,33,0.32)
--shadow-cobalt:  0 0 0 1px rgba(0,71,171,0.35), 0 6px 18px -8px rgba(0,71,171,0.30)
```

Cards primarily rely on `border` + tonal surface contrast, not shadows. Shadows appear on featured pricing card (`shadow-xl`), modals, and the optional primary-glow on hero CTAs.

---

## Voice & content rules

The README in `iroko/README.md` has the full voice doc. Cliff notes:

- **Spanish first.** All marketing/dashboard copy in Spanish. English microcopy fine when technical (`PROD`, `BUILD`, `OWNER`, `STUDIO`).
- **`tú`, no `usted`.** Maker tone.
- **Geist sans for all UI, all the time.** No italic, no serif.
- **Numbers always in Geist Mono.** With `tabular-nums`.
- **Eyebrow micro-labels** (Geist Mono, 11px, weight 600, 0.22em tracking, uppercase) **above every page H1**. They're the system's signature.
- **No emoji. No exclamation marks.**
- **Wordmark always `IROKO` uppercase** with two-O treatment (poppy + cobalt). Never write "Iroko" in sentence case in product chrome.

Canonical phrases to keep:
- "El tronco que sostiene tus productos."
- "Un tronco común para tus micro-SaaS."
- "Tu próximo micro-SaaS empieza esta tarde."
- "Aprende del pasado · construye el futuro."

---

## Screens / Views

### A. Marketing site (`src/app/[locale]/(public)/…`)

The marketing surfaces in `src/app/[locale]/(public)/` currently render placeholder retail-analytics copy with a Material 3 teal palette. They must be rewritten to the Iroko brand. Reference implementation: `iroko/ui_kits/iroko-marketing/`.

#### A.1 Navbar (`src/components/layout/public-navbar.tsx`)

- Sticky top, transparent until scroll > 8px, then frosted `rgba(255,255,255,0.86)` with `backdrop-blur(20px)` + 1px bottom border.
- Left: mark SVG (24×24, ring + core) + wordmark `IROKO` (Geist 800 CAPS, 22px, the two `O`s tinted poppy + cobalt).
- Center: 4 links — **Producto**, **Precios**, **Documentación**, **Changelog** (Geist 500, 14px, color `text-secondary`; active is `text-primary` with no decoration).
- Right: ghost "Iniciar sesión" (text only) + primary "Empezar gratis →" (background `ink`, color `paper`, radius `md`, padding `10px 18px`).
- Reference: `iroko/ui_kits/iroko-marketing/Navbar.jsx`

#### A.2 Hero

- Full-width section, top padding 80px, bottom padding 120px.
- Two ambient glow blobs (radial gradients in poppy + cobalt, very low alpha, `blur(80px)`) behind content.
- Centered column with max-width 720px.
- Eyebrow: `STEP · 01 · ORIGEN` (Geist Mono 700, 10px, tracking 0.24em).
- H1: `Un tronco común<br>para tus micro-saas.` — Geist 700, clamp(48px, 5.5vw, 80px), the words "micro-saas" colored `poppy`.
- Lead: 18px Geist 400, color `text-secondary`, max-width 640px, line-height 1.6.
- Two CTAs side-by-side: primary "Empezar gratis →" (poppy) + outline "Ver documentación".
- "Proof strip" below CTAs: row of 5 monospace beats with a small poppy dot prefix — `Auth + MFA`, `Stripe billing`, `Orgs + RBAC`, `i18n · es/en`, `Dark mode` — separated by small gray dots.
- Reference: `iroko/ui_kits/iroko-marketing/Hero.jsx`

#### A.3 Feature grid (6 cards, 3-col)

Each card: surface-elevated, 1px border, radius 10px, padding 28px, gap 14px, hover lift via `border-color` and `translate-y(-1px)`. Icon box 44×44, `radius-md`, `poppy-wash` background with `poppy/18 border`, Lucide icon stroke 1.25 colored `poppy`. Title Geist 600 17px, body Geist 400 14px line-height 1.6 color `text-secondary`.

Six features:
1. **Autenticación lista** (`shield-check`) — Login email/password, magic link, OAuth Google/GitHub, MFA + recovery codes desde Supabase Auth.
2. **Orgs + permisos** (`building-2`) — Multi-tenant con invitaciones por email y roles owner/admin/member.
3. **Billing con Stripe** (`credit-card`) — Suscripciones, trials, upgrades, portal de cliente, webhooks reconciliados.
4. **Internacionalización** (`globe`) — next-intl con es/en, mensajes tipados, switcher respetando rutas.
5. **Light + Dark** (`moon`) — Theme provider con persistencia, tokens semánticos en CSS.
6. **Esquema Supabase** (`database`) — Migraciones SQL para profiles, organizations, memberships, invitations, subscriptions con RLS.

Reference: `iroko/ui_kits/iroko-marketing/FeatureGrid.jsx`.

#### A.4 Quote block (Akan proverb)

Centered, max-width 760px, padding 64px vertical, vertical stack with 24px gap:
- Eyebrow `PROVERBIO AKAN` in poppy.
- Blockquote in Geist 500 italic-feeling but NOT italic (Geist), 36px, line-height 1.3, tracking -0.018em: `"Antes de cortar el iroko, se le pide permiso al espíritu del árbol — porque sin tronco, no hay ramas."`
- Gold/poppy gradient rule below (120px wide).
- Caption: `LA FILOSOFÍA DETRÁS DEL TEMPLATE`.

Reference: `iroko/ui_kits/iroko-marketing/Quote.jsx`.

#### A.5 Pricing (3 tiers)

`Personal` (free) · **`Studio` ($49, featured night card, translate-y(-12px), gold "Más popular" ribbon)** · `Custom` (a medida).
Featured tier is **ink** background with paper text, primary CTA is poppy. Standard tiers are `surface-elevated` + 1px border with monochrome CTA.
Reference: `iroko/ui_kits/iroko-marketing/PricingTiers.jsx`.

#### A.6 CTA block (final)

Large ink card with grid overlay + ambient poppy glow at top-center. Centered content: eyebrow in gold "STEP · FINAL · DESPLIEGA", display H2 in Geist 700 64px "Tu próximo micro-SaaS empieza esta tarde.", lead with inline `<code>pnpm install</code>` styled mono, two CTAs (poppy primary + outline ghost on dark).
Reference: `iroko/ui_kits/iroko-marketing/CtaBlock.jsx`.

#### A.7 Footer

4-column grid: brand block (mark + wordmark + 2 lines copy) + Producto + Recursos + Compañía. Below a horizontal rule with mono caption strip: `PIPEC · IROKO · MADE IN CL` / `∼ APRENDE DEL PASADO · CONSTRUYE EL FUTURO ∼`.
Reference: `iroko/ui_kits/iroko-marketing/Footer.jsx`.

---

### B. Dashboard (`src/app/[locale]/dashboard/…`)

The current dashboard renders retail analytics placeholder content. Replace with a generic multi-tenant SaaS dashboard. Reference: `iroko/ui_kits/iroko-dashboard/`.

#### B.1 Layout shell

```
┌─────────────┬──────────────────────────────────┐
│             │  Topbar 60px sticky              │
│  Sidebar    ├──────────────────────────────────┤
│  248px      │  content max-1280px              │
│  sticky     │  padding 28px / 40px / 56px      │
│  full-height│                                  │
│             │                                  │
└─────────────┴──────────────────────────────────┘
```

#### B.2 Sidebar (`Sidebar.jsx`)

- Background `surface-2`, 1px right border.
- Top brand strip 60px: 32×32 mark box (`ink` rounded-md) + wordmark `IROKO` CAPS Geist 800 22px.
- Org switcher card right below — colored avatar tile (org-tone) + org name + plan label + chevron. Clicking opens a dropdown of orgs + "Nueva organización".
- Nav (5 items): Overview / Proyectos / Miembros / Billing / Ajustes — Lucide icons stroke 1.25, active state is `poppy-wash` background + `poppy` text + 5px poppy dot at right edge.
- Footer: "Engine build" mini-card with `iroko · v1.0` + `● stable` chip.

#### B.3 Topbar (`Topbar.jsx`)

- 60px, sticky, `rgba(255,255,255,0.85)` + `backdrop-blur(16px)` + 1px border bottom.
- Left: breadcrumb — org name in Geist Mono 600 11px CAPS tracking 0.16em + `/` separator + page title in Geist 700 18px.
- Right: search input (240px wide, `surface-elevated` bg, `⌘ K` mono kbd inside), `bell` icon button with poppy unread dot, avatar (32×32, poppy bg, initials).
- Avatar click → dropdown menu (Perfil, Preferencias, Atajos, Cambiar tema, Idioma, Cerrar sesión with `text-error`).

#### B.4 Overview (`OverviewScreen.jsx`)

- Eyebrow: `{ORG NAME} · OVERVIEW`
- H1: `Hola, {firstName}.` (Geist 700 44px)
- Sub: "Tres ramas crecieron esta semana. Cuatro miembros pendientes de aceptar invitación."
- KPI grid (4 cards): MRR / Proyectos activos / Miembros / Uptime — value Geist Mono 30px, delta chip in success/error colors, period label in mono eyebrow style.
- 2-column: Revenue chart (12-month bar chart, gradient bars from poppy → cobalt with last bar solid poppy) + Activity feed (5 items, each with icon tile + actor + verb + target mono + timestamp).
- Projects table — 5 rows with name (mono), env chip (prod=success / staging=warning / preview=info), member count, status chip (active/building/idle), last deploy.

#### B.5 Projects (`ProjectsScreen.jsx`)

Grid of 6 project cards. Each: icon tile in tone (iron/gold/indigo) + project name mono + env chip top-right + description + bottom row (members count, branch, "hace 2h"). Reference: `iroko/ui_kits/iroko-dashboard/ProjectsScreen.jsx`.

#### B.6 Members (`MembersScreen.jsx`)

Table: avatar (28×28 tonal square) + name + email mono + role chip (owner=poppy solid, admin=poppy-wash, member=outline) + status chip (active/invited) + last seen + ⋯ icon. Toolbar above: search + role filter + status filter + "Invitar miembro" primary CTA.

#### B.7 Billing (`BillingScreen.jsx`)

- **Current plan card** — full-width `ink` card with grid overlay, eyebrow gold "PLAN ACTUAL", "Studio" display, description, "Actualizar plan" poppy CTA + "Portal Stripe →" ghost, right-aligned mono price block.
- **Payment method card** — Visa chip + masked card mono + "Cambiar" outline.
- **Usage card** — 3 progress bars (Proyectos / Miembros / Storage) with poppy fill.
- **Invoice history** table — 5 rows of invoices with paid status chip.

#### B.8 Settings (`SettingsScreen.jsx`)

Tabbed: General / Seguridad / Integraciones / Zona peligrosa.
- **General**: Identidad panel (Nombre, Slug mono, Email facturación), Preferencias panel (3 toggles).
- **Seguridad**: MFA toggle, auto-cierre, dominios permitidos.
- **Integraciones**: Supabase + Stripe + Slack + GitHub cards with "Conectado" success chip or "Conectar" outline.
- **Zona peligrosa**: error-bordered card with Transferir + Eliminar CTAs.

#### B.9 Login (`Login.jsx`)

Split-screen 50/50:
- Left: form (max-width 420px centered) — small brand row, eyebrow + display H1 "Vuelve a tu tronco." + sub, email field (icon left) + password field (with "Olvidé mi contraseña" link), poppy primary CTA "Iniciar sesión", outline "Enviarme un magic link", divider "O CONTINÚA CON", 2-col OAuth (Google + GitHub).
- Right: `ink` background with grid overlay + ambient poppy glow + HUD ring composition (nested rings + dotted orbit + 4 satellite nodes) + Akan proverb blockquote + version/commits/ramas mono stats footer.

---

## Migration plan for `src/`

### Phase 1 · Tokens + fonts

1. **Copy `iroko/colors_and_type.css`** content into `src/app/iroko-tokens.css` (or merge directly into `globals.css`).
2. **Rewrite `src/app/globals.css`** — replace the entire M3 token block (`--color-primary: #31666d`, `--color-surface: #fdf9f2`, etc) with the Iroko `:root` tokens. The shadcn aliases (`--primary`, `--background`, `--card`, `--border`, `--ring`, etc) should map onto the Iroko semantic tokens, e.g.:
   ```css
   --background: var(--color-paper);
   --foreground: var(--color-ink);
   --primary: var(--color-poppy);
   --primary-foreground: var(--color-paper);
   --secondary: var(--color-cobalt);
   --secondary-foreground: var(--color-paper);
   --muted: var(--color-gray-100);
   --muted-foreground: var(--color-gray-700);
   --accent: var(--color-poppy-wash);
   --accent-foreground: var(--color-poppy);
   --destructive: var(--color-poppy);
   --border: #e8e9ec;
   --input: #d3d3d3;
   --ring: var(--color-poppy);
   --radius: 0.375rem; /* 6px / radius-md */
   ```
3. **Update `src/app/layout.tsx`** — swap `Plus_Jakarta_Sans` + `IBM_Plex_Mono` for `Geist` + `Geist_Mono` from `next/font/google`:
   ```ts
   import { Geist, Geist_Mono } from 'next/font/google';
   const geistSans = Geist({ variable: '--font-sans', subsets: ['latin'] });
   const geistMono = Geist_Mono({ variable: '--font-mono', subsets: ['latin'], weight: ['400','500','600','700'] });
   ```
4. **Remove the Material Symbols `<link>`** in `src/app/layout.tsx` head — Iroko uses Lucide.
5. **`pnpm add lucide-react`**, then replace every `<span className="material-symbols-outlined">…</span>` with a `<Icon strokeWidth={1.5} className="size-4" />` from `lucide-react`. Mapping cheat sheet:

   | Material Symbols | Lucide |
   |---|---|
   | `inventory_2` / `folder_tree` | `FolderTree` |
   | `query_stats` / `monitoring` / `analytics` | `Activity` / `BarChart3` |
   | `storefront` | `Store` |
   | `trending_up` / `bolt` | `TrendingUp` / `Zap` |
   | `database` | `Database` |
   | `check_circle` | `CircleCheck` |
   | `lock` / `lock_reset` | `Lock` / `LockKeyhole` |
   | `mail` | `Mail` |
   | `auto_awesome` | `Sparkles` / `WandSparkles` |
   | `expand_more` | `ChevronDown` |
   | `notifications` | `Bell` |
   | `account_circle` | `UserCircle2` |
   | `logout` | `LogOut` |
   | `search` | `Search` |
   | `edit_note` / `delete_sweep` | `Pencil` / `Trash2` |
   | `format_quote` | `Quote` |
   | `sync` | `RefreshCw` |
   | `group` / `users` | `Users` |
   | `settings_suggest` / `settings` | `Settings` |
   | `grid_view` / `layout_grid` | `LayoutGrid` |
   | `add` / `plus` | `Plus` |
   | `arrow_forward` | `ArrowRight` |

6. **Copy `iroko/assets/`** into `src/public/iroko/` (or `public/` directly if you prefer flat). Update favicons in `src/app/layout.tsx` `<head>` to point at the new icons (see `Favicons` section below).

### Phase 2 · Public marketing

For each file in `src/app/[locale]/(public)/`:

| File to update | Reference component |
|---|---|
| `page.tsx` (home) | `iroko/ui_kits/iroko-marketing/Hero.jsx` + `FeatureGrid.jsx` + `Quote.jsx` + `PricingTiers.jsx` + `CtaBlock.jsx` |
| `pricing/page.tsx` | `PricingTiers.jsx` + `CtaBlock.jsx` |
| `product/page.tsx` | `Hero.jsx` + `FeatureGrid.jsx` |
| `solutions/page.tsx` | `FeatureGrid.jsx` + `Quote.jsx` |
| `contact/page.tsx` | Re-skin existing form with new tokens; preserve form action |
| `layout.tsx` (public) | Replace `<PublicNavbar />` and `<PublicFooter />` with new versions |

For `src/components/layout/public-navbar.tsx`:
- Use the JSX in `iroko/ui_kits/iroko-marketing/Navbar.jsx` as the visual spec.
- Keep `next-intl` translations (use `t('nav.product')` for `Producto`, etc.).
- Keep the `<Link>` from `@/i18n/routing` (not `next/link`).

For `src/components/layout/public-footer.tsx`:
- Use `iroko/ui_kits/iroko-marketing/Footer.jsx` as the visual spec.

### Phase 3 · Auth surfaces

`src/app/[locale]/(auth)/`:

| File | Reference component |
|---|---|
| `login/page.tsx` | `iroko/ui_kits/iroko-dashboard/Login.jsx` |
| `signup/page.tsx` | Re-skin with same field treatment + brand panel from `Login.jsx` |
| `forgot-password/page.tsx` | Single-column variant of Login with just email field |
| `reset-password/page.tsx` | Same single-column treatment |
| `signup/confirmation/page.tsx` | Add "Revisa tu inbox" message with mono email caption + resend button |
| `layout.tsx` | Split-screen 50/50 wrapper — left form, right ink brand panel with HUD ring |

**Critical**: keep all server actions (`signInAction`, `signUpAction`, `magicLinkAction`, `verifyMfaAction`, `verifyRecoveryAction`, OAuth) as-is. The visual swap should NOT touch business logic. The existing `useActionState` + `useTransition` pattern stays.

### Phase 4 · Dashboard

`src/app/[locale]/dashboard/`:

| File | Reference component |
|---|---|
| `layout.tsx` | Shell (sidebar 248px + topbar 60px + content padding 28/40/56) |
| `page.tsx` (overview) | `iroko/ui_kits/iroko-dashboard/OverviewScreen.jsx` |
| `inventory/page.tsx` | **Rename to** `projects/page.tsx`. Use `ProjectsScreen.jsx`. |
| `operations/page.tsx` | Generic "Métricas" screen — re-skin existing |
| `team/page.tsx` | Use `MembersScreen.jsx` (rename file to `members/page.tsx`) |
| `reports/page.tsx` | Generic — re-skin existing |
| `org/settings/page.tsx` | Use `SettingsScreen.jsx` |
| `account/page.tsx` | Re-skin with new tokens, keep `accountActions` |

For `src/components/layout/app-sidebar.tsx`:
- Use `iroko/ui_kits/iroko-dashboard/Sidebar.jsx` as the visual spec.
- Replace the hard-coded "RA" monogram + "Retail Analytics" + "Corporate Edition" with the Iroko mark + `IROKO` wordmark + "Engine build" footer.
- Add the **org switcher** above the nav (currently doesn't exist) — wire it to a Supabase query that returns user's organizations.

For `src/components/layout/app-topbar-client.tsx`:
- Use `iroko/ui_kits/iroko-dashboard/Topbar.jsx` as the visual spec.
- Keep the existing `DropdownMenu` for the avatar — just re-skin.
- Add breadcrumb `{orgName} / {pageName}` left of the search input.

### Phase 5 · shadcn primitives

Re-skin (don't replace) the shadcn components in `src/components/ui/`:

- **`button.tsx`** — variants: `default` (poppy bg white text), `secondary` (ink bg white text), `outline` (transparent border-strong text-primary), `ghost` (transparent text-secondary hover surface-2), `destructive` (poppy-wash bg poppy text), `link` (poppy text underline-offset). Size `default` = h-9 px-4 text-13 radius-md.
- **`card.tsx`** — `surface-elevated` bg, 1px border, radius `lg` (8px), no default shadow. Padding 6 (24px).
- **`input.tsx`** — h-9, paper bg, border-strong, radius-md, focus-visible ring poppy/20.
- **`badge.tsx`** — pill radius, three variants: `default` (poppy-wash + poppy), `secondary` (cobalt-wash + cobalt), `success` (success-wash + success), `outline` (transparent + border + text-primary).

Detailed token-to-class mapping lives in `iroko/colors_and_type.css`. The shadcn `cn()` helper still works as-is.

### Phase 6 · Copy + i18n

In `messages/es.json` and `messages/en.json` (which weren't in the import but should exist alongside `src/`):

- Replace all `Axiom Ledger` strings with `Iroko`.
- Replace all retail-analytics-specific copy (SKU, inventario, proveedores, mermas, retail, multitienda) with template SaaS copy (proyectos, miembros, organizaciones, billing, plan).
- Default homepage hero: `Un tronco común para tus micro-SaaS.` / `The shared trunk for your micro-SaaS.`
- See `iroko/README.md` "Canonical phrases" for the lift-and-paste list.

### Phase 7 · Database (Supabase)

The existing schema (profiles, organizations, memberships, invitations, subscriptions, recovery_codes) is already correct for the multi-tenant model Iroko needs. Don't touch it — only the UI changes.

If you want to add the **project resource** that Iroko's dashboard demos (since the current code uses `inventory` as a placeholder), add a new table `projects`:

```sql
create table projects (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  slug text not null,
  description text,
  environment text default 'preview' check (environment in ('prod','staging','preview','idle')),
  status text default 'idle' check (status in ('active','building','idle')),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (org_id, slug)
);

alter table projects enable row level security;
create policy projects_member_select on projects for select
  using (org_id in (select org_id from memberships where user_id = auth.uid()));
create policy projects_admin_write on projects for all
  using (org_id in (select org_id from memberships where user_id = auth.uid() and role in ('owner','admin')));
```

### Phase 8 · Favicons

The bundle ships a complete favicon set in `iroko/assets/`:
- `favicon.svg` — primary, vector
- `favicon-16.png` / `favicon-32.png` / `favicon-48.png` / `favicon-64.png`
- `apple-touch-icon.png` (180×180)
- `icon-192.png` / `icon-512.png` (PWA)
- `icon-maskable-512.png` (PWA maskable, 80% safe zone)
- `og-image-mark.png` (1024×1024, for og:image fallback)
- `site.webmanifest`

Copy them to `src/public/`, then in `src/app/layout.tsx` `<head>`:

```tsx
<link rel="icon" type="image/svg+xml" href="/favicon.svg" />
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png" />
<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16.png" />
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
<link rel="manifest" href="/site.webmanifest" />
<meta name="theme-color" content="#0e1117" />
```

Or use Next's app-router metadata API in `layout.tsx`:

```ts
export const metadata: Metadata = {
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-16.png', sizes: '16x16', type: 'image/png' },
    ],
    apple: { url: '/apple-touch-icon.png', sizes: '180x180' },
  },
  manifest: '/site.webmanifest',
  themeColor: '#0e1117',
};
```

---

## State management

The codebase already uses:
- **`useActionState`** + server actions for auth and form mutations
- **`@tanstack/react-query`** (via `src/components/providers/query-provider.tsx`) for client-side data fetching
- **Supabase RLS** + server components for protected data

This handoff doesn't change any of that. The Iroko design is purely a visual layer.

---

## Interactions & behavior

- **Hovers**: buttons darken (poppy → crimson; ink → +5% black overlay). Cards lift via `border-color` (border → border-strong) and optional `translate-y(-1px)`. No scale changes.
- **Active/press**: `translate-y(1px)` on buttons, no shadow change.
- **Focus-visible**: 3px ring in `poppy/20` color, offset 0.
- **Transitions**: `all 180–220ms ease`. Never bouncy.
- **Sticky navbar**: switches from `transparent` to `rgba(255,255,255,0.86)` + `backdrop-blur(20px)` once `scrollY > 8px`.
- **Org switcher dropdown**: appears below the trigger, popover style (`surface-elevated` + `shadow-md` + `border`). Includes "Nueva organización" CTA at the bottom.
- **Settings tabs**: underline-active style, `border-bottom: 2px solid poppy` on active tab, `text-secondary → text-primary` on hover.

---

## Assets

All assets live in `iroko/assets/`:

| File | Purpose |
|---|---|
| `mark-iroko.svg` | Primary mark (on ink, for dark/colored bg) |
| `mark-iroko-light.svg` | Primary mark (on white, with light border) |
| `wordmark-iroko.svg` | IROKO wordmark on light |
| `wordmark-iroko-dark.svg` | IROKO wordmark on dark |
| `lockup-iroko.svg` | Mark + wordmark + tagline "SAAS · TEMPLATE · ENGINE" |
| `ornament-iroko.svg` | Section divider with poppy/cobalt nodes |
| `favicon.svg` + PNG set | Favicons (see Phase 8) |
| `site.webmanifest` | PWA manifest |

There are no photographs in the system. The Login brand panel and CtaBlock use programmatic SVG (HUD ring composition) and CSS gradients only.

---

## Files in this bundle

```
iroko/
├── README.md                         ← Brand voice + visual foundations (read first)
├── SKILL.md                          ← Agent-Skills entrypoint
├── colors_and_type.css               ← Drop-in CSS tokens (the source of truth)
├── assets/                           ← Logos, marks, favicons, OAuth marks
│   ├── mark-iroko.svg, mark-iroko-light.svg
│   ├── wordmark-iroko.svg, wordmark-iroko-dark.svg
│   ├── lockup-iroko.svg, ornament-iroko.svg
│   ├── favicon.svg, favicon-16.png, favicon-32.png, favicon-48.png, favicon-64.png
│   ├── apple-touch-icon.png, icon-192.png, icon-512.png
│   ├── icon-maskable-512.png, og-image-mark.png
│   ├── favicon-light.svg, *.svg variants
│   ├── site.webmanifest
│   ├── logo-google.svg, logo-microsoft.svg  (OAuth marks)
├── preview/                          ← Design System specimen cards (visual reference)
└── ui_kits/
    ├── iroko-marketing/              ← Public marketing reference impl
    │   ├── index.html, styles.css, README.md
    │   ├── Navbar.jsx, Hero.jsx, FeatureGrid.jsx
    │   ├── Quote.jsx, PricingTiers.jsx, CtaBlock.jsx, Footer.jsx
    └── iroko-dashboard/              ← Authenticated app reference impl
        ├── index.html, styles.css, README.md
        ├── Sidebar.jsx, Topbar.jsx
        ├── OverviewScreen.jsx, ProjectsScreen.jsx
        ├── MembersScreen.jsx, BillingScreen.jsx, SettingsScreen.jsx
        └── Login.jsx
```

Open the two `index.html` files in a browser to see the fully interactive click-through demos.

---

## Implementation order (recommended)

1. **Tokens + fonts + lucide swap + favicons** (Phase 1 + 8) — small, foundational, breaks nothing because Tailwind keeps working.
2. **shadcn re-skin** (Phase 5) — buttons, cards, inputs, badges. Everything downstream improves automatically.
3. **Auth screens** (Phase 3) — easiest hifi targets, the form layouts are well-defined and the brand panel is reusable.
4. **Marketing site** (Phase 2) — high visibility, the existing copy is most placeholder-y here.
5. **Dashboard shell** (Phase 4 — sidebar + topbar) — once this lands, all dashboard screens inherit it.
6. **Dashboard screens** (Phase 4 cont.) — Overview, Projects, Members, Billing, Settings.
7. **Copy + i18n** (Phase 6) — can run in parallel with anything above.
8. **Projects table** (Phase 7) — only if you want the demo data backed by a real Supabase table; otherwise the UI works with seed data.

---

## Open questions for the developer

If anything is ambiguous, ask the user (pipec, `pipec@iroko.dev`) before guessing. Specific things to confirm:

1. **Default route after login.** Currently the code redirects to `/dashboard`. Iroko's dashboard `OverviewScreen` assumes the user has at least one org. Confirm the onboarding flow: if a fresh user has no orgs, where do they land? (Suggestion: `/dashboard/welcome` with a "Crea tu primera organización" form.)
2. **Org slug routing.** The dashboard URL pattern is currently `/dashboard/...` without an org slug. Iroko's reference has the org name in the topbar breadcrumb, but the URL stays slug-less. Confirm: should we move to `/dashboard/{orgSlug}/...` for shareable URLs, or stay session-scoped with the current sidebar switcher?
3. **Stripe billing portal**. The reference design has a "Portal Stripe →" link in the current-plan card. Confirm the existing Supabase + Stripe integration includes a portal session endpoint, or add one.
4. **Project entity**. Phase 7 adds a `projects` table. Confirm naming: do you want `projects` (generic, matches what Iroko's UI shows) or rename to something domain-specific later?

---

That's it. Welcome to Iroko.
