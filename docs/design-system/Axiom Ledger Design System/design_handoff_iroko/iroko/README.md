# Iroko Design System

> *"Antes de cortar el iroko, se le pide permiso al espíritu del árbol — porque sin tronco, no hay ramas."* — Proverbio Akan

**Iroko** es el sistema de diseño del template SaaS multi-tenant del mismo nombre — un tronco común sobre el que crecen tus micro-SaaS. Esta carpeta contiene la fundación visual (tokens, componentes, voz) y los kits de UI listos para componer nuevas páginas, mockups, slides o producción.

---

## El producto

Iroko es un template Next.js + Supabase multi-tenant pensado para rebrandearse en cada proyecto. Lo construye **pipec** (pipec.cl) como base reusable para sus propios micro-SaaS. La idea no es venderlo: es no reescribirlo cada vez.

Lo que trae el template:

- **Auth** — email/password, magic links, OAuth (Google + GitHub), MFA + recovery codes
- **Orgs** — multi-tenant: cada cuenta puede pertenecer a varias organizaciones con roles `owner / admin / member`
- **Billing** — Stripe suscripciones, trials, portal de cliente, webhooks reconciliados
- **i18n** — `next-intl` con `es` (default) y `en`
- **Light + Dark** — theme provider con tokens semánticos en CSS
- **Esquema Supabase** — migraciones para profiles, organizations, memberships, invitations, subscriptions, todo con RLS

### Surfaces

| | |
|---|---|
| **Marketing público** | `/`, `/product`, `/pricing`, `/docs`, `/changelog` — Spanish-first |
| **Dashboard privado** | `/dashboard` — Overview, Proyectos, Miembros, Billing, Ajustes |
| **Auth** | `/login`, `/signup`, `/forgot-password`, MFA, recovery |

### Origen del proyecto

El código base parte de un boilerplate Next.js 16 + Tailwind + shadcn + Supabase generado en **Google Stitch** y luego adaptado. La marca *Iroko* y este sistema de diseño los construimos desde cero en esta sesión — el copy "Axiom Ledger / retail analytics" que venía en el código original era placeholder.

---

## Identificadores de marca

| | |
|---|---|
| Nombre | **Iroko** |
| Por | pipec · `pipec.cl` |
| Tagline (es) | *Un tronco común para tus micro-SaaS.* |
| Tagline (en) | *The shared trunk for your micro-SaaS.* |
| Mitología | Yoruba — Iroko es el árbol sagrado al que se le pide permiso |
| Default locale | `es` |

---

## CONTENT FUNDAMENTALS

La voz de Iroko es **maker honesta**: técnica sin ser árida, mística sin ser esotérica, cercana sin perder rigor. Como hablaría un dev que también es artesano.

### Tono

- **"Tú", no "usted".** Iroko habla como un colega que ya pasó por ese código. *"Crea tu micro-SaaS hoy"*, *"Vuelve a tu tronco"*.
- **Ritual + técnico, en partes iguales.** Metáforas del árbol ("tronco", "ramas", "raíz", "bosque") conviven con vocabulario duro ("Supabase RLS", "webhooks", "MFA"). No las suavices.
- **Editorial sobria.** Las headlines son **Cormorant italic** — eso de por sí ya hace todo el levantamiento estético; el copy puede ser directo, casi tímido. La cursiva carga la emoción.
- **Filosófico al final.** Cada surface importante termina con una nota ceremonial: el proverbio Akan en el login, el ornamento gold-rule en marketing, el "aprende del pasado · construye el futuro" en el footer.

### Casing

- **H1 / H2 marketing:** Sentence case Cormorant italic, español. *"Un tronco común para tus micro-SaaS."*
- **H1 dashboard:** Cormorant italic, breadcrumb mono encima. *"Hola, Pipe."*
- **Eyebrows / labels / chips:** ALL CAPS Geist Mono con tracking 0.18–0.24em. Bilingüe natural: `STUDIO`, `STEP · 02 · TRONCO`, `MIEMBRO`, `BUILD`, `PROD`.
- **Botones:** Sentence case en marketing (*"Empezar gratis"*), sentence case en dashboard (*"Nuevo proyecto"*, *"Invitar miembro"*).
- **Wordmark:** *Iroko* — siempre Cormorant italic con las dos letras centrales en color iron.

### Pronombres y gramática

- **Spanish first.** Default locale `es`. El copy nace en español y se traduce a inglés, no al revés.
- **Inclusivo natural** — el plural genérico funciona (*"los miembros"*); evita la `e` o `x` salvo que el cliente final lo pida.
- **Verbos en imperativo en CTAs** — *"Crea"*, *"Empieza"*, *"Despliega"*.

### Vibras a mantener

- Cero emoji.
- Cero exclamaciones.
- Los numerales SIEMPRE en mono (Geist Mono).
- Los códigos / IDs / slugs / dominios en mono.
- Cuando dudes, agrega una línea de eyebrow mono encima del título.

### Frases canónicas (lift estas)

- *"El tronco que sostiene tus productos."*
- *"Antes de cortar el iroko, se le pide permiso al espíritu del árbol — porque sin tronco, no hay ramas."*
- *"Un tronco común para tus micro-SaaS."*
- *"Aprende del pasado · construye el futuro."*
- *"Tu próximo micro-SaaS empieza esta tarde."*

---

## VISUAL FOUNDATIONS

### Paleta — Tierra + Hierro

Una paleta afrofuturista anclada en pigmentos ceremoniales: óxido de hierro, oro de hoja, noche-tierra, e hueso color marfil.

- **Iron `#b8513a`** — la acción primaria. CTAs, links, acentos en el wordmark.
- **Gold `#d9a441`** — acento secundario. Ribbons "Más popular", KPIs positivos, decoración.
- **Indigo `#3c4f73`** — contrapeso frío. Estados `info`, balance visual.
- **Night `#13110d`** — la profundidad. Tier featured, modo oscuro, login brand-panel.
- **Bone `#f5ecda`** — el papel cálido. Background default — *nunca blanco crudo*.
- **Earth / Bark / Clay** — la tipografía: bark `#5a4232` para body, earth `#3a2c1f` para títulos en light, clay `#8b6645` para texto terciario.

Estados:
- `success` `#6f9362` (moss verde)
- `warning` `#d9a441` (el gold doblando función)
- `error` `#c14534` (hot iron)
- `info` `#3c4f73`

Todos los semánticos tienen una versión `-wash` (12–18% alpha) para badges y notificaciones.

### Tipografía

- **Display:** *Cormorant Garamond italic 500* — solo italic, weight 500. Para headlines emocionales, el wordmark, y nombres de página/sección en breadcrumbs.
- **UI / body:** Inter Tight 400–700. Todo el cuerpo, formularios, botones, listas.
- **Mono:** Geist Mono 500–700. Numerales (siempre), eyebrow labels, IDs, slugs, código, kbd hints.

Reglas:
- Las numerales SIEMPRE son mono con `font-variant-numeric: tabular-nums`.
- Los eyebrows uppercase mono con tracking entre 0.18em (label-lg) y 0.26em (label-xs).
- Los títulos cortos pueden ser Cormorant italic; los largos o muy informativos se quedan en Inter Tight.

### Espaciado y radii

- Espaciado: escala Tailwind (4 / 8 / 12 / 16 / 24 / 32 / 48 / 64 / 96).
- Radii: **pequeños y precisos** — 2 / 4 / 6 / 8 / 10 / 14, más `pill` para chips de status. Iroko *no* es "soft" — la geometría es ceremonial, no esponjosa.
- Container marketing: `max-w-1240px` con padding 32px.

### Elevación

Sombras tibias, nunca azuladas:
- `sm` — 0 1px 2px rgba(19,17,13,0.06)
- `md` — 0 4px 12px -4px rgba(19,17,13,0.10)
- `lg` — 0 10px 24px -8px rgba(19,17,13,0.16)
- `xl` — 0 24px 48px -12px rgba(19,17,13,0.22)
- `iron-glow` — 0 0 0 1px rgba(184,81,58,0.4), 0 8px 24px -8px rgba(184,81,58,0.35) (para CTAs primarios opcional)

### Fondos y texturas

- **Light mode:** bone `#f5ecda` plano. Las secciones secundarias usan `surface-2` (`#ede2c9`) para crear ritmo.
- **Dark mode:** night `#13110d` con grid sutil de líneas (`rgba(245,236,218,0.04)`) cada 32–48px — el "papel cuadriculado" del studio.
- **Glow blobs:** en marketing hero, dos radial-gradients (iron + gold) muy difusos como iluminación ambiente.
- **Mix de modo:** los login-brand-panels, CTA blocks, y featured pricing tier están siempre en *night* sobre un canvas *bone* — el contraste es parte de la identidad.

### Animación

- Transiciones de 180–300ms, `ease-out`. Nada bouncy.
- `fade-in` con leve translate de 4px para entradas de pantalla.
- Hovers: cambio de tono *o* `translate-y(-1px)`, nunca scale.
- No hay easter eggs animados — la marca es contemplativa, no juguetona.

### Hover / press

- Buttons primary: `background: iron` → `background: iron-deep` (~10% más oscuro). Sin shadow change.
- Buttons outline: `background: transparent` → `background: surface-2`.
- Links: `color: iron` → `color: iron-deep` + subrayado.
- Cards interactive: borde `border` → `border-strong`, o sombra `sm` → `md`.
- Active (pressed): translate-y 1px, ya está.

### Bordes

- Borde estándar: `rgba(58,44,31,0.16)` — earth con baja opacidad.
- Borde fuerte (inputs, divisores enfatizados): `rgba(58,44,31,0.32)`.
- En dark: `rgba(245,236,218,0.14)` / `0.28`.
- *Nunca* bordes de color salvo en estados de error/focus.

### Cards

Tres arquetipos:

1. **Surface card** (mayoría) — `surface-elevated` blanco crema, borde `border`, radio 10px, sin sombra. Hierarquía por contraste tonal con el bone background.
2. **Night card** (CTA, featured pricing, login brand-panel) — `night` background, bone text, posible grid overlay, glow ambiente. La pieza dramática.
3. **Empty / data card** — borde dashed `border`, label mono central. Para estados vacíos.

### Capas y blur

- Topbar: `backdrop-filter: blur(16px)` sobre `rgba(245,236,218,0.85)` — bone frosted.
- Modales y popovers: surface-elevated con `shadow-lg`, blur opcional en backdrop.
- Tints (washes) son la firma — `iron-wash` `gold-wash` `indigo-wash` van en chips, badges, notificaciones.

### Imagery

Iroko no usa fotografía. Los marks geométricos del árbol, ornamentos sagrados, gradientes sutiles, y compositions tipográficas hacen todo el trabajo. Si el producto necesita imagen real, va en *warm-graded* (cálido, ligeramente desaturado) sobre un container `night` con grid overlay.

### Layout fijo

- **Sidebar dashboard:** 248px, sticky, full-height.
- **Topbar dashboard:** 60px, sticky.
- **Navbar marketing:** transparent al top, frosted bone al hacer scroll.
- **Container marketing:** max-1240px, padding-x 32px.

---

## ICONOGRAPHY

- **Set primario: Lucide** (lucide.dev). Stroke-width **1.25** — más fino que el default 2 — para emparejar con la suavidad serif del display face. Se carga vía CDN:
  ```html
  <script src="https://unpkg.com/lucide@latest/dist/umd/lucide.js"></script>
  <script>lucide.createIcons();</script>
  ```
  Y se usa con `<i data-lucide="tree-pine"></i>` (Lucide reemplaza por el SVG).
- **Iconos comunes en el sistema:** `tree-pine` (símbolo de marca), `layout-grid`, `folder-tree`, `folder`, `users`, `user-plus`, `credit-card`, `settings`, `shield-check`, `building-2`, `globe`, `moon`, `database`, `bell`, `search`, `log-out`, `plus`, `chevron-down`, `more-horizontal`, `download`, `wand-sparkles`, `arrow-right`.
- **Tamaños:** 17px en sidebar/topbar, 18–22px en cards y empty states, 13–14px inline en botones y chips.
- **No emoji. No unicode arrow hacks** (`→`). Si necesitas una flecha, usa `arrow-right` de Lucide.
- **Mark de marca:** `assets/mark-iroko.svg` — un árbol geométrico (tronco bone, raíz iron, nodos gold). Versión light en `mark-iroko-light.svg`.
- **No SVG sprite, no PNG icons** — todo es Lucide o asset SVG explícito.

### Substitution flag

Si quieres usar **Phosphor** o **Heroicons** en lugar de Lucide, ambos pares funcionan con el sistema. Phosphor "Light" se siente especialmente afín al display serif si quieres llevar el estilo aún más editorial. Avísame y reemplazo.

---

## Index

```
README.md                ← estás aquí
SKILL.md                 ← Agent Skills entrypoint (Claude Code compatible)
colors_and_type.css      ← tokens · cargar PRIMERO en cada nuevo HTML
assets/                  ← wordmark, mark, lockup, ornamentos, OAuth logos
preview/                 ← cards del Design System tab (no enlazar en prod)
ui_kits/
  iroko-marketing/       ← landing pública · navbar, hero, features, pricing, footer
  iroko-dashboard/       ← app autenticado · sidebar+topbar, overview, miembros, billing, ajustes, login
brand/                   ← exploración del proceso de naming (referencia histórica)
```

## Quick start

```html
<!-- Carga la fuente del sistema -->
<link rel="stylesheet" href="colors_and_type.css">

<!-- Carga Lucide si vas a usar iconos -->
<script src="https://unpkg.com/lucide@latest/dist/umd/lucide.js"></script>

<!-- Estructura mínima Iroko-shaped -->
<header>
  <span class="eyebrow">Step · 01 · Origen</span>
  <h1 class="display-italic" style="font-size: 56px;">
    Un tronco común para tus <span style="color: var(--color-iron);">micro-SaaS</span>.
  </h1>
</header>
<button class="btn-iron" style="background: var(--color-iron); color: white; border-radius: var(--radius-lg); padding: 14px 28px; font-weight: 600;">
  Empezar gratis →
</button>

<script>lucide.createIcons();</script>
```

Para mocks más ricos, abre `ui_kits/iroko-marketing/index.html` o `ui_kits/iroko-dashboard/index.html` y copia los componentes que necesites.
