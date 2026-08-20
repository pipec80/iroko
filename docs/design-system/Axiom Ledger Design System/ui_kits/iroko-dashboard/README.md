# Iroko — Dashboard UI Kit

Recreation of the authenticated multi-tenant SaaS dashboard for **Iroko**.

## Components

| File                 | Purpose                                                           |
| -------------------- | ----------------------------------------------------------------- |
| `Sidebar.jsx`        | Brand strip + org switcher (dropdown) + nav + engine-build footer |
| `Topbar.jsx`         | Breadcrumb (org/page) + search + notifications + avatar menu      |
| `OverviewScreen.jsx` | Greeting, KPI grid, revenue chart, activity feed, projects table  |
| `ProjectsScreen.jsx` | Card grid of all projects with environment chips                  |
| `MembersScreen.jsx`  | Member table with role/status chips, invite button                |
| `BillingScreen.jsx`  | Current plan card, payment method, usage bars, invoice history    |
| `SettingsScreen.jsx` | Tabbed settings (General / Security / Integrations / Danger zone) |
| `Login.jsx`          | Split-screen login form + editorial brand panel with Akan proverb |
| `index.html`         | Loads React + Babel + Lucide; wires the click-through demo        |

## Demo flow

1. Land on **Login** screen (split-screen, brand panel on the right)
2. "Iniciar sesión" → **Overview** (Hola, Pipe — KPIs + chart + activity)
3. Click any sidebar item — **Proyectos**, **Miembros**, **Billing**, **Ajustes**
4. Click the **org switcher** in the sidebar to swap organizations
5. Click the **avatar** top-right → menu with "Cerrar sesión" returns to Login

## Visual rules

- Default background: Paper (`#ffffff`) or a neutral surface token. Cards use semantic surfaces and `1px var(--border)`.
- Sidebar background: a neutral `surface-2`, separated from the main canvas by contrast and border.
- Section headers: **Geist 700–800**, with a concise Geist Mono eyebrow only when it adds hierarchy.
- KPI numerals: **Geist Mono 600**, tracking `-0.04em`.
- Status pills: uppercase mono with leading colored dot, `border-radius: 999px`.
- Primary action: solid Poppy `#d92121`; Cobalt `#0047ab` is the secondary accent. Ink `#0e1117` is reserved for dramatic surfaces.
- Icons: **Lucide** through `lucide-react` in production, with a consistent `1.5` stroke.

## Notes

The dashboard uses **light mode** by default. Wrap any element in `data-theme="dark"` to flip its descendants — the `colors_and_type.css` token system handles the rest. The Settings → Preferences toggle is wired to UI state only (not persisted).
